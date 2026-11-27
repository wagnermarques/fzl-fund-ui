import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import type { FzlRichTextSanitizerFn } from './rich-text-editor.types';

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'BR', 'P', 'DIV', 'SPAN',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD'
]);

const DISCARD_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE']);

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Built-in safe HTML sanitizer using the browser's DOMParser.
 */
export function defaultSanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  if (typeof DOMParser === 'undefined') return dirtyHtml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');

  function cleanNode(node: Node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (DISCARD_TAGS.has(tagName)) {
          el.remove();
          continue;
        }

        if (!ALLOWED_TAGS.has(tagName)) {
          // Replace disallowed tag with its child nodes or remove
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.remove();
          continue;
        }

        // Clean attributes
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          if (attrName.startsWith('on') || attrName === 'style') {
            el.removeAttribute(attr.name);
          } else if (tagName === 'A' && attrName === 'href') {
            try {
              const parsed = new URL(attr.value, window?.location?.href || 'https://localhost');
              if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
                el.removeAttribute(attr.name);
              }
            } catch {
              el.removeAttribute(attr.name);
            }
          } else if (['colspan', 'rowspan', 'class', 'target', 'rel'].includes(attrName)) {
            // Keep safe attributes
          } else if (tagName === 'A') {
            // Remove other attributes on links
            el.removeAttribute(attr.name);
          } else {
            el.removeAttribute(attr.name);
          }
        }

        if (tagName === 'A') {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }

        cleanNode(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    }
  }

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/**
 * Reactive Lit-based Rich Text (WYSIWYG) Editor Web Component.
 *
 * @customElement fzl-lit-rich-text-editor
 * @tag fzl-lit-rich-text-editor
 *
 * @fires {CustomEvent<{ value: string }>} fzl-change - Dispatched when content changes and commits
 * @fires {CustomEvent<{ value: string }>} fzl-input - Dispatched live on input
 * @fires {CustomEvent<{ value: string }>} value-changed - Alias for task form compatibility
 * @fires {CustomEvent<FocusEvent>} fzl-focus - Dispatched on focus
 * @fires {CustomEvent<FocusEvent>} fzl-blur - Dispatched on blur
 *
 * @csspart field - Container wrapper
 * @csspart shell - Editor outer border shell
 * @csspart toolbar - Formatting action bar
 * @csspart button - Formatting toolbar button
 * @csspart editable - The contenteditable editing canvas
 */
@customElement('fzl-lit-rich-text-editor')
export class FzlLitRichTextEditor extends FzlWidgetMixin(LitElement) {
  @property({ type: String })
  value = '';

  @property({ type: String })
  label = '';

  @property({ type: String })
  placeholder = 'Detalhes opcionais... use a barra para negrito, listas, tabelas e links';

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  readOnly = false;

  @property({ type: String, attribute: 'min-height' })
  minHeight = '96px';

  @property({ type: String, attribute: 'max-height' })
  maxHeight = '360px';

  @property({ attribute: false })
  sanitizer: FzlRichTextSanitizerFn | null = null;

  @state()
  private _focused = false;

