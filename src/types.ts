export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RecipeIngredient {
  name: string;
  nameNormalized: string;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  prepTimeMinutes: number;
  difficulty: Difficulty;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags?: string[];
}

export interface UserPantryItem {
  id: string;
  nameRaw: string;
  nameNormalized: string;
  expiresAt: string | null;
  createdAt: string;
  quantity?: string;
}

export interface ScoredRecipe {
  recipe: Recipe;
  matchPercent: number;
  expiryBonus: number;
  matchedCount: number;
  requiredCount: number;
}

export type Screen =
  | { name: 'home' }
  | { name: 'pantry' }
  | { name: 'manual' }
  | { name: 'photo' }
  | { name: 'stats' }
  | {
      name: 'results';
      scored: ScoredRecipe[];
      urgent: UserPantryItem[];
      warn: UserPantryItem[];
    }
  | {
      name: 'recipe';
      recipe: Recipe;
      scored: ScoredRecipe[];
      variationHint?: string;
    };
