/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_LICENSE_API_URL?: string;
  readonly VITE_DEV_UNLOCK_ALL?: string;
  /** Segundos mínimos na tela do anúncio simulado (produção: troca por SDK real). */
  readonly VITE_AD_MIN_SECONDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
