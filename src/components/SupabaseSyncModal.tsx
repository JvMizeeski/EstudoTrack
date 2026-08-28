import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Code2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SupabaseSyncService } from '../lib/supabaseSync';
import { SUPABASE_URL } from '../lib/supabase';

export const SUPABASE_CLEANUP_DROP_SQL_CODE = `-- ============================================================================
-- 1. ESTUDATRACK - SCRIPT PARA DELETAR / RESETAR TUDO NO SUPABASE (LIMPEZA TOTAL)
-- ============================================================================
-- Execute este script no SQL Editor caso queira limpar qualquer resquício antigo:

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_challenges CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.library_items CASCADE;
DROP TABLE IF EXISTS public.study_tasks CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.study_images CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Limpar cache do schema
NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_SCHEMA_SQL_CODE = `-- ============================================================================
-- 2. ESTUDATRACK - SCRIPT DE CRIAÇÃO DO ZERO (SEM RLS / ACESSO LIVRE + REALTIME)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS E USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT,
    avatar TEXT,
    course_or_goal TEXT DEFAULT 'Estudos Acadêmicos',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    target_weekly_minutes INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(lower(name));

-- 2. TABELA DE MATÉRIAS
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);

-- 3. TABELA DE CARDS DE ESTUDO & REVISÃO ESPAÇADA
CREATE TABLE IF NOT EXISTS public.study_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    category_color TEXT DEFAULT '#8b5cf6',
    date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER DEFAULT 45,
    is_specific_time BOOLEAN DEFAULT FALSE,
    recurrence TEXT DEFAULT 'none',
    recurrence_days INTEGER[] DEFAULT '{}',
    excluded_dates TEXT[] DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_dates TEXT[] DEFAULT '{}',
    notes TEXT DEFAULT '',
    notes_html TEXT,
    images TEXT[] DEFAULT '{}',
    review_scheduled BOOLEAN DEFAULT FALSE,
    next_review_date DATE,
    review_stage INTEGER DEFAULT 1,
    priority TEXT DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_tasks_user_date ON public.study_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_study_tasks_completed ON public.study_tasks(user_id, completed);

-- 4. TABELA DE BIBLIOTECA & LEITURAS
CREATE TABLE IF NOT EXISTS public.library_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'book',
    status TEXT NOT NULL DEFAULT 'want_to_read',
    progress INTEGER DEFAULT 0,
    total_units INTEGER,
    unit_label TEXT DEFAULT 'páginas',
    rating INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    cover_url TEXT,
    tags TEXT[] DEFAULT '{}',
    date_started DATE,
    date_finished DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_items_user_status ON public.library_items(user_id, status);

-- 5. TABELAS DE GAMIFICAÇÃO, NOTIFICAÇÕES E LOGS
CREATE TABLE IF NOT EXISTS public.user_badges (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'Award',
    unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    category TEXT DEFAULT 'studies',
    current_progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 1,
    xp_reward INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_challenges (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_type TEXT NOT NULL,
    current INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 100,
    expires_at TIMESTAMPTZ,
    completed BOOLEAN DEFAULT FALSE,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'review',
    date TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    task_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id TEXT,
    file_name TEXT,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DESABILITAR RLS PARA ACESSO DIRETO SEM BLOQUEIOS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_images DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;

-- 7. CONFIGURAÇÃO DE BUCKETS DE STORAGE PÚBLICO
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('estudatrack-images', 'estudatrack-images', true),
    ('avatars', 'avatars', true),
    ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Storage" ON storage.objects;
CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Upload Storage" ON storage.objects;
CREATE POLICY "Public Upload Storage" ON storage.objects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Storage" ON storage.objects;
CREATE POLICY "Public Update Storage" ON storage.objects FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public Delete Storage" ON storage.objects;
CREATE POLICY "Public Delete Storage" ON storage.objects FOR DELETE USING (true);

-- 8. REALTIME EM TEMPO REAL
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.study_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.library_items REPLICA IDENTITY FULL;
ALTER TABLE public.subjects REPLICA IDENTITY FULL;
ALTER TABLE public.user_badges REPLICA IDENTITY FULL;
ALTER TABLE public.user_challenges REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.study_tasks;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.library_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_challenges;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- 9. RECARREGAR CACHE DO POSTGREST IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';
`;

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const [selectedTab, setSelectedTab] = useState<'create' | 'drop'>('create');
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    tablesExist: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCode = selectedTab === 'drop' ? SUPABASE_CLEANUP_DROP_SQL_CODE : SUPABASE_SCHEMA_SQL_CODE;

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleRunTest = async () => {
    setIsChecking(true);
    setTestResult(null);
    try {
      const res = await SupabaseSyncService.checkConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Erro ao conectar.',
        tablesExist: false,
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Extract project ref from URL if possible
  const projectRef = SUPABASE_URL ? SUPABASE_URL.replace('https://', '').split('.')[0] : '';
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden my-3 sm:my-8 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Configuração & Scripts do Supabase</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Scripts prontos para resetar ou configurar as tabelas do zero
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Test Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              testResult === null
                ? isDark
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
                : testResult.ok
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              {testResult === null ? (
                <Database className="w-5 h-5 text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : testResult.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <p className="font-bold text-xs">
                  {testResult === null
                    ? 'Status da Conexão com o Supabase'
                    : testResult.ok
                    ? 'Tabelas Criadas e Sincronizando!'
                    : 'Tabelas Pendentes no Supabase'}
                </p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {testResult === null
                    ? 'Clique no botão ao lado para testar se as tabelas já foram criadas no banco.'
                    : testResult.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunTest}
              disabled={isChecking}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Testando...' : 'Testar Conexão'}</span>
            </button>
          </div>

          {/* Script Selector Tabs */}
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
            <button
              type="button"
              onClick={() => { setSelectedTab('create'); setCopied(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                selectedTab === 'create'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Passo 2: Criar Tabelas do Zero</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedTab('drop'); setCopied(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                selectedTab === 'drop'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Passo 1: Deletar / Limpar Tudo (Drop)</span>
            </button>
          </div>

          {/* SQL Preview & Copy Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {selectedTab === 'drop' ? (
                  <span className="text-rose-400">Script de Limpeza (DROP Tables)</span>
                ) : (
                  <span className="text-purple-400">Script de Configuração Completa (CREATE Tables)</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={sqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 underline"
                >
                  <span>Abrir SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={handleCopySQL}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : selectedTab === 'drop' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Script'}</span>
                </button>
              </div>
            </div>

            {/* Code Block Container */}
            <div
              className={`max-h-56 overflow-y-auto rounded-2xl border p-3 font-mono text-[11px] leading-relaxed ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <pre className="whitespace-pre">{currentCode}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

