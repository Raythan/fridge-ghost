import { SURPRISE_MIN_MATCH } from '../constants';
import { isDevUnlockAll } from '../entitlement/licenseClient';
import { buildNewIssueUrl } from '../feedback/githubIssue';
import { isPublicFeedbackConfigured, submitPublicFeedback } from '../feedback/web3formsSubmit';
import { loadAllRecipes } from '../recipes/loadRecipes';
import { fetchRecipeImageUrlCached } from '../recipes/recipeImage';
import {
  partitionPantryByExpiry,
  pickSurprise,
  scoreRecipes,
  topRecipes,
  variationHint,
} from '../recipes/match';
import { parseIngredientLines } from '../recipes/normalize';
import { extractTextFromImage } from '../ocr/extractFromImage';
import { isSpeechSupported, startDictation } from '../speech/dictation';
import { markDoneToday } from '../storage/history';
import {
  addPantryItems,
  listPantry,
  removePantryItem,
  updatePantryItem,
} from '../storage/pantry';
import {
  ACHIEVEMENTS,
  getGameState,
  getHudSummary,
  recordIngredientsAdded,
  recordOcrSuccess,
  recordRecipeCooked,
  weekRankingLocal,
} from '../gamification/track';
import { getStoredTheme, setTheme, THEME_SWATCHES } from '../theme/theme';
import type { Recipe, ScoredRecipe, Screen } from '../types';
import { showToast } from './toast';

let screen: Screen = { name: 'home' };
let recipesCache: Recipe[] | null = null;
let rootRef: HTMLElement | null = null;
let fewOnly = false;
let stopDictation: (() => void) | null = null;

function notifyAchievements(newIds: string[]): void {
  for (const id of newIds) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) showToast(`${a.icon} Nova conquista: ${a.title}!`, 'success');
  }
}

function renderHud(): HTMLElement {
  const hud = document.createElement('header');
  hud.className =
    'sticky top-0 z-40 border-b border-app-border bg-app-surface/95 backdrop-blur-md [padding-top:max(0.25rem,env(safe-area-inset-top))]';
  const inner = document.createElement('div');
  inner.className = 'mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-2.5';

  const sum = getHudSummary();
  const left = document.createElement('div');
  left.className = 'min-w-0 flex-1';
  const l2 = document.createElement('div');
  l2.className = 'truncate font-display text-sm font-semibold text-app-text';
  l2.textContent = `Nv. ${sum.level} - Pontos ${sum.total}`;
  left.appendChild(l2);

  const statsBtn = document.createElement('button');
  statsBtn.type = 'button';
  statsBtn.className =
    'shrink-0 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-text shadow-sm';
  statsBtn.textContent = 'Progresso';
  statsBtn.setAttribute('aria-label', 'Abrir progresso, estatísticas e conquistas');
  statsBtn.addEventListener('click', () => navigate({ name: 'stats' }));

  inner.appendChild(left);
  inner.appendChild(statsBtn);
  hud.appendChild(inner);
  return hud;
}

/** Grade de temas (aparência) — usa no painel de configurações. */
function appendThemeSwatchGrid(parent: HTMLElement): void {
  const sub = document.createElement('p');
  sub.className = 'mb-3 text-xs text-app-faint';
  sub.textContent =
    'Toca num quadradinho pra mudar o visual — fica guardado só aí no seu aparelho.';
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-3';

  const current = getStoredTheme();
  for (const opt of THEME_SWATCHES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', opt.ariaLabel);
    const active = opt.id === current;
    btn.setAttribute('aria-pressed', String(active));
    btn.className = active
      ? 'rounded-2xl border-2 border-app-accent p-0.5 shadow-sm'
      : 'rounded-2xl border-2 border-transparent p-0.5 transition hover:border-app-border';

    const bar = document.createElement('div');
    bar.className = 'flex h-14 w-full overflow-hidden rounded-xl border border-black/10 shadow-inner';
    bar.setAttribute('aria-hidden', 'true');
    for (const hex of opt.swatch) {
      const stripe = document.createElement('div');
      stripe.className = 'h-full min-w-0 flex-1';
      stripe.style.backgroundColor = hex;
      bar.appendChild(stripe);
    }
    btn.appendChild(bar);
    btn.addEventListener('click', () => {
      setTheme(opt.id);
      rerender();
    });
    grid.appendChild(btn);
  }
  parent.appendChild(sub);
  parent.appendChild(grid);
}

function appendSettingsPanelBody(parent: HTMLElement, onNavigateProgress: () => void): void {
  const stHead = document.createElement('p');
  stHead.className = 'text-[10px] font-medium uppercase tracking-wide text-app-faint';
  stHead.textContent = 'Status agora';
  parent.appendChild(stHead);

  const gs = getGameState();
  const hud = getHudSummary();
  const stBlock = document.createElement('div');
  stBlock.className = 'rounded-xl border border-app-border bg-app-card px-3 py-3 text-sm text-app-muted';
  const stL1 = document.createElement('p');
  stL1.className = 'font-display font-semibold text-app-text';
  stL1.textContent = `Nv. ${hud.level} — ${hud.total} pontos`;
  const stL2 = document.createElement('p');
  stL2.className = 'mt-1';
  stL2.textContent = `Streak: ${gs.currentStreak} dia(s) · recorde ${gs.bestStreak}`;
  stBlock.appendChild(stL1);
  stBlock.appendChild(stL2);
  parent.appendChild(stBlock);

  const progBtn = btnSecondary('Abrir progresso e conquistas', onNavigateProgress);
  parent.appendChild(progBtn);

  const appLabel = document.createElement('p');
  appLabel.className = 'mt-6 text-xs font-semibold text-app-text';
  appLabel.textContent = 'Cores do app';
  parent.appendChild(appLabel);
  appendThemeSwatchGrid(parent);

  const fbLabel = document.createElement('p');
  fbLabel.className = 'mt-6 text-xs font-semibold text-app-text';
  fbLabel.textContent = 'Sua opinião';
  parent.appendChild(fbLabel);

  const fbHint = document.createElement('p');
  fbHint.className = 'text-xs text-app-faint';
  fbHint.textContent =
    isPublicFeedbackConfigured()
      ? 'Sugestões, ideias ou problemas — envio direto por e-mail, sem conta. Quem for dev pode abrir issue no GitHub.'
      : 'Sugestões e ideias — quem usa GitHub pode abrir uma issue; o mantenedor pode ativar envio por e-mail (ver README).';
  parent.appendChild(fbHint);

  const fbBtn = btnSecondary('Enviar feedback', () => openFeedbackModal());
  fbBtn.className =
    'mt-2 w-full rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-center font-medium text-app-text';
  parent.appendChild(fbBtn);
}

