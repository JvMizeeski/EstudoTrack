import { supabase, isSupabaseConfigured, uploadImageToSupabase } from './supabase';
import {
  UserProfile,
  StudyTask,
  LibraryItem,
  SubjectItem,
} from '../types';
import { StoredUserAccount } from './storage';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeHandlers {
  onTasksChange?: (tasks: StudyTask[]) => void;
  onTaskUpsert?: (task: StudyTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onLibraryChange?: (items: LibraryItem[]) => void;
  onLibraryUpsert?: (item: LibraryItem) => void;
  onLibraryDelete?: (itemId: string) => void;
  onProfileUpdate?: (profile: UserProfile) => void;
  onSubjectsChange?: (subjects: SubjectItem[]) => void;
  onStatusChange?: (status: { connected: boolean; message: string }) => void;
}

export interface SyncResponse {
  ok: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export class SupabaseSyncService {
  private static activeChannel: RealtimeChannel | null = null;

  /**
   * Quick connection and schema check for Supabase
   */
  static async checkConnection(): Promise<{ ok: boolean; message: string; tablesExist: boolean }> {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message: 'Chaves do Supabase não configuradas no app.',
        tablesExist: false,
      };
    }
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        const isTableMissing =
          error.code === '42P01' ||
          error.code === 'PGRST125' ||
          error.message.toLowerCase().includes('invalid path') ||
          error.message.toLowerCase().includes('does not exist') ||
          error.message.toLowerCase().includes('not found');

        if (isTableMissing) {
          return {
            ok: false,
            message: 'Tabela "profiles" ainda não foi criada no Supabase. Execute o script SQL no seu painel.',
            tablesExist: false,
          };
        }
        if (error.code === '42501' || error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('permission denied')) {
          return {
            ok: false,
            message: 'Permissão negada pelo RLS no Supabase. Execute o script SQL para liberar o acesso.',
            tablesExist: true,
          };
        }
        return {
          ok: false,
          message: `Erro ao consultar Supabase: ${error.message}`,
          tablesExist: false,
        };
      }
      return {
        ok: true,
        message: 'Conexão ativa e tabelas prontas no Supabase!',
        tablesExist: true,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || 'Falha na conexão de rede com o Supabase.',
        tablesExist: false,
      };
    }
  }

  // ==========================================
  // REALTIME SUBSCRIPTION ENGINE
  // ==========================================
  static subscribeToRealtime(userId: string, handlers: RealtimeHandlers): () => void {
    if (!isSupabaseConfigured()) {
      handlers.onStatusChange?.({ connected: false, message: 'Supabase não configurado' });
      return () => {};
    }

    if (this.activeChannel) {
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }

    const channelName = `realtime-user-${userId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // 1. Study Tasks Realtime
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'study_tasks',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId && handlers.onTaskDelete) {
            handlers.onTaskDelete(oldId);
          }
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (row && handlers.onTaskUpsert) {
            const mappedTask: StudyTask = {
              id: row.id,
              userId: row.user_id,
              title: row.title,
              subject: row.subject,
              categoryColor: row.category_color,
              date: row.date,
              startTime: row.start_time || undefined,
              endTime: row.end_time || undefined,
              durationMinutes: row.duration_minutes || 0,
              isSpecificTime: Boolean(row.is_specific_time),
              recurrence: row.recurrence || 'none',
              recurrenceDays: row.recurrence_days || [],
              excludedDates: row.excluded_dates || [],
              completed: Boolean(row.completed),
              completedAt: row.completed_at || undefined,
              notes: row.notes || '',
              notesHtml: row.notes_html || undefined,
              images: row.images || [],
              reviewScheduled: Boolean(row.review_scheduled),
              nextReviewDate: row.next_review_date || undefined,
              reviewStage: row.review_stage || 1,
              priority: row.priority || 'medium',
              tags: row.tags || [],
              createdAt: row.created_at || new Date().toISOString(),
            };
            handlers.onTaskUpsert(mappedTask);
          }
        }
      }
    );

    // 2. Library Items Realtime
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'library_items',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId && handlers.onLibraryDelete) {
            handlers.onLibraryDelete(oldId);
          }
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (row && handlers.onLibraryUpsert) {
            const mappedItem: LibraryItem = {
              id: row.id,
              userId: row.user_id,
              title: row.title,
              author: row.author,
              type: row.type || 'book',
              status: row.status || 'want_to_read',
              progress: row.progress || 0,
              totalUnits: row.total_units || undefined,
              unitLabel: row.unit_label || 'páginas',
              rating: row.rating || 0,
              notes: row.notes || '',
              coverUrl: row.cover_url || undefined,
              tags: row.tags || [],
              dateStarted: row.date_started || undefined,
              dateFinished: row.date_finished || undefined,
              createdAt: row.created_at || new Date().toISOString(),
            };
            handlers.onLibraryUpsert(mappedItem);
          }
        }
      }
    );

    // 3. Profiles Realtime
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && handlers.onProfileUpdate) {
          const row = payload.new as any;
          const mappedProfile: UserProfile = {
            id: row.id,
            name: row.name,
            email: row.email || '',
            avatar: row.avatar || '',
            courseOrGoal: row.course_or_goal || '',
            level: row.level || 1,
            xp: row.xp || 0,
            streakDays: row.streak_days || 0,
            lastActiveDate: row.last_active_date || new Date().toISOString().split('T')[0],
            targetWeeklyMinutes: row.target_weekly_minutes || 300,
            createdAt: row.created_at || new Date().toISOString(),
          };
          handlers.onProfileUpdate(mappedProfile);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onStatusChange?.({ connected: true, message: 'Tempo real ativo e sincronizado' });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        handlers.onStatusChange?.({ connected: false, message: 'Tentando reconectar tempo real...' });
      }
    });

    this.activeChannel = channel;

    return () => {
      if (this.activeChannel) {
        supabase.removeChannel(this.activeChannel);
        this.activeChannel = null;
      }
    };
  }

  // ==========================================
  // 1. PROFILES & USER ACCOUNTS
  // ==========================================
  static async searchProfileByName(nameOrUsername: string): Promise<(UserProfile & { passwordHash?: string }) | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const clean = nameOrUsername.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', clean)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase searchProfileByName error]', error);
        return null;
      }
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email || '',
        avatar: data.avatar || '',
        courseOrGoal: data.course_or_goal || '',
        level: data.level || 1,
        xp: data.xp || 0,
        streakDays: data.streak_days || 0,
        lastActiveDate: data.last_active_date || new Date().toISOString().split('T')[0],
        targetWeeklyMinutes: data.target_weekly_minutes || 300,
        createdAt: data.created_at || new Date().toISOString(),
        passwordHash: data.password_hash || '',
      };
    } catch (err) {
      console.warn('[Supabase searchProfileByName error]', err);
      return null;
    }
  }

  static async updatePasswordHash(userId: string, newHash: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('profiles').update({ password_hash: newHash }).eq('id', userId);
    } catch (err) {
      console.warn('[Supabase updatePasswordHash error]', err);
    }
  }

  static async fetchProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email || '',
        avatar: data.avatar || '',
        courseOrGoal: data.course_or_goal || '',
        level: data.level || 1,
        xp: data.xp || 0,
        streakDays: data.streak_days || 0,
        lastActiveDate: data.last_active_date || new Date().toISOString().split('T')[0],
        targetWeeklyMinutes: data.target_weekly_minutes || 300,
        createdAt: data.created_at || new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[Supabase fetchProfile error]', err);
      return null;
    }
  }

  static async syncProfile(profile: UserProfile, password?: string): Promise<SyncResponse> {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: 'Supabase não configurado.' };
    }
    try {
      // First try upserting with password_hash if provided
      const payload: Record<string, any> = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        course_or_goal: profile.courseOrGoal,
        level: profile.level,
        xp: profile.xp,
        streak_days: profile.streakDays,
        last_active_date: profile.lastActiveDate,
        target_weekly_minutes: profile.targetWeeklyMinutes,
        updated_at: new Date().toISOString(),
      };

      if (password) {
        payload.password_hash = password;
      }

      let { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

      // If failed due to column password_hash missing, retry without it
      if (error && (error.code === '42703' || error.message.includes('password_hash'))) {
        delete payload.password_hash;
        const retryResult = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        error = retryResult.error;
      }

      if (error) {
        const isTableMissing =
          error.code === '42P01' ||
          error.code === 'PGRST125' ||
          error.message?.toLowerCase().includes('invalid path') ||
          error.message?.toLowerCase().includes('does not exist');

        if (isTableMissing) {
          console.warn('[Supabase syncProfile notice: Tabela "profiles" ainda não foi criada no Supabase]');
          return {
            ok: false,
            error: error.message,
            code: error.code || 'PGRST125',
            message: 'Tabela "profiles" não existe no Supabase. Execute o script SQL no painel.',
          };
        }

        console.warn('[Supabase syncProfile error]', error);
        return {
          ok: false,
          error: error.message,
          code: error.code,
          message: `Erro Supabase: ${error.message}`,
        };
      }

      return { ok: true, message: 'Perfil salvo com sucesso no Supabase!' };
    } catch (err: any) {
      console.error('[Supabase syncProfile exception]', err);
      return { ok: false, error: err?.message || 'Erro inesperado ao salvar no Supabase.' };
    }
  }

  // ==========================================
  // 2. STUDY TASKS
  // ==========================================
  static async fetchTasks(userId: string): Promise<StudyTask[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        subject: row.subject,
        categoryColor: row.category_color,
        date: row.date,
        startTime: row.start_time || undefined,
        endTime: row.end_time || undefined,
        durationMinutes: row.duration_minutes || 0,
        isSpecificTime: Boolean(row.is_specific_time),
        recurrence: row.recurrence || 'none',
        recurrenceDays: row.recurrence_days || [],
        excludedDates: row.excluded_dates || [],
        completed: Boolean(row.completed),
        completedAt: row.completed_at || undefined,
        notes: row.notes || '',
        notesHtml: row.notes_html || undefined,
        images: row.images || [],
        reviewScheduled: Boolean(row.review_scheduled),
        nextReviewDate: row.next_review_date || undefined,
        reviewStage: row.review_stage || 1,
        priority: row.priority || 'medium',
        tags: row.tags || [],
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('[Supabase fetchTasks error]', err);
      return null;
    }
  }

  static async syncTask(task: StudyTask): Promise<SyncResponse> {
    if (!isSupabaseConfigured()) return { ok: false };
    try {
      const { error } = await supabase.from('study_tasks').upsert(
        {
          id: task.id,
          user_id: task.userId,
          title: task.title,
          subject: task.subject,
          category_color: task.categoryColor,
          date: task.date,
          start_time: task.startTime || null,
          end_time: task.endTime || null,
          duration_minutes: task.durationMinutes,
          is_specific_time: task.isSpecificTime,
          recurrence: task.recurrence,
          recurrence_days: task.recurrenceDays || [],
          excluded_dates: task.excludedDates || [],
          completed: task.completed,
          completed_at: task.completedAt || null,
          notes: task.notes || '',
          notes_html: task.notesHtml || null,
          images: task.images || [],
          review_scheduled: task.reviewScheduled || false,
          next_review_date: task.nextReviewDate || null,
          review_stage: task.reviewStage || 1,
          priority: task.priority || 'medium',
          tags: task.tags || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[Supabase syncTask notice]', error.message || error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('[Supabase syncTask exception]', err);
      return { ok: false, error: err?.message };
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase.from('study_tasks').delete().eq('id', taskId);
      if (error) console.warn('[Supabase deleteTask error]', error);
    } catch (err) {
      console.warn('[Supabase deleteTask error]', err);
    }
  }

  // ==========================================
  // 3. LIBRARY ITEMS
  // ==========================================
  static async fetchLibrary(userId: string): Promise<LibraryItem[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        author: row.author,
        type: row.type || 'book',
        status: row.status || 'want_to_read',
        progress: row.progress || 0,
        totalUnits: row.total_units || undefined,
        unitLabel: row.unit_label || 'páginas',
        rating: row.rating || 0,
        notes: row.notes || '',
        coverUrl: row.cover_url || undefined,
        tags: row.tags || [],
        dateStarted: row.date_started || undefined,
        dateFinished: row.date_finished || undefined,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('[Supabase fetchLibrary error]', err);
      return null;
    }
  }

  static async syncLibraryItem(item: LibraryItem): Promise<SyncResponse> {
    if (!isSupabaseConfigured()) return { ok: false };
    try {
      const { error } = await supabase.from('library_items').upsert(
        {
          id: item.id,
          user_id: item.userId,
          title: item.title,
          author: item.author,
          type: item.type,
          status: item.status,
          progress: item.progress,
          total_units: item.totalUnits || null,
          unit_label: item.unitLabel || 'páginas',
          rating: item.rating || 0,
          notes: item.notes || '',
          cover_url: item.coverUrl || null,
          tags: item.tags || [],
          date_started: item.dateStarted || null,
          date_finished: item.dateFinished || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[Supabase syncLibraryItem notice]', error.message || error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('[Supabase syncLibraryItem exception]', err);
      return { ok: false, error: err?.message };
    }
  }

  static async deleteLibraryItem(itemId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase.from('library_items').delete().eq('id', itemId);
      if (error) console.warn('[Supabase deleteLibraryItem error]', error);
    } catch (err) {
      console.warn('[Supabase deleteLibraryItem error]', err);
    }
  }

  // ==========================================
  // 4. SUBJECTS
  // ==========================================
  static async fetchSubjects(userId: string): Promise<SubjectItem[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId);

      if (error || !data || data.length === 0) return null;

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        color: row.color,
      }));
    } catch (err) {
      console.warn('[Supabase fetchSubjects error]', err);
      return null;
    }
  }

  static async syncSubject(subject: SubjectItem, userId: string): Promise<SyncResponse> {
    if (!isSupabaseConfigured()) return { ok: false };
    try {
      const { error } = await supabase.from('subjects').upsert(
        {
          id: subject.id,
          user_id: userId,
          name: subject.name,
          color: subject.color,
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[Supabase syncSubject notice]', error.message || error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('[Supabase syncSubject error]', err);
      return { ok: false, error: err?.message };
    }
  }

  // ==========================================
  // 5. IMAGE UPLOADS
  // ==========================================
  static async uploadTaskImage(userId: string, imageSource: string | File): Promise<string> {
    const fileName = `${userId}/task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const url = await uploadImageToSupabase('estudatrack-images', fileName, imageSource);
    if (url) {
      try {
        await supabase.from('study_images').insert({
          id: 'img-' + Date.now(),
          user_id: userId,
          file_name: fileName,
          file_url: url,
        });
      } catch {
        // ignore
      }
      return url;
    }
    return typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
  }

  static async uploadAvatar(userId: string, imageSource: string | File): Promise<string> {
    const fileName = `${userId}/avatar_${Date.now()}.jpg`;
    const url = await uploadImageToSupabase('avatars', fileName, imageSource);
    return url || (typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
  }

  static async uploadCover(userId: string, imageSource: string | File): Promise<string> {
    const fileName = `${userId}/cover_${Date.now()}.jpg`;
    const url = await uploadImageToSupabase('covers', fileName, imageSource);
    return url || (typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
  }

  // ==========================================
  // 6. DELETE USER ACCOUNT (CLOUD CLEANUP)
  // ==========================================
  static async deleteUserAccount(userId: string): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { ok: true };
    try {
      // Delete user's records across all tables
      await supabase.from('study_tasks').delete().eq('user_id', userId);
      await supabase.from('library_items').delete().eq('user_id', userId);
      await supabase.from('subjects').delete().eq('user_id', userId);
      await supabase.from('user_badges').delete().eq('user_id', userId);
      await supabase.from('user_challenges').delete().eq('user_id', userId);
      await supabase.from('notifications').delete().eq('user_id', userId);
      await supabase.from('audit_logs').delete().eq('user_id', userId);
      await supabase.from('study_images').delete().eq('user_id', userId);
      
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        console.warn('[Supabase deleteUserAccount error]', error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('[Supabase deleteUserAccount exception]', err);
      return { ok: false, error: err?.message };
    }
  }
}