  private _editorEl: HTMLDivElement | null = null;

  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family, system-ui, sans-serif);
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-1, 6px);
      }

      .label {
        font-size: var(--_fzl-font-size-sm, 0.85rem);
        font-weight: var(--_fzl-font-weight-medium, 600);
        color: var(--_fzl-color-text-secondary, var(--md-sys-color-on-surface-variant, #49454f));
      }

      .shell {
        border: 1px solid var(--_fzl-color-border, var(--md-sys-color-outline-variant, #cac4d0));
        border-radius: var(--_fzl-radius-md, 8px);
        background: var(--_fzl-color-surface-subtle, var(--md-sys-color-surface-container-low, #f7f2fa));
        overflow: hidden;
        transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      }

      .shell.focused {
        border-color: var(--_fzl-color-primary, var(--md-sys-color-primary, #6750a4));
        background: var(--_fzl-color-surface, var(--md-sys-color-surface, #ffffff));
        box-shadow: 0 0 0 1px var(--_fzl-color-primary, var(--md-sys-color-primary, #6750a4));
      }

      .shell.disabled {
        opacity: 0.6;
        pointer-events: none;
      }

      .toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 2px;
        padding: 4px 6px;
        background: var(--_fzl-color-surface-muted, var(--md-sys-color-surface-container, #ece6f0));
        border-bottom: 1px solid var(--_fzl-color-border, var(--md-sys-color-outline-variant, #cac4d0));
      }

      .tbtn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: var(--_fzl-radius-sm, 6px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--_fzl-color-text-secondary, var(--md-sys-color-on-surface-variant, #49454f));
        transition: background 0.15s, color 0.15s;
      }

      .tbtn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .tbtn:hover:not(:disabled) {
        background: var(--_fzl-color-primary-subtle, rgba(103, 80, 164, 0.12));
        color: var(--_fzl-color-primary, var(--md-sys-color-primary, #6750a4));
      }

      .tbtn:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }

      .sep {
        width: 1px;
        height: 18px;
        margin: 2px 4px;
        background: var(--_fzl-color-border, var(--md-sys-color-outline-variant, #cac4d0));
      }

      .editable {
        min-height: var(--fzl-editor-min-height, 96px);
        max-height: var(--fzl-editor-max-height, 360px);
        overflow-y: auto;
        padding: 10px 14px;
        font-size: var(--_fzl-font-size-base, 0.95rem);
        font-family: inherit;
        color: var(--_fzl-color-text, var(--md-sys-color-on-surface, #1d1b20));
        line-height: 1.5;
        background: transparent;
      }

      .editable:focus {
        outline: none;
      }

      .editable :is(ul, ol) {
        margin: 6px 0;
        padding-left: 24px;
      }

      .editable p {
        margin: 0 0 8px 0;
      }

      .editable p:last-child {
        margin-bottom: 0;
      }

      .editable a {
        color: var(--_fzl-color-primary, var(--md-sys-color-primary, #6750a4));
        text-decoration: underline;
      }

      /* Native Responsive Tables */
      .editable table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
        font-size: 0.88rem;
        border: 1px solid var(--_fzl-color-border, var(--md-sys-color-outline-variant, #cac4d0));
        border-radius: var(--_fzl-radius-sm, 6px);
        overflow: hidden;
      }

      .editable th {
        background: var(--_fzl-color-surface-muted, var(--md-sys-color-surface-container-high, #ece6f0));
        color: var(--_fzl-color-text, var(--md-sys-color-on-surface, #1d1b20));
        font-weight: 600;
        text-align: left;
        padding: 6px 10px;
        border: 1px solid var(--_fzl-color-border, var(--md-sys-color-outline-variant, #cac4d0));
      }

      .editable td {
        padding: 6px 10px;
        border: 1px solid var(--_fzl-color-border, var(--md-sys-color-outline-variant, #cac4d0));
        color: var(--_fzl-color-text, var(--md-sys-color-on-surface, #1d1b20));
        min-width: 44px;
      }

      .editable tr:nth-child(even) td {
        background: var(--_fzl-color-surface, #ffffff);
      }

      .editable tr:nth-child(odd) td {
        background: var(--_fzl-color-surface-subtle, var(--md-sys-color-surface-container-low, #f7f2fa));
      }

      .editable:empty::before {
        content: attr(data-placeholder);
        color: var(--_fzl-color-text-muted, var(--md-sys-color-outline, #79747e));
        pointer-events: none;
      }
    `
  ];

  override firstUpdated() {
    this._editorEl = this.renderRoot.querySelector('.editable');
    this._syncEditorFromValue();
  }

  override updated(changedProps: PropertyValues) {
    if (changedProps.has('value') && this._editorEl && !this._focused) {
      this._syncEditorFromValue();
    }
    if (changedProps.has('minHeight') && this._editorEl) {
      this.style.setProperty('--fzl-editor-min-height', this.minHeight);
    }
    if (changedProps.has('maxHeight') && this._editorEl) {
      this.style.setProperty('--fzl-editor-max-height', this.maxHeight);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._focused = false;
  }

  /** Sets the value programmatically and syncs with canvas */
  public setValue(val: string): void {
    this._focused = false;
    this.value = val || '';
    if (this._editorEl) {
      this._syncEditorFromValue();
    }
  }

  /** Clears content */
  public reset(): void {
    this.setValue('');
  }

  /** Clean and sanitize HTML */
  private _sanitize(raw: string): string {
    if (typeof this.sanitizer === 'function') {
      return this.sanitizer(raw);
    }
    return defaultSanitizeHtml(raw);
  }

  private _syncEditorFromValue() {
    if (!this._editorEl) return;
    const clean = this._sanitize(this.value);
    if (this._editorEl.innerHTML !== clean) {
      this._editorEl.innerHTML = clean;
    }
  }

  private _findClosest<T extends HTMLElement>(selector: string): T | null {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !this._editorEl?.contains(node)) return null;
    return (node as HTMLElement).closest(selector) as T | null;
  }

  private _exec(command: string, arg: string | null = null) {
    if (this.disabled || this.readOnly || !this._editorEl) return;
    this._editorEl.focus();
    document.execCommand(command, false, arg ?? undefined);
    this._onInput();
  }

  private _insertLink() {
    if (this.disabled || this.readOnly) return;
    const url = window.prompt('Informe a URL do link (ex: https://exemplo.com):', 'https://');
    if (!url) return;
    this._exec('createLink', url);
  }

  private _insertTable() {
    if (this.disabled || this.readOnly || !this._editorEl) return;
    const rowsStr = window.prompt('Número de linhas (1 a 10):', '3');
    if (rowsStr === null) return;
    const colsStr = window.prompt('Número de colunas (1 a 6):', '3');
    if (colsStr === null) return;

    const rows = Math.max(1, Math.min(10, parseInt(rowsStr, 10) || 3));
    const cols = Math.max(1, Math.min(6, parseInt(colsStr, 10) || 3));

    let tableHtml = '<table><thead><tr>';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th>Coluna ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= cols; c++) {
        tableHtml += '<td>&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';

    this._editorEl.focus();
    document.execCommand('insertHTML', false, tableHtml);
    this._onInput();
  }

  private _addRow() {
    if (this.disabled || this.readOnly || !this._editorEl) return;
    const tr = this._findClosest<HTMLTableRowElement>('tr');
    const table = this._findClosest<HTMLTableElement>('table');
    if (tr) {
      const colCount = tr.children.length;
      const newTr = document.createElement('tr');
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';
        newTr.appendChild(td);
      }
      tr.parentNode?.insertBefore(newTr, tr.nextSibling);
      this._onInput();
    } else if (table) {
      const colCount = table.querySelector('tr')?.children.length || 3;
      const tbody = table.querySelector('tbody') || table;
      const newTr = document.createElement('tr');
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';
        newTr.appendChild(td);
      }
      tbody.appendChild(newTr);
      this._onInput();
    } else {
      this._insertTable();
    }
  }

  private _addColumn() {
    if (this.disabled || this.readOnly || !this._editorEl) return;
    const td = this._findClosest<HTMLTableCellElement>('td, th');
    const table = this._findClosest<HTMLTableElement>('table');
    if (!table) {
      this._insertTable();
      return;
    }

    const colIdx = td ? Array.from(td.parentElement?.children || []).indexOf(td) : -1;
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      const isHeader = row.parentElement?.tagName === 'THEAD' || row.querySelector('th');
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.innerHTML = isHeader ? 'Coluna' : '&nbsp;';
      if (colIdx >= 0 && colIdx < row.children.length - 1) {
        row.insertBefore(cell, row.children[colIdx + 1]);
      } else {
        row.appendChild(cell);
      }
    });
    this._onInput();
  }

  private _deleteRow() {
    if (this.disabled || this.readOnly || !this._editorEl) return;
    const tr = this._findClosest<HTMLTableRowElement>('tr');
    const table = this._findClosest<HTMLTableElement>('table');
    if (!tr || !table) return;

    const tbody = tr.parentElement;
    tr.remove();
    if (tbody && tbody.querySelectorAll('tr').length === 0) {
      table.remove();
    }
    this._onInput();
  }

  private _onInput() {
    if (!this._editorEl) return;
    const clean = this._sanitize(this._editorEl.innerHTML);
    this.value = clean;

    const detail = { value: clean };
    this.dispatchEvent(new CustomEvent('fzl-input', { detail, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('fzl-change', { detail, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('value-changed', { detail, bubbles: true, composed: true }));
  }

  private _onFocus(e: FocusEvent) {
    this._focused = true;
    this.dispatchEvent(new CustomEvent('fzl-focus', { detail: { originalEvent: e }, bubbles: true, composed: true }));
  }

  private _onBlur(e: FocusEvent) {
    this._focused = false;
    this._onInput();
    this.dispatchEvent(new CustomEvent('fzl-blur', { detail: { originalEvent: e }, bubbles: true, composed: true }));
  }

  private _renderBtn(title: string, svgPath: unknown, onClick: () => void) {
    return html`
      <button
        type="button"
        class="tbtn"
        part="button"
        title=${title}
        aria-label=${title}
        ?disabled=${this.disabled || this.readOnly}
        @click=${onClick}
      >
        ${svgPath}
      </button>
    `;
  }

  override render() {
    return html`
      <div class="field" part="field">
        ${this.label ? html`<label class="label">${this.label}</label>` : ''}
        <div class="shell ${this._focused ? 'focused' : ''} ${this.disabled ? 'disabled' : ''}" part="shell">
          <div class="toolbar" role="toolbar" aria-label="Barra de Formatação de Texto" part="toolbar">
            ${this._renderBtn('Negrito', html`<svg viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>`, () => this._exec('bold'))}
            ${this._renderBtn('Itálico', html`<svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>`, () => this._exec('italic'))}
            ${this._renderBtn('Sublinhado', html`<svg viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>`, () => this._exec('underline'))}
            <span class="sep"></span>
            ${this._renderBtn('Lista com marcadores', html`<svg viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>`, () => this._exec('insertUnorderedList'))}
            ${this._renderBtn('Lista numerada', html`<svg viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>`, () => this._exec('insertOrderedList'))}
            <span class="sep"></span>
            ${this._renderBtn('Inserir tabela', html`<svg viewBox="0 0 24 24"><path d="M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10.02H3V19z"/></svg>`, () => this._insertTable())}
            ${this._renderBtn('Adicionar linha abaixo', html`<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`, () => this._addRow())}
            ${this._renderBtn('Adicionar coluna à direita', html`<svg viewBox="0 0 24 24"><path d="M4 2h16c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm9 4H4v12h9V6zm2 0v12h5V6h-5z"/></svg>`, () => this._addColumn())}
            ${this._renderBtn('Excluir linha da tabela', html`<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zm2-8h6v8H5v-8zm5-6H6L5 5H2v2h12V5h-3z"/></svg>`, () => this._deleteRow())}
            <span class="sep"></span>
            ${this._renderBtn('Inserir link', html`<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`, () => this._insertLink())}
            ${this._renderBtn('Limpar formatação', html`<svg viewBox="0 0 24 24"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/></svg>`, () => this._exec('removeFormat'))}
          </div>
          <div
            class="editable"
            part="editable"
            contenteditable=${this.disabled || this.readOnly ? 'false' : 'true'}
            data-placeholder=${this.placeholder}
            @input=${this._onInput}
            @focus=${this._onFocus}
            @blur=${this._onBlur}
          ></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-lit-rich-text-editor': FzlLitRichTextEditor;
  }
}