function openFeedbackModal(): void {
  const backdrop = document.createElement('div');
  backdrop.className =
    'fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'fg-fb-title');

  const card = document.createElement('div');
  card.className =
    'max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-app-border bg-app-surface p-4 shadow-xl';

  const title = document.createElement('h2');
  title.id = 'fg-fb-title';
  title.className = 'font-display text-lg font-semibold text-app-text';
  title.textContent = 'Feedback';
  card.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'mt-2 text-sm text-app-muted';
  intro.textContent = isPublicFeedbackConfigured()
    ? 'Conta pra gente o que você achou ou o que travou — enviamos por e-mail, sem precisar de conta em lugar nenhum.'
    : 'Conta o que você percebeu usando o app. Quem trabalha com código pode abrir uma issue no repositório.';
  card.appendChild(intro);

  const devNote = document.createElement('p');
  devNote.className = 'mt-2 text-xs text-app-faint';
  devNote.textContent =
    'Não mandamos relatório automático de erro — só o que você escrever aqui. Desenvolvedores: use o botão do GitHub pra contribuir.';
  card.appendChild(devNote);

  const typeLabel = document.createElement('label');
  typeLabel.className = 'mt-4 block text-xs font-medium text-app-muted';
  typeLabel.htmlFor = 'fg-fb-type';
  typeLabel.textContent = 'Tipo';
  card.appendChild(typeLabel);

  const select = document.createElement('select');
  select.id = 'fg-fb-type';
  select.className =
    'mt-1 w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text';
  const types: { v: string; l: string }[] = [
    { v: 'sugestao', l: 'Sugestão de melhoria' },
    { v: 'ideia', l: 'Ideia nova' },
    { v: 'problema', l: 'Algo não funcionou bem' },
  ];
  for (const { v, l } of types) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    select.appendChild(o);
  }
  card.appendChild(select);

  const taLabel = document.createElement('label');
  taLabel.className = 'mt-4 block text-xs font-medium text-app-muted';
  taLabel.htmlFor = 'fg-fb-body';
  taLabel.textContent = 'O que você quer dizer?';
  card.appendChild(taLabel);

  const ta = document.createElement('textarea');
  ta.id = 'fg-fb-body';
  ta.rows = 5;
  ta.className =
    'mt-1 w-full resize-y rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text placeholder:text-app-faint';
  ta.placeholder = 'Ex.: “Seria legal filtrar por tempo” ou “o botão X não respondeu quando…”';
  card.appendChild(ta);

  if (isPublicFeedbackConfigured()) {
    const emLabel = document.createElement('label');
    emLabel.className = 'mt-4 block text-xs font-medium text-app-muted';
    emLabel.htmlFor = 'fg-fb-email';
    emLabel.textContent = 'Seu e-mail (opcional — só se quiser resposta)';
    card.appendChild(emLabel);

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.id = 'fg-fb-email';
    emailInput.autocomplete = 'email';
    emailInput.inputMode = 'email';
    emailInput.className =
      'mt-1 w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text placeholder:text-app-faint';
    emailInput.placeholder = 'nome@exemplo.com';
    card.appendChild(emailInput);
  }

  const err = document.createElement('p');
  err.className = 'mt-2 hidden text-sm text-app-warn';
  err.setAttribute('role', 'alert');
  card.appendChild(err);

  const actions = document.createElement('div');
  actions.className = 'mt-4 flex flex-col gap-2';

  function close(): void {
    backdrop.remove();
  }

  const sendEmail = document.createElement('button');
  sendEmail.type = 'button';
  sendEmail.className =
    'rounded-xl bg-app-accent px-4 py-3 font-medium text-app-on-accent disabled:opacity-50';
  sendEmail.textContent = 'Enviar mensagem';

  const githubBtn = document.createElement('button');
  githubBtn.type = 'button';
  githubBtn.className = isPublicFeedbackConfigured()
    ? 'rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm font-medium text-app-muted'
    : 'rounded-xl bg-app-accent px-4 py-3 font-medium text-app-on-accent';
  githubBtn.textContent = 'Abrir no GitHub (contribuidores)';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className =
    'rounded-xl border border-transparent bg-transparent px-4 py-2 text-sm font-medium text-app-faint';
  cancel.textContent = 'Cancelar';

  function typeTitle(kind: string): string {
    if (kind === 'ideia') return 'Pra Já — ideia';
    if (kind === 'problema') return 'Pra Já — problema / mal funcionamento';
    return 'Pra Já — sugestão de melhoria';
  }

  function issueBody(kind: string, raw: string): string {
    return [
      `## Tipo`,
      types.find((x) => x.v === kind)?.l ?? kind,
      ``,
      `## Descrição`,
      raw,
      ``,
      `---`,
      `_Enviado pelo app Pra Já (feedback manual, sem log automático de erro)._`,
    ].join('\n');
  }

  function collectEmailInput(): string {
    const el = card.querySelector<HTMLInputElement>('#fg-fb-email');
    return el?.value.trim() ?? '';
  }

  if (isPublicFeedbackConfigured()) {
    sendEmail.addEventListener('click', () => {
      const raw = ta.value.trim();
      if (raw.length < 8) {
        err.textContent = 'Escreve pelo menos uma linha (uns 8 caracteres) pra gente entender.';
        err.classList.remove('hidden');
        ta.focus();
        return;
      }
      err.classList.add('hidden');
      const kind = select.value;
      const typeL = types.find((x) => x.v === kind)?.l ?? kind;
      sendEmail.disabled = true;
      sendEmail.textContent = 'Enviando…';
      void submitPublicFeedback({
        typeLabel: typeL,
        body: raw,
        contactEmail: collectEmailInput() || undefined,
      }).then((r) => {
        sendEmail.disabled = false;
        sendEmail.textContent = 'Enviar mensagem';
        if (r.ok) {
          showToast('Mensagem enviada. Valeu demais!', 'success');
          close();
        } else {
          err.textContent = r.error;
          err.classList.remove('hidden');
        }
      });
    });
    actions.appendChild(sendEmail);
  }

  githubBtn.addEventListener('click', () => {
    const raw = ta.value.trim();
    if (raw.length < 8) {
      err.textContent = 'Escreve pelo menos uma linha (uns 8 caracteres) pra gente entender.';
      err.classList.remove('hidden');
      ta.focus();
      return;
    }
    err.classList.add('hidden');
    const kind = select.value;
    const url = buildNewIssueUrl(typeTitle(kind), issueBody(kind, raw), 'feedback');
    window.open(url, '_blank', 'noopener,noreferrer');
    close();
  });
  actions.appendChild(githubBtn);

  cancel.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  actions.appendChild(cancel);
  card.appendChild(actions);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  ta.focus();
}

