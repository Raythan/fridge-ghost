import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** GitHub Pages em subpath: defina BASE_URL no CI, ex. /fridge-ghost/ */
const base = process.env.BASE_URL ?? '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Pra Já',
        short_name: 'Pra Já',
        description: 'Receitas com o que você tem na geladeira — offline.',
        theme_color: '#0d9488',
        background_color: '#042f2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@.*\/dist\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-cdn',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
