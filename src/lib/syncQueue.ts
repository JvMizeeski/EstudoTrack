import { StudyTask, LibraryItem, SubjectItem, UserProfile } from '../types';
import { SupabaseSyncService, SyncResponse } from './supabaseSync';

export type OutboxEntity = 'task' | 'library' | 'subject' | 'profile';
export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  id: string;
  entity: OutboxEntity;
  op: OutboxOp;
  payload: any;
  userId: string;
  attempts: number;
  lastError?: string;
  queuedAt: string;
  nextAttemptAt?: string;
}

const KEY_PREFIX = 'estudotrack_outbox_';
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const BASE_BACKOFF_MS = 2000;
const PERIODIC_INTERVAL_MS = 30 * 1000;

function loadQueue(userId: string): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(userId: string, queue: OutboxEntry[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(queue));
  } catch (err) {
    console.warn('[SyncQueue] Failed to persist outbox to localStorage', err);
  }
}

function newEntryId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Durable retry queue for every write this app makes to Supabase. The core
// promise: a mutation that fails to reach the cloud (offline, dropped
// connection, tab closed mid-upload, transient PostgREST error) is never
// silently lost — it stays queued and keeps getting retried (with capped
// exponential backoff) until it succeeds, across reloads, forever. This is
// what makes "automatic sync" actually mean "never loses data" instead of
// just "fires once and hopes."
class SyncQueueController {
  private processingUsers = new Set<string>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private onlineBound = false;
  private listeners = new Set<() => void>();

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // listener errors must never break the queue
      }
    });
  }

  size(userId: string): number {
    return loadQueue(userId).length;
  }

  getEntries(userId: string): OutboxEntry[] {
    return loadQueue(userId);
  }

  isProcessing(userId: string): boolean {
    return this.processingUsers.has(userId);
  }

  /**
   * Persist the mutation to the outbox FIRST (so it survives a crash/close
   * even before any network call happens), then attempt it immediately.
   * Resolves with that immediate attempt's outcome so callers can show
   * instant feedback (a toast), while the entry itself stays in the queue —
   * removed only on success — for the background sweep to keep retrying.
   */
  async enqueue(userId: string, entity: OutboxEntity, op: OutboxOp, payload: any): Promise<SyncResponse> {
    const queue = loadQueue(userId);
    const payloadId = payload?.id;
    const existingIndex = queue.findIndex((e) => e.entity === entity && e.payload?.id === payloadId);

    const entry: OutboxEntry = {
      id: existingIndex >= 0 ? queue[existingIndex].id : newEntryId(),
      entity,
      op,
      payload,
      userId,
      attempts: existingIndex >= 0 ? queue[existingIndex].attempts : 0,
      lastError: undefined,
      queuedAt: new Date().toISOString(),
      nextAttemptAt: undefined, // fresh content deserves an immediate attempt, ignoring any prior backoff
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = entry;
    } else {
      queue.push(entry);
    }
    saveQueue(userId, queue);
    this.notify();

    return this.attemptEntry(userId, entry.id);
  }

  /** Runs every due entry for a user once. Safe to call repeatedly/concurrently. */
  async process(userId: string): Promise<void> {
    if (this.processingUsers.has(userId)) return;
    this.processingUsers.add(userId);
    this.notify();
    try {
      const due = loadQueue(userId).filter(
        (e) => !e.nextAttemptAt || new Date(e.nextAttemptAt).getTime() <= Date.now()
      );
      for (const entry of due) {
        await this.attemptEntry(userId, entry.id);
      }
    } finally {
      this.processingUsers.delete(userId);
      this.notify();
    }
  }

  private async attemptEntry(userId: string, entryId: string): Promise<SyncResponse> {
    const queue = loadQueue(userId);
    const idx = queue.findIndex((e) => e.id === entryId);
    if (idx === -1) return { ok: true }; // already resolved/removed by a concurrent attempt

    const entry = queue[idx];
    let result: SyncResponse;
    try {
      result = await this.send(entry);
    } catch (err: any) {
      result = { ok: false, error: err?.message || 'Erro inesperado ao sincronizar.' };
    }

    const freshQueue = loadQueue(userId);
    const freshIdx = freshQueue.findIndex((e) => e.id === entryId);
    if (freshIdx === -1) return result;

    if (result.ok) {
      freshQueue.splice(freshIdx, 1);
      saveQueue(userId, freshQueue);
    } else {
      const attempts = freshQueue[freshIdx].attempts + 1;
      const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempts), MAX_BACKOFF_MS);
      freshQueue[freshIdx] = {
        ...freshQueue[freshIdx],
        attempts,
        lastError: result.error,
        nextAttemptAt: new Date(Date.now() + delay).toISOString(),
      };
      saveQueue(userId, freshQueue);
    }
    this.notify();
    return result;
  }

  private async send(entry: OutboxEntry): Promise<SyncResponse> {
    switch (entry.entity) {
      case 'task':
        return entry.op === 'delete'
          ? SupabaseSyncService.deleteTask(entry.payload.id)
          : SupabaseSyncService.syncTask(entry.payload as StudyTask);
      case 'library':
        return entry.op === 'delete'
          ? SupabaseSyncService.deleteLibraryItem(entry.payload.id)
          : SupabaseSyncService.syncLibraryItem(entry.payload as LibraryItem);
      case 'subject':
        return entry.op === 'delete'
          ? SupabaseSyncService.deleteSubject(entry.payload.id)
          : SupabaseSyncService.syncSubject(entry.payload as SubjectItem, entry.userId);
      case 'profile': {
        // Registration attaches a one-time password hash to write alongside
        // the profile; every other profile sync (XP gain, settings, etc.)
        // omits it so an existing password_hash is never overwritten.
        const { __password, ...profile } = entry.payload as UserProfile & { __password?: string };
        return SupabaseSyncService.syncProfile(profile, __password);
      }
      default:
        return { ok: false, error: 'Tipo de entidade desconhecido na fila de sincronização.' };
    }
  }

  /** Boot the periodic sweep + online-triggered flush for a user. Idempotent. */
  startBoot(userId: string): void {
    this.process(userId);
    if (!this.timers.has(userId)) {
      const id = setInterval(() => this.process(userId), PERIODIC_INTERVAL_MS);
      this.timers.set(userId, id);
    }
    if (!this.onlineBound && typeof window !== 'undefined') {
      this.onlineBound = true;
      window.addEventListener('online', () => {
        this.timers.forEach((_, uid) => this.process(uid));
      });
    }
  }

  stop(userId: string): void {
    const id = this.timers.get(userId);
    if (id) {
      clearInterval(id);
      this.timers.delete(userId);
    }
  }
}

export const SyncQueue = new SyncQueueController();
