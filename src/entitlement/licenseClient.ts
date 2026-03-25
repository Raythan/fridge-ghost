/**
 * Receitas premium: sempre carregadas com as gratuitas (sem paywall no cliente).
 */
import type { Recipe } from '../types';

/** Só para desenvolvimento — outros fluxos podem consultar o flag. */
export function isDevUnlockAll(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_UNLOCK_ALL === 'true';
}

function publicDataUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  const path = file.replace(/^\//, '');
  return `${base}${path}`;
}

export async function loadPremiumRecipes(): Promise<Recipe[]> {
  try {
    const res = await fetch(publicDataUrl('data/recipes-premium.json'), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { recipes?: Recipe[] };
    return Array.isArray(data.recipes) ? data.recipes : [];
  } catch {
    return [];
  }
}
