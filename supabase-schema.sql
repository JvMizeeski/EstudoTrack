-- ============================================================================
-- ESTUDATRACK - SCRIPT SQL COMPLETO PARA O SUPABASE (SEM RLS / ACESSO LIVRE + REALTIME)
-- ============================================================================
-- Instruções:
-- 1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/ioslmxuqluwxojyzwbxn/sql
-- 2. Cole este script completo no SQL Editor e clique em "RUN".
-- 3. Todas as tabelas, permissões de acesso anon/authenticated e realtime estarão 100% ativas!
-- ============================================================================

-- Habilitar extensão para IDs e UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABELAS PRINCIPAIS
-- ============================================================================

-- 1.1 PROFILES (Perfil do Usuário, Login, XP, Nível, Ofensiva e Meta)
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

-- Adiciona coluna password_hash se a tabela já existia sem ela
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- 1.2 SUBJECTS (Matérias e Disciplinas Personalizadas)
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);

-- 1.3 STUDY_TASKS (Cards de Estudo, Revisão Espaçada, Anexos e Notas)
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
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT DEFAULT '',
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

-- 1.4 LIBRARY_ITEMS (Acervo de Livros, Apostilas, Artigos e Leituras)
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

-- 1.5 USER_BADGES (Conquistas e Medalhas Gamificadas)
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

-- 1.6 USER_CHALLENGES (Desafios Semanais com Recompensas de XP)
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

-- 1.7 NOTIFICATIONS (Notificações e Avisos de Revisão)
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

-- 1.8 AUDIT_LOGS (Registro de Histórico e Atividades)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 STUDY_IMAGES (Fotos anexadas aos cards de estudo)
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

-- ============================================================================
-- 2. DESABILITAR RLS (ROW LEVEL SECURITY) E CONCEDER PERMISSÕES
-- ============================================================================
-- Garante acesso direto, leitura e escrita livres para a aplicação web sem bloqueios.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_images DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- 3. STORAGE BUCKETS (Imagens, Anexos e Fotos de Perfil)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('estudatrack-images', 'estudatrack-images', true),
    ('avatars', 'avatars', true),
    ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas públicas para o storage (permitir upload, download e exclusão pública)
DROP POLICY IF EXISTS "Public Read Storage" ON storage.objects;
CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Upload Storage" ON storage.objects;
CREATE POLICY "Public Upload Storage" ON storage.objects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Storage" ON storage.objects;
CREATE POLICY "Public Update Storage" ON storage.objects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Storage" ON storage.objects;
CREATE POLICY "Public Delete Storage" ON storage.objects FOR DELETE USING (true);

-- ============================================================================
-- 4. ATIVAR REALTIME AUTOMÁTICO EM TEMPO REAL
-- ============================================================================
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

-- 5. RECARREGAR O CACHE DO POSTGREST IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';

