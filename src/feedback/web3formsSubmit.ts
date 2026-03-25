export type PublicFeedbackPayload = {
  typeLabel: string;
  body: string;
  /** Se preenchido, vira reply-to no e-mail recebido. */
  contactEmail?: string;
};

export function isPublicFeedbackConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FEEDBACK_WEB3FORMS_ACCESS_KEY?.trim());
}

/**
 * Envia feedback por e-mail via [Web3Forms](https://web3forms.com) (grátis, sem backend próprio).
 * A chave é pública no bundle — use o painel Web3Forms para limite de domínio / captcha.
 */
export async function submitPublicFeedback(
  p: PublicFeedbackPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = import.meta.env.VITE_FEEDBACK_WEB3FORMS_ACCESS_KEY?.trim();
  if (!key) {
    return { ok: false, error: 'Envio direto não está configurado nesta versão do app.' };
  }

  const subject = `[Pra Já] ${p.typeLabel}`;
  const message = [
    `Tipo: ${p.typeLabel}`,
    '',
    p.body,
    '',
    '---',
    typeof navigator !== 'undefined' ? `User-Agent: ${navigator.userAgent}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const payload: Record<string, string> = {
    access_key: key,
    subject,
    message,
    name: p.contactEmail?.trim() ? 'Usuário Pra Já (com e-mail)' : 'Usuário Pra Já',
  };
  const em = p.contactEmail?.trim();
  if (em) payload.email = em;

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { success?: boolean; message?: string };
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: data.message ?? 'Não foi possível enviar. Tenta de novo.' };
  } catch {
    return { ok: false, error: 'Sem conexão ou serviço indisponível.' };
  }
}
