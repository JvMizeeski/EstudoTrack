import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Tag,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  BookOpen,
  Search,
  ChevronDown,
  PlusCircle,
  Pencil,
} from 'lucide-react';
import { StudyTask, ColorPalette, ThemeMode, RecurrenceType, TaskPriority, SubjectItem } from '../types';
import { COLOR_PALETTES, DEFAULT_SUBJECT_COLORS } from '../lib/theme';
import { formatDateToISO, getBrasiliaDate } from '../lib/dateUtils';
import { DataService } from '../lib/storage';
import { SupabaseSyncService } from '../lib/supabaseSync';
import { RichNoteEditor } from './RichNoteEditor';

interface TaskEditorModalProps {
  task: Partial<StudyTask> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'> & { id?: string }) => void;
  onDelete?: (taskId: string) => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  initialDate?: string;
  userId: string;
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  colorPalette,
  themeMode,
  initialDate,
  userId,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultDate = initialDate || formatDateToISO(getBrasiliaDate());

  const [title, setTitle] = useState(task?.title || '');
  const [subjectList, setSubjectList] = useState<SubjectItem[]>([]);
  const [subjectSearch, setSubjectSearch] = useState(task?.subject || '');
  const [selectedSubject, setSelectedSubject] = useState(task?.subject || '');
  const [categoryColor, setCategoryColor] = useState(task?.categoryColor || '#3b82f6');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [newSubjectColor, setNewSubjectColor] = useState('#8b5cf6');

