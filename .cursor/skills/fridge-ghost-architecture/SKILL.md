---
name: fridge-ghost-architecture
description: >-
  Stack, pastas e fluxos de build/deploy do Pra Já (fridge-ghost): Vite, TS,
  Tailwind, PWA, GitHub Actions, BASE_URL e variáveis de ambiente. Use ao
  adicionar dependências, mudar CI, hospedagem, caminhos públicos ou estrutura
  de src/.
---

# Arquitetura Pra Já (fridge-ghost)

**Papel:** arquiteto de solução / tech lead alinhado a este repositório.

## Stack

- **Vite 6** + **TypeScript** (build: `tsc && vite build`).
- **Tailwind CSS** + `src/styles.css` (tokens tema `app-*`).
- **UI:** TypeScript **vanilla** (DOM com `document.createElement`); ponto central `src/ui/mount.ts`.
- **PWA:** `vite-plugin-pwa` em `vite.config.ts` (precache, runtime cache Tesseract no CDN).
- **Dados:** receitas em `public/data/recipes-free.json` e `recipes-premium.json` (servidos como estáticos).

## Mapa de `src/`

| Área | Responsabilidade |
|------|------------------|
| `main.ts` | Entrada, montagem do root. |
| `ui/mount.ts` | Rotas/telas, HUD, modais, maior parte da UI. |
| `ui/toast.ts` | Feedback rápido ao utilizador. |
| `recipes/` | Carregar JSON, normalizar, match, imagens. |
| `storage/` | Despensa, histórico (IndexedDB / localStorage conforme módulo). |
| `ocr/` | Foto → texto (Tesseract). |
| `speech/` | Ditado. |
| `gamification/` | Pontos, conquistas, estado. |
| `theme/` | Temas guardados localmente. |
| `entitlement/` | Regras de acesso a dados (ex.: premium). |
| `feedback/` | GitHub issue URL + envio Web3Forms. |
| `types.ts`, `constants.ts` | Contratos e constantes partilhadas. |

**Regra:** funcionalidades novas com lógica própria → novo módulo sob `src/<domínio>/`; integrar em `mount.ts` com o mínimo de acoplamento.

## Build e `base`

- `vite.config.ts` usa `process.env.BASE_URL` (padrão `/`).
- **GitHub Pages** em subpasta: CI define `BASE_URL: /<nome-do-repo>/`.
- URLs públicas a dados: `import.meta.env.BASE_URL` + caminho (ver `loadRecipes.ts` / `licenseClient.ts`).

## Meta social (OG)

- Plugin `fg-social-meta` em `vite.config.ts`: injeta canonical + Open Graph se `VITE_PUBLIC_CANONICAL_ORIGIN` estiver definida no build.
- **Pages workflow** define origem a partir de `github.repository_owner`.

## CI/CD

- `.github/workflows/ci.yml`: `npm install` (não `npm ci` no Linux/Rollup), lint, `validate-recipes`, build com `BASE_URL=/`.
- `.github/workflows/pages.yml`: mesmo install; `WEB3FORMS_ACCESS_KEY` → `VITE_FEEDBACK_WEB3FORMS_ACCESS_KEY`; deploy artifact Pages.

## Variáveis úteis

- `VITE_*`: expostas ao cliente; nunca colocar segredos reais que não possam ser públicos.
- Ver `.env.example` e README para feedback, canonical, dev unlock.

## Anti-padrões

- Introduzir React/Vue sem decisão explícita do dono do produto (stack é vanilla de propósito).
- Assumir raiz do site sem `BASE_URL` em links a `public/`.
