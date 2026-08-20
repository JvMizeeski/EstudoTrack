import React from 'react';
import {
  Calendar,
  BookOpen,
  Trophy,
  Settings,
} from 'lucide-react';
import { ColorPalette, ThemeMode } from '../types';
import { COLOR_PALETTES } from '../lib/theme';

export type MainTabType = 'agenda' | 'library' | 'ranking' | 'settings';

interface NavigationTabsProps {
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  unreadNotifsCount?: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  colorPalette,
  themeMode,
  unreadNotifsCount = 0,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const tabs = [
    {
      id: 'agenda' as MainTabType,
      label: 'Agenda & Estudos',
      shortLabel: 'Agenda',
      icon: Calendar,
    },
    {
      id: 'library' as MainTabType,
      label: 'Biblioteca',
      shortLabel: 'Biblioteca',
      icon: BookOpen,
    },
    {
      id: 'ranking' as MainTabType,
      label: 'Ranking & Conquistas',
      shortLabel: 'Ranking',
      icon: Trophy,
    },
    {
      id: 'settings' as MainTabType,
      label: 'Configurações',
      shortLabel: 'Ajustes',
      icon: Settings,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-2 py-2 safe-area-pb"
      style={{
        borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)',
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.96)',
      }}
    >
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'font-bold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{
                color: isActive ? pal.previewColor : undefined,
              }}
            >
              <div className="relative">
                <div className={`p-1 rounded-lg ${isActive ? 'scale-110' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {tab.id === 'settings' && unreadNotifsCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: pal.previewColor }}
                  />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
