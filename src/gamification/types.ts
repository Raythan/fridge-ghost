export interface GameState {
  ingredientsAdded: number;
  recipesCooked: number;
  ocrSuccess: number;
  /** Dias (YYYY-MM-DD) em que houve pelo menos uma ação que conta ponto */
  activeDayKeys: string[];
  lastActiveDay: string | null;
  currentStreak: number;
  bestStreak: number;
  /** pontos ganhos por dia para comparar períodos */
  pointsByDay: Record<string, number>;
  achievementsUnlocked: string[];
  version: 1;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export type PeriodKey = 'week' | 'month' | 'all';
