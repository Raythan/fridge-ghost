import type { GameState } from './types';

const KEY = 'fg_game_state_v1';

function emptyState(): GameState {
  return {
    ingredientsAdded: 0,
    recipesCooked: 0,
    ocrSuccess: 0,
    activeDayKeys: [],
    lastActiveDay: null,
    currentStreak: 0,
    bestStreak: 0,
    pointsByDay: {},
    achievementsUnlocked: [],
    version: 1,
  };
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw) as Partial<GameState>;
    if (p.version !== 1) return emptyState();
    return {
      ...emptyState(),
      ...p,
      activeDayKeys: Array.isArray(p.activeDayKeys) ? p.activeDayKeys : [],
      pointsByDay: p.pointsByDay && typeof p.pointsByDay === 'object' ? p.pointsByDay : {},
      achievementsUnlocked: Array.isArray(p.achievementsUnlocked) ? p.achievementsUnlocked : [],
    };
  } catch {
    return emptyState();
  }
}

export function saveGameState(s: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}
