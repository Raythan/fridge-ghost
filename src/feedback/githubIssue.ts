/** Repo `dono/repositório` para abrir "nova issue" no GitHub (sem API — o usuário envia no site). */
const DEFAULT_REPO = 'Raythan/fridge-ghost';

export function getFeedbackRepo(): string {
  const r = import.meta.env.VITE_FEEDBACK_REPO?.trim();
  return r && r.includes('/') ? r : DEFAULT_REPO;
}

const MAX_URL_LENGTH = 7800;

/**
 * Monta URL de nova issue. O GitHub recebe título e corpo; o visitante precisa estar logado e confirmar.
 */
export function buildNewIssueUrl(title: string, body: string, labels?: string): string {
  const repo = getFeedbackRepo().replace(/^\/+|\/+$/g, '');
  const base = `https://github.com/${repo}/issues/new`;
  const t = title.trim().slice(0, 240);
  let b = body.trim();
  let qs = `title=${encodeURIComponent(t)}&body=${encodeURIComponent(b)}`;
  if (labels?.trim()) {
    qs += `&labels=${encodeURIComponent(labels.trim())}`;
  }
  let url = `${base}?${qs}`;
  while (url.length > MAX_URL_LENGTH && b.length > 120) {
    b = `${b.slice(0, Math.floor(b.length * 0.85)).trim()}\n\n_(Texto encurtado — o navegador limita o tamanho do link.)_`;
    qs = `title=${encodeURIComponent(t)}&body=${encodeURIComponent(b)}`;
    if (labels?.trim()) {
      qs += `&labels=${encodeURIComponent(labels.trim())}`;
    }
    url = `${base}?${qs}`;
  }
  return url;
}
