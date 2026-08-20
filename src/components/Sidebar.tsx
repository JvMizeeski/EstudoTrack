import React from 'react';
import {
  Calendar,
  BookOpen,
  Trophy,
  Settings,
  Plus,
  Bell,
  Sun,
  Moon,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { UserProfile, ColorPalette, ThemeMode } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { MainTabType } from './NavigationTabs';

interface SidebarProps {
  currentTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  onOpenNewTaskModal: () => void;
  onOpenWeeklyStats?: () => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  onLogout?: () => void;
  userProfile: UserProfile;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  unreadNotificationsCount: number;
  isRealtimeActive?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewTaskModal,
  onOpenNotifications,
  onToggleTheme,
  onLogout,
  userProfile,
  colorPalette,
  themeMode,
  unreadNotificationsCount,
  isRealtimeActive = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const navItems = [
    {
      id: 'agenda' as MainTabType,
      label: 'Agenda & Estudos',
      icon: Calendar,
    },
    {
      id: 'library' as MainTabType,
      label: 'Biblioteca',
      icon: BookOpen,
    },
    {
      id: 'ranking' as MainTabType,
      label: 'Ranking & Conquistas',
      icon: Trophy,
    },
    {
      id: 'settings' as MainTabType,
      label: 'Configurações',
      icon: Settings,
    },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r transition-all duration-300 z-20 ${
        isCollapsed ? 'w-20 p-3' : 'w-64 lg:w-72 p-4'
      } ${
        isDark
          ? `${pal.darkSidebar} ${pal.darkBorder} text-slate-100`
          : `${pal.lightSidebar} ${pal.lightBorder} text-slate-800`
      }`}
    >
      {/* Top Section */}
      <div className="space-y-5">
        {/* Brand & Collapse/Expand Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between px-2 pt-1'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-bold shrink-0"
              style={{ backgroundColor: pal.previewColor }}
              title="EstudaTrack"
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className={`font-black text-lg tracking-tight block truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  EstudaTrack
                </span>
                <p className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Organizador de Estudos
                </p>
              </div>
            )}
          </div>

          {/* Collapse/Expand Action Button */}
          {onToggleCollapse && (
            <button
              type="button"
              id="sidebar-toggle-collapse-btn"
              onClick={onToggleCollapse}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700/70 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Quick Create Button */}
        <div className={isCollapsed ? 'flex justify-center' : 'px-1'}>
          {isCollapsed ? (
            <button
              type="button"
              id="sidebar-create-task-btn-collapsed"
              onClick={onOpenNewTaskModal}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
              style={{ backgroundColor: pal.previewColor }}
              title="Novo Card de Estudo"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              id="sidebar-create-task-btn"
              onClick={onOpenNewTaskModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl font-bold text-sm text-white shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
              style={{ backgroundColor: pal.previewColor }}
            >
              <Plus className="w-4 h-4" />
              <span>Novo Card de Estudo</span>
            </button>
          )}
        </div>

        {/* Primary Navigation Items */}
        <nav className={`space-y-1.5 ${isCollapsed ? 'flex flex-col items-center' : 'px-1'}`}>
          {!isCollapsed && (
            <div className={`px-2 text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              Navegação
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                type="button"
                onClick={() => onTabChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`transition-all cursor-pointer ${
                  isCollapsed
                    ? `w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isActive
                          ? isDark
                            ? 'bg-slate-800 shadow-xs border border-slate-700/60'
                            : 'bg-white shadow-xs border border-slate-200'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                      }`
                    : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-left ${
                        isActive
                          ? isDark
                            ? 'bg-slate-800 text-white shadow-xs border border-slate-700/60'
                            : 'bg-white text-slate-900 shadow-xs border border-slate-200 font-bold'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                      }`
                }`}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0"
                  style={{
                    backgroundColor: isActive ? `${pal.previewColor}25` : 'transparent',
                    color: isActive ? pal.previewColor : undefined,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="leading-tight truncate">{item.label}</div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Settings Controls */}
      <div
        className="pt-3 border-t"
        style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)' }}
      >
        {isCollapsed ? (
          /* Collapsed Bottom Controls */
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onTabChange('settings')}
              title={`${userProfile.name} - Configurações`}
              className="cursor-pointer"
            >
              <img
                src={userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={userProfile.name}
                className="w-8 h-8 rounded-xl object-cover"
                style={{ outline: `1.5px solid ${pal.previewColor}80` }}
              />
            </button>

            <button
              type="button"
              id="sidebar-notifications-btn-collapsed"
              onClick={onOpenNotifications}
              className={`relative p-2 rounded-xl cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              type="button"
              id="sidebar-theme-toggle-btn-collapsed"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl cursor-pointer ${
                isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={isDark ? 'Mudar para Modo Claro Pastel' : 'Mudar para Modo Noturno'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {onLogout && (
              <button
                type="button"
                id="sidebar-logout-btn-collapsed"
                onClick={onLogout}
                className={`p-2 rounded-xl cursor-pointer transition-colors ${
                  isDark
                    ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                    : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                }`}
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* Expanded Bottom User Card */
          <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div
              onClick={() => onTabChange('settings')}
              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2"
              title="Ver perfil e configurações"
            >
              <img
                src={userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={userProfile.name}
                className="w-8 h-8 rounded-xl object-cover shrink-0"
                style={{ outline: `1.5px solid ${pal.previewColor}80` }}
              />
              <div className="truncate">
                <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  {userProfile.name}
                </p>
                <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                  {userProfile.courseOrGoal || 'Estudante'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                id="sidebar-notifications-btn"
                onClick={onOpenNotifications}
                className={`relative p-1.5 rounded-xl cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Notificações"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                type="button"
                id="sidebar-theme-toggle-btn"
                onClick={onToggleTheme}
                className={`p-1.5 rounded-xl cursor-pointer ${
                  isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title={isDark ? 'Mudar para Modo Claro Pastel' : 'Mudar para Modo Noturno'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {onLogout && (
                <button
                  type="button"
                  id="sidebar-logout-btn"
                  onClick={onLogout}
                  className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
                    isDark
                      ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                      : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
