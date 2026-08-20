import React from 'react';
import { AlertTriangle, Trash2, CalendarX, X } from 'lucide-react';
import { ColorPalette, ThemeMode } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { formatBrasiliaDisplayDate } from '../lib/dateUtils';

interface ConfirmDeleteTaskModalProps {
  isOpen: boolean;
  isRecurring: boolean;
  occurrenceDate: string;
  onCancel: () => void;
  onConfirm: (scope: 'all' | 'occurrence') => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const ConfirmDeleteTaskModal: React.FC<ConfirmDeleteTaskModalProps> = ({
  isOpen,
  isRecurring,
  occurrenceDate,
  onCancel,
  onConfirm,
  colorPalette,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  if (!isOpen) return null;

  const dateLabel = formatBrasiliaDisplayDate(occurrenceDate);

  return (
    <div
      id="confirm-delete-task-overlay"
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={`relative w-full max-w-sm rounded-3xl border p-5 sm:p-6 shadow-2xl ${
          isDark ? 'bg-[#1E293B] border-slate-700/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <button
          onClick={onCancel}
          className={`absolute top-4 right-4 p-1.5 rounded-lg cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-500/15 text-rose-500 mb-3.5">
          <Trash2 className="w-5 h-5" />
        </div>

        <h2 className="font-bold text-base mb-1.5">
          {isRecurring ? 'Excluir bloco recorrente' : 'Excluir card de estudo'}
        </h2>

        <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Esta ação não pode ser desfeita. Os dados excluídos não podem ser recuperados.</span>
        </div>

        {isRecurring ? (
          <div className="space-y-2">
            <p className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Este card se repete em vários dias. O que você quer excluir?
            </p>
            <button
              type="button"
              onClick={() => onConfirm('occurrence')}
              className={`w-full flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-900/60 hover:border-slate-600 text-slate-200'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-800'
              }`}
            >
              <CalendarX className="w-4 h-4 shrink-0" style={{ color: pal.previewColor }} />
              <span>Excluir apenas {dateLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => onConfirm('all')}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-bold text-white cursor-pointer transition-colors bg-rose-600 hover:bg-rose-500"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Excluir toda a série recorrente</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onConfirm('all')}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors bg-rose-600 hover:bg-rose-500"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Permanentemente</span>
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className={`w-full mt-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
