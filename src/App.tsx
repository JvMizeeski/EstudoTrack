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
import { calculateNextSpacedReviewDate, formatDateToISO, getBrasiliaDate } from './lib/dateUtils';
import { INITIAL_RANKING_PEERS } from './lib/gamification';
import { SupabaseSyncService } from './lib/supabaseSync';

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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authId = DataService.getAuthenticatedUserId();
    return Boolean(authId);
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

  const fetchRemoteData = async (userId: string) => {
    try {
      const [remoteProfile, remoteTasks, remoteLib] = await Promise.all([
        SupabaseSyncService.fetchProfile(userId),
        SupabaseSyncService.fetchTasks(userId),
        SupabaseSyncService.fetchLibrary(userId),
      ]);

      if (remoteProfile) {
        setUserProfile(remoteProfile);
      }
      if (remoteTasks !== null) {
        setTasks(remoteTasks);
        DataService.saveTasks(remoteTasks, userId);
      }
      if (remoteLib !== null) {
        setLibraryItems(remoteLib);
        DataService.saveLibrary(remoteLib, userId);
      }
    } catch (err) {
      console.warn('[Supabase Sync Error]', err);
    }
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
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserAccount.id]);

  const handleManualSyncSupabase = async () => {
    // Sync Profile
    await SupabaseSyncService.syncProfile(userProfile);
    // Sync all local tasks
    for (const t of tasks) {
      await SupabaseSyncService.syncTask(t);
    }
    // Sync library items
    for (const item of libraryItems) {
      await SupabaseSyncService.syncLibraryItem(item);
    }
    // Fetch latest back
    await fetchRemoteData(currentUserAccount.id);
    DataService.addAuditLog('Sincronização Nuvem', 'Sincronização com Supabase efetuada', currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  // Helper to add XP and check badge progress
  const awardXP = (amount: number, reason: string) => {
    setUserProfile((prev) => {
      const newXP = prev.xp + amount;
      return { ...prev, xp: newXP };
    });

    DataService.addAuditLog('Ganho de XP', `+${amount} XP: ${reason}`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  // 1. Task Operations
  const handleOpenAddTask = (date?: string) => {
    setEditingTask(null);
    setTaskInitialDate(date);
    setIsTaskEditorOpen(true);
  };

  const handleOpenEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setTaskInitialDate(task.date);
    setIsTaskEditorOpen(true);
  };

  const handleSaveTask = (taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'> & { id?: string }) => {
    if (taskData.id) {
      // Update existing
      const updatedList = tasks.map((t) => {
        if (t.id === taskData.id) {
          const updatedItem = {
            ...t,
            ...taskData,
          } as StudyTask;
          SupabaseSyncService.syncTask(updatedItem);
          return updatedItem;
        }
        return t;
      });
      setTasks(updatedList);
      DataService.saveTasks(updatedList, currentUserAccount.id);
      DataService.addAuditLog('Edição de Tarefa', `Atualizou o card "${taskData.title}"`, currentUserAccount.id);
    } else {
      // Create new
      const newTask: StudyTask = {
        ...taskData,
        id: 'task-' + Date.now(),
        userId: currentUserAccount.id,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newTask, ...tasks];
      setTasks(updatedList);
      DataService.saveTasks(updatedList, currentUserAccount.id);
      SupabaseSyncService.syncTask(newTask);
      awardXP(25, `Criação do card "${newTask.title}"`);
      DataService.addAuditLog('Criação de Tarefa', `Criou o card de estudos "${newTask.title}"`, currentUserAccount.id);
    }
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    DataService.saveTasks(updated, currentUserAccount.id);
    SupabaseSyncService.deleteTask(taskId);
    if (target) {
      DataService.addAuditLog('Exclusão de Tarefa', `Removeu o card "${target.title}"`, currentUserAccount.id);
      setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
    }
  };

  const handleToggleTaskComplete = (taskId: string, completed: boolean) => {
    let completedItem: StudyTask | undefined;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        completedItem = {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
        SupabaseSyncService.syncTask(completedItem);
        return completedItem;
      }
      return t;
    });
    setTasks(updated);
    DataService.saveTasks(updated, currentUserAccount.id);

    const target = tasks.find((t) => t.id === taskId);
    if (completed && target) {
      awardXP(35, `Conclusão do estudo "${target.title}"`);
      DataService.addAuditLog('Conclusão de Bloco', `Completou com sucesso "${target.title}" (+35 XP)`, currentUserAccount.id);

      // Check Spaced Repetition trigger
      if (target.reviewScheduled) {
        const nextReview = calculateNextSpacedReviewDate(target.reviewStage || 1, target.date);
        const newNotif: NotificationItem = {
          id: 'notif-' + Date.now(),
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
  };

  const handleScheduleReview = (task: StudyTask) => {
    const nextReview = calculateNextSpacedReviewDate(task.reviewStage || 1, task.date);
    const updated = tasks.map((t) => {
      if (t.id === task.id) {
        const updatedItem = {
          ...t,
          reviewScheduled: true,
          nextReviewDate: nextReview.nextDate,
          reviewStage: nextReview.nextStage,
        };
        SupabaseSyncService.syncTask(updatedItem);
        return updatedItem;
      }
      return t;
    });
    setTasks(updated);
    DataService.saveTasks(updated, currentUserAccount.id);
    awardXP(20, `Agendamento de revisão para "${task.title}"`);
  };

  // 2. Library Operations
  const handleAddLibraryItem = (itemData: Omit<LibraryItem, 'id' | 'userId' | 'createdAt'>) => {
    const newItem: LibraryItem = {
      ...itemData,
      id: 'lib-' + Date.now(),
      userId: currentUserAccount.id,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...libraryItems];
    setLibraryItems(updated);
    DataService.saveLibrary(updated, currentUserAccount.id);
    SupabaseSyncService.syncLibraryItem(newItem);
    awardXP(30, `Adicionou "${newItem.title}" ao acervo`);
    DataService.addAuditLog('Biblioteca', `Adicionou a obra "${newItem.title}"`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  const handleUpdateLibraryItem = (id: string, updates: Partial<LibraryItem>) => {
    const updated = libraryItems.map((item) => {
      if (item.id === id) {
        const itemUpdated = { ...item, ...updates };
        SupabaseSyncService.syncLibraryItem(itemUpdated);
        return itemUpdated;
      }
      return item;
    });
    setLibraryItems(updated);
    DataService.saveLibrary(updated, currentUserAccount.id);
    DataService.addAuditLog('Biblioteca', `Atualizou o progresso da obra`, currentUserAccount.id);
    setAuditLogs(DataService.getAuditLogs(currentUserAccount.id));
  };

  const handleDeleteLibraryItem = (id: string) => {
    const updated = libraryItems.filter((item) => item.id !== id);
    setLibraryItems(updated);
    DataService.saveLibrary(updated, currentUserAccount.id);
    SupabaseSyncService.deleteLibraryItem(id);
  };

  // 3. Gamification Ranking
  const handleAddFriendToRanking = (friendName: string) => {
    const newPeer: RankingUser = {
      id: 'peer-' + Date.now(),
      name: friendName,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      xp: 850,
      level: 4,
      title: 'Analista do Saber',
      weeklyMinutes: 200,
      tasksCompleted: 6,
      streak: 3,
      positionChange: 0,
    };
    setRankingPeers((prev) => [...prev, newPeer]);
    awardXP(15, `Conectou-se com ${friendName}`);
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
    SupabaseSyncService.syncProfile(newProfile);
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

  const handleResetAllData = () => {
    DataService.resetAllDataForUser(currentUserAccount.id);
    reloadUserData(currentUserAccount.id);
  };

  // 6. Multi-user Auth Handlers
  const handleLogin = (usernameOrEmail: string, pass: string): boolean => {
    const found = DataService.findUserByName(usernameOrEmail);
    if (found) {
      DataService.setAuthenticatedUserId(found.id);
      setIsAuthenticated(true);
      reloadUserData(found.id);
      return true;
    }
    return false;
  };

  const handleRegister = async (name: string, email: string, pass: string, course: string) => {
    const newUserId = 'user-' + Date.now();
    const newAccount: StoredUserAccount = {
      id: newUserId,
      name,
      email: email || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@estudotrack.local`,
      passwordHash: pass,
      avatar: '',
      courseOrGoal: course,
      createdAt: new Date().toISOString(),
    };
    DataService.registerUser(newAccount);
    setAvailableUsers(DataService.getUsers());
    setIsAuthenticated(true);
    reloadUserData(newUserId);
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

  const handleDeleteAccount = async () => {
    const targetUserId = currentUserAccount.id;
    // 1. Delete from Supabase cloud
    await SupabaseSyncService.deleteUserAccount(targetUserId);
    // 2. Delete locally
    DataService.deleteUserAccount(targetUserId);
    // 3. Clear auth and state
    const remainingUsers = DataService.getUsers();
    setAvailableUsers(remainingUsers);
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
            />
          )}

          {activeTab === 'ranking' && (
            <RankingView
              user={userProfile}
              badges={badges}
              peers={rankingPeers}
              onAddFriend={handleAddFriendToRanking}
              colorPalette={activePalette}
              themeMode={settings.themeMode}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={userProfile}
              settings={settings}
              auditLogs={auditLogs}
              onSaveProfile={handleSaveProfile}
              onSaveSettings={handleSaveSettings}
              onPreviewPalette={(pal) => setPreviewPalette(pal)}
              onResetSettingsToDefault={handleResetSettingsToDefault}
              onResetAllData={handleResetAllData}
              onDeleteAccount={handleDeleteAccount}
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
        onRegister={handleRegister}
        onSwitchUser={handleSwitchUser}
        colorPalette={activePalette}
        themeMode={settings.themeMode}
      />
    </div>
  );
}
