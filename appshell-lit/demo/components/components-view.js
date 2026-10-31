import { LitElement, html, css, nothing } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { marked } from 'marked'
import { fzlTokens } from '@fzl/design-tokens'
import { catalog } from './catalog.js'
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
  static styles = [
    sharedStyles,
    css`
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
    `,
  ]

  render() {
    return html`
      <h1>Componentes</h1>
      <p class="subtitle">
        Documentação viva e playground interativo dos web components: cada página apresenta o componente funcionando no palco,
        com controles reativos, código gerado, histórico de eventos, tabela de API e especificação técnica.
      </p>
      <div class="grid">
        ${catalog.map(
          (component) => html`
            <a class="card" href="#/componentes/${component.id}">
              <div>
                <h2><md-icon aria-hidden="true">${component.icon}</md-icon>${component.name}</h2>
                <p>${component.summary}</p>
              </div>
              <div class="impls">${component.implementations.map((impl) => impl.label).join(' · ')}</div>
            </a>
          `,
        )}
      </div>
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
  }

  static styles = [
    sharedStyles,
    css`
      .impl-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
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
    if (changed.has('component')) {
      this._values = { ...(this.component?.initialValues ?? {}) }
      this._slotText = this.component?.slotText ?? ''
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
  }

  /** Aplica os controles ao elemento do palco — no lugar, sem recriá-lo,
   *  para exercitar a reatividade de cada implementação. */
  _sync() {
    const element = this._element
    if (!element) return
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
    const detail = event.detail ? Object.keys(event.detail).join(', ') : ''
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
    return html`
      <h1>${component.name}</h1>
      <p class="subtitle">${declaration?.description ?? component.summary}</p>

      <nav class="impl-tabs" aria-label="Implementações">
        ${component.implementations.map((other) =>
          other === impl
            ? html`<md-filled-button aria-current="page">${other.label}</md-filled-button>`
            : html`<md-outlined-button href="#/componentes/${component.id}/${other.id}">${other.label}</md-outlined-button>`,
        )}
      </nav>

      <!-- O palco é preenchido por _mount() (DOM direto): sem conteúdo do Lit aqui dentro. -->
      <div class="stage" style=${this._primary ? `--fzl-color-primary: ${this._primary}` : ''}></div>
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
