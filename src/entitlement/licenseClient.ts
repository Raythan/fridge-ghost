/**
 * Catálogo extra de receitas: 1 anúncio recompensado por dia (calendário local)
 * libera o pacote até a meia-noite do aparelho; opcional legado de “compra” em localStorage (dev/teste).
 */
import type { Recipe } from '../types';

const SKU_BR = 'pack-br';
const AD_UNLOCK_DAY_KEY = 'fg_ad_unlock_calendar_day';

export function isDevUnlockAll(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_UNLOCK_ALL === 'true';
}

/** Data local do aparelho (YYYY-MM-DD). */
export function localCalendarDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Já assistiu ao anúncio de hoje e o desbloqueio segue valendo. */
export function isDailyAdUnlockActive(): boolean {
  try {
    return localStorage.getItem(AD_UNLOCK_DAY_KEY) === localCalendarDay();
  } catch {
    return false;
  }
}

/** Chamar após o usuário concluir o anúncio recompensado (ou simulação). */
export function recordDailyAdUnlock(): void {
  try {
    localStorage.setItem(AD_UNLOCK_DAY_KEY, localCalendarDay());
  } catch {
    /* noop */
  }
}

export async function isUnlocked(sku: string): Promise<boolean> {
  if (isDevUnlockAll()) return true;
  if (sku !== SKU_BR) return false;
  try {
    const raw = localStorage.getItem('fg_entitlements');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { skus?: string[] };
    return Array.isArray(parsed.skus) && parsed.skus.includes(sku);
  } catch {
    return false;
  }
}

/** Pode carregar receitas premium (anúncio do dia, legado SKU, ou dev). */
export async function hasFullCatalogAccess(): Promise<boolean> {
  if (isDevUnlockAll()) return true;
  if (isDailyAdUnlockActive()) return true;
  return isUnlocked(SKU_BR);
}

/** Simula compra permanente local — só para dev/teste manual. */
export function devGrantSku(sku: string): void {
  const raw = localStorage.getItem('fg_entitlements');
  let skus: string[] = [];
  try {
    if (raw) skus = [...(JSON.parse(raw) as { skus?: string[] }).skus ?? []];
  } catch {
    skus = [];
  }
  if (!skus.includes(sku)) skus.push(sku);
  localStorage.setItem('fg_entitlements', JSON.stringify({ skus }));
}

function publicDataUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  const path = file.replace(/^\//, '');
  return `${base}${path}`;
}

export async function loadPremiumRecipes(): Promise<Recipe[]> {
  if (!(await hasFullCatalogAccess())) return [];
  try {
    const res = await fetch(publicDataUrl('data/recipes-premium.json'), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { recipes?: Recipe[] };
    return Array.isArray(data.recipes) ? data.recipes : [];
  } catch {
    return [];
  }
}

export const ENTITLEMENT_SKU_BR = SKU_BR;
