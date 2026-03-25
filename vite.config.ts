import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** GitHub Pages em subpath: defina BASE_URL no CI, ex. /fridge-ghost/ */
const base = process.env.BASE_URL ?? '/';

const OG_TITLE = 'Pra Já';
const OG_DESCRIPTION =
  'Foto ou texto da geladeira → receitas na hora. App no celular, curadoria em português.';

function socialMetaTagsHtml(): string {
  const origin = process.env.VITE_PUBLIC_CANONICAL_ORIGIN?.replace(/\/$/, '').trim();
  if (!origin) return '';
  const seg = base.replace(/^\/+|\/+$/g, '');
  const pathPrefix = seg ? `/${seg}` : '';
  const canonical = `${origin}${pathPrefix}/`;
  const ogImage = `${origin}${pathPrefix}/pwa-512.png`;
  return `
    <link rel="canonical" href="${canonical}" />
    <meta property="og:site_name" content="${OG_TITLE}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${OG_TITLE}" />
    <meta property="og:description" content="${OG_DESCRIPTION}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:alt" content="Pra Já — receitas com o que você tem" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${OG_TITLE}" />
    <meta name="twitter:description" content="${OG_DESCRIPTION}" />
    <meta name="twitter:image" content="${ogImage}" />
  `;
}

export default defineConfig({
  base,
  plugins: [
    {
      name: 'fg-social-meta',
      transformIndexHtml(html) {
        const inject = socialMetaTagsHtml();
        if (!inject) return html;
        return html.replace('</head>', `${inject}\n  </head>`);
      },
    },
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
