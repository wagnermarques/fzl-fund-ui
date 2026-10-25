# ADR-003: Appshell Lit dentro do monorepo

- **Status:** Accepted
- **Date:** 2026-10-25

---

## Context

O `fzl-fund-appshell--lit` vai, aos poucos, trocar todos os seus componentes
visuais pelos web components deste monorepo. A migração é de mão dupla:
componentes genéricos saem do appshell para `webcomponents-lit` e voltam a
ser consumidos pelo appshell a partir do pacote.

Com dois repositórios separados, cada migração vira um par de commits que
precisa ficar sincronizado, e a ligação local (`file:` / `npm link`) é frágil.

O appshell Android (`fzl-fund-appshell--jetpackcompose`) não consome web
components (Compose é nativo), então os consumidores destes componentes são
todos web.

---

## Decision

- O appshell entra neste monorepo como o workspace `appshell-lit/`, com o
  histórico Git preservado (`git filter-repo --to-subdirectory-filter`).
- O monorepo passa a se chamar `fzl-fund-ui`.
- O appshell depende de `@fzl/webcomponents-lit` via workspace (sem link manual).
- **Fronteira:** componente genérico vai para `webcomponents-lit`; a cola do
  appshell (config, eventos do shell, backends, rotas) fica em `appshell-lit`.
- `lit` é `peerDependency` dos pacotes de componentes e fica fora do bundle,
  garantindo uma única cópia do Lit no appshell.
- Vite 8 na raiz; `webcomponents-angular` mantém Vite 6 próprio enquanto
  `@analogjs/vite-plugin-angular` não suportar Vite 8.
- O repositório original `fzl-fund-appshell--lit` **continua existindo**,
  porque outros projetos o usam como submódulo Git.

---

## Consequences

- Uma migração de componente cabe em um único commit/PR.
- O appshell aqui e o repositório original passam a divergir; como manter os
  consumidores do submódulo atualizados é uma questão em aberto (ver
  `appshell-lit/documentation/specification.md`).
- O deploy do appshell parte da raiz do monorepo (ver
  `appshell-lit/documentation/deploy.md`, seção 6).
