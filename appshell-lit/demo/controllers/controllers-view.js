import { LitElement, html, css } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { marked } from 'marked'
import { controllers, controllerGroups, findController, overviewDoc } from './catalog.js'

/** Markdown sem o título H1 (a página tem o seu). */
function docHtml(markdown) {
  if (!markdown) return ''
  return marked.parse(markdown.replace(/^# .*\n/, ''))
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
  .badge-new {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--md-sys-color-tertiary-container);
    color: var(--md-sys-color-on-tertiary-container);
  }
`

const docStyles = css`
  .doc {
    line-height: 1.6;
  }
  .doc pre {
    background: var(--md-sys-color-surface-container-highest, var(--md-sys-color-surface-variant));
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
  }
  .doc pre code {
    background: none;
    padding: 0;
  }
  .doc table {
    border-collapse: collapse;
    width: 100%;
    display: block;
    overflow-x: auto;
    font-size: 0.9rem;
  }
  .doc th,
  .doc td {
    border: 1px solid var(--md-sys-color-outline-variant);
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  .doc blockquote {
    margin: 0 0 16px;
    padding: 8px 16px;
    border-left: 4px solid var(--md-sys-color-primary);
    background: var(--md-sys-color-surface-container, transparent);
  }
`

/** Árvore de herança (pai -> filhos). */
function childrenOf(parentId) {
  return controllers.filter((controller) => controller.parent === parentId)
}

function renderTree(parentId) {
  const children = childrenOf(parentId)
  if (!children.length) return ''
  return html`<ul>
    ${children.map(
      (controller) => html`<li>
        <a href="#/controllers/${controller.id}"><code>${controller.name}</code></a>
        ${controller.isNew ? html`<span class="badge-new">novo</span>` : ''} ${renderTree(controller.id)}
      </li>`,
    )}
  </ul>`
}

/** #/controllers — catálogo dos controllers extensíveis. */
export class ControllersView extends LitElement {
  static styles = [
    sharedStyles,
    docStyles,
    css`
      .tree {
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        padding: 8px 16px;
        overflow-x: auto;
      }
      .tree ul {
        list-style: none;
        padding-left: 20px;
        margin: 4px 0;
        border-left: 1px dashed var(--md-sys-color-outline-variant);
      }
      .tree > ul {
        border-left: none;
        padding-left: 0;
      }
      .tree li {
        margin: 6px 0;
      }
      .tree a {
        text-decoration: none;
      }
      .group-desc {
        color: var(--md-sys-color-on-surface-variant);
        margin: -6px 0 12px;
        font-size: 0.9rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px;
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 16px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        color: inherit;
        text-decoration: none;
        background: var(--md-sys-color-surface);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .card:hover,
      .card:focus-visible {
        border-color: var(--md-sys-color-primary);
        box-shadow: 0 1px 4px color-mix(in srgb, var(--md-sys-color-shadow, #000) 15%, transparent);
      }
      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        word-break: break-word;
      }
      .card-title md-icon {
        color: var(--md-sys-color-primary);
      }
      .card-summary {
        font-size: 0.88rem;
        color: var(--md-sys-color-on-surface-variant);
      }
      .card-parent {
        font-size: 0.78rem;
        color: var(--md-sys-color-on-surface-variant);
      }
      details {
        margin-top: 32px;
      }
      summary {
        cursor: pointer;
        font-weight: 600;
      }
    `,
  ]

  render() {
    return html`
      <h1>Controllers</h1>
      <p class="subtitle">
        Regras de negócio reutilizáveis de <code>@fzl/webcomponents-lit/controllers</code>, feitas para as
        aplicações <strong>estenderem</strong> (<code>extends</code>) e personalizarem pelos hooks protegidos.
        Funcionam ligados a um <code>LitElement</code> ou sem DOM.
      </p>

      <h2>Hierarquia</h2>
      <div class="tree" role="tree" aria-label="Hierarquia de herança dos controllers">
        <ul>
          <li>
            <a href="#/controllers/base"><code>FzlBaseController</code></a>
            ${renderTree('base')}
          </li>
        </ul>
      </div>

      ${controllerGroups.map((group) => {
        const items = controllers.filter((controller) => controller.group === group.id)
        if (!items.length) return ''
        return html`
          <h2 id="grp-${group.id}">${group.name}</h2>
          <p class="group-desc">${group.description}</p>
          <div class="grid">
            ${items.map((controller) => {
              const parent = controller.parent ? findController(controller.parent) : null
              return html`
                <a class="card" href="#/controllers/${controller.id}">
                  <span class="card-title">
                    <md-icon aria-hidden="true">${controller.icon}</md-icon>
                    ${controller.name}
                    ${controller.isNew ? html`<span class="badge-new">novo</span>` : ''}
                  </span>
                  <span class="card-summary">${controller.summary}</span>
                  ${parent ? html`<span class="card-parent">extends ${parent.name}</span>` : ''}
                </a>
              `
            })}
          </div>
        `
      })}

      <details>
        <summary>Visão geral, composição e exemplos</summary>
        <div class="doc">${unsafeHTML(docHtml(overviewDoc))}</div>
      </details>
    `
  }
}
customElements.define('controllers-view', ControllersView)

/** #/controllers/:id — documentação de um controller. */
export class ControllerDocsView extends LitElement {
  static properties = {
    controllerId: { type: String },
  }

  static styles = [
    sharedStyles,
    docStyles,
    css`
      .lineage {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        font-size: 0.85rem;
        margin: 0 0 8px;
      }
      .lineage a {
        text-decoration: none;
      }
      .children {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
      }
      .title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        word-break: break-word;
      }
    `,
  ]

  _lineage(controller) {
    const chain = []
    let current = controller.parent ? findController(controller.parent) : null
    while (current) {
      chain.unshift(current)
      current = current.parent ? findController(current.parent) : null
    }
    return chain
  }

  render() {
    const controller = findController(this.controllerId)
    if (!controller) {
      return html`<p>Controller não encontrado. <a href="#/controllers">Ver todos</a></p>`
    }
    const lineage = this._lineage(controller)
    const children = childrenOf(controller.id)
    return html`
      ${lineage.length
        ? html`<nav class="lineage" aria-label="Herança">
            ${lineage.map(
              (ancestor) => html`<a href="#/controllers/${ancestor.id}"><code>${ancestor.name}</code></a><span aria-hidden="true">›</span>`,
            )}
            <code>${controller.name}</code>
          </nav>`
        : ''}
      <div class="title-row">
        <h1>${controller.name}</h1>
        ${controller.isNew ? html`<span class="badge-new">novo</span>` : ''}
      </div>
      <p class="subtitle">${controller.summary}</p>
      ${children.length
        ? html`<p class="children">
            Estendido por:
            ${children.map(
              (child, i) => html`${i ? ', ' : ''}<a href="#/controllers/${child.id}"><code>${child.name}</code></a>`,
            )}
          </p>`
        : ''}
      <div class="doc">${unsafeHTML(docHtml(controller.doc))}</div>
    `
  }
}
customElements.define('controller-docs-view', ControllerDocsView)
