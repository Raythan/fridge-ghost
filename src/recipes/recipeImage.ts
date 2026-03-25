/**
 * Tenta achar uma miniatura na Wikipédia em PT pelo nome do prato (rede pública, “na sorte”).
 * Pode falhar ou mostrar artigo errado — só ilustração, não é receita oficial da foto.
 */
const WIKI_PT = 'https://pt.wikipedia.org/w/api.php';

type WikiQuery = {
  query?: {
    pages?: Record<
      string,
      { pageid?: number; missing?: true; thumbnail?: { source: string } }
    >;
  };
};

function firstThumbnail(data: unknown): string | null {
  const pages = (data as WikiQuery).query?.pages;
  if (!pages) return null;
  for (const p of Object.values(pages)) {
    if (p.missing) continue;
    if (typeof p.pageid === 'number' && p.pageid < 0) continue;
    const src = p.thumbnail?.source;
    if (src) return src;
  }
  return null;
}

async function wikiQuery(searchParams: URLSearchParams): Promise<unknown | null> {
  searchParams.set('action', 'query');
  searchParams.set('format', 'json');
  searchParams.set('origin', '*');
  try {
    const res = await fetch(`${WIKI_PT}?${searchParams}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchRecipeImageUrl(recipeName: string): Promise<string | null> {
  const name = recipeName.replace(/\s+/g, ' ').trim();
  if (!name || name.length > 240) return null;

  const spTitle = new URLSearchParams();
  spTitle.set('titles', name.slice(0, 240));
  spTitle.set('redirects', '1');
  spTitle.set('prop', 'pageimages');
  spTitle.set('piprop', 'thumbnail');
  spTitle.set('pithumbsize', '480');
  let url = firstThumbnail(await wikiQuery(spTitle));
  if (url) return url;

  const spSearch = new URLSearchParams();
  spSearch.set('generator', 'search');
  spSearch.set('gsrsearch', name.slice(0, 240));
  spSearch.set('gsrlimit', '12');
  spSearch.set('gsrnamespace', '0');
  spSearch.set('prop', 'pageimages');
  spSearch.set('piprop', 'thumbnail');
  spSearch.set('pithumbsize', '480');
  url = firstThumbnail(await wikiQuery(spSearch));
  if (url) return url;

  const words = name.split(/\s+/).filter(Boolean);
  const short = words.slice(0, 3).join(' ');
  if (short.length >= 3 && short !== name) {
    const spShort = new URLSearchParams();
    spShort.set('generator', 'search');
    spShort.set('gsrsearch', short.slice(0, 240));
    spShort.set('gsrlimit', '12');
    spShort.set('gsrnamespace', '0');
    spShort.set('prop', 'pageimages');
    spShort.set('piprop', 'thumbnail');
    spShort.set('pithumbsize', '480');
    url = firstThumbnail(await wikiQuery(spShort));
  }
  return url;
}

/** Evita repetir request ao reabrir a mesma receita ou listar de novo na sessão. */
const urlByRecipeId = new Map<string, Promise<string | null>>();

export function fetchRecipeImageUrlCached(recipeId: string, recipeName: string): Promise<string | null> {
  let p = urlByRecipeId.get(recipeId);
  if (!p) {
    p = fetchRecipeImageUrl(recipeName);
    urlByRecipeId.set(recipeId, p);
  }
  return p;
}
