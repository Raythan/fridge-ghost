import type { AchievementDef, GameState } from './types';
import { totalPoints } from './points';

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_ingredient', title: 'Primeira despensa', description: 'Guardou o 1º ingrediente.', icon: '🥬' },
  { id: 'pantry_10', title: 'Despensa viva', description: '10+ ingredientes no total.', icon: '📦' },
  { id: 'pantry_50', title: 'Chef em casa', description: '50+ ingredientes no total.', icon: '👨‍🍳' },
  { id: 'first_recipe', title: 'Estreia', description: 'Marcou a 1ª receita como feita.', icon: '⭐' },
  { id: 'cook_5', title: 'Rotina saborosa', description: '5 receitas feitas.', icon: '🍳' },
  { id: 'cook_25', title: 'Mestre do fogão', description: '25 receitas feitas.', icon: '🏅' },
  {
    id: 'first_scan',
    title: 'Olho de águia',
    description: 'Leu texto na 1ª foto da geladeira.',
    icon: '📷',
  },
  {
    id: 'scan_10',
    title: 'Mão na massa com foto',
    description: '10 fotos com leitura de rótulos.',
    icon: '🔍',
  },
  { id: 'streak_3', title: 'Três dias firme', description: '3 dias seguidos usando o app.', icon: '🔥' },
  { id: 'streak_7', title: 'Semana focada', description: '7 dias seguidos de atividade.', icon: '💪' },
  { id: 'streak_30', title: 'Hábito de geladeira', description: '30 dias seguidos.', icon: '🏆' },
  { id: 'points_200', title: 'Pontuador', description: '200+ pontos no total.', icon: '✨' },
  { id: 'points_1000', title: 'Lenda local', description: '1000+ pontos no total.', icon: '👑' },
];

function isUnlocked(s: GameState, id: string): boolean {
  return s.achievementsUnlocked.includes(id);
}

function qualifies(s: GameState, id: string): boolean {
  const t = totalPoints(s);
  switch (id) {
    case 'first_ingredient':
      return s.ingredientsAdded >= 1;
    case 'pantry_10':
      return s.ingredientsAdded >= 10;
    case 'pantry_50':
      return s.ingredientsAdded >= 50;
    case 'first_recipe':
      return s.recipesCooked >= 1;
    case 'cook_5':
      return s.recipesCooked >= 5;
    case 'cook_25':
      return s.recipesCooked >= 25;
    case 'first_scan':
      return s.ocrSuccess >= 1;
    case 'scan_10':
      return s.ocrSuccess >= 10;
    case 'streak_3':
      return s.bestStreak >= 3;
    case 'streak_7':
      return s.bestStreak >= 7;
    case 'streak_30':
      return s.bestStreak >= 30;
    case 'points_200':
      return t >= 200;
    case 'points_1000':
      return t >= 1000;
    default:
      return false;
  }
}

/** Retorna IDs recém-desbloqueados */
export function evaluateAchievements(s: GameState): string[] {
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (isUnlocked(s, a.id)) continue;
    if (qualifies(s, a.id)) {
      s.achievementsUnlocked.push(a.id);
      newly.push(a.id);
    }
  }
  return newly;
}
