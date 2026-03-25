/**
 * Histórico “fiz hoje” — pós-MVP; estrutura mínima para streak futuro.
 */
const KEY = 'fg_history_done';

export interface DoneEntry {
  recipeId: string;
  at: string;
}

export function listDone(): DoneEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as { entries?: DoneEntry[] };
    return Array.isArray(p.entries) ? p.entries : [];
  } catch {
    return [];
  }
}

export function markDoneToday(recipeId: string): void {
  const entries = listDone();
  const at = new Date().toISOString();
  entries.push({ recipeId, at });
  localStorage.setItem(KEY, JSON.stringify({ entries }));
}
