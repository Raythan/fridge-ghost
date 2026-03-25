/**
 * Mescla receitas do dataset Afrodite (PT-BR) em public/data/recipes-free.json.
 * Fonte: https://github.com/adrianosferreira/afrodite.json (dados agregados via crawler).
 * Executa: node scripts/build-recipes-from-afrodite.mjs
 * Pré-requisito: scripts/.cache/afrodite.json (baixe com curl se não existir).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CACHE = path.join(root, 'scripts', '.cache', 'afrodite.json');
const OUT = path.join(root, 'public', 'data', 'recipes-free.json');

const SYNONYMS = {
  mussarela: 'queijo',
  mozzarella: 'queijo',
  parmesao: 'queijo',
  requeijao: 'queijo',
  creme: 'creme de leite',
  'creme leite': 'creme de leite',
  tomates: 'tomate',
  ovos: 'ovo',
  batatas: 'batata',
  cebolas: 'cebola',
  alhos: 'alho',
  'frango peito': 'frango',
  'peito frango': 'frango',
  'carne moida': 'carne',
};

function applySynonyms(s) {
  const parts = s.split(/\s+/);
  return parts.map((w) => SYNONYMS[w] ?? w).join(' ');
}

function normalizeIngredientName(raw) {
  let s = String(raw).trim().toLowerCase();
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/\s+/g, ' ');
  return applySynonyms(s);
}

function slugify(name) {
  const s = String(name)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (s || 'receita').slice(0, 72);
}

function stripLeadingQty(line) {
  let t = String(line).replace(/\u00a0/g, ' ').trim();
  if (!t || t === ' ') return '';
  t = t.replace(/^\d+\s*[-–—]\s*/, '');
  t = t.replace(
    /^\d+[\d.,/]*\s*(?:a\s*\d+[\d.,/]*)?\s*(?:kg|g|mg|ml|l|litros?|un\.?|unidades?|dentes?|ovos?|fatias?|ramos?|folhas?|pitadas?|gotas?)\.?\s+/i,
    ''
  );
  t = t.replace(
    /^\d+[\d.,/]*\s*(?:x[ií]caras?|colheres?|col\.?\s*\(?chá\)?|col\.?\s*\(?sopa\)?|chá|sopa)\b\.?\s*/i,
    ''
  );
  t = t.replace(/^\d+[\d.,/]*\s*(?:kg|g|mg|ml|l)\s+/i, '');
  t = t.replace(/^\d+[\d.,/]*\s+/, '');
  t = t.replace(/^(?:de|com|ou)\s+/i, '').trim();
  return t;
}

function parseAfroditeIngredients(conteudo) {
  if (!Array.isArray(conteudo)) return [];
  const out = [];
  for (const line of conteudo) {
    const cleaned = stripLeadingQty(line);
    if (cleaned.length < 2) continue;
    if (/^[·.\-\s]+$/.test(cleaned)) continue;
    const name = cleaned.split(',')[0].trim().slice(0, 120);
    if (name.length < 2) continue;
    const nameNormalized = normalizeIngredientName(name);
    if (!nameNormalized) continue;
    out.push({ name, nameNormalized });
  }
  const seen = new Set();
  const deduped = [];
  for (const ing of out) {
    if (seen.has(ing.nameNormalized)) continue;
    seen.add(ing.nameNormalized);
    deduped.push(ing);
  }
  return deduped.slice(0, 24);
}

function parseSteps(conteudo) {
  if (!Array.isArray(conteudo)) return [];
  return conteudo
    .map((s) => String(s).replace(/\u00a0/g, ' ').trim())
    .filter((s) => s.length > 4 && s !== ' ')
    .map((s) => s.replace(/^\d+\s*[-–—]\s*/, '').trim())
    .filter((s) => s.length > 3)
    .slice(0, 35);
}

function estimatePrep(steps, ings) {
  const base = 12 + steps.length * 2.5 + Math.min(ings.length, 12) * 2;
  return Math.min(180, Math.max(8, Math.round(base)));
}

function difficultyFrom(ings, steps) {
  if (ings.length <= 5 && steps.length <= 10) return 'easy';
  if (ings.length <= 14 && steps.length <= 18) return 'medium';
  return 'hard';
}

function uniqueId(baseId, used) {
  let id = baseId;
  let n = 2;
  while (used.has(id)) {
    id = `${baseId}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

if (!fs.existsSync(CACHE)) {
  console.error('Falta', CACHE);
  console.error('Baixe com: curl -sL "https://raw.githubusercontent.com/adrianosferreira/afrodite.json/master/afrodite.json" -o scripts/.cache/afrodite.json');
  process.exit(1);
}

const afrodite = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
if (!Array.isArray(existing.recipes)) {
  console.error('recipes-free.json inválido');
  process.exit(1);
}

/** Mínimo de receitas no arquivo após o merge (curadoria + importação). */
const TARGET_TOTAL = 200;
const usedIds = new Set(existing.recipes.map((r) => r.id));
const merged = [...existing.recipes];

for (const raw of afrodite) {
  if (merged.length >= TARGET_TOTAL) break;
  const nome = String(raw.nome || '').trim();
  if (!nome || nome.length > 120) continue;

  const secs = raw.secao || [];
  const ingSec = secs.find((s) => {
    const n = String(s.nome || '')
      .trim()
      .toLowerCase();
    return n.includes('ingrediente');
  });
  const prepSec = secs.find((s) => {
    const n = String(s.nome || '')
      .trim()
      .toLowerCase();
    return n.includes('preparo') || n.includes('modo');
  });
  if (!ingSec?.conteudo || !prepSec?.conteudo) continue;

  const ingredients = parseAfroditeIngredients(ingSec.conteudo);
  const steps = parseSteps(prepSec.conteudo);
  if (ingredients.length < 2 || steps.length < 2) continue;

  const baseId = slugify(nome);
  const id = uniqueId(baseId, usedIds);
  merged.push({
    id,
    name: nome.slice(0, 120),
    prepTimeMinutes: estimatePrep(steps, ingredients),
    difficulty: difficultyFrom(ingredients, steps),
    ingredients,
    steps,
    tags: ['brasil', 'afrodite'],
  });
}

fs.writeFileSync(OUT, `${JSON.stringify({ recipes: merged }, null, 2)}\n`, 'utf8');
console.log(`Escrito ${OUT}: ${merged.length} receitas (meta mínima 200).`);
