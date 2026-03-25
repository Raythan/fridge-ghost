---
name: fridge-ghost-performance
description: >-
  Desempenho do Pra Já: carregamento de receitas, PWA, bundle, rerenders e
  trabalho pesado no cliente. Use ao mexer em mount, recipes, OCR, workbox ou
  build.
---

# Desempenho (Pra Já)

**Papel:** engenheiro frontend com perfil de performance (Web Vitals, custo no cliente).

## Dados e rede

- Receitas: `loadAllRecipes()` já combina free + premium; **cache** em memória (`recipesCache` em `mount.ts`) — invalidar só quando dados mudarem de verdade.
- Pré-carga no `mount()` evita atraso na primeira lista; não duplicar fetches redundantes sem motivo.
- JSON grande: evitar `JSON.parse` repetido no mesmo ciclo de vida; manter uma fonte cacheada.

## UI

- `rerender()` reconstrói a árvore principal — evitar chamadas em **loops** ou **intervalos** desnecessários; debounce inputs pesados se adicionar busca em listas grandes.

## OCR e media

- Tesseract é pesado: já há cache de CDN no Workbox; não carregar outra cópia da lib por engano.
- Imagens de receita: seguir padrão existente em `recipeImage.ts` (cache, URLs públicas).

## Bundle

- Preferir APIs nativas e módulos já presentes antes de acrescentar bibliotecas.
- Verificar impacto em tamanho (`vite build` output) ao adicionar dependências.

## PWA

- Alterações em `vite.config.ts` (Workbox) afetam offline e atualizações — testar `npm run build` e comportamento de atualização de SW quando mexer nisso.
