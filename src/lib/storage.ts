import {
  StudyTask,
  LibraryItem,
  Badge,
  WeeklyChallenge,
  UserProfile,
  AppSettings,
  NotificationItem,
  AuditLog,
  SubjectItem,
} from '../types';
import { INITIAL_BADGES, INITIAL_WEEKLY_CHALLENGES } from './gamification';
import { formatDateToISO, getBrasiliaDate } from './dateUtils';
import { DEFAULT_SUBJECT_COLORS } from './theme';

const STORAGE_KEYS = {
  AUTHENTICATED_USER_ID: 'estudotrack_auth_user_id',
  CURRENT_USER_ID: 'estudotrack_current_user_id',
  USERS: 'estudotrack_users_db',
  TASKS: 'estudotrack_tasks_',
  SUBJECTS: 'estudotrack_subjects_',
  LIBRARY: 'estudotrack_library_',
  BADGES: 'estudotrack_badges_',
  CHALLENGES: 'estudotrack_challenges_',
  SETTINGS: 'estudotrack_settings_',
  NOTIFICATIONS: 'estudotrack_notifications_',
  AUDIT_LOGS: 'estudotrack_audit_logs_',
};

export interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  courseOrGoal: string;
  createdAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'dark',
  colorPalette: 'purple',
  notificationsEnabled: true,
  soundEnabled: true,
  reviewRemindersEnabled: true,
  defaultView: 'week',
  supabaseUrl: '',
  supabaseAnonKey: '',
  autoSpacedRepetition: true,
};

function getTodayISO(): string {
  return formatDateToISO(getBrasiliaDate());
}

function getRelativeDateISO(offsetDays: number): string {
  const d = getBrasiliaDate();
  d.setDate(d.getDate() + offsetDays);
  return formatDateToISO(d);
}

export function getInitialSeedTasks(_userId: string): StudyTask[] {
  return [];
}

export function getInitialSeedLibrary(_userId: string): LibraryItem[] {
  return [];
}

export function getInitialSeedNotifications(_userId: string): NotificationItem[] {
  return [];
}

export function getInitialSeedAudit(_userId: string): AuditLog[] {
  return [];
}

// Storage Access & Multi-user state handlers
export class DataService {
  // Registered by App.tsx on mount so a failed localStorage write (quota
  // exceeded, private-browsing restrictions, etc.) surfaces to the user
  // instead of only ever reaching a console nobody's watching.
  static onStorageError: ((message: string) => void) | null = null;

