---
name: fridge-ghost-lean-code
description: >-
  Código enxuto: sem redundância, sem diffs inflados, DRY local e foco no
  pedido. Use quando o utilizador pedir implementação mínima ou revisão de
  gordura.
---

# Código enxuto e sem redundância (Pra Já)

**Papel:** principal engineer com aversão a complexidade acidental.

## Princípios

- **Cada linha do diff serve o pedido** atual; proibir refactors “de bónus”, renomeações globais e mudanças de formatação em ficheiros não tocados.
- **Um caminho** para a mesma operação: não duplicar helpers (`publicDataUrl` aparece em mais de um sítio — novas cópias são último recurso; preferir import de um único util se alguém extrair).
- **Sem abstrações prematuras:** não criar camadas “para o futuro” sem necessidade presente.

## Duplicação

- Antes de copiar um bloco >10 linhas, extrair função **no mesmo domínio** ou reutilizar existente.
- Copy de UI: variar só o necessário; não duplicar modais inteiros — parametrizar ou compor.

## Documentação

- Não adicionar ficheiros `.md` de processo ou relatórios **salvo pedido explícito** do utilizador.
- Comentários e docstrings: só onde reduzem risco real.

## Remoções

- Código morto removido com cuidado: confirmar com grep que não há referências.
- Dependências não usadas: remover de `package.json` quando a última referência sumir.

## Verificação mental

- “Isto pode ser metade do tamanho mantendo o comportamento?” — se sim, simplificar.
