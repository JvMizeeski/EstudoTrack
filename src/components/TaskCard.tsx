import React, { useState } from 'react';
import {
  Check,
  Clock,
  Repeat,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  MoreVertical,
  Play,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import DOMPurify from 'dompurify';
import { StudyTask, ColorPalette, ThemeMode } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { formatDuration, formatShortDate } from '../lib/dateUtils';

interface TaskCardProps {
  task: StudyTask;
  onToggleComplete: (taskId: string, isCompleted: boolean) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
  onScheduleReview?: (task: StudyTask) => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onScheduleReview,
  colorPalette,
  themeMode,
}) => {
  const [showFullNotes, setShowFullNotes] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const handleCheckClick = () => {
    const nextState = !task.completed;
    if (nextState) {
      // Fire confetti burst
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: [pal.previewColor, '#10b981', '#fbbf24', '#38bdf8'],
      });
    }
    onToggleComplete(task.id, nextState);
  };

  const getRecurrenceText = () => {
    if (task.recurrence === 'daily') return 'Diário';
    if (task.recurrence === 'weekdays') return 'Seg a Sex';
    if (task.recurrence === 'weekly') return 'Semanal';
    if (task.recurrence === 'custom' && task.recurrenceDays?.length) {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return task.recurrenceDays.map((d) => days[d]).join(', ');
    }
    return null;
  };

  const recurrenceLabel = getRecurrenceText();

  return (
    <>
      <div
        id={`study-card-${task.id}`}
        className={`group relative rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl ${
          task.completed
            ? isDark
              ? 'bg-slate-800/40 border-slate-700/40 opacity-75'
              : 'bg-slate-50/80 border-slate-200 opacity-80'
            : isDark
            ? 'bg-[#1E293B] border-slate-700/60 hover:bg-slate-800/90'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {/* Top Subject Tag & Time Indicator */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: task.categoryColor }}
            >
              {task.subject}
            </span>

            {/* Recurrence Badge */}
            {recurrenceLabel && (
              <span
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(0,0,0,0.05)',
                  color: isDark ? '#94a3b8' : '#64748b',
                }}
              >
                <Repeat className="w-3 h-3" />
                <span>{recurrenceLabel}</span>
              </span>
            )}

            {/* Spaced Review Tag */}
            {task.reviewScheduled && (
              <span
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400"
                title={`Revisão programada: ${task.nextReviewDate ? formatShortDate(task.nextReviewDate) : 'Em breve'}`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revisão {task.reviewStage ? `Fase ${task.reviewStage}` : ''}</span>
              </span>
            )}
          </div>

          {/* Time badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Clock className="w-3.5 h-3.5" style={{ color: pal.previewColor }} />
            <span>
              {task.isSpecificTime && task.startTime
                ? `${task.startTime} - ${task.endTime || ''}`
                : formatDuration(task.durationMinutes)}
            </span>
          </div>
        </div>

        {/* Title and Complete Checkbox */}
        <div className="flex items-start gap-3 my-2">
          <button
            id={`task-check-${task.id}`}
            type="button"
            onClick={handleCheckClick}
            className={`w-6 h-6 mt-0.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              task.completed
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                : isDark
                ? 'border-2 border-slate-600 hover:border-slate-400'
                : 'border-2 border-slate-300 hover:border-slate-400'
            }`}
            title={task.completed ? 'Marcar como não concluído' : 'Marcar como concluído (+35 XP)'}
          >
            {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
          </button>

          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-sm sm:text-base leading-snug tracking-tight transition-all ${
                task.completed
                  ? 'line-through text-slate-500'
                  : isDark
                  ? 'text-slate-100'
                  : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>

            {/* Quick tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {task.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Study Summary & Notes Preview */}
        {(task.notes || task.notesHtml) && (
          <div
            className={`mt-3 p-3 rounded-2xl text-xs leading-relaxed transition-all ${
              isDark
                ? 'bg-slate-900/60 border border-slate-700/50 text-slate-300'
                : 'bg-slate-50 border border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" style={{ color: pal.previewColor }} />
                Resumo do Estudo:
              </span>
              {task.notes.length > 140 && (
                <button
                  type="button"
                  onClick={() => setShowFullNotes(!showFullNotes)}
                  className="hover:underline flex items-center gap-0.5 cursor-pointer"
                  style={{ color: pal.previewColor }}
                >
                  {showFullNotes ? (
                    <>
                      <span>Menos</span>
                      <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <span>Ver tudo</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>

            {task.notesHtml ? (
              <div
                className={`relative ${!showFullNotes && task.notes.length > 140 ? 'max-h-28 overflow-hidden' : ''}`}
              >
                <div
                  className="rich-note-content"
                  style={{ ['--rich-note-accent' as any]: pal.previewColor }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.notesHtml) }}
                />
                {!showFullNotes && task.notes.length > 140 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                    style={{
                      background: `linear-gradient(to bottom, transparent, ${isDark ? '#0f172a' : '#f8fafc'})`,
                    }}
                  />
                )}
              </div>
            ) : (
              <p
                className={`whitespace-pre-line font-sans ${
                  !showFullNotes && task.notes.length > 140 ? 'line-clamp-2' : ''
                }`}
              >
                {task.notes}
              </p>
            )}
          </div>
        )}

        {/* Attached Images Gallery */}
        {task.images && task.images.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
              <ImageIcon className="w-3.5 h-3.5" style={{ color: pal.previewColor }} />
              <span>Anexos & Esquemas ({task.images.length})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {task.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className="relative group rounded-xl overflow-hidden aspect-video border border-slate-700 bg-black cursor-pointer hover:ring-2 transition-all"
                  style={{ outlineColor: pal.previewColor }}
                >
                  <img
                    src={img}
                    alt={`Anexo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Footer Actions */}
        <div
          className="mt-3.5 pt-3 border-t flex items-center justify-between text-xs"
          style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}
        >
          <div className="flex items-center gap-2">
            {onScheduleReview && (
              <button
                type="button"
                onClick={() => onScheduleReview(task)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Agendar próxima revisão espaçada"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revisar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Editar Card"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja excluir este bloco de estudos?')) {
                  onDelete(task.id);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Excluir Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={selectedImage}
              alt="Anexo ampliado"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
            >
              <Trash2 className="w-4 h-4 sr-only" />
              <span>✕</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
