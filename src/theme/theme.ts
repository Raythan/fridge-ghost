export type ThemeId = 'clean' | 'slate' | 'rose' | 'violet';

const STORAGE_KEY = 'fg_theme';

/** Migra nomes antigos (associados a gênero) para IDs só de cor */
const LEGACY_THEME: Record<string, ThemeId> = {
  clean: 'clean',
  slate: 'slate',
  rose: 'rose',
  violet: 'violet',
  masculine: 'slate',
  feminine: 'rose',
  neutral: 'violet',
};

const META_COLORS: Record<ThemeId, string> = {
  clean: '#1a73e8',
  slate: '#38bdf8',
  rose: '#f472b6',
  violet: '#a78bfa',
};

const THEME_CLASSES = ['fg-theme-clean', 'fg-theme-slate', 'fg-theme-rose', 'fg-theme-violet'];

/** Ordem e cores do preview (faixas no botão — sem texto de gênero) */
export const THEME_SWATCHES: {
  id: ThemeId;
  ariaLabel: string;
  swatch: [string, string, string];
}[] = [
  {
    id: 'clean',
    ariaLabel: 'Tema claro: branco, cinza claro e azul',
    swatch: ['#ffffff', '#f1f3f4', '#1a73e8'],
  },
  {
    id: 'slate',
    ariaLabel: 'Tema escuro: azul noite, cinza azulado e ciano',
    swatch: ['#0c1222', '#1e293b', '#38bdf8'],
  },
  {
    id: 'rose',
    ariaLabel: 'Tema escuro: bordô, roxo escuro e rosa',
    swatch: ['#1a1216', '#3d2a32', '#f472b6'],
  },
  {
    id: 'violet',
    ariaLabel: 'Tema escuro: roxo profundo, uva e lilás',
    swatch: ['#13101a', '#2d2640', '#a78bfa'],
  },
];

export function getStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'clean';
    const mapped = LEGACY_THEME[raw];
    if (mapped) {
      if (raw !== mapped) {
        localStorage.setItem(STORAGE_KEY, mapped);
      }
      return mapped;
    }
  } catch {
    /* noop */
  }
  return 'clean';
}

export function setTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* noop */
  }
  const root = document.documentElement;
  for (const c of THEME_CLASSES) root.classList.remove(c);
  root.classList.add(`fg-theme-${id}`);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLORS[id]);
}

export function initTheme(): void {
  setTheme(getStoredTheme());
}
