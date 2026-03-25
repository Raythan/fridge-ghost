import { URGENT_DAYS, WARN_DAYS, RESULTS_LIMIT } from '../constants';
import type { Recipe, ScoredRecipe, UserPantryItem } from '../types';

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Conjunto normalizado do que o usuário tem */
function pantrySet(pantry: UserPantryItem[]): Set<string> {
  return new Set(pantry.map((p) => p.nameNormalized));
}

function recipeRequiredIngredients(recipe: Recipe): { norm: string; optional: boolean }[] {
  return recipe.ingredients.map((i) => ({
    norm: i.nameNormalized,
    optional: Boolean(i.optional),
  }));
}

function expiryBonusForRecipe(
  recipe: Recipe,
  pantry: UserPantryItem[]
): { bonus: number; matchedNorms: Set<string> } {
  const required = recipeRequiredIngredients(recipe).filter((x) => !x.optional);
  const optional = recipeRequiredIngredients(recipe).filter((x) => x.optional);
  const allNeed = [...required, ...optional];
  const byNorm = new Map<string, UserPantryItem>();
  for (const p of pantry) byNorm.set(p.nameNormalized, p);

  let bonus = 0;
  const matchedNorms = new Set<string>();
  for (const { norm } of allNeed) {
    const item = byNorm.get(norm);
    if (!item) continue;
    matchedNorms.add(norm);
    const d = daysUntil(item.expiresAt);
    if (d === null) continue;
    if (d <= URGENT_DAYS && d >= 0) bonus += 30;
    else if (d <= WARN_DAYS && d >= 0) bonus += 12;
  }
  return { bonus, matchedNorms };
}

export function scoreRecipes(pantry: UserPantryItem[], recipes: Recipe[]): ScoredRecipe[] {
  const have = pantrySet(pantry);
  const scored: ScoredRecipe[] = [];

  for (const recipe of recipes) {
    const required = recipeRequiredIngredients(recipe).filter((x) => !x.optional);
    const requiredNorms = required.map((r) => r.norm);
    const totalReq = requiredNorms.length || 1;
    let matched = 0;
    for (const n of requiredNorms) {
      if (have.has(n)) matched++;
    }
    const matchPercent = Math.round((matched / totalReq) * 100);
    const { bonus } = expiryBonusForRecipe(recipe, pantry);
    scored.push({
      recipe,
      matchPercent,
      expiryBonus: bonus,
      matchedCount: matched,
      requiredCount: totalReq,
    });
  }

  scored.sort((a, b) => {
    const t = a.recipe.prepTimeMinutes - b.recipe.prepTimeMinutes;
    if (t !== 0) return t;
    const m = b.matchPercent - a.matchPercent;
    if (m !== 0) return m;
    return b.expiryBonus - a.expiryBonus;
  });

  return scored;
}

export function topRecipes(scored: ScoredRecipe[], limit = RESULTS_LIMIT): ScoredRecipe[] {
  return scored.slice(0, limit);
}

export function partitionPantryByExpiry(items: UserPantryItem[]): {
  urgent: UserPantryItem[];
  warn: UserPantryItem[];
} {
  const urgent: UserPantryItem[] = [];
  const warn: UserPantryItem[] = [];
  for (const p of items) {
    const d = daysUntil(p.expiresAt);
    if (d === null) continue;
    if (d < 0) continue;
    if (d <= URGENT_DAYS) urgent.push(p);
    else if (d <= WARN_DAYS) warn.push(p);
  }
  urgent.sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  warn.sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  return { urgent, warn };
}

export function pickSurprise(scored: ScoredRecipe[], minMatch: number): ScoredRecipe | null {
  const pool = scored.filter((s) => s.matchPercent >= minMatch);
  if (pool.length === 0) return null;
  const i = Math.floor(Math.random() * pool.length);
  return pool[i] ?? null;
}

/** Segunda receita que compartilha ingrediente “urgente” com a principal */
export function variationHint(
  primary: Recipe,
  scored: ScoredRecipe[],
  urgentNorms: Set<string>
): string | undefined {
  if (urgentNorms.size === 0) return undefined;
  const primaryNorms = new Set(primary.ingredients.map((i) => i.nameNormalized));
  for (const s of scored) {
    if (s.recipe.id === primary.id) continue;
    for (const ing of s.recipe.ingredients) {
      if (!urgentNorms.has(ing.nameNormalized)) continue;
      if (primaryNorms.has(ing.nameNormalized)) {
        return `Outra onda: dá uma chance pra “${s.recipe.name}” também — ajuda a usar coisa que tá na fila pra vencer.`;
      }
    }
  }
  return undefined;
}
