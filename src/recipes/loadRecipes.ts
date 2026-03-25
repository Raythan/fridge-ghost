import { loadPremiumRecipes } from '../entitlement/licenseClient';
import type { Recipe } from '../types';
import { normalizeIngredientName } from './normalize';

function publicDataUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  const path = file.replace(/^\//, '');
  return `${base}${path}`;
}

function normalizeRecipe(r: Recipe): Recipe {
  return {
    ...r,
    ingredients: r.ingredients.map((i) => ({
      ...i,
      nameNormalized: i.nameNormalized || normalizeIngredientName(i.name),
    })),
  };
}

export async function loadFreeRecipes(): Promise<Recipe[]> {
  const res = await fetch(publicDataUrl('data/recipes-free.json'));
  if (!res.ok) throw new Error('Não foi possível carregar receitas.');
  const data = (await res.json()) as { recipes: Recipe[] };
  const list = Array.isArray(data.recipes) ? data.recipes : [];
  return list.map(normalizeRecipe);
}

export async function loadAllRecipes(): Promise<Recipe[]> {
  const [free, premium] = await Promise.all([loadFreeRecipes(), loadPremiumRecipes()]);
  return [...free.map(normalizeRecipe), ...premium.map(normalizeRecipe)];
}