function openSettingsPanel(): void {
  const backdrop = document.createElement('div');
  backdrop.className =
    'fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'fg-settings-title');

  const panel = document.createElement('div');
  panel.className =
    'flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-app-border bg-app-surface shadow-xl sm:rounded-2xl';

  const head = document.createElement('div');
  head.className = 'flex shrink-0 items-center justify-between gap-3 border-b border-app-border px-4 py-3';
  const ht = document.createElement('h2');
  ht.id = 'fg-settings-title';
  ht.className = 'font-display text-lg font-semibold text-app-text';
  ht.textContent = 'Configurações';

  function close(): void {
    backdrop.remove();
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'rounded-lg px-3 py-1.5 text-sm font-medium text-app-muted hover:bg-app-card-alt';
  closeBtn.textContent = 'Fechar';
  closeBtn.setAttribute('aria-label', 'Fechar configurações');
  closeBtn.addEventListener('click', close);

  head.appendChild(ht);
  head.appendChild(closeBtn);
  panel.appendChild(head);

  const scroll = document.createElement('div');
  scroll.className = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4';
  const bodyInner = document.createElement('div');
  bodyInner.className = 'space-y-4';
  appendSettingsPanelBody(bodyInner, () => {
    close();
    navigate({ name: 'stats' });
  });
  scroll.appendChild(bodyInner);
  panel.appendChild(scroll);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
}

function renderHomeSettingsButton(shell: HTMLElement): void {
  const wrap = document.createElement('div');
  wrap.className = 'mt-10';
  const b = btnSecondary('Configurações', () => openSettingsPanel());
  b.setAttribute('aria-haspopup', 'dialog');
  wrap.appendChild(b);
  shell.appendChild(wrap);
}

function difficultyLabel(d: Recipe['difficulty']): string {
  if (d === 'easy') return 'Fácil';
  if (d === 'medium') return 'Médio';
  return 'Difícil';
}

async function ensureRecipes(): Promise<Recipe[]> {
  if (!recipesCache) recipesCache = await loadAllRecipes();
  return recipesCache;
}

function navigate(next: Screen): void {
  screen = next;
  if (rootRef) render(rootRef);
}

function rerender(): void {
  if (rootRef) render(rootRef);
}

const RESULTS_HELP_TEXT =
  'Aqui eu te mostro no máximo 8 receitas — as mais rápidas primeiro e as que mais batem com o que você tem (não é lista aleatória). Quer sorte? Usa “Me surpreende” lá embaixo.';

/** Título “Ideias pra hoje” + ícone com tooltip explicativo. */
function renderIdeiasPraHojeHeader(shell: HTMLElement): void {
  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-start gap-2';

  const h2 = document.createElement('h2');
  h2.className = 'min-w-0 flex-1 font-display text-2xl font-bold text-app-text';
  h2.textContent = 'Ideias pra hoje';

  const helpWrap = document.createElement('div');
  helpWrap.className = 'relative shrink-0 pt-0.5';

  const helpBtn = document.createElement('button');
  helpBtn.type = 'button';
  helpBtn.className =
    'flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-app-card text-sm font-semibold italic text-app-muted shadow-sm transition hover:bg-app-card-alt hover:text-app-text';
  helpBtn.textContent = 'i';
  helpBtn.setAttribute('aria-label', 'Como essa lista funciona');
  helpBtn.setAttribute('aria-expanded', 'false');

  const pop = document.createElement('div');
  pop.id = 'fg-ideias-help';
  pop.setAttribute('role', 'tooltip');
  pop.className =
    'invisible absolute right-0 top-full z-[60] mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-app-border bg-app-surface p-3 text-left text-sm leading-relaxed text-app-muted shadow-lg';

  const blurbP = document.createElement('p');
  blurbP.textContent = RESULTS_HELP_TEXT;
  pop.appendChild(blurbP);

  let docHandler: ((ev: MouseEvent) => void) | null = null;
  let escHandler: ((ev: KeyboardEvent) => void) | null = null;

  function close(): void {
    pop.classList.add('invisible');
    helpBtn.setAttribute('aria-expanded', 'false');
    if (docHandler) {
      document.removeEventListener('mousedown', docHandler, true);
      docHandler = null;
    }
    if (escHandler) {
      document.removeEventListener('keydown', escHandler, true);
      escHandler = null;
    }
  }

  function open(): void {
    pop.classList.remove('invisible');
    helpBtn.setAttribute('aria-expanded', 'true');
    docHandler = (ev: MouseEvent) => {
      if (!helpWrap.contains(ev.target as Node)) close();
    };
    escHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close();
    };
    setTimeout(() => {
      document.addEventListener('mousedown', docHandler!, true);
      document.addEventListener('keydown', escHandler!, true);
    }, 0);
  }

  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pop.classList.contains('invisible')) open();
    else close();
  });

  helpWrap.appendChild(helpBtn);
  helpWrap.appendChild(pop);
  titleRow.appendChild(h2);
  titleRow.appendChild(helpWrap);
  shell.appendChild(titleRow);
}

export function mount(root: HTMLElement): void {
  rootRef = root;
  const renderApp = () => render(root);
  (window as unknown as { __fg_render?: () => void }).__fg_render = renderApp;
  renderApp();
  void loadAllRecipes()
    .then((r) => {
      recipesCache = r;
    })
    .catch(() => {
      /* ensureRecipes tenta de novo ao usar receitas */
    });
}

