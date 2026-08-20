import React, { useEffect } from 'react';
import {
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  PieChart,
  Award,
  BookOpen,
  Download,
  Share2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { StudyTask, ColorPalette, ThemeMode, UserProfile } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { formatDuration, getWeekDays } from '../lib/dateUtils';

interface WeeklyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: StudyTask[];
  user: UserProfile;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const WeeklyStatsModal: React.FC<WeeklyStatsModalProps> = ({
  isOpen,
  onClose,
  tasks,
  user,
  colorPalette,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const weekDays = getWeekDays();
  const weekIsoSet = new Set(weekDays.map((d) => d.iso));

  // Filter tasks in current week
  const weekTasks = tasks.filter((t) => weekIsoSet.has(t.date));

  // Compute daily minutes
  const dailyMinutesMap: Record<string, { total: number; completed: number }> = {};
  weekDays.forEach((d) => {
    dailyMinutesMap[d.iso] = { total: 0, completed: 0 };
  });

  let totalPlannedMinutes = 0;
  let totalCompletedMinutes = 0;
  let totalCompletedTasksCount = 0;

  // Subject breakdown
  const subjectMinutesMap: Record<string, { minutes: number; color: string; count: number }> = {};

  weekTasks.forEach((t) => {
    const mins = t.durationMinutes || 45;
    totalPlannedMinutes += mins;

    if (!subjectMinutesMap[t.subject]) {
      subjectMinutesMap[t.subject] = { minutes: 0, color: t.categoryColor, count: 0 };
    }
    subjectMinutesMap[t.subject].minutes += mins;
    subjectMinutesMap[t.subject].count += 1;

    if (dailyMinutesMap[t.date]) {
      dailyMinutesMap[t.date].total += mins;
      if (t.completed) {
        dailyMinutesMap[t.date].completed += mins;
      }
    }

    if (t.completed) {
      totalCompletedMinutes += mins;
      totalCompletedTasksCount += 1;
    }
  });

  const completionRate = weekTasks.length > 0
    ? Math.round((totalCompletedTasksCount / weekTasks.length) * 100)
    : 0;

  const maxDailyMinutes = Math.max(120, ...Object.values(dailyMinutesMap).map((d) => d.total));

  const sortedSubjects = Object.entries(subjectMinutesMap).sort(
    (a, b) => b[1].minutes - a[1].minutes
  );

  return (
    <div
      id="weekly-stats-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="weekly-stats-container"
        className={`relative w-full max-w-3xl rounded-3xl border p-5 sm:p-7 shadow-2xl my-3 sm:my-8 transition-all ${
          isDark ? 'bg-[#1E293B] border-slate-700/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b mb-6" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
              style={{ backgroundColor: pal.previewColor }}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Relatório de Desempenho Semanal</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Estatísticas consolidadas e análise de rendimento acadêmico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Highlight Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Tempo Estudado
            </span>
            <p className="text-xl font-extrabold tracking-tight text-blue-400">
              {formatDuration(totalCompletedMinutes)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">de {formatDuration(totalPlannedMinutes)} planejados</p>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Taxa de Conclusão
            </span>
            <p className="text-xl font-extrabold tracking-tight text-emerald-400">
              {completionRate}%
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{totalCompletedTasksCount} de {weekTasks.length} cards cumpridos</p>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Disciplinas
            </span>
            <p className="text-xl font-extrabold tracking-tight text-purple-400">
              {sortedSubjects.length}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">matérias ativas nesta semana</p>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Sequência
            </span>
            <p className="text-xl font-extrabold tracking-tight text-amber-400">
              {user.streakDays} Dias
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">de consistência diária</p>
          </div>
        </div>

        {/* Daily Bar Chart */}
        <div className={`p-4 sm:p-5 rounded-2xl border mb-6 ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5 text-slate-200">
              <Calendar className="w-4 h-4 text-purple-400" />
              Horas Dedicadas por Dia da Semana
            </h3>
            <span className="text-xs text-slate-400">Segunda a Domingo</span>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 pt-4">
            {weekDays.map((wd) => {
              const dayData = dailyMinutesMap[wd.iso] || { total: 0, completed: 0 };
              const totalHeight = (dayData.total / maxDailyMinutes) * 100;
              const completedHeight = dayData.total > 0 ? (dayData.completed / dayData.total) * 100 : 0;

              return (
                <div key={wd.iso} className="flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {dayData.completed}m
                  </div>
                  <div className="w-full max-w-[36px] bg-slate-800 rounded-xl relative overflow-hidden h-28 flex items-end">
                    {/* Planned background height */}
                    <div
                      className="w-full rounded-xl transition-all duration-500 relative"
                      style={{
                        height: `${Math.max(8, totalHeight)}%`,
                        backgroundColor: wd.isToday ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {/* Completed fill */}
                      <div
                        className="w-full rounded-xl transition-all duration-500"
                        style={{
                          height: `${completedHeight}%`,
                          backgroundColor: pal.previewColor,
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className={`text-[11px] font-semibold block ${wd.isToday ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>
                      {wd.dayName}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{wd.dayNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject Breakdown Progress Bars */}
        <div className={`p-4 sm:p-5 rounded-2xl border mb-6 ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5 text-slate-200">
            <PieChart className="w-4 h-4 text-purple-400" />
            Distribuição de Tempo por Matéria
          </h3>

          {sortedSubjects.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">Nenhuma matéria registrada para esta semana.</p>
          ) : (
            <div className="space-y-3">
              {sortedSubjects.map(([subjName, data]) => {
                const percent = totalPlannedMinutes > 0 ? Math.round((data.minutes / totalPlannedMinutes) * 100) : 0;
                return (
                  <div key={subjName} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span className="font-semibold text-slate-200">{subjName}</span>
                        <span className="text-[11px] text-slate-400">({data.count} cards)</span>
                      </div>
                      <div className="font-bold text-slate-200">
                        <span>{formatDuration(data.minutes)}</span>
                        <span className="text-slate-400 text-[11px] ml-1.5">({percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: data.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t mt-6" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: pal.previewColor }}
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
