import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'public', 'data');

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function validateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !Array.isArray(data.recipes)) {
    throw new Error(`${filePath}: esperado { recipes: [] }`);
  }
  const ids = new Set();
  for (let i = 0; i < data.recipes.length; i++) {
    const r = data.recipes[i];
    const label = `${path.basename(filePath)} recipes[${i}]`;
    if (!r.id || typeof r.id !== 'string') throw new Error(`${label}: id obrigatório`);
    if (ids.has(r.id)) throw new Error(`${label}: id duplicado ${r.id}`);
    ids.add(r.id);
    if (!r.name || typeof r.name !== 'string') throw new Error(`${label}: name obrigatório`);
    if (typeof r.prepTimeMinutes !== 'number' || r.prepTimeMinutes < 0) {
      throw new Error(`${label}: prepTimeMinutes inválido`);
    }
    if (!DIFFICULTIES.has(r.difficulty)) throw new Error(`${label}: difficulty inválida`);
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
      throw new Error(`${label}: ingredients obrigatório`);
    }
    for (const ing of r.ingredients) {
      if (!ing.name || typeof ing.name !== 'string') throw new Error(`${label}: ingredient.name`);
      if (!ing.nameNormalized || typeof ing.nameNormalized !== 'string') {
        throw new Error(`${label}: ingredient.nameNormalized obrigatório (${ing.name})`);
      }
    }
    if (!Array.isArray(r.steps) || r.steps.length === 0) throw new Error(`${label}: steps obrigatório`);
  }
  console.log(`OK ${path.basename(filePath)}: ${data.recipes.length} receitas`);
}

for (const name of ['recipes-free.json', 'recipes-premium.json']) {
  validateFile(path.join(root, name));
}
console.log('Validação concluída.');
