# Especificação — Integração com `fzl-fund-ui-widgets-components`

> Status: **monorepo criado** — appshell e componentes no `fzl-fund-ui`; migração de componentes ainda não iniciada.
> Decisão registrada em `docs/architecture/003-appshell-in-monorepo.md` (raiz do monorepo).

---

## 1. Objetivo

Passar a usar no appshell os web components do projeto irmão
`../fzl-fund-ui-widgets-components` e, no longo prazo, **substituir todos os
componentes visuais do appshell** pelos componentes desse projeto.

A migração é incremental (padrão *strangler fig*): os dois projetos convivem,
cada componente é migrado individualmente e o appshell nunca fica quebrado no
meio do caminho.

O fluxo é de mão dupla:

1. **Levar** — um componente genérico do appshell é movido para o projeto de componentes.
2. **Trazer** — o appshell passa a consumir esse componente a partir do pacote.

---

## 2. Contexto

### 2.1 Appshell (`fzl-fund-appshell--lit`)

- JavaScript (ES modules), Lit 3, `@material/web`, Vite 8.
- Também é uma biblioteca: expõe `exports` (incluindo `./webcomponents/*`) e
  declara `peerDependencies`.
- Componentes atuais em `src/webcomponents/`.

### 2.2 Projeto de componentes (`fzl-fund-ui-widgets-components`)

- Monorepo com npm workspaces:
  - `@fzl/webcomponents-es6` (vanilla)
  - `@fzl/webcomponents-lit`
  - `@fzl/webcomponents-angular` (Angular Elements)
  - `@fzl/design-tokens` (`packages/design-tokens`, variáveis `--fzl-*`)
- TypeScript, Vite 6.
- `@fzl/webcomponents-lit` hoje contém apenas o componente `button`.

### 2.3 Monorepo `fzl-fund-ui`

Os dois projetos acima foram reunidos no monorepo `fzl-fund-ui`:

```
fzl-fund-ui/
├── packages/design-tokens
├── webcomponents-es6
├── webcomponents-lit
├── webcomponents-angular
└── appshell-lit              (este appshell, com o histórico Git preservado)
```

O repositório original `fzl-fund-appshell--lit` continua existindo, porque
outros projetos o usam como submódulo Git.

O appshell Jetpack Compose não consome web components (é nativo); no futuro
pode compartilhar só os design tokens, gerados também como Kotlin (ex.:
Style Dictionary).

---

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Forma de consumo | **Monorepo** `fzl-fund-ui` com npm workspaces: o appshell depende de `@fzl/webcomponents-lit` via workspace. **Não** usar submódulo Git nem `npm link`. |
| Distribuição (registry) | Adiada. |
| Repositório original do appshell | Mantido — é usado como submódulo por outros projetos. |
| Versões | Vite 8 na raiz; `webcomponents-angular` com Vite 6 próprio (`@analogjs/vite-plugin-angular` 1.x não suporta Vite 8). |
| Distribuição do próprio appshell | Adiada. |
| TS × JS | Componentes em TypeScript lá; appshell continua em JavaScript e consome o JS compilado (`dist/`). Os `.d.ts` servem só para autocomplete. |
| Fronteira | **Componente genérico vai para lá. Cola do appshell fica aqui.** |
| Visual | Os componentes de lá também usam Material Design (`@material/web`). |
| Tema | Appshell mantém seu tema (`src/styles/theme.css`, variáveis `--md-sys-*`). Componentes Material Web herdam essas variáveis através do Shadow DOM. |

---

## 4. Fronteira: genérico × cola

Um componente **genérico** não conhece o appshell: recebe dados por
propriedades/atributos e comunica por eventos DOM. Não importa
`appshell.config.js`, `backend()`, eventos `push:*`/`notification:*` etc.

A **cola** é o que liga o componente ao appshell: ler config, assinar eventos
do shell, chamar backends, rotear.