function render(root: HTMLElement): void {
  root.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'flex min-h-dvh flex-col bg-app-page';
  wrap.appendChild(renderHud());

  const shell = document.createElement('div');
  shell.className = 'mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-5';
  wrap.appendChild(shell);
  root.appendChild(wrap);

  switch (screen.name) {
    case 'home':
      renderHome(shell);
      break;
    case 'pantry':
      void renderPantry(shell);
      break;
    case 'manual':
      renderManual(shell);
      break;
    case 'photo':
      renderPhoto(shell);
      break;
    case 'stats':
      renderStats(shell);
      break;
    case 'results':
      renderResults(shell, screen);
      break;
    case 'recipe':
      void renderRecipeAsync(shell, screen);
      break;
  }
}

function btnPrimary(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className =
    'w-full rounded-2xl bg-app-accent px-4 py-3 text-center font-display text-lg font-semibold text-app-on-accent shadow-lg shadow-black/20 transition active:scale-[0.98]';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function btnSecondary(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className =
    'w-full rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-center font-medium text-app-text';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function renderHome(shell: HTMLElement): void {
  const h1 = document.createElement('h1');
  h1.className = 'font-display text-3xl font-bold tracking-tight text-app-text';
  h1.textContent = 'Pra Já';
  shell.appendChild(h1);

  const sub = document.createElement('p');
  sub.className = 'mt-2 text-app-muted';
  sub.textContent =
    'Tira uma foto ou escreve o que tem aí na geladeira que eu te ajudo com receita na hora. Nada disso sai do seu celular, combinado?';
  shell.appendChild(sub);

  const stack = document.createElement('div');
  stack.className = 'mt-8 flex flex-col gap-3';
  stack.appendChild(
    btnPrimary('Bater foto da geladeira', () => navigate({ name: 'photo' }))
  );
  stack.appendChild(
    btnSecondary('Escrever o que tenho', () => navigate({ name: 'manual' }))
  );
  stack.appendChild(
    btnSecondary('O que já salvei', () => navigate({ name: 'pantry' }))
  );
  shell.appendChild(stack);

  const goRecipes = document.createElement('button');
  goRecipes.type = 'button';
  goRecipes.className =
    'mt-8 text-sm font-medium text-app-muted underline decoration-app-link underline-offset-4';
  goRecipes.textContent = 'Me mostra receita com o que eu tenho →';
  goRecipes.addEventListener('click', () => void openResults());
  shell.appendChild(goRecipes);

  renderHomeSettingsButton(shell);

  const note = document.createElement('p');
  note.className = 'mt-8 text-xs leading-relaxed text-app-faint';
  note.textContent =
    'Dica de amigo: na primeira vez a leitura da foto pode pedir internet pra baixar umas coisinhas; depois costuma rodar mais offline.';
  shell.appendChild(note);

  if (isDevUnlockAll()) {
    const p = document.createElement('p');
    p.className = 'mt-2 text-xs text-app-warn';
    p.textContent = 'VITE_DEV_UNLOCK_ALL ativo — todas as SKUs liberadas no dev.';
    shell.appendChild(p);
  }
}

function renderStats(shell: HTMLElement): void {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'mb-4 self-start text-sm text-app-muted';
  back.textContent = '← Voltar pro início';
  back.addEventListener('click', () => navigate({ name: 'home' }));
  shell.appendChild(back);

  const h2 = document.createElement('h2');
  h2.className = 'font-display text-2xl font-bold text-app-text';
  h2.textContent = 'Teu desempenho & conquistas';
  shell.appendChild(h2);

  const state = getGameState();
  const sum = getHudSummary();

  const grid = document.createElement('div');
  grid.className = 'mt-6 grid grid-cols-2 gap-3';
  const statCards: [string, string][] = [
    ['Nível', String(sum.level)],
    ['Média (pts / dia que usou o app)', String(sum.avgPerDay)],
    ['Pontos no total', String(sum.total)],
    ['Ingredientes que já colocou', String(state.ingredientsAdded)],
    ['Receitas que marcou como feitas', String(state.recipesCooked)],
    ['Fotos que leu os rótulos', String(state.ocrSuccess)],
    ['Dias seguidos (atual)', `${state.currentStreak} dia(s)`],
    ['Recorde de dias seguidos', `${state.bestStreak} dia(s)`],
  ];
  for (const [label, val] of statCards) {
    const c = document.createElement('div');
    c.className = 'rounded-xl border border-app-border bg-app-card px-3 py-3';
    const lb = document.createElement('div');
    lb.className = 'text-[10px] font-medium uppercase tracking-wide text-app-faint';
    lb.textContent = label;
    const v = document.createElement('div');
    v.className = 'mt-1 font-display text-base font-semibold text-app-text';
    v.textContent = val;
    c.appendChild(lb);
    c.appendChild(v);
    grid.appendChild(c);
  }
  shell.appendChild(grid);

  const rankTitle = document.createElement('h3');
  rankTitle.className = 'mt-10 font-display text-lg font-semibold text-app-text';
  rankTitle.textContent = 'Ranking por semana (só aí no celular)';
  shell.appendChild(rankTitle);
  const rankSub = document.createElement('p');
  rankSub.className = 'mt-1 text-xs text-app-faint';
  rankSub.textContent =
    'Comparativo bem caseiro: pontos que você ganhou em cada semana (segunda a domingo).';
  shell.appendChild(rankSub);

  const weeks = weekRankingLocal(state, 10).filter((x) => x.points > 0).slice(0, 6);
  if (weeks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'mt-3 text-sm text-app-muted';
    empty.textContent =
      'Ainda zerado por aqui — mexe no app, cozinha, tira foto da geladeira que isso enche!';
    shell.appendChild(empty);
  } else {
    const rankList = document.createElement('ol');
    rankList.className = 'mt-4 space-y-2';
    weeks.forEach((w, i) => {
      const li = document.createElement('li');
      li.className =
        'flex items-center justify-between gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-sm';
      const left = document.createElement('span');
      left.className = 'text-app-muted';
      left.textContent = `#${i + 1} · Semana de ${w.label}`;
      const right = document.createElement('span');
      right.className = 'shrink-0 font-display font-semibold text-app-text';
      right.textContent = `${w.points} pts`;
      li.appendChild(left);
      li.appendChild(right);
      rankList.appendChild(li);
    });
    shell.appendChild(rankList);
  }

  const achTitle = document.createElement('h3');
  achTitle.className = 'mt-10 font-display text-lg font-semibold text-app-text';
  achTitle.textContent = 'Conquistas';
  shell.appendChild(achTitle);
  const achSub = document.createElement('p');
  achSub.className = 'mt-1 text-xs text-app-faint';
  achSub.textContent = 'Vão abrindo conforme você usa o app — tudo fica guardado aí, sem nuvem.';
  shell.appendChild(achSub);

  const achGrid = document.createElement('div');
  achGrid.className = 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2';
  for (const a of ACHIEVEMENTS) {
    const unl = state.achievementsUnlocked.includes(a.id);
    const c = document.createElement('div');
    c.className = unl
      ? 'rounded-xl border border-app-border-strong bg-app-success-bg px-3 py-3 text-sm text-app-text'
      : 'rounded-xl border border-dashed border-app-border bg-app-card-alt px-3 py-3 text-sm text-app-muted opacity-80';
    const row = document.createElement('div');
    row.className = 'flex gap-2';
    const ic = document.createElement('span');
    ic.className = 'text-lg';
    ic.setAttribute('aria-hidden', 'true');
    ic.textContent = a.icon;
    const txt = document.createElement('div');
    const t1 = document.createElement('div');
    t1.className = 'font-semibold text-app-text';
    t1.textContent = a.title;
    const t2 = document.createElement('div');
    t2.className = 'mt-0.5 text-xs text-app-muted';
    t2.textContent = unl ? a.description : `${a.description} (ainda não rolou).`;
    txt.appendChild(t1);
    txt.appendChild(t2);
    row.appendChild(ic);
    row.appendChild(txt);
    c.appendChild(row);
    achGrid.appendChild(c);
  }
  shell.appendChild(achGrid);
}

async function openResults(): Promise<void> {
  const pantry = await listPantry();
  if (pantry.length === 0) {
    showToast('Opa, coloca uns ingredientes antes — escreve, fala ou manda foto.', 'warning');
    navigate({ name: 'manual' });
    return;
  }
  const recipes = await ensureRecipes();
  const scored = scoreRecipes(pantry, recipes);
  const { urgent, warn } = partitionPantryByExpiry(pantry);
  navigate({ name: 'results', scored, urgent, warn });
}

async function renderPantry(shell: HTMLElement): Promise<void> {
  const items = await listPantry();

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'mb-4 self-start text-sm text-app-muted';
  back.textContent = '← Voltar';
  back.addEventListener('click', () => navigate({ name: 'home' }));
  shell.appendChild(back);

  const h2 = document.createElement('h2');
  h2.className = 'font-display text-2xl font-bold text-app-text';
  h2.textContent = 'Sua despensa';
  shell.appendChild(h2);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mt-4 flex flex-col gap-4';
    const p = document.createElement('p');
    p.className = 'text-app-muted';
    p.textContent = 'Tá vazio por aqui. Bota uns itens escrevendo, falando ou mandando foto.';
    empty.appendChild(p);
    empty.appendChild(
      btnPrimary('Bora adicionar', () => navigate({ name: 'manual' }))
    );
    shell.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'mt-4 flex flex-col gap-3';
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'rounded-xl border border-app-border-strong bg-app-card p-3';

    const row = document.createElement('div');
    row.className = 'flex flex-wrap items-center gap-2';

    const name = document.createElement('span');
    name.className = 'flex-1 font-medium text-app-text';
    name.textContent = it.nameRaw;
    row.appendChild(name);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'rounded-lg border border-app-danger-border bg-app-danger-bg px-2 py-1 text-xs text-app-danger';
    del.textContent = 'Excluir';
    del.addEventListener('click', async () => {
      await removePantryItem(it.id);
      rerender();
    });
    row.appendChild(del);
    card.appendChild(row);

    const dateRow = document.createElement('div');
    dateRow.className = 'mt-2 flex flex-wrap items-center gap-2 text-sm text-app-muted';
    const lbl = document.createElement('label');
    lbl.textContent = 'Validade: ';
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'rounded border border-app-border bg-app-input px-2 py-1 text-app-text';
    if (it.expiresAt) {
      input.value = it.expiresAt.slice(0, 10);
    }
    input.addEventListener('change', async () => {
      const v = input.value;
      await updatePantryItem(it.id, {
        expiresAt: v ? `${v}T12:00:00.000Z` : null,
      });
    });
    lbl.appendChild(input);
    dateRow.appendChild(lbl);
    card.appendChild(dateRow);

    list.appendChild(card);
  }
  shell.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'mt-8 flex flex-col gap-3';
  actions.appendChild(btnSecondary('Exportar lista (texto)', () => {
    const text = items.map((i) => i.nameRaw).join(', ');
    void navigator.clipboard.writeText(text).then(
      () => showToast('Copiei a lista pra área de transferência.', 'success'),
      () =>
        showToast(
          text.length > 140
            ? `Não deu pra copiar sozinho — copia na mão: ${text.slice(0, 120)}…`
            : `Não deu pra copiar: ${text}`,
          'warning'
        )
    );
  }));
  actions.appendChild(btnPrimary('Ver o que posso cozinhar', () => void openResults()));
  shell.appendChild(actions);
}

function renderManual(shell: HTMLElement): void {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'mb-4 self-start text-sm text-app-muted';
  back.textContent = '← Voltar';
  back.addEventListener('click', () => navigate({ name: 'home' }));
  shell.appendChild(back);

  const h2 = document.createElement('h2');
  h2.className = 'font-display text-2xl font-bold text-app-text';
  h2.textContent = 'O que você tem aí?';
  shell.appendChild(h2);

  const ta = document.createElement('textarea');
  ta.className =
    'mt-4 min-h-[120px] w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-app-text placeholder:text-app-faint';
  ta.placeholder = 'Tipo: 3 ovos, tomate, queijo, arroz, cebola… pode separar com vírgula.';
  shell.appendChild(ta);

  const row = document.createElement('div');
  row.className = 'mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch';

  const add = btnPrimary('Jogar na despensa', async () => {
    const lines = parseIngredientLines(ta.value);
    if (lines.length === 0) {
      showToast('Coloca pelo menos um item aí pra eu te ajudar.', 'warning');
      return;
    }
    await addPantryItems(lines);
    ta.value = '';
    notifyAchievements(recordIngredientsAdded(lines.length));
    showToast(
      lines.length === 1 ? '1 item guardado.' : `${lines.length} itens guardados na despensa.`,
      'success'
    );
  });
  row.appendChild(add);

  if (isSpeechSupported()) {
    const voice = btnSecondary('Falar em vez de digitar', () => {
      if (stopDictation) stopDictation();
      stopDictation = startDictation(
        (text) => {
          ta.value = ta.value ? `${ta.value}\n${text}` : text;
          stopDictation = null;
          showToast('Pronto, joguei o que você falou aí.', 'success');
        },
        (err) => showToast(err, 'error')
      );
    });
    row.appendChild(voice);
  } else {
    const hint = document.createElement('p');
    hint.className = 'flex items-center text-xs text-app-faint sm:max-w-[40%] sm:self-center';
    hint.textContent = 'Esse navegador não deixa usar voz direito — manda ver no teclado.';
    row.appendChild(hint);
  }
  shell.appendChild(row);

  const manualFooter = document.createElement('div');
  manualFooter.className = 'mt-8 flex flex-col gap-3';
  manualFooter.appendChild(btnSecondary('Ver o que salvei', () => navigate({ name: 'pantry' })));
  manualFooter.appendChild(btnPrimary('Me dá ideia de receita', () => void openResults()));
  shell.appendChild(manualFooter);
}

function renderPhoto(shell: HTMLElement): void {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'mb-4 self-start text-sm text-app-muted';
  back.textContent = '← Voltar';
  back.addEventListener('click', () => navigate({ name: 'home' }));
  shell.appendChild(back);

  const h2 = document.createElement('h2');
  h2.className = 'font-display text-2xl font-bold text-app-text';
  h2.textContent = 'Foto da geladeira';
  shell.appendChild(h2);

  const p = document.createElement('p');
  p.className = 'mt-2 text-sm text-app-muted';
  p.textContent =
    'Eu tento ler o que tá escrito nas embalagens na própria foto. Dá uma olhada no resultado e completa o que faltar, beleza?';
  shell.appendChild(p);

  const tips = document.createElement('details');
  tips.className = 'mt-4 rounded-xl border border-app-border bg-app-card-alt';
  const sum = document.createElement('summary');
  sum.className =
    'cursor-pointer list-none px-3 py-2.5 font-medium text-app-text [&::-webkit-details-marker]:hidden';
  sum.textContent = 'Sem etiqueta na foto? Vamos nessa';
  const tipBody = document.createElement('div');
  tipBody.className =
    'space-y-2 border-t border-app-border px-3 py-3 text-xs leading-relaxed text-app-muted';
  const tipLines = [
    'Fruta, verdura, pão… muita coisa não tem letra nenhuma. Usa o campo “Itens extras” ali embaixo.',
    'Luz boa, sem reflexo forte, e câmera mais perto do rótulo (nome e validade) ajudam a leitura automática.',
    'Geladeira lotada? Uma foto por prateleira (ou da porta) costuma funcionar melhor — vai processando aos poucos.',
    'Se vier texto esquisito, apaga o que não for comida e separa os ingredientes com vírgula.',
    'Combina com a tela de escrever ou com a voz pra fechar a lista com o que a foto não pegou.',
  ];
  for (const line of tipLines) {
    const tp = document.createElement('p');
    tp.textContent = `· ${line}`;
    tipBody.appendChild(tp);
  }
  tips.appendChild(sum);
  tips.appendChild(tipBody);
  shell.appendChild(tips);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.className = 'mt-4 block w-full text-sm text-app-muted';

  const preview = document.createElement('img');
  preview.className = 'mt-4 hidden max-h-48 w-full rounded-xl object-cover';

  const ta = document.createElement('textarea');
  ta.className =
    'min-h-[100px] w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text';
  ta.placeholder =
    'Aqui aparece o que eu consegui ler na foto — ajusta, apaga besteira e separa com vírgula.';

  const extraLbl = document.createElement('label');
  extraLbl.className = 'text-xs font-medium text-app-muted';
  extraLbl.textContent = 'Itens extras (sem etiqueta ou que não saíram na leitura da foto)';

  const extraTa = document.createElement('textarea');
  extraTa.className =
    'min-h-[80px] w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm text-app-text placeholder:text-app-faint';
  extraTa.placeholder =
    'Ex.: banana, limão, alho, pão francês, cenoura, temperos a granel… (opcional)';

  let currentFile: File | null = null;
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (!f) return;
    currentFile = f;
    preview.src = URL.createObjectURL(f);
    preview.classList.remove('hidden');
  });

  const status = document.createElement('p');
  status.className = 'text-sm text-app-faint';

  const process = btnSecondary('Ler texto da foto', async () => {
    if (!currentFile) {
      showToast('Escolhe uma foto primeiro, senão não rola.', 'warning');
      return;
    }
    status.textContent = 'Lendo… na primeira vez pode demorar um tiquinho.';
    try {
      const text = await extractTextFromImage(currentFile);
      ta.value = text;
      status.textContent = 'Pronto! Confere aí e usa “Itens extras” se faltar alguma coisa.';
      notifyAchievements(recordOcrSuccess());
    } catch (e) {
      status.textContent =
        'Não rolou dessa vez — tenta outra foto, mais luz, ou manda ver escrevendo na despensa.';
      console.error(e);
    }
  });

  shell.appendChild(input);
  shell.appendChild(preview);

  const photoBlock = document.createElement('div');
  photoBlock.className = 'mt-4 flex flex-col gap-4';
  photoBlock.appendChild(process);
  photoBlock.appendChild(status);
  photoBlock.appendChild(ta);
  photoBlock.appendChild(extraLbl);
  photoBlock.appendChild(extraTa);
  photoBlock.appendChild(
    btnPrimary('Salvar na despensa', async () => {
      const fromOcr = parseIngredientLines(ta.value);
      const fromExtra = parseIngredientLines(extraTa.value);
      const merged = [...fromOcr, ...fromExtra];
      if (merged.length === 0) {
        showToast(
          'Tá vazio — lê a foto de novo, escreve no quadro ou bota no “Itens extras”.',
          'warning'
        );
        return;
      }
      await addPantryItems(merged);
      notifyAchievements(recordIngredientsAdded(merged.length));
      showToast(
        merged.length === 1 ? '1 item guardado.' : `${merged.length} itens guardados na despensa.`,
        'success'
      );
      navigate({ name: 'pantry' });
    })
  );
  shell.appendChild(photoBlock);
}