  const [date, setDate] = useState(task?.date || defaultDate);
  const [isSpecificTime, setIsSpecificTime] = useState(task?.isSpecificTime ?? true);
  const [startTime, setStartTime] = useState(task?.startTime || '09:00');
  const [endTime, setEndTime] = useState(task?.endTime || '10:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(task?.durationMinutes ?? 60);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task?.recurrenceDays || [1, 3, 5]);
  const [notes, setNotes] = useState(task?.notes || '');
  const [notesHtml, setNotesHtml] = useState(task?.notesHtml || '');
  const [images, setImages] = useState<string[]>(task?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [reviewScheduled, setReviewScheduled] = useState(task?.reviewScheduled ?? true);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [tags, setTags] = useState<string[]>(task?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'identity' | 'notes'>(task?.id ? 'notes' : 'identity');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const loaded = DataService.getSubjects();
      setSubjectList(loaded);
      setTitle(task?.title || '');
      setDate(task?.date || defaultDate);
      setIsSpecificTime(task?.isSpecificTime ?? true);
      setStartTime(task?.startTime || '09:00');
      setEndTime(task?.endTime || '10:30');
      setDurationMinutes(task?.durationMinutes ?? 60);
      setRecurrence(task?.recurrence || 'none');
      setRecurrenceDays(task?.recurrenceDays || [1, 3, 5]);
      setNotes(task?.notes || '');
      setNotesHtml(task?.notesHtml || '');
      setImages(task?.images || []);
      setReviewScheduled(task?.reviewScheduled ?? false);
      setPriority(task?.priority || 'medium');
      setTags(task?.tags || []);
      setErrorMsg('');
      setActiveTab(task?.id ? 'notes' : 'identity');

      if (task?.subject) {
        setSubjectSearch(task.subject || '');
        setSelectedSubject(task.subject || '');
        setCategoryColor(task.categoryColor || '#3b82f6');
      } else if (loaded.length > 0) {
        setSubjectSearch(loaded[0].name || '');
        setSelectedSubject(loaded[0].name || '');
        setCategoryColor(loaded[0].color || '#8b5cf6');
      } else {
        setSubjectSearch('');
        setSelectedSubject('');
        setCategoryColor('#3b82f6');
      }

      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, task, defaultDate]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    fileList.forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64 = loadEvt.target?.result as string;
        if (base64) {
          setImages((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRecurrenceDay = (dayIndex: number) => {
    if (recurrenceDays.includes(dayIndex)) {
      setRecurrenceDays(recurrenceDays.filter((d) => d !== dayIndex));
    } else {
      setRecurrenceDays([...recurrenceDays, dayIndex].sort());
    }
  };

  const handleSelectSubject = (item: SubjectItem) => {
    setSelectedSubject(item.name);
    setSubjectSearch(item.name);
    setCategoryColor(item.color);
    setIsSubjectDropdownOpen(false);
  };

  const handleCreateNewSubject = (nameToCreate: string) => {
    const cleanName = nameToCreate.trim();
    if (!cleanName) return;
    const created = DataService.addSubject(cleanName, newSubjectColor);
    const updated = DataService.getSubjects();
    setSubjectList(updated);
    setSelectedSubject(created.name);
    setSubjectSearch(created.name);
    setCategoryColor(created.color);
    setIsSubjectDropdownOpen(false);
  };

  const filteredSubjects = subjectList.filter((s) =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase().trim())
  );

  const exactMatchExists = subjectList.some(
    (s) => s.name.toLowerCase().trim() === subjectSearch.toLowerCase().trim()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor, informe o título ou assunto principal do bloco.');
      setActiveTab('identity');
      return;
    }

    let finalSubjectName = selectedSubject.trim() || subjectSearch.trim();
    if (!finalSubjectName) {
      setErrorMsg('Por favor, selecione ou cadastre uma disciplina.');
      setActiveTab('identity');
      return;
    }

    // If user typed a new subject and didn't click save subject, auto-register it
    if (!exactMatchExists && finalSubjectName) {
      const created = DataService.addSubject(finalSubjectName, categoryColor);
      finalSubjectName = created.name;
    }

    // Calculate duration in minutes if using specific times
    let calculatedDuration = durationMinutes;
    if (isSpecificTime && startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (endMin > startMin) {
        calculatedDuration = endMin - startMin;
      }
    }

    onSave({
      id: task?.id,
      title: title.trim(),
      subject: finalSubjectName,
      categoryColor,
      date,
      startTime: isSpecificTime ? startTime : undefined,
      endTime: isSpecificTime ? endTime : undefined,
      durationMinutes: calculatedDuration,
      isSpecificTime,
      recurrence,
      recurrenceDays: recurrence === 'custom' || recurrence === 'weekly' || recurrence === 'weekdays' ? recurrenceDays : undefined,
      completed: task?.completed || false,
      completedAt: task?.completedAt,
      notes: notes.trim(),
      notesHtml,
      images,
      reviewScheduled,
      priority,
      tags,
    });
    onClose();
  };

  const weekDayLabels = [
    { label: 'Dom', val: 0 },
    { label: 'Seg', val: 1 },
    { label: 'Ter', val: 2 },
    { label: 'Qua', val: 3 },
    { label: 'Qui', val: 4 },
    { label: 'Sex', val: 5 },
    { label: 'Sáb', val: 6 },
  ];

  const identityLabel = selectedSubject || subjectSearch || 'Sem matéria';
  const timeLabel = isSpecificTime
    ? `${startTime || '--:--'} - ${endTime || '--:--'}`
    : `${durationMinutes ?? 60} min`;

  return (
    <div
      id="task-editor-modal-overlay"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="task-editor-modal-container"
        className={`relative w-full sm:max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl border flex flex-col shadow-2xl transition-all ${
          isDark ? 'bg-[#1E293B] border-slate-700/60 text-slate-100' : 'bg-[#FFFFFF] border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-7 pb-4 border-b" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md shrink-0"
              style={{ backgroundColor: categoryColor }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {task?.id ? 'Editar Bloco de Estudo' : 'Novo Card de Estudo'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Organize sua matéria, horários, anotações ricas e revisões
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl cursor-pointer shrink-0 ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          {/* Tabs + compact identity strip (always visible, above the scrollable area) */}
          <div className="shrink-0 px-4 sm:px-7 pt-4 space-y-2.5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveTab('identity')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'identity' ? 'text-white shadow-xs' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'identity' ? { backgroundColor: pal.previewColor } : {}}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Identificação</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'notes' ? 'text-white shadow-xs' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'notes' ? { backgroundColor: pal.previewColor } : {}}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resumo & Anotações</span>
              </button>
            </div>

            <div
              className={`flex items-center gap-x-2 gap-y-1 flex-wrap p-2.5 rounded-xl border text-[11px] sm:text-xs ${
                isDark ? 'bg-slate-900/50 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />
              <span className="font-bold" style={{ color: pal.previewColor }}>{identityLabel}</span>
              <span className="opacity-40">•</span>
              <span className="font-semibold truncate max-w-[10rem] sm:max-w-none">{title || 'Sem título'}</span>
              <span className="opacity-40 hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLabel}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('identity')}
                title="Editar identificação"
                className={`ml-auto p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable tab content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 py-4 text-xs sm:text-sm">
          {activeTab === 'identity' && (
          <div className="space-y-4">
          {/* Title */}
          <div>
            <label className={`block font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Título da Aula ou Tópico *
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              value={title || ''}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Ex: Funções Trigonométricas, Direito Constitucional Art. 5º, Algoritmos..."
              className={`w-full px-3.5 py-2.5 rounded-xl border font-medium focus:outline-hidden transition-all ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700 focus:border-purple-500 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-300 focus:border-purple-500 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Subject Searchable Combobox Dropdown */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Disciplina / Matéria *
              </label>
              {selectedSubject && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Cor da matéria:</span>
                  <div className="flex items-center gap-1">
                    {DEFAULT_SUBJECT_COLORS.slice(0, 6).map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setCategoryColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                          categoryColor === c ? 'scale-125 ring-2 ring-white ring-offset-1' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                        title="Trocar cor"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700 focus-within:border-purple-500'
                    : 'bg-white border-slate-300 focus-within:border-purple-500'
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: categoryColor }}
                />
                <input
                  type="text"
                  value={subjectSearch || ''}
                  onChange={(e) => {
                    setSubjectSearch(e.target.value);
                    setIsSubjectDropdownOpen(true);
                  }}
                  onFocus={() => setIsSubjectDropdownOpen(true)}
                  placeholder="Digite para buscar ou cadastrar uma disciplina..."
                  className={`w-full bg-transparent font-medium focus:outline-hidden text-xs sm:text-sm ${
                    isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown Options */}
              {isSubjectDropdownOpen && (
                <div
                  className={`absolute z-30 left-0 right-0 top-full mt-1.5 rounded-2xl border shadow-xl max-h-56 overflow-y-auto p-1.5 ${
                    isDark ? 'bg-[#1E293B] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {filteredSubjects.length > 0 && (
                    <div className="space-y-1 mb-1">
                      {filteredSubjects.map((s) => (
                        <button
                          type="button"
                          key={s.id || s.name}
                          onClick={() => handleSelectSubject(s)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                            selectedSubject.toLowerCase() === s.name.toLowerCase()
                              ? isDark ? 'bg-purple-950/40 text-purple-300 font-bold' : 'bg-purple-50 text-purple-900 font-bold'
                              : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            <span>{s.name}</span>
                          </div>
                          {selectedSubject.toLowerCase() === s.name.toLowerCase() && (
                            <Check className="w-4 h-4 text-purple-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Register New Subject Option */}
                  {subjectSearch.trim() && !exactMatchExists && (
                    <div className={`p-2.5 rounded-xl border mt-1 ${isDark ? 'bg-slate-900/60 border-purple-800/40' : 'bg-purple-50/70 border-purple-200'}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs font-semibold ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                          Cadastrar &quot;{subjectSearch.trim()}&quot;
                        </span>
                        <div className="flex items-center gap-1">
                          {DEFAULT_SUBJECT_COLORS.slice(0, 5).map((colorOpt) => (
                            <button
                              type="button"
                              key={colorOpt}
                              onClick={() => setNewSubjectColor(colorOpt)}
                              className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                                newSubjectColor === colorOpt ? 'scale-125 ring-2 ring-purple-400' : 'opacity-70'
                              }`}
                              style={{ backgroundColor: colorOpt }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCreateNewSubject(subjectSearch)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xs cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Cadastrar no Banco e Usar</span>
                      </button>
                    </div>
                  )}

                  {filteredSubjects.length === 0 && !subjectSearch.trim() && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Nenhuma disciplina cadastrada ainda. Digite o nome acima para cadastrar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date & Time Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Date */}
            <div>
              <label className={`block font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Data do Estudo</span>
              </label>
              <input
                type="date"
                value={date || ''}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border font-medium focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-purple-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                }`}
              />
            </div>

            {/* Time Mode Toggle */}
            <div>
              <label className={`block font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Formato de Tempo</span>
              </label>
              <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsSpecificTime(true)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSpecificTime
                      ? 'text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={isSpecificTime ? { backgroundColor: pal.previewColor } : {}}
                >
                  Horário Específico
                </button>
                <button
                  type="button"
                  onClick={() => setIsSpecificTime(false)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isSpecificTime
                      ? 'text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={!isSpecificTime ? { backgroundColor: pal.previewColor } : {}}
                >
                  Minutos Dedicados
                </button>
              </div>
            </div>
          </div>

          {/* Time Inputs (Specific vs Duration) */}
          {isSpecificTime ? (
            <div className={`grid grid-cols-2 gap-4 p-3 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Início</label>
                <input
                  type="time"
                  value={startTime || ''}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-purple-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Término</label>
                <input
                  type="time"
                  value={endTime || ''}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-purple-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Duração estimada do bloco:</span>
                <span className="font-bold text-sm" style={{ color: pal.previewColor }}>{durationMinutes ?? 60} minutos</span>
              </div>
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={durationMinutes ?? 60}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: pal.previewColor }}
              />
              <div className="flex gap-2 justify-between text-[11px] text-slate-400">
                <span>15 min</span>
                <span>45 min</span>
                <span>90 min (1h30)</span>
                <span>180 min (3h)</span>
                <span>300 min (5h)</span>
              </div>
            </div>
          )}

          {/* Recurrence Selector */}
          <div>
            <label className={`block font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Repeat className="w-4 h-4 text-slate-400" />
              <span>Frequência / Recorrência</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'none' as RecurrenceType, label: 'Pontual (Única)' },
                { id: 'daily' as RecurrenceType, label: 'Todos os Dias' },
                { id: 'weekdays' as RecurrenceType, label: 'Segunda a Sexta' },
                { id: 'custom' as RecurrenceType, label: 'Dias Específicos' },
              ].map((rec) => (
                <button
                  type="button"
                  key={rec.id}
                  onClick={() => setRecurrence(rec.id)}
                  className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    recurrence === rec.id
                      ? 'font-bold'
                      : isDark
                      ? 'border-slate-700/60 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                  style={recurrence === rec.id ? {
                    borderColor: pal.previewColor,
                    backgroundColor: `${pal.previewColor}18`,
                    color: pal.previewColor,
                  } : {}}
                >
                  {rec.label}
                </button>
              ))}
            </div>

            {/* Specific Days Picker */}
            {recurrence === 'custom' && (
              <div className={`mt-2.5 flex items-center gap-1.5 p-2 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-100 border-slate-200'}`}>
                <span className="text-xs text-slate-400 mr-1">Repetir nos dias:</span>
                {weekDayLabels.map((wd) => {
                  const isSelected = recurrenceDays.includes(wd.val);
                  return (
                    <button
                      type="button"
                      key={wd.val}
                      onClick={() => toggleRecurrenceDay(wd.val)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                      style={isSelected ? { backgroundColor: pal.previewColor } : {}}
                    >
                      {wd.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          </div>
          )}

          {activeTab === 'notes' && (
          <div className="flex flex-col">
          {/* Rich Notes / Summary block & Image uploads */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileText className="w-4 h-4" style={{ color: pal.previewColor }} />
                <span>Resumo da Matéria & Anotações de Estudo</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: `${pal.previewColor}18`,
                    color: pal.previewColor,
                    border: `1px solid ${pal.previewColor}40`,
                  }}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Anexar Imagem / Foto da Lousa</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <RichNoteEditor
              content={notesHtml}
              onChange={(html, plainText) => {
                setNotesHtml(html);
                setNotes(plainText);
              }}
              onUploadImage={(file) => SupabaseSyncService.uploadTaskImage(userId, file)}
              placeholder="Escreva aqui seu resumo da aula, tópicos estudados, fórmulas-chave, dúvidas e lembretes para relacionar com o dia de estudo..."
              isDark={isDark}
              accentColor={pal.previewColor}
            />

            {/* Attached Images Grid */}
            {images.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Imagens e Diagramas Anexados ({images.length}):</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-700 aspect-video bg-slate-900"
                    >
                      <img
                        src={imgSrc}
                        alt={`Anexo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title="Remover anexo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
          )}
          </div>

          {/* Footer Actions */}
          <div
            className="shrink-0 flex items-center justify-between p-4 sm:p-7 pt-4 border-t"
            style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}
          >
            {task?.id && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja excluir este card de estudo permanentemente?')) {
                    onDelete(task.id!);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Card</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="save-task-btn"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                style={{
                  backgroundColor: pal.previewColor,
                }}
              >
                <Check className="w-4 h-4" />
                <span>{task?.id ? 'Salvar Alterações' : 'Criar Card de Estudo'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
