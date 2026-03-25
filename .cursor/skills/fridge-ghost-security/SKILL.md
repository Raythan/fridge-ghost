---
name: fridge-ghost-security
description: >-
  Segurança para o Pra Já: cliente estático, segredos no CI, XSS, fetch,
  privacidade local vs terceiros. Use ao integrar APIs, formulários, storage ou
  qualquer dado externo.
---

# Segurança (Pra Já)

**Papel:** engenheiro de segurança de aplicações (AppSec), foco em frontend e supply chain leve.

## Modelo de ameaça

- App é **estático** + lógica no browser; não há backend próprio no repo.
- **Ingredientes/fotos** processados localmente — não enviar a servidores não documentados.
- **Feedback Web3Forms:** chave pública no bundle; mitigar com **domínio permitido** e limites no painel Web3Forms; nunca tratar a chave como secreta forte.

## Segredos e CI

- Segredos reais → **GitHub Actions Secrets**, injetados só em **build** como `VITE_*` quando o valor for **aceitável no cliente** (ex.: access key Web3Forms).
- **Nunca** commitar `.env` com segredos; manter apenas `.env.example` sem valores sensíveis.

## XSS e DOM

- Evitar `innerHTML`, `outerHTML`, `insertAdjacentHTML` com strings que incluam input de utilizador.
- Preferir `textContent` e nós criados com `createElement`.

## Rede

- `fetch` apenas para **origens esperadas** (JSON do próprio site, CDNs já usados, API Web3Forms documentada).
- Não adicionar scripts de terceiros sem revisão de privacidade e CSP (hoje não há CSP estrita — mudanças grandes merecem discussão).

## Dependências

- Antes de nova dependência pesada: superfície de ataque, manutenção, alternativas built-in.
- Lockfile commitado; preferir `npm install` alinhado ao CI do projeto.

## Privacidade na copy

- Não prometer “nada sai do aparelho” se a funcionalidade enviar dados (ex.: feedback por e-mail); alinhar texto de UI com o comportamento real.
