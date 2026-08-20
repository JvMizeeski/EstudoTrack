export type TimeSlotView = 'day' | 'week' | 'month';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface StudyTask {
  id: string;
  userId: string;
  title: string;
  subject: string;
  categoryColor: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes: number; // e.g. 45 min
  isSpecificTime: boolean;
  recurrence: RecurrenceType;
  recurrenceDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  completed: boolean;
  completedAt?: string;
  notes: string;
  images: string[]; // base64 or image URLs
  reviewScheduled?: boolean;
  nextReviewDate?: string; // YYYY-MM-DD
  reviewStage?: number; // 1=24h, 2=7d, 3=30d
  priority: TaskPriority;
  tags: string[];
  createdAt: string;
}

export type MediaItemType = 'book' | 'documentary' | 'article' | 'course' | 'paper';
export type MediaItemStatus = 'want_to_read' | 'reading' | 'completed' | 'paused';

export interface LibraryItem {
  id: string;
  userId: string;
  title: string;
  author: string;
  type: MediaItemType;
  status: MediaItemStatus;
  progress: number;
  totalUnits?: number; // pages, minutes or episodes
  unitLabel?: string; // 'páginas', 'minutos', 'aulas'
  rating: number; // 1-5
  notes: string;
  coverUrl?: string;
  tags: string[];
  dateStarted?: string;
  dateFinished?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'studies' | 'streak' | 'reviews' | 'library' | 'special';
  currentProgress: number;
  maxProgress: number;
  xpReward: number;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  targetType: 'tasks' | 'minutes' | 'reviews' | 'library';
  current: number;
  target: number;
  xpReward: number;
  expiresAt: string;
  completed: boolean;
  claimed: boolean;
}

export interface RankingUser {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  title: string;
  weeklyMinutes: number;
  tasksCompleted: number;
  streak: number;
  isCurrentUser?: boolean;
  positionChange: number; // +1, -1, 0
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  courseOrGoal: string;
  level: number;
  xp: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  targetWeeklyMinutes: number;
  createdAt: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  color: string;
}

export type ColorPalette = 'purple' | 'emerald' | 'indigo' | 'amber';
export type ThemeMode = 'dark' | 'light';

export interface AppSettings {
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  reviewRemindersEnabled: boolean;
  defaultView: TimeSlotView;
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSpacedRepetition: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'review' | 'streak' | 'achievement' | 'challenge' | 'system';
  date: string; // ISO
  read: boolean;
  taskId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}