function filterFewIngredients(list: ScoredRecipe[]): ScoredRecipe[] {
  return list.filter((s) => {
    const req = s.recipe.ingredients.filter((i) => !i.optional);
    return req.length <= 3;
  });
}

function renderResults(shell: HTMLElement, s: Screen & { name: 'results' }): void {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'mb-4 self-start text-sm text-app-muted';
  back.textContent = '← Início de novo';
  back.addEventListener('click', () => navigate({ name: 'home' }));
  shell.appendChild(back);

  renderIdeiasPraHojeHeader(shell);

  if (s.urgent.length > 0) {
    const box = document.createElement('div');
    box.className =
      'mt-4 rounded-xl border border-app-danger-border bg-app-danger-bg p-3';
    const t = document.createElement('p');
    t.className = 'font-display text-sm font-semibold text-app-danger';
    t.textContent = 'Corre que isso vence';
    box.appendChild(t);
    const ul = document.createElement('ul');
    ul.className = 'mt-2 list-inside list-disc text-sm text-app-danger';
    for (const u of s.urgent) {
      const li = document.createElement('li');
      li.textContent = u.nameRaw;
      ul.appendChild(li);
    }
    box.appendChild(ul);
    shell.appendChild(box);
  }

  if (s.warn.length > 0 && s.urgent.length === 0) {
    const box = document.createElement('div');
    box.className = 'mt-4 rounded-xl border border-app-warn-border bg-app-warn-bg p-3';
    const t = document.createElement('p');
    t.className = 'text-sm font-semibold text-app-warn';
    t.textContent = 'Fica de olho na validade (até 7 dias)';
    box.appendChild(t);
    const ul = document.createElement('ul');
    ul.className = 'mt-2 list-inside list-disc text-sm text-app-warn';
    for (const u of s.warn.slice(0, 6)) {
      const li = document.createElement('li');
      li.textContent = u.nameRaw;
      ul.appendChild(li);
    }
    box.appendChild(ul);
    shell.appendChild(box);
  }

  const toggleRow = document.createElement('label');
  toggleRow.className =
    'mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-app-border bg-app-card-alt px-3 py-3 text-sm text-app-muted';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = fewOnly;
  cb.addEventListener('change', () => {
    fewOnly = cb.checked;
    navigate(s);
  });
  toggleRow.appendChild(cb);
  toggleRow.appendChild(
    document.createTextNode('Só receita com poucos ingredientes (3 ou menos na lista)')
  );
  shell.appendChild(toggleRow);

  const baseList = fewOnly ? filterFewIngredients(s.scored) : s.scored;
  const shown = topRecipes(baseList);

  const list = document.createElement('div');
  list.className = 'mt-6 flex flex-col gap-3';
  for (const sc of shown) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className =
      'flex w-full gap-3 rounded-2xl border border-app-border-strong bg-app-card p-3 text-left transition active:scale-[0.99]';

    const thumbWrap = document.createElement('div');
    thumbWrap.className =
      'relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-app-border bg-app-card-alt';
    const thumbPh = document.createElement('div');
    thumbPh.className = 'absolute inset-0 animate-pulse bg-app-border/50';
    thumbPh.setAttribute('aria-hidden', 'true');
    thumbWrap.appendChild(thumbPh);

    const textCol = document.createElement('div');
    textCol.className = 'flex min-w-0 flex-1 flex-col justify-center gap-1';

    const title = document.createElement('div');
    title.className = 'font-display text-base font-semibold leading-snug text-app-text sm:text-lg';
    title.textContent = sc.recipe.name;

    const meta = document.createElement('div');
    meta.className = 'text-sm leading-snug text-app-muted';
    meta.textContent = `Bate com ~${sc.matchPercent}% do que você tem · ${sc.recipe.prepTimeMinutes} min · ${difficultyLabel(sc.recipe.difficulty)}`;

    textCol.appendChild(title);
    textCol.appendChild(meta);

    card.appendChild(thumbWrap);
    card.appendChild(textCol);

    void fetchRecipeImageUrlCached(sc.recipe.id, sc.recipe.name).then((src) => {
      if (!card.isConnected) return;
      thumbPh.remove();
      if (!src) {
        const ph = document.createElement('span');
        ph.className =
          'flex h-full w-full items-center justify-center text-2xl text-app-faint opacity-70';
        ph.textContent = '🍽';
        ph.setAttribute('aria-hidden', 'true');
        thumbWrap.appendChild(ph);
        return;
      }
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.className = 'h-full w-full object-cover';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        if (!thumbWrap.isConnected) return;
        img.remove();
        const ph = document.createElement('span');
        ph.className =
          'flex h-full w-full items-center justify-center text-2xl text-app-faint opacity-70';
        ph.textContent = '🍽';
        ph.setAttribute('aria-hidden', 'true');
        thumbWrap.appendChild(ph);
      });
      thumbWrap.appendChild(img);
    });

    card.addEventListener('click', () => {
      const urgentNorms = new Set(s.urgent.map((u) => u.nameNormalized));
      const hint = variationHint(sc.recipe, s.scored, urgentNorms);
      navigate({
        name: 'recipe',
        recipe: sc.recipe,
        scored: s.scored,
        variationHint: hint,
      });
    });

    list.appendChild(card);
  }
  shell.appendChild(list);

  const surprise = btnSecondary('Me surpreende', () => {
    const pool = fewOnly ? filterFewIngredients(s.scored) : s.scored;
    const pick = pickSurprise(pool, SURPRISE_MIN_MATCH);
    if (!pick) {
      showToast(
        'Tá faltando combinação boa — coloca mais coisa na despensa ou desliga o filtro de “poucos ingredientes”.',
        'info'
      );
      return;
    }
    const urgentNorms = new Set(s.urgent.map((u) => u.nameNormalized));
    const hint = variationHint(pick.recipe, s.scored, urgentNorms);
    navigate({
      name: 'recipe',
      recipe: pick.recipe,
      scored: s.scored,
      variationHint: hint,
    });
  });
  surprise.className += ' mt-8';
  shell.appendChild(surprise);
}

