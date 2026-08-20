import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Sparkles,
  Flame,
  RotateCcw,
  Search,
  BookOpen,
  Image as ImageIcon,
  Bell,
  Check,
} from 'lucide-react';
import {
  StudyTask,
  ColorPalette,
  ThemeMode,
  TimeSlotView,
  UserProfile,
  SubjectItem,
} from '../types';
import { COLOR_PALETTES, SUBJECT_PRESETS } from '../lib/theme';
import { DataService } from '../lib/storage';
import {
  formatDateToISO,
  parseISODate,
  getBrasiliaDate,
  formatBrasiliaDisplayDate,
  formatShortDate,
  getWeekDays,
  getMonthDaysGrid,
  formatDuration,
} from '../lib/dateUtils';
import { TaskCard } from './TaskCard';

interface AgendaViewProps {
  tasks: StudyTask[];
  user: UserProfile;
  onAddTask: (date?: string) => void;
  onEditTask: (task: StudyTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskComplete: (taskId: string, completed: boolean) => void;
  onScheduleReview: (task: StudyTask) => void;
  onOpenStats: () => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  user,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
  onScheduleReview,
  onOpenStats,
  colorPalette,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const todayIso = formatDateToISO(getBrasiliaDate());
  const [currentView, setCurrentView] = useState<TimeSlotView>('week');
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(getBrasiliaDate().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(getBrasiliaDate().getFullYear());
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableSubjects, setAvailableSubjects] = useState<SubjectItem[]>([]);

  useEffect(() => {
    const subjects = DataService.getSubjects(user.id);
    setAvailableSubjects(subjects);
  }, [user.id, tasks]);

  // Tasks belonging to "Today"
  const todayTasks = tasks.filter((t) => {
    if (t.date === todayIso) return true;
    const bDate = getBrasiliaDate();
    const dayOfWeek = bDate.getDay();
    if (t.recurrence === 'daily') return true;
    if (t.recurrence === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
    if (t.recurrence === 'custom' && t.recurrenceDays?.includes(dayOfWeek)) return true;
    return false;
  });

  const todayCompletedCount = todayTasks.filter((t) => t.completed).length;
  const todayProgressPercent = todayTasks.length > 0
    ? Math.round((todayCompletedCount / todayTasks.length) * 100)
    : 0;

  const todayTotalMinutes = todayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  const todayCompletedMinutes = todayTasks
    .filter((t) => t.completed)
    .reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

  // Filter tasks based on search & subject filter
  const filteredTasks = tasks.filter((t) => {
    const matchesSubject = selectedSubjectFilter === 'all' || t.subject === selectedSubjectFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Navigation handlers
  const handlePrev = () => {
    if (currentView === 'day') {
      const d = parseISODate(selectedDateIso);
      d.setDate(d.getDate() - 1);
      setSelectedDateIso(formatDateToISO(d));
    } else if (currentView === 'week') {
      const d = parseISODate(selectedDateIso);
      d.setDate(d.getDate() - 7);
      setSelectedDateIso(formatDateToISO(d));
    } else {
      if (currentMonthIndex === 0) {
        setCurrentMonthIndex(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonthIndex(currentMonthIndex - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentView === 'day') {
      const d = parseISODate(selectedDateIso);
      d.setDate(d.getDate() + 1);
      setSelectedDateIso(formatDateToISO(d));
    } else if (currentView === 'week') {
      const d = parseISODate(selectedDateIso);
      d.setDate(d.getDate() + 7);
      setSelectedDateIso(formatDateToISO(d));
    } else {
      if (currentMonthIndex === 11) {
        setCurrentMonthIndex(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonthIndex(currentMonthIndex + 1);
      }
    }
  };

  const handleJumpToToday = () => {
    setSelectedDateIso(todayIso);
    setCurrentMonthIndex(getBrasiliaDate().getMonth());
    setCurrentYear(getBrasiliaDate().getFullYear());
  };

  // Helper to get tasks for a specific date (including recurring tasks)
  const getTasksForDate = (dateIso: string) => {
    const targetDate = parseISODate(dateIso);
    const dayOfWeek = targetDate.getDay();

    return filteredTasks.filter((t) => {
      if (t.date === dateIso) return true;
      if (t.recurrence === 'daily') return true;
      if (t.recurrence === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
      if (t.recurrence === 'custom' && t.recurrenceDays?.includes(dayOfWeek)) return true;
      return false;
    });
  };

  const weekDays = getWeekDays(parseISODate(selectedDateIso));
  const monthGrid = getMonthDaysGrid(currentYear, currentMonthIndex);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div id="agenda-dashboard-container" className="space-y-6">
      {/* 1. COMPACT RESUMO DO DIA: Focado, enxuto e sem elementos redundantes */}
      <section
        id="today-summary-section"
        className={`rounded-3xl border p-4 sm:p-5 shadow-sm transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Date Tag above + Single Line Resumo de Hoje Title + Subtitle */}
          <div className="space-y-1 min-w-0">
            {/* Tag de data pequeno acima em linha única */}
            <div className="flex items-center">
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5"
                style={{
                  backgroundColor: `${pal.previewColor}18`,
                  color: pal.previewColor,
                  border: `1px solid ${pal.previewColor}35`,
                }}
              >
                <CalendarIcon className="w-3 h-3 shrink-0" style={{ color: pal.previewColor }} />
                <span>{formatBrasiliaDisplayDate(todayIso)}</span>
              </span>
            </div>

            <h1 className={`text-lg sm:text-xl font-black tracking-tight whitespace-nowrap truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Resumo de Hoje
            </h1>

            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {todayTasks.length === 0
                ? 'Nenhum bloco de estudo agendado para hoje.'
                : `${todayTasks.length} ${todayTasks.length === 1 ? 'matéria programada' : 'matérias programadas'} • ${formatDuration(todayCompletedMinutes)} de ${formatDuration(todayTotalMinutes)} concluídos`}
            </p>
          </div>

          {/* Right: Meta do Dia (bloco único com largura máxima no mobile) e abaixo os 2 botões 50/50 de mesma altura */}
          <div className="flex flex-col gap-2.5 w-full md:w-auto shrink-0">
            {/* Meta do Dia Progress (bloco único na largura máxima) */}
            <div className={`w-full flex items-center justify-between md:justify-start gap-3 px-3.5 py-2 rounded-2xl border ${
              isDark ? 'bg-slate-800/80 border-slate-700/70' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={isDark ? '#334155' : '#e2e8f0'}
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={pal.previewColor}
                      strokeWidth="3.5"
                      strokeDasharray="88"
                      strokeDashoffset={88 - (88 * todayProgressPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className={`absolute text-[10px] font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {todayProgressPercent}%
                  </span>
                </div>
                <div className="text-left">
                  <p className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Meta do Dia</p>
                  <p className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {todayCompletedCount}/{todayTasks.length} concluídos
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                todayProgressPercent === 100
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {todayProgressPercent === 100 ? 'Meta atingida!' : `${todayTotalMinutes - todayCompletedMinutes > 0 ? formatDuration(todayTotalMinutes - todayCompletedMinutes) + ' restantes' : 'Em andamento'}`}
              </span>
            </div>

            {/* Quick Action Buttons: Criar Card e Estatísticas 50/50 com mesma altura */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                id="quick-add-task-btn"
                type="button"
                onClick={() => onAddTask(todayIso)}
                className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-2xl text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02] cursor-pointer"
                style={{ backgroundColor: pal.previewColor }}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Criar Card</span>
              </button>

              <button
                id="view-stats-btn"
                type="button"
                onClick={onOpenStats}
                className={`h-10 flex items-center justify-center gap-1.5 px-3 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
                title="Abrir Estatísticas Detalhadas"
              >
                <BarChart3 className="w-4 h-4 shrink-0" style={{ color: pal.previewColor }} />
                <span>Estatísticas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact List of Today's items (Subject, Title, Suggested Time only) */}
        {todayTasks.length > 0 && (
          <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)' }}>
            {todayTasks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition-colors ${
                  t.completed
                    ? isDark ? 'bg-slate-900/40 border-slate-800 opacity-60' : 'bg-slate-100 border-slate-200 opacity-60'
                    : isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleTaskComplete(t.id, !t.completed)}
                    className={`w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      t.completed
                        ? 'bg-emerald-600 text-white'
                        : isDark ? 'border border-slate-600 hover:border-slate-400' : 'border border-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {t.completed && <Check className="w-3 h-3" />}
                  </button>
                  <div className="min-w-0 flex-1 truncate">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded text-white shrink-0"
                        style={{ backgroundColor: t.categoryColor }}
                      >
                        {t.subject}
                      </span>
                      <span
                        onClick={() => onEditTask(t)}
                        className={`font-semibold truncate cursor-pointer hover:underline ${
                          t.completed ? 'line-through text-slate-500' : isDark ? 'text-slate-200' : 'text-slate-900'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" style={{ color: pal.previewColor }} />
                  <span>
                    {t.isSpecificTime && t.startTime ? `${t.startTime}` : `${t.durationMinutes} min`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. CALENDAR CONTROLS & FILTER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
        {/* Row 1: View mode toggle (Dia / Semana / Mês) + Hoje - Full width on mobile */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className={`grid grid-cols-3 flex-1 lg:flex lg:flex-none items-center p-1 rounded-2xl border text-xs font-semibold ${
            isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-300'
          }`}>
            <button
              id="view-day-btn"
              type="button"
              onClick={() => setCurrentView('day')}
              className={`py-1.5 px-3 text-center rounded-xl transition-all cursor-pointer ${
                currentView === 'day'
                  ? 'text-white shadow-xs font-bold'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700 hover:text-slate-900'
              }`}
              style={currentView === 'day' ? { backgroundColor: pal.previewColor } : {}}
            >
              Dia
            </button>
            <button
              id="view-week-btn"
              type="button"
              onClick={() => setCurrentView('week')}
              className={`py-1.5 px-3 text-center rounded-xl transition-all cursor-pointer ${
                currentView === 'week'
                  ? 'text-white shadow-xs font-bold'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700 hover:text-slate-900'
              }`}
              style={currentView === 'week' ? { backgroundColor: pal.previewColor } : {}}
            >
              Semana
            </button>
            <button
              id="view-month-btn"
              type="button"
              onClick={() => setCurrentView('month')}
              className={`py-1.5 px-3 text-center rounded-xl transition-all cursor-pointer ${
                currentView === 'month'
                  ? 'text-white shadow-xs font-bold'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700 hover:text-slate-900'
              }`}
              style={currentView === 'month' ? { backgroundColor: pal.previewColor } : {}}
            >
              Mês
            </button>
          </div>

          <button
            type="button"
            onClick={handleJumpToToday}
            className={`px-3.5 py-2.5 lg:py-1.5 rounded-xl text-xs font-semibold border cursor-pointer shrink-0 ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Hoje
          </button>
        </div>

        {/* Row 2: Date Navigator Arrows & Label - Full Width on mobile */}
        <div className={`flex items-center justify-between gap-2 w-full lg:w-auto p-1 lg:p-0 rounded-2xl lg:rounded-none ${
          isDark ? 'bg-slate-800/40 lg:bg-transparent' : 'bg-slate-50 lg:bg-transparent'
        }`}>
          <button
            type="button"
            onClick={handlePrev}
            className={`p-2 rounded-xl border cursor-pointer shrink-0 ${
              isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className={`text-xs sm:text-sm font-bold flex-1 text-center truncate px-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            {currentView === 'day' && formatBrasiliaDisplayDate(selectedDateIso)}
            {currentView === 'week' && `Semana de ${formatShortDate(weekDays[0].iso)} a ${formatShortDate(weekDays[6].iso)}`}
            {currentView === 'month' && `${monthNames[currentMonthIndex]} de ${currentYear}`}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className={`p-2 rounded-xl border cursor-pointer shrink-0 ${
              isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            title="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Row 3: Filters: Subject dropdown - Full width on mobile */}
        <div className="w-full lg:w-auto">
          <select
            value={selectedSubjectFilter || 'all'}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className={`w-full lg:w-auto px-3.5 py-2.5 lg:py-1.5 rounded-xl text-xs border font-medium focus:outline-hidden cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-purple-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
            }`}
          >
            <option value="all">Todas as Matérias</option>
            {availableSubjects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. CALENDAR VIEWS (DAY / WEEK / MONTH) */}

      {/* A. DAY VIEW */}
      {currentView === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              <CalendarIcon className="w-4 h-4" style={{ color: pal.previewColor }} />
              <span>Cronograma do Dia: {formatBrasiliaDisplayDate(selectedDateIso)}</span>
            </h3>
            <button
              type="button"
              onClick={() => onAddTask(selectedDateIso)}
              className="flex items-center gap-1 text-xs font-semibold hover:underline cursor-pointer"
              style={{ color: pal.previewColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar neste dia</span>
            </button>
          </div>

          {getTasksForDate(selectedDateIso).length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border border-dashed ${
              isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-300 bg-slate-50'
            }`}>
              <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className={`font-semibold text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Nenhum bloco de estudo agendado para este dia.
              </p>
              <p className={`text-xs mt-1 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Crie um card com anotações e metas para manter o ritmo!
              </p>
              <button
                type="button"
                onClick={() => onAddTask(selectedDateIso)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
                style={{ backgroundColor: pal.previewColor }}
              >
                + Criar Card para Este Dia
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getTasksForDate(selectedDateIso).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleTaskComplete}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onScheduleReview={onScheduleReview}
                  colorPalette={colorPalette}
                  themeMode={themeMode}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* B. WEEK VIEW (7 COLUMNS) */}
      {currentView === 'week' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayTasks = getTasksForDate(day.iso);
              const dayCompletedCount = dayTasks.filter((t) => t.completed).length;

              return (
                <div
                  key={day.iso}
                  className={`rounded-3xl border p-3 min-h-[380px] flex flex-col transition-all ${
                    day.isToday
                      ? isDark
                        ? 'bg-slate-800/90 border-2 shadow-lg'
                        : 'border-2 shadow-xs'
                      : isDark
                      ? 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  style={day.isToday ? {
                    borderColor: pal.previewColor,
                    backgroundColor: isDark ? undefined : `${pal.previewColor}10`,
                  } : {}}
                >
                  {/* Day Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
                    <div>
                      <span
                        className={`text-xs font-bold block ${day.isToday ? 'font-extrabold' : isDark ? 'text-slate-400' : 'text-slate-600'}`}
                        style={day.isToday ? { color: pal.previewColor } : {}}
                      >
                        {day.dayName}
                      </span>
                      <span className={`text-sm font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {day.dayNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {dayTasks.length > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            dayCompletedCount === dayTasks.length
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {dayCompletedCount}/{dayTasks.length}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onAddTask(day.iso)}
                        className={`p-1 rounded-lg cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        title={`Adicionar tarefa em ${day.dayName}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tasks List inside Day Column */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayTasks.length === 0 ? (
                      <div
                        onClick={() => onAddTask(day.iso)}
                        className={`h-28 border border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer text-center p-2 ${
                          isDark
                            ? 'border-slate-700/50 text-slate-500 hover:border-purple-500/50 hover:text-purple-400'
                            : 'border-slate-300 text-slate-400 hover:border-purple-400 hover:text-purple-600'
                        }`}
                      >
                        <Plus className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-medium">Livre • Agendar</span>
                      </div>
                    ) : (
                      dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`group p-2.5 rounded-2xl border text-xs transition-all relative ${
                            task.completed
                              ? isDark ? 'bg-slate-900/40 border-slate-800/60 opacity-60' : 'bg-slate-100 border-slate-200 opacity-60'
                              : isDark
                              ? 'bg-slate-800/90 border-slate-700/70 hover:border-purple-500/60'
                              : 'bg-white border-slate-200 hover:border-purple-300 shadow-xs'
                          }`}
                        >
                          {/* Top subject tag & time */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white truncate max-w-[90px]"
                              style={{ backgroundColor: task.categoryColor }}
                            >
                              {task.subject}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {task.isSpecificTime && task.startTime ? task.startTime : `${task.durationMinutes}m`}
                            </span>
                          </div>

                          {/* Title & Checkbox */}
                          <div className="flex items-start gap-1.5 my-1">
                            <button
                              type="button"
                              onClick={() => onToggleTaskComplete(task.id, !task.completed)}
                              className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                                task.completed
                                  ? 'bg-emerald-600 text-white'
                                  : isDark ? 'border border-slate-600 hover:border-purple-400' : 'border border-slate-400 hover:border-purple-600'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3" />}
                            </button>
                            <p
                              onClick={() => onEditTask(task)}
                              className={`font-semibold text-xs leading-tight cursor-pointer hover:text-purple-500 transition-colors line-clamp-2 ${
                                task.completed ? 'line-through text-slate-500' : isDark ? 'text-slate-200' : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </p>
                          </div>

                          {/* Mini badges: Images/Notes count & Review */}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                            {task.images && task.images.length > 0 && (
                              <span className="flex items-center gap-0.5 text-purple-500 dark:text-purple-400">
                                <ImageIcon className="w-3 h-3" />
                                <span>{task.images.length}</span>
                              </span>
                            )}
                            {task.reviewScheduled && (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Bell className="w-3 h-3" />
                                <span>Revisão</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. MONTH VIEW (GRID) */}
      {currentView === 'month' && (
        <div className={`rounded-3xl border p-4 sm:p-6 space-y-4 shadow-sm ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
        }`}>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold pb-2 border-b" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Seg</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Ter</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Qua</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Qui</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Sex</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Sáb</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {monthGrid.map((cell, idx) => {
              const cellTasks = getTasksForDate(cell.iso);
              const hasTasks = cellTasks.length > 0;
              const allDone = hasTasks && cellTasks.every((t) => t.completed);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDateIso(cell.iso);
                    setCurrentView('day');
                  }}
                  className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isToday
                      ? 'shadow-xs'
                      : cell.isCurrentMonth
                      ? isDark
                        ? 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800/40 opacity-40'
                      : 'bg-slate-100/40 border-slate-100 opacity-40'
                  }`}
                  style={cell.isToday ? {
                    borderColor: pal.previewColor,
                    backgroundColor: `${pal.previewColor}15`,
                  } : {}}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday ? 'font-extrabold' : isDark ? 'text-slate-300' : 'text-slate-800'
                      }`}
                      style={cell.isToday ? { color: pal.previewColor } : {}}
                    >
                      {cell.date.getDate()}
                    </span>
                    {hasTasks && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: allDone ? '#10b981' : pal.previewColor }}
                      />
                    )}
                  </div>

                  {/* Task Pills Preview */}
                  <div className="space-y-1 my-1 overflow-hidden max-h-12">
                    {cellTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className="text-[9px] font-semibold px-1 py-0.5 rounded truncate text-white"
                        style={{ backgroundColor: t.categoryColor }}
                      >
                        {t.title}
                      </div>
                    ))}
                    {cellTasks.length > 2 && (
                      <span className="text-[9px] text-slate-400 block font-medium">
                        +{cellTasks.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

