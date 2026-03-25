/** Remove acentos e normaliza para comparação */
export function normalizeIngredientName(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/\s+/g, ' ');
  return applySynonyms(s);
}

const SYNONYMS: Record<string, string> = {
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

function applySynonyms(s: string): string {
  const parts = s.split(/\s+/);
  const mapped = parts.map((w) => SYNONYMS[w] ?? w);
  return mapped.join(' ');
}

/** Parse lista livre: vírgulas, "e", quebras de linha */
export function parseIngredientLines(text: string): string[] {
  const cleaned = text
    .replace(/\be\b/gi, ',')
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of cleaned) {
    const qtyStripped = line.replace(/^\d+[\d.,/]*\s*/, '').trim();
    if (qtyStripped) out.push(qtyStripped);
  }
  return out;
}
