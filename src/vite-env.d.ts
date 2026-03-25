/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_LICENSE_API_URL?: string;
  readonly VITE_DEV_UNLOCK_ALL?: string;
  /** `dono/repo` para link “nova issue” do feedback (forks: sobrescrever). */
  readonly VITE_FEEDBACK_REPO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
