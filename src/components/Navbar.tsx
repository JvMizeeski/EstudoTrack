import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Flame,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Timer,
  Settings,
} from 'lucide-react';
import { ColorPalette, ThemeMode, UserProfile, NotificationItem } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { calculateLevelFromXP } from '../lib/gamification';

interface NavbarProps {
  user: UserProfile;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onSelectTaskFromNotif?: (taskId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  colorPalette,
  themeMode,
  onToggleTheme,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  notifications,
  onMarkNotificationRead,
  onClearAllNotifications,
  onSelectTaskFromNotif,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;
  const isDark = themeMode === 'dark';
  const unreadNotifs = notifications.filter((n) => !n.read);
  const userLevelInfo = calculateLevelFromXP(user.xp);

  return (
    <header
      id="main-app-header"
      className="md:hidden sticky top-0 z-30 border-b backdrop-blur-md px-4 py-3 transition-colors duration-200"
      style={{
        borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.94)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Mobile Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md font-bold"
            style={{ backgroundColor: pal.previewColor }}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className={`font-bold text-base tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              EstudaTrack
            </span>
          </div>
        </div>

        {/* Right Action Bar for Mobile */}
        <div className="flex items-center gap-2">
          {/* Daily Streak Indicator */}
          <div
            id="mobile-streak-indicator-badge"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border"
            style={{
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.1)',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.4)',
              color: isDark ? '#fbbf24' : '#d97706',
            }}
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{user.streakDays}d</span>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className={`p-2 rounded-xl border relative transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div
                className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl p-3 z-50 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b mb-2 border-slate-700/50">
                  <span className="font-bold text-xs">Notificações</span>
                  {unreadNotifs.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllNotifications}
                      className="text-[10px] text-purple-500 hover:underline cursor-pointer"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-3">Nenhuma notificação.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          onMarkNotificationRead(n.id);
                          if (n.taskId && onSelectTaskFromNotif) onSelectTaskFromNotif(n.taskId);
                          setShowNotifMenu(false);
                        }}
                        className={`p-2 rounded-xl text-xs cursor-pointer ${
                          n.read
                            ? isDark ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-50 text-slate-500'
                            : isDark ? 'bg-purple-950/40 text-slate-100 font-semibold' : 'bg-purple-50 text-purple-900 font-semibold'
                        }`}
                      >
                        <p className="text-[11px] leading-tight">{n.title}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border cursor-pointer ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mobile Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className={`p-2 rounded-xl border cursor-pointer transition-colors ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-rose-400 hover:bg-rose-950/40'
                : 'bg-slate-100 border-slate-200 text-rose-600 hover:bg-rose-50'
            }`}
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
