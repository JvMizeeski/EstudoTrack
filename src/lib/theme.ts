import { ColorPalette, ThemeMode } from '../types';

export interface PaletteConfig {
  id: ColorPalette;
  name: string;
  description: string;
  previewColor: string;
  previewSecondary: string;
  gradientClass: string;
  badgeBg: string;
  badgeText: string;
  primaryButton: string;
  primaryHover: string;
  accentText: string;
  accentTextDark: string;
  accentBg: string;
  glowColor: string;
  ringColor: string;
  borderColor: string;
  subtleBgLight: string;
  subtleBgDark: string;
  // Layout themes
  darkBg: string;
  darkSidebar: string;
  darkCard: string;
  darkBorder: string;
  lightBg: string;
  lightSidebar: string;
  lightCard: string;
  lightBorder: string;
}

export const COLOR_PALETTES: Record<ColorPalette, PaletteConfig> = {
  purple: {
    id: 'purple',
    name: 'Roxo Noturno (Padrão)',
    description: 'Tons profundos de violeta e ametista para imersão e foco total.',
    previewColor: '#9333ea',
    previewSecondary: '#7e22ce',
    gradientClass: 'from-purple-600 to-indigo-800',
    badgeBg: 'bg-purple-500/20 border-purple-500/30',
    badgeText: 'text-purple-300 dark:text-purple-300',
    primaryButton: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30',
    primaryHover: 'hover:bg-purple-500/10',
    accentText: 'text-purple-600 dark:text-purple-400',
    accentTextDark: 'text-purple-400',
    accentBg: 'bg-purple-600',
    glowColor: 'shadow-purple-500/20',
    ringColor: 'focus:ring-purple-500 focus:border-purple-500',
    borderColor: 'border-purple-500/30',
    subtleBgLight: 'bg-purple-50 text-purple-800 border-purple-200',
    subtleBgDark: 'bg-purple-950/40 text-purple-300 border-purple-700/50',
    darkBg: 'bg-[#0F172A]',
    darkSidebar: 'bg-[#131D33]',
    darkCard: 'bg-[#1E293B]',
    darkBorder: 'border-slate-700/60',
    lightBg: 'bg-[#F8FAFC]',
    lightSidebar: 'bg-[#F1F5F9]',
    lightCard: 'bg-[#FFFFFF]',
    lightBorder: 'border-slate-200',
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verde revigorante e menta para clareza mental e produtividade serena.',
    previewColor: '#059669',
    previewSecondary: '#047857',
    gradientClass: 'from-emerald-600 to-teal-800',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/30',
    badgeText: 'text-emerald-300 dark:text-emerald-300',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30',
    primaryHover: 'hover:bg-emerald-500/10',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentTextDark: 'text-emerald-400',
    accentBg: 'bg-emerald-600',
    glowColor: 'shadow-emerald-500/20',
    ringColor: 'focus:ring-emerald-500 focus:border-emerald-500',
    borderColor: 'border-emerald-500/30',
    subtleBgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    subtleBgDark: 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50',
    darkBg: 'bg-[#061A14]',
    darkSidebar: 'bg-[#0B231D]',
    darkCard: 'bg-[#0F2F27]',
    darkBorder: 'border-emerald-900/60',
    lightBg: 'bg-[#F2F9F5]',
    lightSidebar: 'bg-[#E6F4EC]',
    lightCard: 'bg-[#FFFFFF]',
    lightBorder: 'border-emerald-200/80',
  },
  indigo: {
    id: 'indigo',
    name: 'Oceano Índigo',
    description: 'Azul e ciano modernos para organização analítica e estudos profundos.',
    previewColor: '#2563eb',
    previewSecondary: '#1d4ed8',
    gradientClass: 'from-blue-600 to-indigo-800',
    badgeBg: 'bg-blue-500/20 border-blue-500/30',
    badgeText: 'text-blue-300 dark:text-blue-300',
    primaryButton: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30',
    primaryHover: 'hover:bg-blue-500/10',
    accentText: 'text-blue-600 dark:text-blue-400',
    accentTextDark: 'text-blue-400',
    accentBg: 'bg-blue-600',
    glowColor: 'shadow-blue-500/20',
    ringColor: 'focus:ring-blue-500 focus:border-blue-500',
    borderColor: 'border-blue-500/30',
    subtleBgLight: 'bg-blue-50 text-blue-800 border-blue-200',
    subtleBgDark: 'bg-blue-950/40 text-blue-300 border-blue-700/50',
    darkBg: 'bg-[#0A1128]',
    darkSidebar: 'bg-[#0F1A3A]',
    darkCard: 'bg-[#14234B]',
    darkBorder: 'border-blue-900/60',
    lightBg: 'bg-[#F0F6FC]',
    lightSidebar: 'bg-[#E3EFFB]',
    lightCard: 'bg-[#FFFFFF]',
    lightBorder: 'border-blue-200/80',
  },
  amber: {
    id: 'amber',
    name: 'Âmbar Crepúsculo',
    description: 'Tons quentes de âmbar e bronze para estímulo visual e dinamismo.',
    previewColor: '#d97706',
    previewSecondary: '#b45309',
    gradientClass: 'from-amber-600 to-orange-800',
    badgeBg: 'bg-amber-500/20 border-amber-500/30',
    badgeText: 'text-amber-300 dark:text-amber-300',
    primaryButton: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30',
    primaryHover: 'hover:bg-amber-500/10',
    accentText: 'text-amber-600 dark:text-amber-400',
    accentTextDark: 'text-amber-400',
    accentBg: 'bg-amber-600',
    glowColor: 'shadow-amber-500/20',
    ringColor: 'focus:ring-amber-500 focus:border-amber-500',
    borderColor: 'border-amber-500/30',
    subtleBgLight: 'bg-amber-50 text-amber-800 border-amber-200',
    subtleBgDark: 'bg-amber-950/40 text-amber-300 border-amber-700/50',
    darkBg: 'bg-[#18120C]',
    darkSidebar: 'bg-[#231A10]',
    darkCard: 'bg-[#2D2216]',
    darkBorder: 'border-amber-900/60',
    lightBg: 'bg-[#FAF7F2]',
    lightSidebar: 'bg-[#F2ECE1]',
    lightCard: 'bg-[#FFFFFF]',
    lightBorder: 'border-amber-200/80',
  },
};

