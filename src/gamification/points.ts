import type { GameState } from './types';

export function toLocalDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Pesos usados na média exibida (e no “nível”) */
const W = {
  recipe: 25,
  ingredient: 2,
  ocr: 12,
  streakBonusPerDay: 3, // soma ao total por dia de streak atual (cap)
};

export function totalPoints(s: GameState): number {
  const streakPart = Math.min(s.currentStreak, 30) * W.streakBonusPerDay;
  return (
    s.recipesCooked * W.recipe + s.ingredientsAdded * W.ingredient + s.ocrSuccess * W.ocr + streakPart
  );
}

export function activeDaysCount(s: GameState): number {
  return Math.max(1, s.activeDayKeys.length);
}

/** Média de pontos por dia com atividade (como pedido no produto) */
export function averagePointsPerActiveDay(s: GameState): number {
  return Math.round(totalPoints(s) / activeDaysCount(s));
}

export function levelFromPoints(s: GameState): number {
  const t = totalPoints(s);
  return Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, t) / 40)));
}

export function sumPointsInRange(s: GameState, start: Date, end: Date): number {
  let sum = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endAt = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= endAt) {
    sum += s.pointsByDay[toLocalDayKey(cur)] ?? 0;
    cur.setDate(cur.getDate() + 1);
  }
  return sum;
}

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function weekRankingLocal(s: GameState, weeksBack = 8): { label: string; points: number }[] {
  const out: { label: string; points: number }[] = [];
  const now = new Date();
  for (let i = 0; i < weeksBack; i++) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = startOfWeekMonday(end);
    const endW = new Date(start);
    endW.setDate(endW.getDate() + 6);
    const pts = sumPointsInRange(s, start, endW);
    const label = `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')}`;
    out.push({ label, points: pts });
  }
  return out.sort((a, b) => b.points - a.points);
}
