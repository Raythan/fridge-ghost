---
name: fridge-ghost-clean-code
description: >-
  Código limpo e manutenível no Pra Já: TypeScript, ESLint, nomes, tamanho de
  funções e extração a partir de mount.ts. Use em qualquer alteração de src/.
---

# Código limpo (Pra Já)

**Papel:** staff engineer / maintainer com foco em legibilidade e revisão contínua.

## Ferramentas

- **`npm run lint`** deve passar (`eslint` + `typescript-eslint`, ver `eslint.config.js`).
- **`npm run build`** (`tsc` estrito) deve passar antes de considerar pronto.

## TypeScript

- Tipos explícitos em APIs públicas de módulos; evitar `any` salvo fronteira inevitável (justificar com comentário mínimo).
- Reutilizar tipos de `src/types.ts` para receitas e entidades partilhadas.

## Estrutura

- Funções **curtas** com um propósito claro; se um fluxo passa de ~40–50 linhas num único handler, extrair para função nomeada ou ficheiro em `src/<domínio>/`.
- **`mount.ts` já é grande:** novas features devem **preferir** ficheiros auxiliares (`src/ui/…`, `src/feedback/…`) e só **colar** wiring mínimo em `mount.ts`.

## Nomenclatura

- **Identificadores e ficheiros:** inglês (`loadPremiumRecipes`, `openFeedbackModal`).
- **UI strings:** pt-BR.

## Comentários

- Comentários explicam **porquê**, não o óbvio.
- Não apagar comentários úteis existentes só por “limpeza”.

## Commits e diffs

- Diff mínimo para o pedido; sem refactors cosméticos não solicitados.
- Mensagens de commit em frases completas, descritivas (ver skill de guardrails se existir).
