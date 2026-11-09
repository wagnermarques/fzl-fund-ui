import { LitElement, html, css } from 'lit'
import './connection-status.js'
import './app-clock.js'
import './app-version.js'

/** Rodapé fixo do appshell. Hospeda pequenos web components de status
 *  (conexão, relógio, versão) e expõe um <slot> para que um projeto que use
 *  este appshell acrescente outros — sem precisar editar este arquivo. */
export class AppFooter extends LitElement {
  static properties = {
    footerText: { type: String },
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex: 0 0 auto;
      min-height: 32px;
      padding: 0 12px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface-variant);
      border-top: 1px solid var(--md-sys-color-outline);
      font-size: 0.75rem;
    }
    .start,
    .end {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
      white-space: nowrap;
    }
    .center {
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 8px;
      flex: 1 1 auto;
      max-width: 600px;
    }
  `

  constructor() {
    super()
    this.footerText = ''
  }

  render() {
    return html`
      <div class="start">
        <connection-status></connection-status>
        <app-clock></app-clock>
      </div>
      ${this.footerText ? html`<div class="center">${this.footerText}</div>` : ''}
      <div class="end">
        <slot></slot>
        <app-version></app-version>
      </div>
    `
  }
}

customElements.define('app-footer', AppFooter)
