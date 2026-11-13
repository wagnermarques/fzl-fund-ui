import { LitElement, html, css, nothing } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { marked } from 'marked'
import { fzlTokens } from '@fzl/design-tokens'
import { fzlRegistry, fzlFocus } from '@fzl/webcomponents-lit'
import '@fzl/webcomponents-lit/button'
import '@fzl/webcomponents-lit/crumb'
import { catalog, componentCategories, getComponentCategories, hasCategory } from './catalog.js'
import { controlsFor, findDeclaration } from './manifest.js'

const DEFAULT_PRIMARY = fzlTokens['color-primary']
const MAX_EVENTS = 5

/** A especificação em Markdown sem o título (a página tem o seu) e sem a
 *  seção de API sincronizada, que a página mostra ao vivo a partir do
 *  manifesto da implementação aberta. */
function docHtml(markdown) {
  if (!markdown) return ''
  const sections = markdown.replace(/^# .*\n/, '').split(/^(?=## )/m)
  return marked.parse(sections.filter((section) => !/^## .*API Reference/.test(section)).join(''))
}

const sharedStyles = css`
  :host {
    display: block;
    max-width: 960px;
    margin: 0 auto;
    padding: 16px 24px 64px;
  }
  h1 {
    font-size: 1.6rem;
    margin: 0 0 4px;
  }
  h2 {
    font-size: 1.1rem;
    margin: 32px 0 12px;
  }
  .subtitle {
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 24px;
  }
  code {
    font-family: monospace;
    background: var(--md-sys-color-surface-variant);
    color: var(--md-sys-color-on-surface-variant);
    padding: 1px 4px;
    border-radius: 4px;
  }
`

/** #/componentes — a lista do catálogo. */
export class ComponentsView extends LitElement {
  static properties = {
    _selectedCategory: { state: true },
    _searchQuery: { state: true },
    _labHc: { state: true },
    _labRm: { state: true },
    _labRtl: { state: true },
    _labTypematicCount: { state: true },
    _labActiveNode: { state: true },
    _labActiveStack: { state: true },
    _labHoveredId: { state: true },
    _labFocusedId: { state: true },
    _labActiveId: { state: true },
  }

  static styles = [
    sharedStyles,
    css`
      .catalog-toolbar {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-bottom: 28px;
      }
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        max-width: 460px;
      }
      .search-box md-icon {
        position: absolute;
        left: 12px;
        color: var(--md-sys-color-on-surface-variant);
        pointer-events: none;
        font-size: 20px;
      }
      .search-box input {
        width: 100%;
        padding: 10px 36px 10px 40px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 999px;
        background: var(--md-sys-color-surface);
        color: inherit;
        font-family: inherit;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .search-box input:focus {
        border-color: var(--md-sys-color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent);
      }
      .search-clear {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        color: var(--md-sys-color-on-surface-variant);
        cursor: pointer;
        padding: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      .search-clear:hover {
        background: var(--md-sys-color-surface-variant);
      }
      .category-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .category-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid var(--md-sys-color-outline-variant);
        background: var(--md-sys-color-surface);
        color: inherit;
        font-family: inherit;
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }
      .category-pill:hover {
        background: var(--md-sys-color-surface-variant);
      }
      .category-pill.active {
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        border-color: var(--md-sys-color-primary);
      }
      .pill-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
        background: var(--md-sys-color-surface-container-high);
        color: var(--md-sys-color-on-surface-variant);
      }
      .category-pill.active .pill-count {
        background: rgba(255, 255, 255, 0.22);
        color: inherit;
      }
      .category-section {
        margin-bottom: 36px;
      }
      .category-header {
        margin-bottom: 14px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }
      .category-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 4px;
        font-size: 1.2rem;
      }
      .category-desc {
        margin: 0;
        font-size: 0.86rem;
        color: var(--md-sys-color-on-surface-variant);
        line-height: 1.45;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
      }
      a.card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 16px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        color: inherit;
        text-decoration: none;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }
      a.card:hover,
      a.card:focus-visible {
        background: var(--md-sys-color-surface-variant);
        border-color: var(--md-sys-color-outline);
      }
      a.card h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 8px;
        font-size: 1.15rem;
      }
      a.card p {
        margin: 0 0 16px;
        font-size: 0.9rem;
        line-height: 1.45;
        color: var(--md-sys-color-on-surface-variant);
      }
      .card-badges {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 6px;
      }
      .impls {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 6px;
        background: var(--md-sys-color-surface-container-high);
        color: var(--md-sys-color-primary);
        font-size: 0.75rem;
        font-weight: 500;
        width: fit-content;
      }
      .cat-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 6px;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        font-weight: 500;
      }
      .empty-catalog {
        padding: 36px 20px;
        text-align: center;
        border: 1px dashed var(--md-sys-color-outline-variant);
        border-radius: 12px;
        color: var(--md-sys-color-on-surface-variant);
      }
      .empty-catalog md-icon {
        font-size: 36px;
        margin-bottom: 8px;
      }
      .infra-section {
        margin-top: 40px;
        padding-top: 24px;
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }
      .infra-header {
        margin: 0 0 8px;
        font-size: 1.35rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .infra-lead {
        margin: 0 0 20px;
        line-height: 1.55;
        color: var(--md-sys-color-on-surface-variant);
      }
      .infra-lead a {
        color: var(--md-sys-color-primary);
      }
      .infra-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .infra-card {
        display: flex;
        flex-direction: column;
        padding: 16px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        background: var(--md-sys-color-surface);
      }
      .infra-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 8px;
        font-size: 1.05rem;
      }
      .infra-card p {
        margin: 0 0 12px;
        font-size: 0.9rem;
        line-height: 1.45;
        color: var(--md-sys-color-on-surface-variant);
      }
      .infra-list {
        margin: 0;
        padding-left: 18px;
        font-size: 0.85rem;
        line-height: 1.55;
        color: var(--md-sys-color-on-surface);
      }
      .infra-list li + li {
        margin-top: 4px;
      }
      .lab-box {
        margin-top: 24px;
        padding: 20px;
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 12px;
        background: var(--md-sys-color-surface-container-low, var(--md-sys-color-surface));
      }
      .lab-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 6px;
        font-size: 1.1rem;
      }
      .lab-desc {
        margin: 0 0 16px;
        font-size: 0.9rem;
        color: var(--md-sys-color-on-surface-variant);
      }
      .lab-toggles {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .lab-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 999px;
        background: var(--md-sys-color-surface);
        font-size: 0.85rem;
        cursor: pointer;
        user-select: none;
      }
      .lab-toggle.active {
        border-color: var(--md-sys-color-primary);
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        font-weight: 600;
      }
      .lab-stage {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px;
        border: 2px dashed var(--md-sys-color-outline);
        border-radius: 10px;
        background: var(--md-sys-color-surface);
        transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }
      .lab-stage.hc-mode {
        background: #000000;
        color: #ffffff;
        border: 2px solid #ffff00;
      }
      .lab-stage-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }
      .lab-telemetry {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 10px;
      }
      .telemetry-item {
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid var(--md-sys-color-outline-variant);
        background: var(--md-sys-color-surface);
        font-size: 0.8rem;
      }
      .telemetry-label {
        display: block;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }
      .telemetry-value {
        font-family: monospace;
        font-weight: 600;
        word-break: break-word;
      }
      .state-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .state-pill {
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.72rem;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
        opacity: 0.55;
      }
      .state-pill.on {
        opacity: 1;
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        font-weight: 600;
      }
    `,
  ]

  constructor() {
    super()
    this._selectedCategory = 'all'
    this._searchQuery = ''
    this._labHc = false
    this._labRm = false
    this._labRtl = false
    this._labTypematicCount = 0
    this._labActiveNode = '—'
    this._labActiveStack = '—'
    this._labHoveredId = ''
    this._labFocusedId = ''
    this._labActiveId = ''
    this._unsubFocus = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._unsubFocus = fzlFocus.subscribe((activeNode, activeStack) => {
      this._labActiveNode = activeNode ? `<${activeNode.tagName.toLowerCase()}>` : '—'
      this._labActiveStack = activeStack.length ? activeStack.map((w) => w.widgetId).join(' › ') : '—'
    })
  }

  disconnectedCallback() {
    this._unsubFocus?.()
    this._unsubFocus = null
    super.disconnectedCallback()
  }

  _onLabPointer(e) {
    const widget = fzlRegistry.getEnclosingWidget(e.target)
    const host = widget?.hostElement
    this._labHoveredId = host?.hasAttribute('data-fzl-hovered') ? widget.widgetId : ''
    this._labFocusedId = host?.hasAttribute('data-fzl-focused') ? widget.widgetId : ''
    this._labActiveId = host?.hasAttribute('data-fzl-active') ? widget.widgetId : ''
  }

  _matchesQuery(component, query) {
    if (!query) return true
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    if (component.name?.toLowerCase().includes(needle)) return true
    if (component.id?.toLowerCase().includes(needle)) return true
    if (component.summary?.toLowerCase().includes(needle)) return true
    return (component.implementations ?? []).some((impl) => impl.tag?.toLowerCase().includes(needle))
  }

  _clearFilters() {
    this._selectedCategory = 'all'
    this._searchQuery = ''
  }

  _renderCard(component, showCategoryBadge = false) {
    const cats = getComponentCategories(component)
    return html`
      <a class="card" href="#/componentes/${component.id}">
        <div>
          <h2><md-icon aria-hidden="true">${component.icon}</md-icon>${component.name}</h2>
          <p>${component.summary}</p>
        </div>
        <div class="card-badges">
          <div class="impls">${component.implementations.map((impl) => impl.label).join(' · ')}</div>
          ${showCategoryBadge && cats.length
            ? html`
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  ${cats.map(
                    (category) => html`<span class="cat-badge">${category.emoji} ${category.shortLabel}</span>`,
                  )}
                </div>
              `
            : nothing}
        </div>
      </a>
    `
  }

  render() {
    const registeredCount = fzlRegistry.length
    const query = this._searchQuery.trim()
    const searchMatching = catalog.filter((c) => this._matchesQuery(c, query))
    const visibleCategories =
      this._selectedCategory === 'all'
        ? componentCategories
        : componentCategories.filter((cat) => cat.id === this._selectedCategory)

    const sections = visibleCategories
      .map((category) => ({
        category,
        items: searchMatching.filter((c) => hasCategory(c, category.id)),
      }))
      .filter((section) => section.items.length > 0)

    const totalVisible = sections.reduce((acc, s) => acc + s.items.length, 0)

    return html`
      <h1>Componentes</h1>
      <p class="subtitle">
        Documentação viva e playground interativo dos web components classificados por domínio: cada página apresenta o
        componente funcionando no palco, com controles reativos, código gerado, histórico de eventos e tabela de API.
      </p>

      <div class="catalog-toolbar" role="search" aria-label="Filtrar catálogo de componentes">
        <div class="search-box">
          <md-icon aria-hidden="true">search</md-icon>
          <input
            type="search"
            aria-label="Filtrar componentes por nome, tag ou funcionalidade"
            placeholder="Filtrar componentes por nome, tag ou funcionalidade..."
            .value=${this._searchQuery}
            @input=${(e) => {
              this._searchQuery = e.target.value
            }}
          />
          ${this._searchQuery
            ? html`
                <button
                  type="button"
                  class="search-clear"
                  aria-label="Limpar busca"
                  @click=${() => (this._searchQuery = '')}
                >
                  <md-icon aria-hidden="true">close</md-icon>
                </button>
              `
            : nothing}
        </div>

        <div class="category-pills" role="tablist" aria-label="Categorias de componentes">
          <button
            type="button"
            role="tab"
            class="category-pill ${this._selectedCategory === 'all' ? 'active' : ''}"
            aria-selected=${this._selectedCategory === 'all' ? 'true' : 'false'}
            @click=${() => (this._selectedCategory = 'all')}
          >
            <span>Todos</span>
            <span class="pill-count">${searchMatching.length}</span>
          </button>
          ${componentCategories.map((cat) => {
            const count = searchMatching.filter((c) => hasCategory(c, cat.id)).length
            const isActive = this._selectedCategory === cat.id
            return html`
              <button
                type="button"
                role="tab"
                class="category-pill ${isActive ? 'active' : ''}"
                aria-selected=${isActive ? 'true' : 'false'}
                @click=${() => (this._selectedCategory = cat.id)}
              >
                <span aria-hidden="true">${cat.emoji}</span>
                <span>${cat.shortLabel}</span>
                <span class="pill-count">${count}</span>
              </button>
            `
          })}
        </div>
      </div>

      ${totalVisible === 0
        ? html`
            <div class="empty-catalog">
              <md-icon aria-hidden="true">search_off</md-icon>
              <p>Nenhum componente encontrado para os filtros aplicados.</p>
              <md-outlined-button @click=${this._clearFilters}>Limpar filtros</md-outlined-button>
            </div>
          `
        : sections.map(
            (section) => html`
              <section class="category-section" aria-labelledby="cat-${section.category.id}">
                <header class="category-header">
                  <h2 id="cat-${section.category.id}" class="category-title-row">
                    <span aria-hidden="true">${section.category.emoji}</span>
                    <span>${section.category.name}</span>
                    <span class="pill-count">${section.items.length}</span>
                  </h2>
                  <p class="category-desc">${section.category.description}</p>
                </header>
                <div class="grid">
                  ${section.items.map((component) => this._renderCard(component, Boolean(query)))}
                </div>
              </section>
            `,
          )}

      <section class="infra-section" aria-labelledby="components-infra-heading">
        <h2 id="components-infra-heading" class="infra-header">
          <md-icon aria-hidden="true">architecture</md-icon>
          Components Infrastructure (<code>@fzl/core</code>)
        </h2>
        <p class="infra-lead">
          Nossa infraestrutura base de Web Components (<code>@fzl/core</code>) foi arquiteturalmente inspirada no sistema de widgets
          <a href="https://dojotoolkit.org/reference-guide/1.7/dijit/info.html" target="_blank" rel="noopener">Dojo Toolkit Dijit (1.7)</a>
          (<a href="https://dojotoolkit.org/reference-guide/1.7/dijit/index.html" target="_blank" rel="noopener">Dijit Overview</a>),
          adaptando seus quatro pilares clássicos — <strong>Accessibility (a11y)</strong>, <strong>Base Utilities</strong>,
          <strong>Utility Classes</strong> e <strong>Infrastructure Widgets / Mixins</strong> — para <strong>Custom Elements v1</strong>,
          <strong>Shadow DOM</strong> e os três motores do monorepo (<strong>Lit</strong>, <strong>Vanilla ES6</strong> e <strong>Angular Elements</strong>)
          sob licença <code>GPL-3.0-or-later</code> (ADR-005).
        </p>

        <div class="infra-grid">
          <article class="infra-card">
            <h3><md-icon aria-hidden="true">accessibility_new</md-icon>Accessibility (a11y) &amp; High Contrast</h3>
            <p>
              Inspirado em <code>dijit/a11y</code> e <code>dijit/hccss</code>, garante acessibilidade nativa e detecção de preferências visuais do sistema.
            </p>
            <ul class="infra-list">
              <li><code>fzlA11y</code>: detecta alto contraste (<code>forced-colors: active</code>, <code>prefers-contrast: more</code>) e movimento reduzido (<code>prefers-reduced-motion</code>).</li>
              <li>Reflete automaticamente <code>data-fzl-hc</code>, <code>data-fzl-reduced-motion</code> e direção efetiva <code>dir="ltr|rtl"</code> no <code>:host</code>.</li>
              <li>Utilitários de inspeção de elementos focáveis (<code>getFocusableElements</code>, <code>getFirstFocusable</code>, <code>getLastFocusable</code>).</li>
            </ul>
          </article>

          <article class="infra-card">
            <h3><md-icon aria-hidden="true">hub</md-icon>Base Utilities &amp; Utility Classes</h3>
            <p>
              Inspirado em <code>dijit/registry</code>, <code>dijit/focus</code>, <code>dijit/typematic</code>, <code>dijit/place</code> e <code>dijit/popup</code>.
            </p>
            <ul class="infra-list">
              <li><code>fzlRegistry</code>: registro central de instâncias (<code>byId</code>, <code>byNode</code>, <code>getEnclosingWidget</code>, <code>findWidgets</code>) atravessando fronteiras de Shadow DOM.</li>
              <li><code>fzlFocus</code>: rastreamento do elemento profundo ativo (<code>curNode</code>), pilha de widgets ativos (<code>activeStack</code>) e restauração de foco (<code>bookmarkFocus</code>).</li>
              <li><code>fzlTypematic</code>: disparo repetitivo acelerado ao manter botão ou tecla pressionados (suportado via atributo <code>typematic</code> em botões).</li>
              <li><code>fzlPlace</code> &amp; <code>fzlPopup</code>: posicionamento ancorado com colisão de viewport e gerenciamento de pilha de <code>z-index</code>.</li>
            </ul>
          </article>

          <article class="infra-card">
            <h3><md-icon aria-hidden="true">extension</md-icon>Infrastructure Widgets &amp; Mixins</h3>
            <p>
              Inspirado em <code>dijit/_WidgetBase</code>, <code>_CssStateMixin</code>, <code>_FocusMixin</code> e <code>_KeyNavContainer</code>.
            </p>
            <ul class="infra-list">
              <li><code>FzlWidgetMixin</code> &amp; <code>FzlWidgetController</code>: ciclo de vida padronizado com auto-registro no <code>fzlRegistry</code>, limpeza automática de recursos via <code>own()</code> e emissão padronizada de eventos (<code>emit()</code>).</li>
              <li><strong>CSS &amp; Focus States</strong>: reflexão automática de <code>data-fzl-hovered</code>, <code>data-fzl-active</code>, <code>data-fzl-focused</code> e eventos <code>fzl-focus</code> / <code>fzl-blur</code>.</li>
              <li><code>FzlKeyNavController</code>: navegação por teclado WAI-ARIA com <em>roving tabindex</em> (<code>ArrowLeft</code>, <code>ArrowRight</code>, <code>ArrowUp</code>, <code>ArrowDown</code>, <code>Home</code>, <code>End</code>) aplicada em <code>crumb</code> e <code>card-list</code>.</li>
            </ul>
          </article>
        </div>

        <div class="lab-box">
          <h3 class="lab-title">
            <md-icon aria-hidden="true">science</md-icon>
            Laboratório Visual Interativo: Accessibility (a11y), High Contrast &amp; Dijit Mixins
          </h3>
          <p class="lab-desc">
            Experimente ao vivo os recursos herdados de <code>@fzl/core</code>: ative o <strong>Alto Contraste (<code>data-fzl-hc</code>)</strong>,
            inverta a direção para <strong>RTL (<code>dir="rtl"</code>)</strong>, navegue com as setas do teclado (<code>←</code> <code>→</code> <code>Home</code> <code>End</code>)
            na trilha e segure o botão <strong>Typematic</strong> pressionado para ver a aceleração contínua.
          </p>

          <div class="lab-toggles" role="group" aria-label="Simulador de Acessibilidade e Infraestrutura">
            <button
              type="button"
              class="lab-toggle ${this._labHc ? 'active' : ''}"
              aria-pressed=${this._labHc ? 'true' : 'false'}
              @click=${() => (this._labHc = !this._labHc)}
            >
              <md-icon aria-hidden="true">contrast</md-icon>
              High Contrast (<code>data-fzl-hc</code>)
            </button>

            <button
              type="button"
              class="lab-toggle ${this._labRm ? 'active' : ''}"
              aria-pressed=${this._labRm ? 'true' : 'false'}
              @click=${() => (this._labRm = !this._labRm)}
            >
              <md-icon aria-hidden="true">motion_photos_off</md-icon>
              Reduced Motion (<code>data-fzl-reduced-motion</code>)
            </button>

            <button
              type="button"
              class="lab-toggle ${this._labRtl ? 'active' : ''}"
              aria-pressed=${this._labRtl ? 'true' : 'false'}
              @click=${() => (this._labRtl = !this._labRtl)}
            >
              <md-icon aria-hidden="true">format_textdirection_r_to_l</md-icon>
              Direção RTL (<code>dir="rtl"</code>)
            </button>
          </div>

          <div
            class="lab-stage ${this._labHc ? 'hc-mode' : ''}"
            dir=${this._labRtl ? 'rtl' : 'ltr'}
            @pointerover=${this._onLabPointer}
            @pointerout=${this._onLabPointer}
            @pointerdown=${this._onLabPointer}
            @pointerup=${this._onLabPointer}
            @focusin=${this._onLabPointer}
            @focusout=${this._onLabPointer}
          >
            <fzl-lit-crumb
              id="lab-crumb"
              path="Início / Infraestrutura / Dijit A11y"
              back-label="Voltar"
              ?data-fzl-hc=${this._labHc}
              ?data-fzl-reduced-motion=${this._labRm}
            ></fzl-lit-crumb>

            <div class="lab-stage-row">
              <fzl-lit-button
                id="lab-btn-typematic"
                variant="primary"
                typematic
                ?data-fzl-hc=${this._labHc}
                ?data-fzl-reduced-motion=${this._labRm}
                @fzl-click=${() => {
                  this._labTypematicCount += 1
                }}
              >
                Segure Pressionado (Typematic: ${this._labTypematicCount})
              </fzl-lit-button>

              <fzl-lit-button
                id="lab-btn-reset"
                variant="secondary"
                ?data-fzl-hc=${this._labHc}
                ?data-fzl-reduced-motion=${this._labRm}
                @fzl-click=${() => {
                  this._labTypematicCount = 0
                }}
              >
                Zerar Contador
              </fzl-lit-button>
            </div>
          </div>

          <div class="lab-telemetry" aria-live="polite">
            <div class="telemetry-item">
              <span class="telemetry-label">fzlRegistry (Instâncias Ativas)</span>
              <span class="telemetry-value">${registeredCount} widget(s) registrado(s)</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">fzlFocus.activeStack (Shadow DOM)</span>
              <span class="telemetry-value">${this._labActiveStack} (${this._labActiveNode})</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">_CssStateMixin (:host attributes)</span>
              <div class="state-pills">
                <span class="state-pill ${this._labHoveredId ? 'on' : ''}">[data-fzl-hovered]</span>
                <span class="state-pill ${this._labFocusedId ? 'on' : ''}">[data-fzl-focused]</span>
                <span class="state-pill ${this._labActiveId ? 'on' : ''}">[data-fzl-active]</span>
                <span class="state-pill ${this._labHc ? 'on' : ''}">[data-fzl-hc]</span>
              </div>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">_KeyNavContainer &amp; Typematic</span>
              <span class="telemetry-value">Setas ← → Home/End • Disparo: ${this._labTypematicCount}x</span>
            </div>
          </div>
        </div>
      </section>
    `
  }
}

/** #/componentes/:id/:impl — a documentação viva de um componente. */
export class ComponentDocsView extends LitElement {
  static properties = {
    component: { attribute: false },
    implId: { attribute: false },
    _values: { state: true },
    _slotText: { state: true },
    _primary: { state: true },
    _events: { state: true },
    _status: { state: true },
    _copied: { state: true },
    _stageHc: { state: true },
    _stageRm: { state: true },
    _stageRtl: { state: true },
    _widgetId: { state: true },
    _hostStates: { state: true },
  }

  static styles = [
    sharedStyles,
    css`
      .docs-title-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 4px;
      }
      .docs-title-row h1 {
        margin: 0;
      }
      .docs-category-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--md-sys-color-surface-container-high);
        color: var(--md-sys-color-primary);
        font-size: 0.78rem;
        font-weight: 500;
        text-decoration: none;
      }
      .docs-category-badge:hover {
        background: var(--md-sys-color-surface-variant);
      }
      .impl-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      .a11y-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        margin-bottom: 10px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 10px;
        background: var(--md-sys-color-surface-container-low, var(--md-sys-color-surface));
        font-size: 0.82rem;
      }
      .a11y-toggles {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .a11y-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid var(--md-sys-color-outline-variant);
        background: var(--md-sys-color-surface);
        color: inherit;
        font-size: 0.78rem;
        cursor: pointer;
      }
      .a11y-chip.active {
        border-color: var(--md-sys-color-primary);
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        font-weight: 600;
      }
      .a11y-inspector {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-family: monospace;
        font-size: 0.75rem;
      }
      .a11y-badge {
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
        opacity: 0.55;
      }
      .a11y-badge.on {
        opacity: 1;
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        font-weight: 600;
      }
      .stage {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        padding: 24px;
        border: 1px dashed var(--md-sys-color-outline);
        border-radius: 12px;
        background: var(--md-sys-color-surface);
        box-sizing: border-box;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }
      .stage.hc-mode {
        background: #000000;
        color: #ffffff;
        border: 2px solid #ffff00;
      }
      .stage > * {
        max-width: 100%;
      }
      .stage > app-header,
      .stage > app-footer,
      .stage > consent-banner,
      .stage > fzl-lit-crumb,
      .stage > fzl-es6-crumb,
      .stage > fzl-ng-crumb,
      .stage > app-crumb,
      .stage > nav-accordion {
        width: 100%;
      }
      .status {
        min-height: 1.5em;
        margin: 8px 0 0;
        color: var(--md-sys-color-on-surface-variant);
        font-style: italic;
      }
      .controls {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }
      fieldset {
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 8px;
        margin: 0;
        padding: 8px 12px 12px;
      }
      legend {
        font-family: monospace;
        padding: 0 4px;
      }
      .hint {
        font-size: 0.8rem;
        color: var(--md-sys-color-on-surface-variant);
        margin: 0 0 8px;
      }
      label.option {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-right: 12px;
      }
      md-outlined-text-field {
        width: 100%;
      }
      .color-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .code {
        position: relative;
      }
      pre {
        margin: 0;
        padding: 16px 48px 16px 16px;
        overflow-x: auto;
        border-radius: 8px;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
      }
      .code md-icon-button {
        position: absolute;
        top: 4px;
        right: 4px;
      }
      .events {
        margin: 0;
        padding-left: 20px;
        font-family: monospace;
        font-size: 0.85rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      th,
      td {
        text-align: left;
        vertical-align: top;
        padding: 6px 8px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }
      .doc {
        line-height: 1.6;
      }
      .doc pre code {
        background: none;
        padding: 0;
      }
      .doc blockquote {
        margin: 0;
        padding: 4px 16px;
        border-left: 4px solid var(--md-sys-color-outline-variant);
        color: var(--md-sys-color-on-surface-variant);
      }
    `,
  ]

  constructor() {
    super()
    this._values = {}
    this._slotText = ''
    this._primary = ''
    this._events = []
    this._status = ''
    this._copied = false
    this._stageHc = false
    this._stageRm = false
    this._stageRtl = false
    this._widgetId = ''
    this._hostStates = { hovered: false, focused: false, active: false }
    this._element = null
    this._loadToken = 0
  }

  get _implementation() {
    const impls = this.component?.implementations ?? []
    return impls.find((impl) => impl.id === this.implId) ?? impls[0]
  }

  get _controls() {
    const impl = this._implementation
    if (!impl) return []
    return controlsFor(impl, this.component.implementations.filter((other) => other !== impl))
  }

  willUpdate(changed) {
    if (changed.has('component') || changed.has('implId')) {
      const impl = this._implementation
      this._values = { ...(this.component?.initialValues ?? {}), ...(impl?.initialValues ?? {}) }
      this._slotText = impl?.slotText ?? this.component?.slotText ?? ''
      this._events = []
    }
  }

  updated(changed) {
    if (changed.has('component') || changed.has('implId')) {
      this._mount()
    } else {
      this._sync()
    }
  }

  /** Carrega o pacote da implementação e põe um elemento novo no palco. */
  async _mount() {
    const impl = this._implementation
    const stage = this.renderRoot.querySelector('.stage')
    if (!impl || !stage) return
    const token = ++this._loadToken
    this._element = null
    stage.replaceChildren()
    this._status = `Carregando ${impl.packageName}…`
    try {
      await impl.load()
      await customElements.whenDefined(impl.tag)
    } catch (error) {
      if (token === this._loadToken) this._status = `Não foi possível carregar ${impl.packageName}: ${error.message}`
      return
    }
    if (token !== this._loadToken) return
    const element = document.createElement(impl.tag)
    const declaration = findDeclaration(impl.manifest, impl.tag)
    for (const event of declaration?.events ?? []) {
      element.addEventListener(event.name, (e) => this._logEvent(e))
    }
    this._element = element
    this._status = ''
    // Atributos e conteúdo antes de entrar no DOM: o Angular Elements só
    // projeta (<ng-content>) os filhos que o elemento já tem ao ser criado.
    this._sync()
    stage.append(element)
    requestAnimationFrame(() => this._refreshHostInspector())
  }

  _refreshHostInspector() {
    const el = this._element
    if (!el) return
    this._widgetId = el.getAttribute('data-fzl-widget-id') || el.id || el.tagName.toLowerCase()
    this._hostStates = {
      hovered: el.hasAttribute('data-fzl-hovered'),
      focused: el.hasAttribute('data-fzl-focused'),
      active: el.hasAttribute('data-fzl-active'),
    }
  }

  /** Aplica os controles ao elemento do palco — no lugar, sem recriá-lo,
   *  para exercitar a reatividade de cada implementação. */
  _sync() {
    const element = this._element
    if (!element) return
    element.toggleAttribute('data-fzl-hc', !!this._stageHc)
    element.toggleAttribute('data-fzl-reduced-motion', !!this._stageRm)
    if (this._stageRtl) {
      element.setAttribute('dir', 'rtl')
    } else {
      element.removeAttribute('dir')
    }
    for (const control of this._controls) {
      const value = this._values[control.name] !== undefined ? this._values[control.name] : control.default
      if (control.kind === 'boolean') {
        const hasAttr = element.hasAttribute(control.name)
        const shouldHave = !!value
        if (hasAttr !== shouldHave) {
          element.toggleAttribute(control.name, shouldHave)
        }
      } else if (value !== undefined && value !== null) {
        if (element.getAttribute(control.name) !== String(value)) {
          element.setAttribute(control.name, value)
        }
      }
    }
    if (this._slotText !== undefined && element.textContent !== this._slotText) {
      element.textContent = this._slotText
    }
  }

  _logEvent(event) {
    if (event.type === 'fzl-cards-reorder' && event.detail?.items) {
      this._values = { ...this._values, items: JSON.stringify(event.detail.items) }
    }
    if (event.type === 'fzl-change' && event.detail?.selected !== undefined) {
      this._values = {
        ...this._values,
        selected: Array.isArray(event.detail.selected)
          ? JSON.stringify(event.detail.selected)
          : String(event.detail.selected),
      }
    }
    if (event.type === 'fzl-click' && event.currentTarget.localName === 'fzl-reader-chapterview') {
      this._values = { ...this._values, selected: !this._values.selected }
    }
    const detail = event.detail
      ? Object.entries(event.detail)
          .filter(([k]) => k !== 'originalEvent')
          .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : v}`)
          .join(', ')
      : ''
    const time = new Date().toLocaleTimeString()
    const line = `${time}  <${event.currentTarget.localName}>  ${event.type}${detail ? `  { ${detail} }` : ''}`
    this._events = [line, ...this._events].slice(0, MAX_EVENTS)
  }

  _setValue(name, value) {
    this._values = { ...this._values, [name]: value }
  }

  get _code() {
    const impl = this._implementation
    if (!impl) return ''
    const attrs = this._controls
      .map((control) => {
        const value = this._values[control.name] !== undefined ? this._values[control.name] : control.default
        if (value === undefined || value === control.default || value === false || value === '' || value === null) return ''
        return value === true ? ` ${control.name}` : ` ${control.name}="${value}"`
      })
      .join('')
    const style = this._primary ? ` style="--fzl-color-primary: ${this._primary}"` : ''
    const slot = this._slotText ? this._slotText : ''
    return `<script type="module">\n  import '${impl.packageName}'\n</script>\n\n<${impl.tag}${attrs}${style}>${slot}</${impl.tag}>`
  }

  async _copy() {
    try {
      await navigator.clipboard.writeText(this._code)
      this._copied = true
      setTimeout(() => (this._copied = false), 1500)
    } catch {
      // Sem permissão de área de transferência
    }
  }

  render() {
    const component = this.component
    const impl = this._implementation
    if (!component || !impl) return html`<p>Componente não encontrado. <a href="#/componentes">Ver todos</a></p>`
    const declaration = findDeclaration(impl.manifest, impl.tag)
    const cats = getComponentCategories(component)
    return html`
      <div class="docs-title-row">
        <h1>${component.name}</h1>
        ${cats.map(
          (category) => html`
            <a class="docs-category-badge" href="#/componentes" title="${category.description}">
              <span aria-hidden="true">${category.emoji}</span>
              <span>${category.name}</span>
            </a>
          `,
        )}
      </div>
      <p class="subtitle">${declaration?.description ?? component.summary}</p>

      <nav class="impl-tabs" aria-label="Implementações">
        ${component.implementations.map((other) =>
          other === impl
            ? html`<md-filled-button aria-current="page">${other.label}</md-filled-button>`
            : html`<md-outlined-button href="#/componentes/${component.id}/${other.id}">${other.label}</md-outlined-button>`,
        )}
      </nav>

      <div class="a11y-bar" role="region" aria-label="Inspeção de Acessibilidade e Infraestrutura (@fzl/core)">
        <div class="a11y-toggles">
          <button
            type="button"
            class="a11y-chip ${this._stageHc ? 'active' : ''}"
            aria-pressed=${this._stageHc ? 'true' : 'false'}
            @click=${() => (this._stageHc = !this._stageHc)}
          >
            <md-icon aria-hidden="true">contrast</md-icon>
            High Contrast (<code>data-fzl-hc</code>)
          </button>
          <button
            type="button"
            class="a11y-chip ${this._stageRm ? 'active' : ''}"
            aria-pressed=${this._stageRm ? 'true' : 'false'}
            @click=${() => (this._stageRm = !this._stageRm)}
          >
            <md-icon aria-hidden="true">motion_photos_off</md-icon>
            Reduced Motion
          </button>
          <button
            type="button"
            class="a11y-chip ${this._stageRtl ? 'active' : ''}"
            aria-pressed=${this._stageRtl ? 'true' : 'false'}
            @click=${() => (this._stageRtl = !this._stageRtl)}
          >
            <md-icon aria-hidden="true">format_textdirection_r_to_l</md-icon>
            RTL (<code>dir="rtl"</code>)
          </button>
        </div>
        <div class="a11y-inspector" aria-live="polite">
          <span>id: <strong>${this._widgetId || '—'}</strong></span>
          <span class="a11y-badge ${this._hostStates.hovered ? 'on' : ''}">[data-fzl-hovered]</span>
          <span class="a11y-badge ${this._hostStates.focused ? 'on' : ''}">[data-fzl-focused]</span>
          <span class="a11y-badge ${this._hostStates.active ? 'on' : ''}">[data-fzl-active]</span>
        </div>
      </div>

      <!-- O palco é preenchido por _mount() (DOM direto): sem conteúdo do Lit aqui dentro. -->
      <div
        class="stage ${this._stageHc ? 'hc-mode' : ''}"
        dir=${this._stageRtl ? 'rtl' : 'ltr'}
        style=${this._primary ? `--fzl-color-primary: ${this._primary}` : ''}
        @pointerover=${() => this._refreshHostInspector()}
        @pointerout=${() => this._refreshHostInspector()}
        @pointerdown=${() => this._refreshHostInspector()}
        @pointerup=${() => this._refreshHostInspector()}
        @focusin=${() => this._refreshHostInspector()}
        @focusout=${() => this._refreshHostInspector()}
      ></div>
      <p class="status" role="status">${this._status}</p>

      <div class="controls">
        ${this._controls.map((control) => this._renderControl(control))}
        ${this.component?.slotText !== undefined ? this._renderSlotControl() : nothing}
        ${this._renderThemeControl()}
      </div>

      <h2>Código</h2>
      <div class="code">
        <pre><code>${this._code}</code></pre>
        <md-icon-button @click=${this._copy} aria-label="Copiar código"
          ><md-icon>${this._copied ? 'check' : 'content_copy'}</md-icon></md-icon-button
        >
      </div>

      <h2>Eventos</h2>
      ${this._events.length
        ? html`<ol class="events" aria-live="polite">${this._events.map((line) => html`<li>${line}</li>`)}</ol>`
        : html`<p class="hint" aria-live="polite">Interaja com o componente no palco para ver os eventos aqui.</p>`}

      ${this._renderApi(impl, declaration)}

      <h2>Documentação</h2>
      <div class="doc">${unsafeHTML(docHtml(component.doc))}</div>
    `
  }

  _renderControl(control) {
    const value = this._values[control.name] !== undefined ? this._values[control.name] : control.default
    if (control.kind === 'options') {
      return html`
        <fieldset>
          <legend>${control.name}</legend>
          <p class="hint">${control.description}</p>
          ${control.options.map(
            (option) => html`
              <label class="option">
                <md-radio
                  name=${control.name}
                  value=${option}
                  ?checked=${value === option}
                  @change=${() => this._setValue(control.name, option)}
                ></md-radio>
                ${option}
              </label>
            `,
          )}
        </fieldset>
      `
    }
    if (control.kind === 'boolean') {
      return html`
        <fieldset>
          <legend>${control.name}</legend>
          <p class="hint">${control.description}</p>
          <label class="option">
            <md-switch ?selected=${!!value} @change=${(e) => this._setValue(control.name, e.target.selected)}></md-switch>
            ${value ? 'sim' : 'não'}
          </label>
        </fieldset>
      `
    }
    return html`
      <fieldset>
        <legend>${control.name}</legend>
        <p class="hint">${control.description}</p>
        <md-outlined-text-field
          aria-label=${control.name}
          .value=${value ?? ''}
          @input=${(e) => this._setValue(control.name, e.target.value)}
        ></md-outlined-text-field>
      </fieldset>
    `
  }

  _renderSlotControl() {
    return html`
      <fieldset>
        <legend>slot</legend>
        <p class="hint">Conteúdo do componente (slot padrão)</p>
        <md-outlined-text-field
          aria-label="Conteúdo do slot"
          .value=${this._slotText}
          @input=${(e) => (this._slotText = e.target.value)}
        ></md-outlined-text-field>
      </fieldset>
    `
  }

  _renderThemeControl() {
    return html`
      <fieldset>
        <legend>--fzl-color-primary</legend>
        <p class="hint">Tema: o token público, aplicado ao redor do componente</p>
        <div class="color-row">
          <input
            type="color"
            aria-label="Cor primária"
            .value=${this._primary || DEFAULT_PRIMARY}
            @input=${(e) => (this._primary = e.target.value)}
          />
          <code>${this._primary || `${DEFAULT_PRIMARY} (padrão)`}</code>
          ${this._primary ? html`<md-text-button @click=${() => (this._primary = '')}>Restaurar</md-text-button>` : nothing}
        </div>
      </fieldset>
    `
  }

  _renderApi(impl, declaration) {
    if (!declaration) return nothing
    const table = (title, headers, rows) =>
      rows.length
        ? html`
            <h3>${title}</h3>
            <div class="table-wrap">
              <table>
                <thead><tr>${headers.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead>
                <tbody>${rows.map((row) => html`<tr>${row.map((cell) => html`<td>${cell}</td>`)}</tr>`)}</tbody>
              </table>
            </div>
          `
        : nothing
    return html`
      <h2>API de <code>&lt;${impl.tag}&gt;</code></h2>
      <p class="hint">Informações técnicas de <code>${impl.packageName}</code>.</p>
      ${table(
        'Atributos',
        ['Nome', 'Tipo', 'Padrão', 'Descrição'],
        (declaration.attributes ?? []).map((a) => [
          html`<code>${a.name}</code>`,
          html`<code>${a.type?.text ?? ''}</code>`,
          a.default ? html`<code>${a.default}</code>` : '',
          a.description ?? '',
        ]),
      )}
      ${table(
        'Eventos',
        ['Nome', 'Tipo', 'Descrição'],
        (declaration.events ?? []).map((e) => [html`<code>${e.name}</code>`, html`<code>${e.type?.text ?? ''}</code>`, e.description ?? '']),
      )}
      ${table(
        'Slots',
        ['Nome', 'Descrição'],
        (declaration.slots ?? []).map((s) => [s.name ? html`<code>${s.name}</code>` : '(padrão)', s.description ?? '']),
      )}
      ${table(
        'CSS Parts',
        ['Nome', 'Descrição'],
        (declaration.cssParts ?? []).map((p) => [html`<code>::part(${p.name})</code>`, p.description ?? '']),
      )}
    `
  }
}

customElements.define('components-view', ComponentsView)
customElements.define('component-docs-view', ComponentDocsView)
