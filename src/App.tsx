/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  StudyTask,
  LibraryItem,
  Badge,
  RankingUser,
  AppSettings,
  NotificationItem,
  AuditLog,
  ColorPalette,
} from './types';
import { DataService, StoredUserAccount } from './lib/storage';
import { COLOR_PALETTES, getThemeClasses } from './lib/theme';
import { calculateNextSpacedReviewDate, formatDateToISO, getBrasiliaDate, formatShortDate } from './lib/dateUtils';
import { SupabaseSyncService } from './lib/supabaseSync';
import { SyncQueue } from './lib/syncQueue';
import { hashPassword, verifyPassword, isBcryptHash } from './lib/passwordUtils';

import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { NavigationTabs, MainTabType } from './components/NavigationTabs';
import { AgendaView } from './components/AgendaView';
import { LibraryView } from './components/LibraryView';
import { RankingView } from './components/RankingView';
import { SettingsView } from './components/SettingsView';
import { TaskEditorModal } from './components/TaskEditorModal';
import { WeeklyStatsModal } from './components/WeeklyStatsModal';
import { AuthModal } from './components/AuthModal';
import { AuthView } from './components/AuthView';
import { Toast, ToastData } from './components/Toast';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authId = DataService.getAuthenticatedUserId();
    if (!authId) return false;
    // An AUTHENTICATED_USER_ID pointing at an account that no longer exists
    // in the local registry (corrupted/cleared estudotrack_users_db, a
    // fresh browser profile, etc.) used to fall through to a fabricated
    // 'user-default-1' phantom identity instead of forcing a real login —
    // that's how cards ended up scattered across seven different user_ids
    // in Supabase, none of them a real registered profile. Treat an orphaned
    // pointer as "not authenticated" instead.
    const hasMatchingAccount = DataService.getUsers().some((u) => u.id === authId);
    if (!hasMatchingAccount) {
      DataService.setAuthenticatedUserId(null);
      return false;
    }
    return true;
  });

  // App state
  const [currentUserAccount, setCurrentUserAccount] = useState<StoredUserAccount>(() => {
    // Clear legacy mock cache if present
    try {
      const storedTasks = localStorage.getItem('estudotrack_tasks_user-default-1');
      if (storedTasks && storedTasks.includes('task-1')) {
        localStorage.removeItem('estudotrack_tasks_user-default-1');
        localStorage.removeItem('estudotrack_library_user-default-1');
        localStorage.removeItem('estudotrack_notifications_user-default-1');
        localStorage.removeItem('estudotrack_audit_logs_user-default-1');
        localStorage.removeItem('estudotrack_badges_user-default-1');
      }
    } catch {
      // ignore
    }
    return DataService.getCurrentUser();
  });
  const [availableUsers, setAvailableUsers] = useState<StoredUserAccount[]>(() => DataService.getUsers());
  const [activeTab, setActiveTab] = useState<MainTabType>('agenda');

  const [tasks, setTasks] = useState<StudyTask[]>(() => DataService.getTasks(currentUserAccount.id));
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(() => DataService.getLibrary(currentUserAccount.id));
  const [badges, setBadges] = useState<Badge[]>(() => DataService.getBadges(currentUserAccount.id));
  const [rankingPeers, setRankingPeers] = useState<RankingUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => DataService.getSettings(currentUserAccount.id));
  const [previewPalette, setPreviewPalette] = useState<ColorPalette | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => DataService.getNotifications(currentUserAccount.id));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => DataService.getAuditLogs(currentUserAccount.id));

  // User Profile Object - Clean Initial Slate
  const [userProfile, setUserProfile] = useState<UserProfile>(() => ({
    id: currentUserAccount.id,
    name: currentUserAccount.name || 'Estudante',
    email: currentUserAccount.email || '',
    avatar: currentUserAccount.avatar || '',
    courseOrGoal: currentUserAccount.courseOrGoal || '',
    level: 1,
    xp: 0,
    streakDays: 0,
    lastActiveDate: formatDateToISO(getBrasiliaDate()),
    targetWeeklyMinutes: 300,
    createdAt: currentUserAccount.createdAt,
  }));

  // Modals state
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<StudyTask> | null>(null);
  const [taskInitialDate, setTaskInitialDate] = useState<string | undefined>(undefined);
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('estudatrack_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('estudatrack_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Sync status indicator (pending outbox entries, whether a sweep is
  // running right now, and basic browser online/offline awareness)
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    // Surface a failed localStorage write (quota exceeded, private
    // browsing, etc.) instead of leaving it silent in the console forever.
    DataService.onStorageError = (message) => {
      setToast({ message, type: 'error' });
    };
    return () => {
      DataService.onStorageError = null;
    };
  }, []);

  useEffect(() => {
    const uid = currentUserAccount.id;
    if (!uid) return;

    const refresh = () => {
      setPendingSyncCount(SyncQueue.size(uid));
      setIsSyncingNow(SyncQueue.isProcessing(uid));
    };
    refresh();
    const unsubscribe = SyncQueue.onChange(refresh);

    SyncQueue.startBoot(uid);

    const handleOnline = () => {
      setIsOnline(true);
      SyncQueue.process(uid);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUserAccount.id]);

  const handleForceSync = () => {
    if (!currentUserAccount.id) return;
    SyncQueue.process(currentUserAccount.id);
  };

  // Sync state whenever active user changes
  const reloadUserData = (userId: string) => {
    const user = DataService.getUsers().find((u) => u.id === userId) || DataService.getCurrentUser();
    setCurrentUserAccount(user);
    setUserProfile({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      courseOrGoal: user.courseOrGoal || '',
      level: 1,
      xp: 0,
      streakDays: 0,
      lastActiveDate: formatDateToISO(getBrasiliaDate()),
      targetWeeklyMinutes: 300,
      createdAt: user.createdAt,
    });
    setTasks(DataService.getTasks(user.id));
    setLibraryItems(DataService.getLibrary(user.id));
    setBadges(DataService.getBadges(user.id));
    setSettings(DataService.getSettings(user.id));
    setNotifications(DataService.getNotifications(user.id));
    setAuditLogs(DataService.getAuditLogs(user.id));

    // Fetch initial state from Supabase
    fetchRemoteData(user.id);
  };

  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Any local record missing from a remote snapshot didn't make it to the
  // cloud yet (offline, dropped mid-upload, transient error) — re-queue it
  // for automatic resend instead of leaving it stranded until the next
  // unrelated edit happens to touch it.
  function reconcileMissing<T extends { id: string }>(
    entity: 'task' | 'library' | 'subject',
    userId: string,
    localList: T[],
    remoteList: T[]
  ): void {
    const remoteIds = new Set(remoteList.map((item) => item.id));
    const missing = localList.filter((item) => !remoteIds.has(item.id));
    if (missing.length === 0) return;
    missing.forEach((item) => {
      SyncQueue.enqueue(userId, entity, 'upsert', item).catch(() => {});
    });
    console.warn(`[Supabase Sync] Re-queued ${missing.length} local "${entity}" record(s) missing from the remote snapshot.`);
  }

  const fetchRemoteData = async (userId: string) => {
    try {
      const [remoteProfile, remoteTasks, remoteLib, remoteSubjects, leaderboard] = await Promise.all([
        SupabaseSyncService.fetchProfile(userId),
        SupabaseSyncService.fetchTasks(userId),
        SupabaseSyncService.fetchLibrary(userId),
        SupabaseSyncService.fetchSubjects(userId),
        SupabaseSyncService.fetchLeaderboard(userId),
      ]);

      if (remoteProfile) {
        setUserProfile(remoteProfile);
      }
      // An empty remote result can mean "this account really has nothing yet",
      // but it can just as easily mean a transient fetch problem that Supabase
      // reported as zero rows instead of a real error. Never let that silently
      // wipe out a local cache that already has data — only accept the remote
      // list when it isn't empty, or when there was nothing local to lose.
      // KEEP THIS GUARD — it's the fix for the original data-loss bug.
      const localTasksNow = DataService.getTasks(userId);
      if (remoteTasks !== null) {
        if (remoteTasks.length > 0 || localTasksNow.length === 0) {
          setTasks(remoteTasks);
          DataService.saveTasks(remoteTasks, userId);
          reconcileMissing('task', userId, localTasksNow, remoteTasks);
        } else {
          console.warn('[Supabase Sync] Remote returned 0 tasks but local cache has data — keeping local cache, skipping overwrite.');
        }
      }
      const localLibNow = DataService.getLibrary(userId);
      if (remoteLib !== null) {
        if (remoteLib.length > 0 || localLibNow.length === 0) {
          setLibraryItems(remoteLib);
          DataService.saveLibrary(remoteLib, userId);
          reconcileMissing('library', userId, localLibNow, remoteLib);
        } else {
          console.warn('[Supabase Sync] Remote returned 0 library items but local cache has data — keeping local cache, skipping overwrite.');
        }
      }
      const localSubjectsNow = DataService.getSubjects(userId);
      if (remoteSubjects !== null) {
        if (remoteSubjects.length > 0 || localSubjectsNow.length === 0) {
          DataService.saveSubjects(remoteSubjects, userId);
          reconcileMissing('subject', userId, localSubjectsNow, remoteSubjects);
        } else {
          console.warn('[Supabase Sync] Remote returned 0 subjects but local cache has data — keeping local cache, skipping overwrite.');
        }
      }
      setRankingPeers(leaderboard);
    } catch (err) {
      console.warn('[Supabase Sync Error]', err);
    }
  };

  const handleRefreshRanking = async () => {
    setRankingPeers(await SupabaseSyncService.fetchLeaderboard(currentUserAccount.id));
  };

  // REALTIME SUBSCRIPTION: Automatic live two-way sync
  useEffect(() => {
    fetchRemoteData(currentUserAccount.id);

    const unsubscribe = SupabaseSyncService.subscribeToRealtime(currentUserAccount.id, {
      onStatusChange: (status) => {
        setIsRealtimeActive(status.connected);
      },
      onTaskUpsert: (task) => {
        setTasks((prev) => {
          const index = prev.findIndex((t) => t.id === task.id);
          let updated: StudyTask[];
          if (index >= 0) {
            updated = [...prev];
            updated[index] = task;
          } else {
            updated = [task, ...prev];
          }
          DataService.saveTasks(updated, currentUserAccount.id);
          return updated;
        });
      },
      onTaskDelete: (taskId) => {
        setTasks((prev) => {
          const updated = prev.filter((t) => t.id !== taskId);
          DataService.saveTasks(updated, currentUserAccount.id);
          return updated;
        });
      },
      onLibraryUpsert: (item) => {
        setLibraryItems((prev) => {
          const index = prev.findIndex((i) => i.id === item.id);
          let updated: LibraryItem[];
          if (index >= 0) {
            updated = [...prev];
            updated[index] = item;
          } else {
            updated = [item, ...prev];
          }
          DataService.saveLibrary(updated, currentUserAccount.id);
          return updated;
        });
      },
      onLibraryDelete: (itemId) => {
        setLibraryItems((prev) => {
          const updated = prev.filter((i) => i.id !== itemId);
          DataService.saveLibrary(updated, currentUserAccount.id);
          return updated;
        });
      },
      onProfileUpdate: (profile) => {
        setUserProfile(profile);
      },
      onSubjectsChange: (subjects) => {
        const localNow = DataService.getSubjects(currentUserAccount.id);
        if (subjects.length > 0 || localNow.length === 0) {
          DataService.saveSubjects(subjects, currentUserAccount.id);
        }
      },
      onReconnected: () => {
        // Anything that changed while the realtime connection was down was
        // missed — catch up with a full re-pull and flush whatever the
        // outbox still owes the cloud.
        fetchRemoteData(currentUserAccount.id);
        SyncQueue.process(currentUserAccount.id);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserAccount.id]);

  const handleManualSyncSupabase = async () => {
    // Emergency-only manual push: everyday sync is automatic via the outbox
    // queue (SyncQueue) — this just forces an immediate full re-sync of
    // everything currently held locally, then pulls the latest back.
    await SyncQueue.enqueue(currentUserAccount.id, 'profile', 'upsert', userProfile);
    for (const t of tasks) {
      await SyncQueue.enqueue(currentUserAccount.id, 'task', 'upsert', t);
    }
    for (const item of libraryItems) {
      await SyncQueue.enqueue(currentUserAccount.id, 'library', 'upsert', item);
    }
    await fetchRemoteData(currentUserAccount.id);
    DataService.addAuditLog('Sincronização Nuvem', 'Sincronização manual com Supabase efetuada', currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  // Helper to add XP and check badge progress
  const awardXP = (amount: number, reason: string) => {
    const updatedProfile = { ...userProfile, xp: userProfile.xp + amount };
    setUserProfile(updatedProfile);
    // Sync immediately so the new XP shows up in the cross-user ranking
    // right away, instead of only after a manual "sync now" click.
    SyncQueue.enqueue(currentUserAccount.id, 'profile', 'upsert', updatedProfile).catch(() => {});

    DataService.addAuditLog('Ganho de XP', `+${amount} XP: ${reason}`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  // 1. Task Operations
  const handleOpenAddTask = (date?: string) => {
    setEditingTask(null);
    setTaskInitialDate(date);
    setEditingOccurrenceDate(undefined);
    setIsTaskEditorOpen(true);
  };

  const handleOpenEditTask = (task: StudyTask, occurrenceDate?: string) => {
    setEditingTask(task);
    setTaskInitialDate(task.date);
    setEditingOccurrenceDate(occurrenceDate || task.date);
    setIsTaskEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'> & { id?: string }) => {
    if (taskData.id) {
      // Update existing
      const updatedItem: StudyTask = { ...(tasks.find((t) => t.id === taskData.id) as StudyTask), ...taskData };
      const updatedList = tasks.map((t) => (t.id === taskData.id ? updatedItem : t));
      setTasks(updatedList);
      DataService.saveTasks(updatedList, currentUserAccount.id);
      DataService.addAuditLog('Edição de Tarefa', `Atualizou o card "${taskData.title}"`, currentUserAccount.id);
      setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));

      const result = await SyncQueue.enqueue(currentUserAccount.id, 'task', 'upsert', updatedItem);
      setToast(
        result.ok
          ? { message: `Alterações em "${taskData.title}" salvas!`, type: 'success' }
          : { message: `"${taskData.title}" salvo localmente — sincronização pendente.`, type: 'error' }
      );
    } else {
      // Create new
      const newTask: StudyTask = {
        ...taskData,
        id: crypto.randomUUID(),
        userId: currentUserAccount.id,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newTask, ...tasks];
      setTasks(updatedList);
      DataService.saveTasks(updatedList, currentUserAccount.id);
      awardXP(25, `Criação do card "${newTask.title}"`);
      DataService.addAuditLog('Criação de Tarefa', `Criou o card de estudos "${newTask.title}"`, currentUserAccount.id);
      setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));

      const result = await SyncQueue.enqueue(currentUserAccount.id, 'task', 'upsert', newTask);
      setToast(
        result.ok
          ? { message: `Card "${newTask.title}" criado com sucesso!`, type: 'success' }
          : { message: `"${newTask.title}" salvo localmente — sincronização pendente.`, type: 'error' }
      );
    }
  };

  const handleDeleteTask = async (taskId: string, scope: 'all' | 'occurrence' = 'all', occurrenceDate?: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    if (scope === 'occurrence' && target.recurrence !== 'none' && occurrenceDate) {
      const updatedExcludedDates = Array.from(new Set([...(target.excludedDates || []), occurrenceDate]));
      const updatedItem: StudyTask = { ...target, excludedDates: updatedExcludedDates };
      const updatedList = tasks.map((t) => (t.id === taskId ? updatedItem : t));
      setTasks(updatedList);
      DataService.saveTasks(updatedList, currentUserAccount.id);
      DataService.addAuditLog(
        'Exclusão de Ocorrência',
        `Removeu a ocorrência de ${occurrenceDate} do card "${target.title}"`,
        currentUserAccount.id
      );
      setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));

      const result = await SyncQueue.enqueue(currentUserAccount.id, 'task', 'upsert', updatedItem);
      setToast(
        result.ok
          ? { message: `Ocorrência de ${formatShortDate(occurrenceDate)} removida.`, type: 'delete' }
          : { message: `Ocorrência removida localmente — sincronização pendente.`, type: 'error' }
      );
      return;
    }

    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    DataService.saveTasks(updated, currentUserAccount.id);
    DataService.addAuditLog('Exclusão de Tarefa', `Removeu o card "${target.title}"`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
    setToast({ message: `Card "${target.title}" excluído.`, type: 'delete' });
    SyncQueue.enqueue(currentUserAccount.id, 'task', 'delete', { id: taskId }).catch(() => {});
  };

  const handleToggleTaskComplete = async (taskId: string, completed: boolean, occurrenceDate?: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const dateKey = occurrenceDate || target.date;
    const isRecurring = target.recurrence !== 'none';

    // A recurring series shares one row, so completion has to be tracked per
    // occurrence date instead of the single `completed` boolean.
    const completedItem: StudyTask = isRecurring
      ? {
          ...target,
          completedDates: completed
            ? Array.from(new Set([...(target.completedDates || []), dateKey]))
            : (target.completedDates || []).filter((d) => d !== dateKey),
        }
      : {
          ...target,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };

    const updated = tasks.map((t) => (t.id === taskId ? completedItem : t));
    setTasks(updated);
    DataService.saveTasks(updated, currentUserAccount.id);
    const syncResultPromise = SyncQueue.enqueue(currentUserAccount.id, 'task', 'upsert', completedItem);

    if (completed) {
      awardXP(35, `Conclusão do estudo "${target.title}"`);
      DataService.addAuditLog('Conclusão de Bloco', `Completou com sucesso "${target.title}" (+35 XP)`, currentUserAccount.id);

      // Check Spaced Repetition trigger
      if (target.reviewScheduled) {
        const nextReview = calculateNextSpacedReviewDate(target.reviewStage || 1, dateKey);
        const newNotif: NotificationItem = {
          id: crypto.randomUUID(),
          userId: currentUserAccount.id,
          title: 'Revisão Espaçada Agendada',
          message: `Próxima revisão de "${target.title}" programada para ${nextReview.nextDate}.`,
          type: 'review',
          date: new Date().toISOString(),
          read: false,
          taskId: target.id,
        };
        const updatedNotifs = [newNotif, ...notifications];
        setNotifications(updatedNotifs);
        DataService.saveNotifications(updatedNotifs, currentUserAccount.id);
      }
    }
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));

    const result = await syncResultPromise;
    if (!result.ok) {
      setToast({ message: `Progresso de "${target.title}" salvo localmente — sincronização pendente.`, type: 'error' });
    }
  };

  const handleScheduleReview = (task: StudyTask) => {
    const updated = tasks.map((t) => {
      if (t.id === task.id) {
        const nextReview = calculateNextSpacedReviewDate(task.reviewStage || 1, task.date);
        const updatedItem = {
          ...t,
          reviewScheduled: true,
          nextReviewDate: nextReview.nextDate,
          reviewStage: nextReview.nextStage,
        };
        SyncQueue.enqueue(currentUserAccount.id, 'task', 'upsert', updatedItem).catch(() => {});
        return updatedItem;
      }
      return t;
    });
    setTasks(updated);
    DataService.saveTasks(updated, currentUserAccount.id);
    awardXP(20, `Agendamento de revisão para "${task.title}"`);
  };

  // 2. Library Operations
  const handleAddLibraryItem = async (itemData: Omit<LibraryItem, 'id' | 'userId' | 'createdAt'>) => {
    const newItem: LibraryItem = {
      ...itemData,
      id: crypto.randomUUID(),
      userId: currentUserAccount.id,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...libraryItems];
    setLibraryItems(updated);
    DataService.saveLibrary(updated, currentUserAccount.id);
    awardXP(30, `Adicionou "${newItem.title}" ao acervo`);
    DataService.addAuditLog('Biblioteca', `Adicionou a obra "${newItem.title}"`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));

    const result = await SyncQueue.enqueue(currentUserAccount.id, 'library', 'upsert', newItem);
    if (!result.ok) {
      setToast({ message: `"${newItem.title}" salvo localmente — sincronização pendente.`, type: 'error' });
    }
  };

  const handleUpdateLibraryItem = async (id: string, updates: Partial<LibraryItem>) => {
    let updatedItemRef: LibraryItem | null = null;
    const updated = libraryItems.map((item) => {
      if (item.id === id) {
        const itemUpdated = { ...item, ...updates };
        updatedItemRef = itemUpdated;
        return itemUpdated;
      }
      return item;
    });
    setLibraryItems(updated);
    DataService.saveLibrary(updated, currentUserAccount.id);
    DataService.addAuditLog('Biblioteca', `Atualizou o progresso da obra`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));

    if (!updatedItemRef) return;
    const result = await SyncQueue.enqueue(currentUserAccount.id, 'library', 'upsert', updatedItemRef);
    if (!result.ok) {
      setToast({ message: `Alteração salva localmente — sincronização pendente.`, type: 'error' });
    }
  };

  const handleDeleteLibraryItem = (id: string) => {
    const updated = libraryItems.filter((item) => item.id !== id);
    setLibraryItems(updated);
    DataService.saveLibrary(updated, currentUserAccount.id);
    SyncQueue.enqueue(currentUserAccount.id, 'library', 'delete', { id }).catch(() => {});
  };


  // 5. Settings & Theming
  const handleSaveProfile = (updates: Partial<UserProfile>) => {
    const newProfile = { ...userProfile, ...updates };
    setUserProfile(newProfile);
    const updatedAccount = DataService.updateUserProfile({
      name: updates.name,
      courseOrGoal: updates.courseOrGoal,
      avatar: updates.avatar,
    });
    setCurrentUserAccount(updatedAccount);
    SyncQueue.enqueue(currentUserAccount.id, 'profile', 'upsert', newProfile).catch(() => {});
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setPreviewPalette(null);
    DataService.saveSettings(newSettings, currentUserAccount.id);
  };

  const handleResetSettingsToDefault = () => {
    const defaultSet: AppSettings = {
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
    setSettings(defaultSet);
    setPreviewPalette(null);
    DataService.saveSettings(defaultSet, currentUserAccount.id);
  };

  const handleTabChange = (tab: MainTabType) => {
    if (tab !== 'settings' && previewPalette) {
      setPreviewPalette(null);
    }
    setActiveTab(tab);
  };

  // 6. Multi-user Auth Handlers
  const handleLogin = async (usernameOrEmail: string, pass: string): Promise<boolean> => {
    const found = DataService.findUserByName(usernameOrEmail);
    if (!found) return false;

    const passwordOk = await verifyPassword(pass, found.passwordHash);
    if (!passwordOk) return false;

    // Transparently upgrade legacy plaintext passwords to a bcrypt hash
    if (found.passwordHash && !isBcryptHash(found.passwordHash)) {
      const newHash = await hashPassword(pass);
      const users = DataService.getUsers().map((u) => (u.id === found.id ? { ...u, passwordHash: newHash } : u));
      DataService.saveUsers(users);
      SupabaseSyncService.updatePasswordHash(found.id, newHash);
    }

    DataService.setAuthenticatedUserId(found.id);
    setIsAuthenticated(true);
    reloadUserData(found.id);
    return true;
  };

  const handleSwitchUser = (userId: string) => {
    DataService.setAuthenticatedUserId(userId);
    setIsAuthenticated(true);
    reloadUserData(userId);
  };

  const handleLogout = () => {
    DataService.logout();
    setIsAuthenticated(false);
  };

  const handleAuthSuccess = (userId: string, account: StoredUserAccount, profile?: UserProfile) => {
    DataService.registerUser(account);
    DataService.setAuthenticatedUserId(userId);
    setCurrentUserAccount(account);
    setAvailableUsers(DataService.getUsers());
    if (profile) {
      setUserProfile(profile);
    } else {
      setUserProfile({
        id: account.id,
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        courseOrGoal: account.courseOrGoal || '',
        level: 1,
        xp: 0,
        streakDays: 0,
        lastActiveDate: formatDateToISO(getBrasiliaDate()),
        targetWeeklyMinutes: 300,
        createdAt: account.createdAt,
      });
    }
    setIsAuthenticated(true);
    reloadUserData(userId);
  };

  // 7. Notifications helpers
  const handleMarkNotificationRead = (notifId: string) => {
    const updated = notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    setNotifications(updated);
    DataService.saveNotifications(updated, currentUserAccount.id);
  };

  const handleClearAllNotifications = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    DataService.saveNotifications(updated, currentUserAccount.id);
  };

  const handleSelectTaskFromNotif = (taskId: string) => {
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      handleOpenEditTask(t);
    }
  };

  // If user is not authenticated, show the initial Registration & Login screen
  if (!isAuthenticated) {
    return (
      <AuthView
        onLoginSuccess={handleAuthSuccess}
        colorPalette={settings.colorPalette}
        themeMode={settings.themeMode}
        onToggleTheme={() =>
          handleSaveSettings({
            ...settings,
            themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
          })
        }
        onSelectPalette={(pal) =>
          handleSaveSettings({
            ...settings,
            colorPalette: pal,
          })
        }
        savedAccounts={availableUsers.filter(
          (u) => u.name && u.name.trim() !== '' && u.id !== 'user-default-1'
        )}
      />
    );
  }

  const activePalette: ColorPalette = previewPalette || settings.colorPalette;
  const themeClasses = getThemeClasses(settings.themeMode, activePalette);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      id="estudatrack-app-root"
      className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${themeClasses.bg} font-sans`}
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Desktop Left Sidebar */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={handleTabChange}
        onOpenNewTaskModal={() => handleOpenAddTask()}
        onOpenWeeklyStats={() => setIsStatsOpen(true)}
        onOpenNotifications={() => handleTabChange('settings')}
        onToggleTheme={() =>
          handleSaveSettings({
            ...settings,
            themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
          })
        }
        onLogout={handleLogout}
        userProfile={userProfile}
        colorPalette={activePalette}
        themeMode={settings.themeMode}
        unreadNotificationsCount={unreadCount}
        isRealtimeActive={isRealtimeActive}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        isOnline={isOnline}
        isSyncingNow={isSyncingNow}
        pendingSyncCount={pendingSyncCount}
        onForceSync={handleForceSync}
      />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Hidden on Desktop) */}
        <Navbar
          user={userProfile}
          colorPalette={activePalette}
          themeMode={settings.themeMode}
          onToggleTheme={() =>
            handleSaveSettings({
              ...settings,
              themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
            })
          }
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenSettings={() => handleTabChange('settings')}
          onLogout={handleLogout}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onClearAllNotifications={handleClearAllNotifications}
          onSelectTaskFromNotif={handleSelectTaskFromNotif}
        />

        {/* Primary Main Content Area */}
        <main
          id="app-main-viewport"
          className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12 transition-all duration-300 ${
            isSidebarCollapsed ? 'max-w-[1700px]' : 'max-w-7xl'
          }`}
        >
          {activeTab === 'agenda' && (
            <AgendaView
              tasks={tasks}
              user={userProfile}
              onAddTask={handleOpenAddTask}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleTaskComplete={handleToggleTaskComplete}
              onScheduleReview={handleScheduleReview}
              onOpenStats={() => setIsStatsOpen(true)}
              colorPalette={activePalette}
              themeMode={settings.themeMode}
            />
          )}

          {activeTab === 'library' && (
            <LibraryView
              items={libraryItems}
              onAddItem={handleAddLibraryItem}
              onUpdateItem={handleUpdateLibraryItem}
              onDeleteItem={handleDeleteLibraryItem}
              colorPalette={activePalette}
              themeMode={settings.themeMode}
              userId={currentUserAccount.id}
            />
          )}

          {activeTab === 'ranking' && (
            <RankingView
              user={userProfile}
              badges={badges}
              peers={rankingPeers}
              onRefresh={handleRefreshRanking}
              colorPalette={activePalette}
              themeMode={settings.themeMode}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={userProfile}
              settings={settings}
              auditLogs={auditLogs}
              tasks={tasks}
              onSaveProfile={handleSaveProfile}
              onSaveSettings={handleSaveSettings}
              onPreviewPalette={(pal) => setPreviewPalette(pal)}
              onResetSettingsToDefault={handleResetSettingsToDefault}
              onManualSyncSupabase={handleManualSyncSupabase}
              onLogout={handleLogout}
              colorPalette={activePalette}
              themeMode={settings.themeMode}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        colorPalette={activePalette}
        themeMode={settings.themeMode}
        unreadNotifsCount={unreadCount}
      />

      {/* Task Editor & Summary Modal */}
      <TaskEditorModal
        task={editingTask}
        isOpen={isTaskEditorOpen}
        onClose={() => setIsTaskEditorOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        colorPalette={activePalette}
        themeMode={settings.themeMode}
        initialDate={taskInitialDate}
        occurrenceDate={editingOccurrenceDate}
        userId={currentUserAccount.id}
      />

      {/* Weekly Stats & Detailed Academic Progress Modal */}
      <WeeklyStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tasks={tasks}
        user={userProfile}
        colorPalette={activePalette}
        themeMode={settings.themeMode}
      />

      {/* Authentication & Multi-user Switch Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={userProfile}
        availableUsers={availableUsers}
        onLogin={handleLogin}
        onSwitchUser={handleSwitchUser}
        colorPalette={activePalette}
        themeMode={settings.themeMode}
      />
    </div>
  );
}