export function getThemeClasses(mode: ThemeMode, palette: ColorPalette) {
  const isDark = mode === 'dark';
  const pal = COLOR_PALETTES[palette] || COLOR_PALETTES.purple;

  return {
    isDark,
    palette: pal,
    bg: isDark ? `${pal.darkBg} text-slate-100` : `${pal.lightBg} text-slate-900`,
    sidebarBg: isDark ? `${pal.darkSidebar} ${pal.darkBorder} text-slate-100` : `${pal.lightSidebar} ${pal.lightBorder} text-slate-800`,
    cardBg: isDark
      ? `${pal.darkCard} ${pal.darkBorder} text-slate-100 shadow-lg`
      : `${pal.lightCard} ${pal.lightBorder} text-slate-900 shadow-sm`,
    cardSubtle: isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-100/90 border-slate-200',
    inputBg: isDark
      ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
    border: isDark ? pal.darkBorder : pal.lightBorder,
    borderHover: isDark ? 'hover:border-slate-500' : 'hover:border-slate-400',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
    textSecondary: isDark ? 'text-slate-300' : 'text-slate-700',
    navBg: isDark
      ? `${pal.darkSidebar}/95 ${pal.darkBorder} backdrop-blur-md`
      : `${pal.lightSidebar}/95 ${pal.lightBorder} backdrop-blur-md shadow-xs`,
    modalOverlay: 'bg-black/75 backdrop-blur-xs',
    dropdownBg: isDark ? `${pal.darkCard} ${pal.darkBorder} shadow-2xl` : `bg-white ${pal.lightBorder} shadow-xl`,
  };
}

export const DEFAULT_SUBJECT_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#64748b', // Slate
];

export const SUBJECT_PRESETS = [
  { name: 'Direito Constitucional', color: '#8b5cf6' },
  { name: 'Cálculo e Álgebra', color: '#3b82f6' },
  { name: 'Estrutura de Dados', color: '#10b981' },
  { name: 'Língua Portuguesa', color: '#ec4899' },
  { name: 'Administração Geral', color: '#f59e0b' },
  { name: 'Física Clássica', color: '#06b6d4' },
];
