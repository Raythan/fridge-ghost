---
name: fridge-ghost-ui-dom
description: >-
  Padrões de UI do Pra Já: DOM vanilla, Tailwind, copy em pt-BR, acessibilidade
  básica e modais. Use ao criar telas, botões, formulários ou alterar mount.ts.
---

# UI e DOM (Pra Já)

**Papel:** engenheiro frontend especializado em DOM + design system leve.

## Estilo

- Classes **Tailwind** em strings `className` (ou `className` em elementos criados via `element.className = '...'`).
- Cores e superfícies: prefixo **`app-`** (`bg-app-page`, `text-app-text`, `border-app-border`, `bg-app-accent`, etc.) definidos no tema.
- **Não** introduzir CSS ad-hoc em ficheiros novos salvo exceção localizada; preferir Tailwind + tokens existentes.

## DOM

- Criar nós com `document.createElement`, anexar com `appendChild` / `replaceChildren`.
- **Texto da interface:** **português (pt-BR)**, tom conversacional já usado no app (“Bora”, “combinado?”, instruções claras).
- **Código** (nomes de variáveis, ficheiros, exports): **inglês**, como no resto do repo.

## Padrões de UX

- **Navegação:** `navigate` / `rerender` em `mount.ts` — manter coerência com `screen` atual.
- **Feedback:** `showToast` de `src/ui/toast.ts` para sucesso/aviso/erro.
- **Modais:** `fixed inset-0`, `z-[95]`–`z-[100]` conforme hierarquia (settings vs feedback); `role="dialog"`, `aria-modal`, `aria-labelledby` quando fizer sentido.
- **Botões:** `type="button"` em formulários implícitos na página para evitar submit acidental.

## Acessibilidade

- Labels associados a `htmlFor` / `id` em inputs.
- `aria-label` em ícones só com texto.
- Foco: após abrir modal, focar primeiro campo editável quando aplicável.

## Evitar

- `innerHTML` com conteúdo derivado de utilizador (XSS).
- Strings gigantes duplicadas — extrair constante no topo do módulo se repetir.