async function renderRecipeAsync(shell: HTMLElement, s: Screen & { name: 'recipe' }): Promise<void> {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'mb-4 self-start text-sm text-app-muted';
  back.textContent = '← Voltar pras ideias';
  back.addEventListener('click', () => {
    void (async () => {
      const pantry = await listPantry();
      const recipes = await ensureRecipes();
      const scored = scoreRecipes(pantry, recipes);
      const { urgent, warn } = partitionPantryByExpiry(pantry);
      navigate({ name: 'results', scored, urgent, warn });
    })();
  });
  shell.appendChild(back);

  const h2 = document.createElement('h2');
  h2.className = 'font-display text-2xl font-bold text-app-text';
  h2.textContent = s.recipe.name;
  shell.appendChild(h2);

  const meta = document.createElement('p');
  meta.className = 'mt-2 text-sm text-app-muted';
  meta.textContent = `${s.recipe.prepTimeMinutes} min · ${difficultyLabel(s.recipe.difficulty)}`;
  shell.appendChild(meta);

  const imgWrap = document.createElement('div');
  imgWrap.className =
    'mt-4 flex max-h-56 min-h-[140px] flex-col overflow-hidden rounded-2xl border border-app-border bg-app-card-alt';
  const imgStatus = document.createElement('p');
  imgStatus.className = 'm-auto px-4 py-6 text-center text-xs text-app-faint';
  imgStatus.textContent = 'Tentando achar uma foto que combine…';
  imgWrap.appendChild(imgStatus);
  shell.appendChild(imgWrap);

  void fetchRecipeImageUrlCached(s.recipe.id, s.recipe.name).then((src) => {
    if (!shell.isConnected) return;
    imgStatus.remove();
    if (!src) {
      const p = document.createElement('p');
      p.className = 'm-auto px-4 py-6 text-center text-xs text-app-faint';
      p.textContent =
        'Não rolou achar imagem dessa vez — segue tranquilo só com o texto e o passo a passo.';
      imgWrap.appendChild(p);
      return;
    }
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Ilustração aproximada: ${s.recipe.name}`;
    img.className = 'h-auto max-h-56 w-full object-cover';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', () => {
      if (!imgWrap.isConnected) return;
      const cap = document.createElement('p');
      cap.className =
        'border-t border-app-border bg-app-surface/80 px-2 py-1.5 text-[10px] leading-snug text-app-faint';
      cap.textContent =
        'Imagem ilustrativa (busca na Wikipédia) — pode não ser exatamente esse prato aí na sua casa.';
      imgWrap.appendChild(cap);
    });
    img.addEventListener('error', () => {
      if (!imgWrap.isConnected) return;
      img.remove();
      const p = document.createElement('p');
      p.className = 'm-auto px-4 py-6 text-center text-xs text-app-faint';
      p.textContent = 'A foto não carregou — sem problema, a receita tá aí embaixo.';
      imgWrap.appendChild(p);
    });
    imgWrap.appendChild(img);
  });

  const pantry = await listPantry();
  const have = new Set(pantry.map((p) => p.nameNormalized));
  const ingTitle = document.createElement('h3');
  ingTitle.className = 'mt-6 font-display text-lg font-semibold text-app-text';
  ingTitle.textContent = 'O que entra nessa receita';
  shell.appendChild(ingTitle);

  const ul = document.createElement('ul');
  ul.className = 'mt-2 space-y-1 text-sm';
  for (const ing of s.recipe.ingredients) {
    const li = document.createElement('li');
    const ok = have.has(ing.nameNormalized);
    li.className = ok ? 'text-app-success' : 'text-app-danger';
    li.textContent = `${ok ? '✓' : '✗'} ${ing.name}${ing.optional ? ' (opcional)' : ''}`;
    ul.appendChild(li);
  }
  shell.appendChild(ul);

  const missing = s.recipe.ingredients.filter(
    (ing) => !ing.optional && !have.has(ing.nameNormalized)
  );
  if (missing.length > 0) {
    const shopTitle = document.createElement('h3');
    shopTitle.className = 'mt-6 font-display text-lg font-semibold text-app-text';
    shopTitle.textContent = 'Falta comprar';
    shell.appendChild(shopTitle);
    const shopUl = document.createElement('ul');
    shopUl.className = 'mt-2 list-inside list-disc text-sm text-app-muted';
    for (const ing of missing) {
      const li = document.createElement('li');
      li.textContent = ing.name;
      shopUl.appendChild(li);
    }
    shell.appendChild(shopUl);
    const copyShop = btnSecondary('Copiar lista do que falta', () => {
      const text = missing.map((i) => i.name).join(', ');
      void navigator.clipboard.writeText(`Comprar: ${text}`).then(
        () => showToast('Copiei a lista pra colar no Zap ou no bloco de notas.', 'success'),
        () =>
          showToast(
            text.length > 140
              ? `Não deu pra copiar sozinho — copia na mão: ${text.slice(0, 120)}…`
              : `Não deu pra copiar: ${text}`,
            'warning'
          )
      );
    });
    copyShop.className += ' mt-3';
    shell.appendChild(copyShop);
  } else {
    const okShop = document.createElement('p');
    okShop.className = 'mt-4 text-sm text-app-success';
    okShop.textContent = 'Parece que você já tem tudo pra essa receita — manda ver!';
    shell.appendChild(okShop);
  }

  const stTitle = document.createElement('h3');
  stTitle.className = 'mt-6 font-display text-lg font-semibold text-app-text';
  stTitle.textContent = 'Passo a passo';
  shell.appendChild(stTitle);

  const ol = document.createElement('ol');
  ol.className = 'mt-2 list-inside list-decimal space-y-2 text-sm text-app-muted';
  for (const step of s.recipe.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    ol.appendChild(li);
  }
  shell.appendChild(ol);

  if (s.variationHint) {
    const tip = document.createElement('p');
    tip.className = 'mt-6 rounded-xl border border-app-border bg-app-card-alt p-3 text-sm text-app-muted';
    tip.textContent = s.variationHint;
    shell.appendChild(tip);
  }

  const recipeActions = document.createElement('div');
  recipeActions.className = 'mt-8 flex flex-col gap-3';
  recipeActions.appendChild(
    btnSecondary('Fiz essa hoje', () => {
      markDoneToday(s.recipe.id);
      notifyAchievements(recordRecipeCooked());
      showToast('Anotado aqui no teu histórico. Boa refeição!', 'success');
    })
  );
  shell.appendChild(recipeActions);
}
