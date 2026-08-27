import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Palette,
  Bell,
  History,
  RotateCcw,
  Save,
  Check,
  Moon,
  Sun,
  Trash2,
  AlertTriangle,
  Upload,
  Camera,
  LogOut,
  BookOpen,
  Plus,
  Pencil,
} from 'lucide-react';
import {
  UserProfile,
  AppSettings,
  ColorPalette,
  ThemeMode,
  AuditLog,
  StudyTask,
  SubjectItem,
} from '../types';
import { COLOR_PALETTES, DEFAULT_SUBJECT_COLORS } from '../lib/theme';
import { SupabaseSyncService } from '../lib/supabaseSync';
import { DataService } from '../lib/storage';

interface SettingsViewProps {
  user: UserProfile;
  settings: AppSettings;
  auditLogs: AuditLog[];
  tasks: StudyTask[];
  onSaveProfile: (updatedProfile: Partial<UserProfile>) => void;
  onSaveSettings: (updatedSettings: AppSettings) => void;
  onPreviewPalette?: (palette: ColorPalette) => void;
  onResetSettingsToDefault: () => void;
  onManualSyncSupabase?: () => Promise<void>;
  onLogout?: () => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  settings,
  auditLogs,
  tasks,
  onSaveProfile,
  onSaveSettings,
  onPreviewPalette,
  onResetSettingsToDefault,
  onLogout,
  colorPalette,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const currentPal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [courseOrGoal, setCourseOrGoal] = useState(user?.courseOrGoal || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [selectedThemeMode, setSelectedThemeMode] = useState<ThemeMode>(settings?.themeMode || 'dark');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(colorPalette || settings?.colorPalette || 'purple');
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings?.notificationsEnabled ?? true);
  const [reviewRemindersEnabled, setReviewRemindersEnabled] = useState(settings?.reviewRemindersEnabled ?? true);
  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? true);

  const [settingsSavedFeedback, setSettingsSavedFeedback] = useState(false);

  // Subjects (Disciplinas / Matérias) management state
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColorPick, setNewSubjectColorPick] = useState(DEFAULT_SUBJECT_COLORS[0]);
  const [subjectFormError, setSubjectFormError] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectColor, setEditSubjectColor] = useState('');
  const [subjectPendingDelete, setSubjectPendingDelete] = useState<SubjectItem | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setCourseOrGoal(user?.courseOrGoal || '');
    setAvatar(user?.avatar || '');
  }, [user]);

  useEffect(() => {
    setSubjects(DataService.getSubjects(user.id));
  }, [user.id]);

  const linkedTaskCount = (subjectName: string) =>
    tasks.filter((t) => t.subject.trim().toLowerCase() === subjectName.trim().toLowerCase()).length;

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSubjectName.trim();
    if (!clean) return;
    const duplicate = subjects.some((s) => s.name.trim().toLowerCase() === clean.toLowerCase());
    if (duplicate) {
      setSubjectFormError('Já existe uma disciplina cadastrada com esse nome.');
      return;
    }
    DataService.addSubject(clean, newSubjectColorPick, user.id);
    setSubjects(DataService.getSubjects(user.id));
    setNewSubjectName('');
    setSubjectFormError('');
  };

  const startEditSubject = (s: SubjectItem) => {
    setEditingSubjectId(s.id);
    setEditSubjectName(s.name);
    setEditSubjectColor(s.color);
    setSubjectFormError('');
  };

  const cancelEditSubject = () => {
    setEditingSubjectId(null);
    setSubjectFormError('');
  };

  const saveEditSubject = () => {
    if (!editingSubjectId) return;
    const clean = editSubjectName.trim();
    if (!clean) return;
    const duplicate = subjects.some(
      (s) => s.id !== editingSubjectId && s.name.trim().toLowerCase() === clean.toLowerCase()
    );
    if (duplicate) {
      setSubjectFormError('Já existe uma disciplina cadastrada com esse nome.');
      return;
    }
    DataService.updateSubject(editingSubjectId, { name: clean, color: editSubjectColor }, user.id);
    setSubjects(DataService.getSubjects(user.id));
    setEditingSubjectId(null);
    setSubjectFormError('');
  };

  const confirmDeleteSubject = () => {
    if (!subjectPendingDelete) return;
    DataService.deleteSubject(subjectPendingDelete.id, user.id);
    setSubjects(DataService.getSubjects(user.id));
    setSubjectPendingDelete(null);
  };

  useEffect(() => {
    setSelectedPalette(colorPalette);
  }, [colorPalette]);

  const handlePaletteSelect = (palKey: ColorPalette) => {
    setSelectedPalette(palKey);
    onPreviewPalette?.(palKey);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      name: name.trim(),
      courseOrGoal: courseOrGoal.trim(),
      avatar: avatar.trim(),
    });
    setProfileSavedFeedback(true);
    setTimeout(() => setProfileSavedFeedback(false), 2500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
          // Upload directly to background storage
          const cloudUrl = await SupabaseSyncService.uploadAvatar(user.id, file);
          if (cloudUrl) {
            setAvatar(cloudUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      themeMode: selectedThemeMode,
      colorPalette: selectedPalette,
      notificationsEnabled,
      reviewRemindersEnabled,
      soundEnabled,
    });
    setSettingsSavedFeedback(true);
    setTimeout(() => setSettingsSavedFeedback(false), 2500);
  };

  return (
    <div id="settings-view-container" className="max-w-4xl mx-auto space-y-7 sm:space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Configurações
        </h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Gerencie seu perfil de estudante, preferências de estudo e aparência do app.
        </p>
      </div>

      {/* 1. PERFIL DO USUÁRIO */}
      <section
        className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 pb-4 border-b mb-5" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <User className="w-5 h-5" style={{ color: currentPal.previewColor }} />
          <h2 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Perfil do Estudante</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-2">
            <div className="relative group">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt="Avatar do Estudante"
                className="w-20 h-20 rounded-2xl object-cover shadow-md"
                style={{ outline: `2px solid ${currentPal.previewColor}` }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Trocar Foto"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold">Alterar</span>
              </button>
            </div>

            <div className="flex-1 w-full space-y-2 text-center sm:text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" style={{ color: currentPal.previewColor }} />
                  <span>Escolher Foto do Dispositivo</span>
                </button>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Foto do perfil salva e vinculada à sua conta de estudos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Nome Completo *</label>
              <input
                type="text"
                required
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
                style={{ borderColor: undefined }}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Curso / Objetivo Acadêmico</label>
              <input
                type="text"
                value={courseOrGoal || ''}
                onChange={(e) => setCourseOrGoal(e.target.value)}
                placeholder="Ex: Medicina, Concurso Magistratura, Engenharia..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100 placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {profileSavedFeedback ? (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <Check className="w-4 h-4" /> Perfil atualizado com sucesso!
              </span>
            ) : <div />}

            <div className="flex items-center gap-2">
              {onLogout && (
                <button
                  type="button"
                  id="settings-logout-btn"
                  onClick={onLogout}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                      : 'border-slate-300 bg-slate-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              )}

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: currentPal.previewColor }}
              >
                <Save className="w-4 h-4" />
                <span>Salvar Perfil</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 2. TEMAS & PALETAS DE CORES */}
      <section
        className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b mb-5" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Palette className="w-5 h-5 shrink-0" style={{ color: currentPal.previewColor }} />
            <div className="w-full">
              <h2 className={`font-bold text-base w-full ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Aparência & Paletas de Cores</h2>
              <p className={`hidden sm:block text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Personalize o visual e a atmosfera de estudos com visualização instantânea</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetSettingsToDefault}
            className={`flex items-center justify-center sm:justify-start gap-1 text-xs cursor-pointer py-1 px-2.5 sm:p-0 rounded-lg sm:rounded-none w-full sm:w-auto ${
              isDark ? 'bg-slate-800 sm:bg-transparent text-slate-300 hover:text-slate-100' : 'bg-slate-100 sm:bg-transparent text-slate-700 hover:text-slate-900'
            }`}
            title="Restaurar padrões de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
        </div>

        <form onSubmit={handleSettingsSubmit} className="space-y-5 text-xs sm:text-sm">
          {/* Light / Dark Mode Toggle */}
          <div>
            <label className={`block font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Modo de Exibição</label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setSelectedThemeMode('dark')}
                className={`p-3 rounded-2xl border flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer ${
                  selectedThemeMode === 'dark'
                    ? isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-900 text-white shadow-xs'
                    : isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                style={selectedThemeMode === 'dark' ? { borderColor: currentPal.previewColor, boxShadow: `0 0 0 1px ${currentPal.previewColor}` } : {}}
              >
                <Moon className="w-4 h-4" style={{ color: currentPal.previewColor }} />
                <span>Modo Escuro</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedThemeMode('light')}
                className={`p-3 rounded-2xl border flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer ${
                  selectedThemeMode === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
                style={selectedThemeMode === 'light' ? { borderColor: currentPal.previewColor, boxShadow: `0 0 0 1px ${currentPal.previewColor}` } : {}}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Modo Claro</span>
              </button>
            </div>
          </div>

          {/* 4 Pre-defined Color Palettes */}
          <div>
            <label className={`block font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Paletas de Cores de Destaque
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['purple', 'emerald', 'indigo', 'amber'] as ColorPalette[]).map((palKey) => {
                const p = COLOR_PALETTES[palKey];
                const isSelected = selectedPalette === palKey;

                return (
                  <div
                    key={palKey}
                    onClick={() => handlePaletteSelect(palKey)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? isDark
                          ? 'bg-slate-800/90 shadow-md'
                          : 'bg-slate-50 shadow-sm'
                        : isDark
                        ? 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                    style={isSelected ? {
                      borderColor: p.previewColor,
                      boxShadow: `0 0 0 2px ${p.previewColor}40`
                    } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-xl shadow-xs flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: p.previewColor }}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <p className={`font-bold text-xs sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{p.name}</p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <span className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: p.previewColor }} />
                      <span className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: p.previewSecondary }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-2 border-t space-y-3" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4" style={{ color: currentPal.previewColor }} />
              <h3 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Notificações & Lembretes</h3>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={`font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Lembretes de Revisão Espaçada</span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avisar quando houver revisões programadas no dia</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!reviewRemindersEnabled}
                  onChange={(e) => setReviewRemindersEnabled(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: currentPal.previewColor }}
                />
              </label>

              <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={`font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Alertas de Sequência Diária</span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lembrete para manter a consistência de estudos</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: currentPal.previewColor }}
                />
              </label>
            </div>
          </div>

          {/* Save Settings Button */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
            {settingsSavedFeedback ? (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <Check className="w-4 h-4" /> Preferências salvas com sucesso!
              </span>
            ) : <div />}

            <button
              type="submit"
              id="save-preferences-btn"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: currentPal.previewColor }}
            >
              <Save className="w-4 h-4" />
              <span>Salvar Preferências</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. DISCIPLINAS & MATÉRIAS */}
      <section
        className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 pb-4 border-b mb-5" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <BookOpen className="w-5 h-5" style={{ color: currentPal.previewColor }} />
          <div>
            <h2 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Disciplinas & Matérias</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cadastre, edite ou remova as disciplinas usadas nos seus cards de estudo</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* New Subject Form */}
          <form onSubmit={handleAddSubject} className={`p-3.5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => {
                  setNewSubjectName(e.target.value);
                  setSubjectFormError('');
                }}
                placeholder="Nome da nova disciplina..."
                className={`flex-1 px-3.5 py-2.5 rounded-xl border font-medium focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                }`}
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition-transform hover:scale-[1.02] shrink-0"
                style={{ backgroundColor: currentPal.previewColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cor:</span>
              {DEFAULT_SUBJECT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewSubjectColorPick(c)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    newSubjectColorPick === c ? 'scale-125 ring-2 ring-white ring-offset-1' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            {subjectFormError && !editingSubjectId && (
              <p className="text-[11px] text-rose-500 font-medium">{subjectFormError}</p>
            )}
          </form>

          {/* Subjects List */}
          <div className="space-y-2">
            {subjects.length === 0 ? (
              <p className={`text-xs text-center py-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Nenhuma disciplina cadastrada ainda.
              </p>
            ) : (
              subjects.map((s) => {
                const isEditing = editingSubjectId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editSubjectName}
                            onChange={(e) => setEditSubjectName(e.target.value)}
                            className={`flex-1 px-3 py-2 rounded-lg border font-medium focus:outline-hidden ${
                              isDark
                                ? 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-purple-500'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                            }`}
                          />
                          <span
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: editSubjectColor }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {DEFAULT_SUBJECT_COLORS.map((c) => (
                            <button
                              type="button"
                              key={c}
                              onClick={() => setEditSubjectColor(c)}
                              className={`rounded-full transition-transform cursor-pointer ${
                                editSubjectColor === c ? 'scale-125 ring-2 ring-white ring-offset-1' : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c, width: '1.1rem', height: '1.1rem' }}
                              title={c}
                            />
                          ))}
                        </div>
                        {subjectFormError && (
                          <p className="text-[11px] text-rose-500 font-medium">{subjectFormError}</p>
                        )}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEditSubject}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={saveEditSubject}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                            style={{ backgroundColor: currentPal.previewColor }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className={`flex-1 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{s.name}</span>
                        <span className={`text-[11px] shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {linkedTaskCount(s.name)} card{linkedTaskCount(s.name) === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditSubject(s)}
                          title="Editar disciplina"
                          className={`p-1.5 rounded-lg cursor-pointer shrink-0 ${
                            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectPendingDelete(s)}
                          title="Excluir disciplina"
                          className="p-1.5 rounded-lg cursor-pointer shrink-0 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 4. HISTÓRICO DE ALTERAÇÕES & ATIVIDADES */}
      <section
        className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 pb-4 border-b mb-4" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <History className="w-5 h-5" style={{ color: currentPal.previewColor }} />
          <h2 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Histórico de Atividades</h2>
        </div>

        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
          {auditLogs.length === 0 ? (
            <p className={`text-xs text-center py-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum registro no histórico.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.action}: </span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{log.details}</span>
                </div>
                <span className={`text-[10px] whitespace-nowrap shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Delete Subject Confirmation Modal */}
      {subjectPendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSubjectPendingDelete(null);
          }}
        >
          <div className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
            isDark ? 'border-rose-500/40 bg-slate-900 text-slate-100' : 'border-rose-300 bg-white text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className={`font-bold text-lg mb-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Excluir "{subjectPendingDelete.name}"?
            </h3>

            {linkedTaskCount(subjectPendingDelete.name) > 0 ? (
              <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Esta disciplina está vinculada a <strong>{linkedTaskCount(subjectPendingDelete.name)} card{linkedTaskCount(subjectPendingDelete.name) === 1 ? '' : 's'}</strong> de estudo já criado{linkedTaskCount(subjectPendingDelete.name) === 1 ? '' : 's'}.
                Ao excluir, ela deixará de aparecer na lista de seleção, mas os cards existentes manterão o nome e a cor atuais. Deseja continuar mesmo assim?
              </p>
            ) : (
              <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Nenhum card de estudo está vinculado a esta disciplina. Essa ação é irreversível.
              </p>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSubjectPendingDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubject}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
