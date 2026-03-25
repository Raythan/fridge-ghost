export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

const DURATION_MS = 4200;

function variantClasses(v: ToastVariant): string {
  switch (v) {
    case 'success':
      return 'border-emerald-500/40 bg-emerald-950/92 text-emerald-50';
    case 'error':
      return 'border-red-600/45 bg-red-950/92 text-red-50';
    case 'warning':
      return 'border-amber-500/40 bg-amber-950/92 text-amber-50';
    default:
      return 'border-app-border bg-app-card text-app-text shadow-md';
  }
}

/** Toasts fixos no corpo para sobreviver a re-renders do app em #app */
export function showToast(message: string, variant: ToastVariant = 'info'): void {
  let host = document.getElementById('fg-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'fg-toast-host';
    host.className =
      'pointer-events-none fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-lg flex-col gap-2 px-4 pt-2 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]';
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = `fg-toast pointer-events-auto rounded-2xl border px-4 py-3.5 text-sm font-medium leading-snug shadow-lg shadow-black/25 ${variantClasses(variant)}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  host.appendChild(el);

  window.setTimeout(() => {
    el.classList.add('fg-toast-out');
    window.setTimeout(() => {
      el.remove();
      if (host && host.childElementCount === 0) host.remove();
    }, 280);
  }, DURATION_MS);
}