Sobre o `md-imports.js`: não é um componente, é o arquivo que registra de uma
vez os elementos do Material Web usados pelo appshell. Os componentes de lá
importam os próprios `@material/web/...` (não podem contar com o
`md-imports` do appshell); importar o mesmo elemento duas vezes não custa
nada, desde que haja uma única cópia do `@material/web`.

Componentes acoplados podem ser divididos: parte visual vai para lá, parte de
cola fica aqui (wrapper fino).

Classificação inicial (a confirmar):

| Componente | Tendência |
|---|---|
| `app-clock`, `app-version`, `connection-status`, `nav-accordion` | Genéricos — candidatos fáceis |
| `app-header`, `app-footer`, `consent-banner`, `user-status`, `user-notifications` | Dividir visual × cola |
| `app-shell`, `auth-view`, `config-*-view`, `not-found-view` | Cola do appshell — por último ou ficam aqui |
| `md-imports` | Infra do appshell (imports do Material Web) — fica aqui e tende a encolher |

---

## 5. Requisitos técnicos

### 5.1 No `@fzl/webcomponents-lit`

1. ✅ **Lit externo ao bundle** — `lit` é `peerDependency` e fica fora do
   bundle. Quando um componente passar a usar `@material/web`, acrescentá-lo
   ao `external` e às `peerDependencies` do mesmo jeito.
2. ✅ **Exports por componente** — cada componente tem uma entrada no
   `vite.config.ts` e um subpath no `package.json` (hoje:
   `@fzl/webcomponents-lit/button`). Ao migrar um componente, acrescentar os dois.
3. **`@material/web`** como dependência dos componentes que o usam.

### 5.2 Registro de custom elements

Evitar erro de "already defined" quando appshell e app registram a mesma tag:
usar guarda (`customElements.get(tag)`) ou um único ponto de registro.

### 5.3 Angular Elements

Pesado (runtime Angular + zone.js). No appshell priorizar Lit/ES6; componentes
Angular, se usados, carregados sob demanda via `import()` dinâmico.

### 5.4 Versões

Vite 8 na raiz e em todos os workspaces, exceto `webcomponents-angular`, que
fica com Vite 6 próprio até o `@analogjs/vite-plugin-angular` suportar Vite 8.

---

## 6. Ciclo de migração de um componente

1. **Levar** — copiar o componente para `webcomponents-lit`, converter para
   TS, remover dependências do appshell (viram propriedades/eventos).
2. **Build** — `npm run build:lit` (o appshell consome o `dist/`).
3. **Trazer** — no appshell, trocar o import para o pacote; o arquivo antigo é
   removido ou vira wrapper de cola.
4. **Validar** — testes (vitest) e verificação visual no app rodando.

Critério de pronto: *a definir*.

---

## 7. Pré-requisitos

- [x] Monorepo `fzl-fund-ui` criado (componentes + appshell com histórico).
- [x] Ajustes do item 5.1.
- [x] Appshell ligado ao pacote via workspace; a home de demo usa o
      `fzl-lit-button` como prova do encanamento.
- [x] Deploy a partir do monorepo documentado (`deploy.md`, seção 6).

---

## 8. Em aberto

- **Design tokens** — `@fzl/design-tokens` (`--fzl-*`) e o tema do appshell
  (`--md-sys-*`) convivem sem colisão, mas falta definir a relação entre eles
  (ex.: `--fzl-color-primary` derivar de `--md-sys-color-primary`?).
- **Ordem da migração.**
- **Consumidores do submódulo** — o appshell no monorepo e o repositório
  original passam a divergir. Como levar as melhorias para quem usa o
  submódulo (ex.: `git subtree split`, ou migrar esses apps para o pacote)?
  Atenção: depois que o appshell depender de `@fzl/webcomponents-lit`, o
  repositório original sozinho não terá esse pacote.
- **Critério de pronto** por componente.
- **Dependência direta × peer** — com a substituição total planejada, a
  tendência é dependência direta do appshell.
- **Distribuição** (registry) do pacote de componentes e do appshell.
- O que fazer com o diretório antigo `fzl-fund-ui-widgets-components` (a outra
  sessão estava trabalhando nele; o monorepo partiu de um snapshot dele).
