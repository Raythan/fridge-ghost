---
name: fridge-ghost-scalability
description: >-
  Escalabilidade de código e produto no Pra Já: limites de mount.ts, módulos
  por domínio, dados em JSON e scripts. Use ao planear features médias ou
  grandes.
---

# Escalabilidade (Pra Já)

**Papel:** arquiteto de software aplicado a codebase pequena mas em crescimento.

## Fronteiras de módulo

- Cada domínio (`recipes`, `storage`, `gamification`, `feedback`, …) expõe **APIs pequenas**; `mount.ts` apenas orquestra eventos e navegação.
- Nova feature com estado ou regras → **novo diretório ou ficheiro** sob `src/`, não centenas de linhas soltas num único handler.

## Dados

- Receitas permanecem **ficheiros JSON** versionados até haver requisito de BD; scripts em `scripts/` validam/importam (`validate-recipes.mjs`, etc.).
- Crescimento do JSON: considerar partição futura (vários ficheiros) **antes** de o parser no cliente ficar frágil.

## Tipos e contratos

- Novos campos de receita ou entidades: atualizar `types.ts` e **script de validação** se aplicável.

## CI

- Manter `validate-recipes` e lint no caminho crítico; novos passos custosos devem ser justificados (cache, condicionais).

## Produto

- Funcionalidades que exijam backend (auth forte, paywall servidor) são **mudança arquitetural** — documentar no README/plano, não “esconder” no cliente.
