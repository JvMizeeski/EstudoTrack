import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Flame,
  Award,
  Clock,
  CheckCircle2,
  Sparkles,
  Zap,
  RotateCcw,
  Crown,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Star,
  Target,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  RankingUser,
  Badge,
  UserProfile,
  ColorPalette,
  ThemeMode,
} from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { calculateLevelFromXP } from '../lib/gamification';

interface RankingViewProps {
  user: UserProfile;
  badges: Badge[];
  peers: RankingUser[];
  onRefresh?: () => void | Promise<void>;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const RankingView: React.FC<RankingViewProps> = ({
  user,
  badges,
  peers,
  onRefresh,
  colorPalette,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const [selectedBadgeFilter, setSelectedBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userLevelInfo = calculateLevelFromXP(user.xp);

  // Combine user into leaderboard list
  const currentUserRankingEntry: RankingUser = {
    id: user.id,
    name: user.name + ' (Você)',
    avatar: user.avatar,
    xp: user.xp,
    level: userLevelInfo.level,
    title: userLevelInfo.title,
    weeklyMinutes: 245,
    tasksCompleted: 8,
    streak: user.streakDays,
    isCurrentUser: true,
    positionChange: 1,
  };

  const allRankingUsers = [...peers, currentUserRankingEntry].sort((a, b) => b.xp - a.xp);
  const userRankIndex = allRankingUsers.findIndex((u) => u.isCurrentUser) + 1;

  const top3 = allRankingUsers.slice(0, 3);
  const restUsers = allRankingUsers.slice(3);

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredBadges = badges.filter((b) => {
    if (selectedBadgeFilter === 'unlocked') return b.unlocked;
    if (selectedBadgeFilter === 'locked') return !b.unlocked;
    return true;
  });

  return (
    <div id="ranking-view-container" className="space-y-6">
      {/* 1. TOP USER LEVEL HERO BANNER */}
      <section
        className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-xs"
                style={{ outline: `2px solid ${pal.previewColor}80` }}
              />
              <span
                className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-xs"
                style={{ backgroundColor: pal.previewColor }}
              >
                Nv. {userLevelInfo.level}
              </span>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div>
                <span
                  className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1"
                  style={{
                    backgroundColor: `${pal.previewColor}20`,
                    color: pal.previewColor,
                    border: `1px solid ${pal.previewColor}40`,
                  }}
                >
                  {userLevelInfo.title}
                </span>
                <h1 className={`text-base sm:text-xl font-bold tracking-tight whitespace-nowrap truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {user.name}
                </h1>
              </div>

              {/* Progress to next level bar */}
              <div className="w-full max-w-sm pt-0.5 space-y-1">
                <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Progresso para Nível {userLevelInfo.level + 1}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={`flex-1 rounded-full h-2 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${userLevelInfo.progressPercent}%`,
                        backgroundColor: pal.previewColor,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-extrabold shrink-0" style={{ color: pal.previewColor }}>
                    {userLevelInfo.progressPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={`p-3 rounded-2xl border text-center min-w-[85px] ${
              isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <p className="text-base font-extrabold text-amber-500">{user.streakDays} Dias</p>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sequência</span>
            </div>

            <div className={`p-3 rounded-2xl border text-center min-w-[85px] ${
              isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <Award className="w-4 h-4 mx-auto mb-1" style={{ color: pal.previewColor }} />
              <p className="text-base font-extrabold" style={{ color: pal.previewColor }}>{unlockedBadgesCount}/{badges.length}</p>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Conquistas</span>
            </div>

            <div className={`p-3 rounded-2xl border text-center min-w-[85px] ${
              isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <Zap className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-base font-extrabold text-blue-500">{user.xp}</p>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pontuação</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LEADERBOARD / RANKING ENTRE AMIGOS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className={`font-bold text-sm sm:text-base whitespace-nowrap truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Ranking de Desempenho
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            title="Atualizar lista do ranking"
            className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Podium for Top Players */}
        {top3.length === 1 && (
          <div className="flex justify-center items-end pt-4 pb-2 max-w-xs mx-auto">
            {/* 1st Place (Centered Alone) */}
            <div className="flex flex-col items-center text-center w-36">
              <div className="relative mb-2">
                <Crown className="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2" />
                <img
                  src={top3[0].avatar}
                  alt={top3[0].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-4 ring-amber-400 shadow-md"
                />
                <span className="absolute -top-1.5 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow">
                  1º
                </span>
              </div>
              <p className={`font-extrabold text-xs sm:text-sm truncate max-w-[130px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{top3[0].name.split(' ')[0]}</p>
              <p className="text-xs font-bold text-amber-500">{top3[0].xp} pts</p>
              <div className={`w-full h-24 sm:h-28 mt-2 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center ${
                isDark ? 'bg-amber-950/30' : 'bg-amber-50'
              }`}>
                <Trophy className="w-7 h-7 text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {top3.length === 2 && (
          <div className="flex justify-center items-end gap-6 sm:gap-10 pt-4 pb-2 max-w-md mx-auto">
            {/* 2nd Place */}
            <div className="flex flex-col items-center text-center w-28 sm:w-32">
              <div className="relative mb-2">
                <img
                  src={top3[1].avatar}
                  alt={top3[1].name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-slate-400"
                />
                <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow">
                  2º
                </span>
              </div>
              <p className={`font-bold text-xs truncate max-w-[110px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{top3[1].name.split(' ')[0]}</p>
              <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{top3[1].xp} pts</p>
              <div className={`w-full h-16 sm:h-20 mt-2 rounded-t-2xl border-t-2 border-slate-400 flex items-center justify-center ${
                isDark ? 'bg-slate-800/80' : 'bg-slate-100'
              }`}>
                <Medal className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center text-center w-32 sm:w-36">
              <div className="relative mb-2">
                <Crown className="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2" />
                <img
                  src={top3[0].avatar}
                  alt={top3[0].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-4 ring-amber-400 shadow-md"
                />
                <span className="absolute -top-1.5 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow">
                  1º
                </span>
              </div>
              <p className={`font-extrabold text-xs sm:text-sm truncate max-w-[120px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{top3[0].name.split(' ')[0]}</p>
              <p className="text-xs font-bold text-amber-500">{top3[0].xp} pts</p>
              <div className={`w-full h-24 sm:h-28 mt-2 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center ${
                isDark ? 'bg-amber-950/30' : 'bg-amber-50'
              }`}>
                <Trophy className="w-7 h-7 text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {top3.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-4 pb-2 items-end max-w-xl mx-auto">
            {/* 2nd Place */}
            <div className="flex flex-col items-center text-center order-1">
              <div className="relative mb-2">
                <img
                  src={top3[1].avatar}
                  alt={top3[1].name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-slate-400"
                />
                <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow">
                  2º
                </span>
              </div>
              <p className={`font-bold text-xs truncate max-w-[90px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{top3[1].name.split(' ')[0]}</p>
              <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{top3[1].xp} pts</p>
              <div className={`w-full h-16 sm:h-20 mt-2 rounded-t-2xl border-t-2 border-slate-400 flex items-center justify-center ${
                isDark ? 'bg-slate-800/80' : 'bg-slate-100'
              }`}>
                <Medal className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* 1st Place (Winner) */}
            <div className="flex flex-col items-center text-center order-2">
              <div className="relative mb-2">
                <Crown className="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2" />
                <img
                  src={top3[0].avatar}
                  alt={top3[0].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-4 ring-amber-400 shadow-md"
                />
                <span className="absolute -top-1.5 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow">
                  1º
                </span>
              </div>
              <p className={`font-extrabold text-xs sm:text-sm truncate max-w-[110px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{top3[0].name.split(' ')[0]}</p>
              <p className="text-xs font-bold text-amber-500">{top3[0].xp} pts</p>
              <div className={`w-full h-24 sm:h-28 mt-2 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center ${
                isDark ? 'bg-amber-950/30' : 'bg-amber-50'
              }`}>
                <Trophy className="w-7 h-7 text-amber-500" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center text-center order-3">
              <div className="relative mb-2">
                <img
                  src={top3[2].avatar}
                  alt={top3[2].name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-amber-700"
                />
                <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-amber-700 text-amber-100 font-extrabold text-[11px] flex items-center justify-center shadow">
                  3º
                </span>
              </div>
              <p className={`font-bold text-xs truncate max-w-[90px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{top3[2].name.split(' ')[0]}</p>
              <p className="text-[11px] font-bold text-amber-600">{top3[2].xp} pts</p>
              <div className={`w-full h-12 sm:h-16 mt-2 rounded-t-2xl border-t-2 border-amber-700 flex items-center justify-center ${
                isDark ? 'bg-amber-900/20' : 'bg-amber-50/60'
              }`}>
                <Medal className="w-5 h-5 text-amber-700" />
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className={`divide-y text-xs ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {allRankingUsers.map((rankUser, idx) => (
              <div
                key={rankUser.id}
                className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  rankUser.isCurrentUser
                    ? isDark ? 'font-bold' : 'font-bold'
                    : isDark
                    ? 'hover:bg-slate-800/60'
                    : 'hover:bg-slate-50'
                }`}
                style={rankUser.isCurrentUser ? {
                  backgroundColor: `${pal.previewColor}14`,
                  borderLeft: `4px solid ${pal.previewColor}`,
                } : {}}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-5 text-center font-extrabold text-xs ${idx < 3 ? 'text-amber-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    #{idx + 1}
                  </span>

                  <img
                    src={rankUser.avatar}
                    alt={rankUser.name}
                    className="w-9 h-9 rounded-xl object-cover shrink-0"
                  />

                  <div className="min-w-0">
                    <p className={`font-bold text-xs sm:text-sm truncate flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      <span>{rankUser.name}</span>
                      {rankUser.isCurrentUser && (
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded text-white font-bold"
                          style={{ backgroundColor: pal.previewColor }}
                        >
                          Você
                        </span>
                      )}
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{rankUser.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Tempo Semanal</span>
                    <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{rankUser.weeklyMinutes} min</span>
                  </div>

                  <div>
                    <span className="text-xs sm:text-sm font-extrabold block" style={{ color: pal.previewColor }}>{rankUser.xp} pts</span>
                    <span className={`text-[10px] flex items-center justify-end gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Flame className="w-3 h-3 text-amber-500" />
                      {rankUser.streak} dias
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. COLLECTIBLE BADGES GALLERY (Conquistas padrão de progresso) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: pal.previewColor }} />
            <h2 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Conquistas & Badges ({unlockedBadgesCount}/{badges.length})</h2>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unlocked', label: 'Desbloqueadas' },
              { id: 'locked', label: 'Bloqueadas' },
            ].map((tab) => {
              const isSelected = selectedBadgeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedBadgeFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-xs font-bold'
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={isSelected ? { backgroundColor: pal.previewColor } : {}}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border text-center flex flex-col justify-between transition-all ${
                badge.unlocked
                  ? isDark
                    ? 'bg-slate-800/80 shadow-xs'
                    : 'shadow-xs'
                  : isDark
                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                  : 'bg-slate-100 border-slate-200 opacity-60'
              }`}
              style={badge.unlocked ? {
                borderColor: `${pal.previewColor}50`,
                backgroundColor: isDark ? undefined : `${pal.previewColor}08`,
              } : {}}
            >
              <div>
                <div
                  className={`w-11 h-11 mx-auto rounded-2xl flex items-center justify-center mb-2.5 shadow-xs ${
                    badge.unlocked
                      ? 'text-white'
                      : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
                  }`}
                  style={badge.unlocked ? { backgroundColor: pal.previewColor } : {}}
                >
                  <Award className="w-5 h-5" />
                </div>

                <h3 className={`font-bold text-xs mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{badge.title}</h3>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{badge.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
                <span className="font-bold text-amber-500 text-[11px]">+{badge.xpReward} pts</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    badge.unlocked
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {badge.unlocked ? 'Conquistado' : `${badge.currentProgress}/${badge.maxProgress}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
