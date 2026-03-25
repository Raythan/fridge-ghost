import { evaluateAchievements } from './achievements';
import { averagePointsPerActiveDay, levelFromPoints, toLocalDayKey, totalPoints } from './points';
import { loadGameState, saveGameState } from './state';
import type { GameState } from './types';

export {
  activeDaysCount,
  averagePointsPerActiveDay,
  levelFromPoints,
  totalPoints,
  weekRankingLocal,
  sumPointsInRange,
  startOfWeekMonday,
  toLocalDayKey,
} from './points';
export { ACHIEVEMENTS } from './achievements';
export type { GameState } from './types';

function todayKey(): string {
  return toLocalDayKey(new Date());
}

function yesterdayKey(): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return toLocalDayKey(y);
}

function touchActivity(s: GameState): void {
  const t = todayKey();
  if (!s.activeDayKeys.includes(t)) {
    s.activeDayKeys.push(t);
    if (s.activeDayKeys.length > 400) s.activeDayKeys = s.activeDayKeys.slice(-400);
  }

  if (s.lastActiveDay === t) return;

  const yk = yesterdayKey();
  if (!s.lastActiveDay) {
    s.currentStreak = 1;
  } else if (s.lastActiveDay === yk) {
    s.currentStreak += 1;
  } else {
    s.currentStreak = 1;
  }
  s.lastActiveDay = t;
  if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
}

function addPointsToday(s: GameState, pts: number): void {
  const k = todayKey();
  s.pointsByDay[k] = (s.pointsByDay[k] ?? 0) + pts;
}

function commit(s: GameState): string[] {
  const newly = evaluateAchievements(s);
  saveGameState(s);
  return newly;
}

export function getGameState(): GameState {
  return loadGameState();
}

export function recordIngredientsAdded(count: number): string[] {
  if (count <= 0) return [];
  const s = loadGameState();
  touchActivity(s);
  s.ingredientsAdded += count;
  addPointsToday(s, count * 2);
  return commit(s);
}

export function recordRecipeCooked(): string[] {
  const s = loadGameState();
  touchActivity(s);
  s.recipesCooked += 1;
  addPointsToday(s, 25);
  return commit(s);
}

export function recordOcrSuccess(): string[] {
  const s = loadGameState();
  touchActivity(s);
  s.ocrSuccess += 1;
  addPointsToday(s, 12);
  return commit(s);
}

export function getHudSummary(): { level: number; avgPerDay: number; total: number } {
  const s = loadGameState();
  return {
    level: levelFromPoints(s),
    avgPerDay: averagePointsPerActiveDay(s),
    total: totalPoints(s),
  };
}
