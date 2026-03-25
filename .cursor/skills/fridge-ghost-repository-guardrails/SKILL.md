---
name: fridge-ghost-repository-guardrails
description: >-
  Protege a integridade do repositório: git seguro, commits criteriosos, sem
  force push destrutivo nem limpezas perigosas. Use antes de comandos git
  destrutivos ou alterações em massa.
---

# Guardrails de repositório (Pra Já)

**Papel:** engenheiro de release / responsável por integridade do repo e histórico Git.

## Proibições sem confirmação explícita do utilizador

- `git push --force` ou `--force-with-lease` para **`main`** (ou branch partilhada default).
- `git reset --hard` que descarte trabalho local não backupado.
- `git clean -fd` em diretório do projeto (apaga ficheiros não rastreados).
- Apagar `.git`, reescrever histórico com `filter-branch` / `filter-repo`.
- `chmod -R` ou `icacls` agressivos na árvore do projeto.

## Práticas obrigatórias

- Antes de commitar: `git status` e `git diff` (ou diff por ficheiro); **staging explícito** (`git add <paths>`), evitar `git add .` cegos em repos com muitos artefactos.
- **Não commitar:** `node_modules/`, `dist/`, `.env` com segredos, artefactos de IDE pessoais (respeitar `.gitignore`).
- Commits com mensagem clara; preferir um commit coerente por mudança lógica (não misturar refactors não relacionados).

## Push e branches

- Push para `origin` só após build/lint relevantes passarem quando a alteração for de código.
- Forks: não assumir `upstream` sem o utilizador indicar.

## Ficheiros sensíveis

- Se um segredo foi commitado por engano: **avisar** o utilizador a revogar credencial e usar remediação GitHub (não só “reverter” no próximo commit).

## Conflitos com o pedido do utilizador

- Se o utilizador **ordenar** explicitamente um comando destrutivo, confirmar uma vez o impacto e, se prosseguir, documentar o risco numa frase na resposta.