  // localStorage is a best-effort cache — Supabase is the source of truth for synced
  // accounts. A quota-exceeded write (e.g. from accumulated base64 images) must never
  // abort the caller's flow (Supabase sync, toasts, modal close, etc).
  private static safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[DataService] Failed to persist "${key}" to localStorage (quota exceeded?)`, err);
      this.onStorageError?.('Não foi possível salvar localmente (armazenamento cheio).');
    }
  }

  // Warns loudly (with a stack trace) whenever a save call is about to
  // replace a non-empty stored list with an empty one — the exact shape of
  // the regression that once silently wiped out a user's cards. This is a
  // detection aid, not a guard: the actual "don't overwrite local with an
  // incomplete remote fetch" protection lives in App.tsx's fetchRemoteData.
  private static warnIfWipingExisting(key: string): void {
    try {
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      if (Array.isArray(existing) && existing.length > 0) {
        console.warn(
          `[DataService] Saving an EMPTY array over "${key}", which currently holds ${existing.length} item(s) — this looks like a regression that would wipe local data.`,
          new Error().stack
        );
      }
    } catch {
      // ignore
    }
  }

  static getAuthenticatedUserId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTHENTICATED_USER_ID);
    } catch {
      return null;
    }
  }

  static setAuthenticatedUserId(id: string | null): void {
    try {
      if (id) {
        this.safeSetItem(STORAGE_KEYS.AUTHENTICATED_USER_ID, id);
        this.safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, id);
      } else {
        // Clearing only AUTHENTICATED_USER_ID left CURRENT_USER_ID pointing
        // at the previous account — harmless while logged out (the login
        // screen doesn't read it), but a real footgun the moment anything
        // reads getCurrentUser()/getCurrentUserId() before the next login
        // finishes. These two keys must never be allowed to disagree.
        localStorage.removeItem(STORAGE_KEYS.AUTHENTICATED_USER_ID);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch {
      // ignore
    }
  }

  static logout(): void {
    this.setAuthenticatedUserId(null);
  }

  static findUserByName(nameOrUsername: string): StoredUserAccount | undefined {
    const clean = nameOrUsername.trim().toLowerCase();
    return this.getUsers().find(
      (u) =>
        u.name.trim().toLowerCase() === clean ||
        (u.email && u.email.trim().toLowerCase() === clean)
    );
  }

  static findUserByEmail(email: string): StoredUserAccount | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.getUsers().find((u) => u.email.trim().toLowerCase() === cleanEmail);
  }

  static registerUser(account: StoredUserAccount): void {
    const cleanName = account.name.trim().toLowerCase();
    const users = this.getUsers().filter(
      (u) => u.id !== account.id && u.name.trim().toLowerCase() !== cleanName
    );
    users.push(account);
    this.saveUsers(users);
    this.setAuthenticatedUserId(account.id);
  }

  static getUsers(): StoredUserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    // No accounts registry yet (or it's corrupted) — return an empty list
    // rather than fabricating and persisting a 'user-default-1' placeholder.
    // That placeholder used to become a real, permanent phantom identity:
    // every getTasks/saveTasks call defaults to getCurrentUserId(), which
    // fell back to this fabricated id, so data would silently start being
    // read/written under an account nobody ever actually registered. An
    // empty list forces the caller (App.tsx's boot check) to route to login
    // instead.
    return [];
  }

  static saveUsers(users: StoredUserAccount[]): void {
    this.safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static getCurrentUserId(): string {
    const current = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (current) return current;
    const users = this.getUsers();
    if (users.length === 0) return '';
    this.safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, users[0].id);
    return users[0].id;
  }

  static setCurrentUserId(id: string): void {
    this.safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, id);
  }

  static getCurrentUser(): StoredUserAccount {
    const id = this.getCurrentUserId();
    const users = this.getUsers();
    const user = users.find((u) => u.id === id);
    if (user) return user;
    // No matching local account — this ephemeral placeholder is never
    // persisted. The caller is expected to route to login (see App.tsx's
    // boot check) instead of silently operating under a fabricated identity.
    return {
      id: '',
      name: '',
      email: '',
      passwordHash: '',
      avatar: '',
      courseOrGoal: '',
      createdAt: new Date().toISOString(),
    };
  }

  static updateUserProfile(updates: Partial<StoredUserAccount>): StoredUserAccount {
    const current = this.getCurrentUser();
    const updated = { ...current, ...updates };
    const users = this.getUsers().map((u) => (u.id === current.id ? updated : u));
    this.saveUsers(users);
    return updated;
  }

  static getTasks(userId?: string): StudyTask[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    const seed = getInitialSeedTasks(uid);
    this.saveTasks(seed, uid);
    return seed;
  }

  static saveTasks(tasks: StudyTask[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    const key = STORAGE_KEYS.TASKS + uid;
    if (tasks.length === 0) {
      this.warnIfWipingExisting(key);
    }
    // Defensive backstop: a base64 data: URI should never reach here — it
    // should have been uploaded to Storage first (see TaskEditorModal /
    // RichNoteEditor) — but if one slips through, drop it from the array
    // rather than let a single huge string blow the localStorage quota for
    // every other task sharing this key.
    const sanitized = tasks.map((t) => {
      const cleanImages = (t.images || []).filter((img) => {
        if (typeof img === 'string' && img.startsWith('data:')) {
          console.warn(`[DataService] Dropped a data: URI from task "${t.id}" images before saving — it should have been uploaded to Storage first.`);
          return false;
        }
        return true;
      });
      if (t.notesHtml && t.notesHtml.includes('src="data:')) {
        console.warn(`[DataService] Task "${t.id}" notesHtml still contains an embedded data: URI image — it should have been uploaded to Storage before saving.`);
      }
      return cleanImages.length !== (t.images || []).length ? { ...t, images: cleanImages } : t;
    });
    this.safeSetItem(key, JSON.stringify(sanitized));
  }

  static getSubjects(userId?: string): SubjectItem[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    // Extract unique subjects from existing tasks or return default starting list
    const tasks = this.getTasks(uid);
    const map = new Map<string, SubjectItem>();
    tasks.forEach((t) => {
      if (t.subject && !map.has(t.subject.toLowerCase())) {
        map.set(t.subject.toLowerCase(), {
          id: crypto.randomUUID(),
          name: t.subject,
          color: t.categoryColor || DEFAULT_SUBJECT_COLORS[map.size % DEFAULT_SUBJECT_COLORS.length],
        });
      }
    });

    const initialSubjects = Array.from(map.values());
    this.saveSubjects(initialSubjects, uid);
    return initialSubjects;
  }

  static saveSubjects(subjects: SubjectItem[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    this.safeSetItem(STORAGE_KEYS.SUBJECTS + uid, JSON.stringify(subjects));
  }

  static addSubject(name: string, color?: string, userId?: string): SubjectItem {
    const uid = userId || this.getCurrentUserId();
    const current = this.getSubjects(uid);
    const existing = current.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;

    const assignedColor = color || DEFAULT_SUBJECT_COLORS[current.length % DEFAULT_SUBJECT_COLORS.length];
    const newSubject: SubjectItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: assignedColor,
    };
    const updated = [...current, newSubject];
    this.saveSubjects(updated, uid);
    return newSubject;
  }

  static updateSubject(id: string, updates: Partial<Pick<SubjectItem, 'name' | 'color'>>, userId?: string): SubjectItem | null {
    const uid = userId || this.getCurrentUserId();
    const current = this.getSubjects(uid);
    const idx = current.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const updatedSubject: SubjectItem = {
      ...current[idx],
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
    };
    const updated = [...current];
    updated[idx] = updatedSubject;
    this.saveSubjects(updated, uid);
    return updatedSubject;
  }

  static deleteSubject(id: string, userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    const current = this.getSubjects(uid);
    this.saveSubjects(current.filter((s) => s.id !== id), uid);
  }

  static getLibrary(userId?: string): LibraryItem[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LIBRARY + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    const seed = getInitialSeedLibrary(uid);
    this.saveLibrary(seed, uid);
    return seed;
  }

  static saveLibrary(items: LibraryItem[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    const key = STORAGE_KEYS.LIBRARY + uid;
    if (items.length === 0) {
      this.warnIfWipingExisting(key);
    }
    this.safeSetItem(key, JSON.stringify(items));
  }

  static getBadges(userId?: string): Badge[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BADGES + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    const badges = INITIAL_BADGES.map((b) => ({
      ...b,
      unlocked: false,
      currentProgress: 0,
      unlockedAt: undefined,
    }));
    this.saveBadges(badges, uid);
    return badges;
  }

  static saveBadges(badges: Badge[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    this.safeSetItem(STORAGE_KEYS.BADGES + uid, JSON.stringify(badges));
  }

  static getChallenges(userId?: string): WeeklyChallenge[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHALLENGES + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    const seed = [...INITIAL_WEEKLY_CHALLENGES];
    this.saveChallenges(seed, uid);
    return seed;
  }

  static saveChallenges(challenges: WeeklyChallenge[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    this.safeSetItem(STORAGE_KEYS.CHALLENGES + uid, JSON.stringify(challenges));
  }

  static getSettings(userId?: string): AppSettings {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS + uid);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings, userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    this.safeSetItem(STORAGE_KEYS.SETTINGS + uid, JSON.stringify(settings));
  }

  static getNotifications(userId?: string): NotificationItem[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    const seed = getInitialSeedNotifications(uid);
    this.saveNotifications(seed, uid);
    return seed;
  }

  static saveNotifications(notifs: NotificationItem[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    this.safeSetItem(STORAGE_KEYS.NOTIFICATIONS + uid, JSON.stringify(notifs));
  }

  static getAuditLogs(userId?: string): AuditLog[] {
    const uid = userId || this.getCurrentUserId();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS + uid);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    const seed = getInitialSeedAudit(uid);
    this.saveAuditLogs(seed, uid);
    return seed;
  }

  static saveAuditLogs(logs: AuditLog[], userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    this.safeSetItem(STORAGE_KEYS.AUDIT_LOGS + uid, JSON.stringify(logs.slice(0, 50)));
  }

  static addAuditLog(action: string, details: string, userId?: string): void {
    const uid = userId || this.getCurrentUserId();
    const logs = this.getAuditLogs(uid);
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: uid,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.saveAuditLogs([newLog, ...logs], uid);
  }

}
