import { Badge, WeeklyChallenge } from '../types';

export const LEVEL_THRESHOLDS = [
  0,     // Nível 1: Novato dos Estudos
  100,   // Nível 2: Aprendiz Dedicado
  250,   // Nível 3: Estudante Focado
  500,   // Nível 4: Analista do Saber
  900,   // Nível 5: Maratonista Acadêmico
  1400,  // Nível 6: Mestre da Disciplina
  2000,  // Nível 7: Especialista Intelectual
  2800,  // Nível 8: Sábio do Conhecimento
  3800,  // Nível 9: Eminência da Sabedoria
  5000,  // Nível 10: Lendário do EstudoFlow
];

export const LEVEL_TITLES = [
  'Novato dos Estudos',
  'Aprendiz Dedicado',
  'Estudante Focado',
  'Analista do Saber',
  'Maratonista Acadêmico',
  'Mestre da Disciplina',
  'Especialista Intelectual',
  'Sábio do Conhecimento',
  'Eminência da Sabedoria',
  'Lendário do EstudoFlow',
];

export function calculateLevelFromXP(xp: number): { level: number; title: string; currentLevelXP: number; nextLevelXP: number; progressPercent: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentLevelBase = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelBase = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1500;
  const xpInCurrentLevel = Math.max(0, xp - currentLevelBase);
  const xpNeededForNext = nextLevelBase - currentLevelBase;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  return {
    level,
    title: LEVEL_TITLES[level - 1] || 'Grão-Mestre',
    currentLevelXP: xp,
    nextLevelXP: nextLevelBase,
    progressPercent,
  };
}

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'first_task',
    title: 'Primeiro Passo',
    description: 'Conclua sua primeira sessão ou tarefa de estudos no app.',
    iconName: 'Zap',
    unlocked: false,
    category: 'studies',
    currentProgress: 0,
    maxProgress: 1,
    xpReward: 50,
  },
  {
    id: 'streak_3',
    title: 'Hábito em Construção',
    description: 'Mantenha uma sequência de 3 dias seguidos estudando.',
    iconName: 'Flame',
    unlocked: false,
    category: 'streak',
    currentProgress: 0,
    maxProgress: 3,
    xpReward: 100,
  },
  {
    id: 'streak_7',
    title: 'Semana Imbatível',
    description: 'Estude por 7 dias ininterruptos.',
    iconName: 'Trophy',
    unlocked: false,
    category: 'streak',
    currentProgress: 0,
    maxProgress: 7,
    xpReward: 250,
  },
  {
    id: 'deep_notes',
    title: 'Resumidor Mestre',
    description: 'Crie resumos detalhados com texto e imagens em 5 cards de estudo.',
    iconName: 'FileText',
    unlocked: false,
    category: 'studies',
    currentProgress: 0,
    maxProgress: 5,
    xpReward: 120,
  },
  {
    id: 'review_master',
    title: 'Mestre da Revisão',
    description: 'Complete 5 revisões programadas no prazo.',
    iconName: 'RotateCcw',
    unlocked: false,
    category: 'reviews',
    currentProgress: 0,
    maxProgress: 5,
    xpReward: 150,
  },
  {
    id: 'bookworm',
    title: 'Rato de Biblioteca',
    description: 'Adicione e conclua a leitura de 2 livros ou artigos na Biblioteca.',
    iconName: 'BookMarked',
    unlocked: false,
    category: 'library',
    currentProgress: 0,
    maxProgress: 2,
    xpReward: 130,
  },
  {
    id: 'marathon_300',
    title: 'Maratona 300',
    description: 'Acumule mais de 300 minutos (5 horas) de estudo na semana.',
    iconName: 'Clock',
    unlocked: false,
    category: 'studies',
    currentProgress: 0,
    maxProgress: 300,
    xpReward: 200,
  },
  {
    id: 'polymath',
    title: 'Polímata Curioso',
    description: 'Estude 4 matérias ou categorias diferentes em uma mesma semana.',
    iconName: 'Sparkles',
    unlocked: false,
    category: 'special',
    currentProgress: 0,
    maxProgress: 4,
    xpReward: 180,
  },
];

export const INITIAL_WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'chal_weekly_minutes',
    title: 'Foco Semanal Imersivo',
    description: 'Dedique pelo menos 240 minutos (4h) de estudo nesta semana.',
    targetType: 'minutes',
    current: 120,
    target: 240,
    xpReward: 150,
    expiresAt: '2026-08-23T23:59:59',
    completed: false,
    claimed: false,
  },
  {
    id: 'chal_tasks_count',
    title: 'Checklist Eficiente',
    description: 'Complete 8 cards de estudo ou tarefas programadas.',
    targetType: 'tasks',
    current: 4,
    target: 8,
    xpReward: 120,
    expiresAt: '2026-08-23T23:59:59',
    completed: false,
    claimed: false,
  },
  {
    id: 'chal_spaced_review',
    title: 'Retenção Ativa',
    description: 'Realize 3 revisões programadas no seu calendário.',
    targetType: 'reviews',
    current: 1,
    target: 3,
    xpReward: 100,
    expiresAt: '2026-08-23T23:59:59',
    completed: false,
    claimed: false,
  },
  {
    id: 'chal_library_read',
    title: 'Conhecimento Expandido',
    description: 'Atualize seu progresso em pelo menos 1 item da sua Biblioteca.',
    targetType: 'library',
    current: 0,
    target: 1,
    xpReward: 80,
    expiresAt: '2026-08-23T23:59:59',
    completed: false,
    claimed: false,
  },
];

