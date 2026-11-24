import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  extractGoogleDocId,
  buildGoogleDocUrl,
  isValidGoogleDoc,
  type FzlDocOpenDetail,
  type FzlDocChangeDetail,
  type FzlDocAppendDetail,
  type FzlDocCopyDetail,
} from './google-doc-editor.types';

export * from './google-doc-editor.types';

/** Official Google Docs brand SVG icon. */
const GOOGLE_DOCS_ICON = html`
  <svg class="doc-icon" viewBox="0 0 40 40" width="36" height="36" aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M26 4H10C7.79 4 6 5.79 6 8v24c0 2.21 1.79 4 4 4h20c2.21 0 4-1.79 4-4V14L26 4z" />
    <path fill="#A1C2FA" d="M26 4v10h10L26 4z" />
    <path fill="#FFFFFF" d="M12 20h16v2H12zm0 4h16v2H12zm0 4h10v2H12z" />
  </svg>
`;

/** External link icon. */
const OPEN_EXTERNAL_ICON = html`
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
  </svg>
`;

/** Copy icon. */
const COPY_ICON = html`
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
`;

/** Check icon. */
const CHECK_ICON = html`
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
`;

/** Edit pencil icon. */
const EDIT_ICON = html`
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
`;

/** Unlink / delete icon. */
const UNLINK_ICON = html`
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
`;

/**
 * `<fzl-google-doc-editor>`
 *
 * Web Component para visualização, vinculação e abertura de documentos Google Docs,
 * suportando edição externa oficial, cópia de link, inserção de conteúdo e prévia.
 *
 * @fires fzl-doc-open - Disparado ao abrir o documento no Google Docs.
 * @fires fzl-doc-change - Disparado ao vincular, alterar ou desvincular o documento.
 * @fires fzl-doc-copy - Disparado ao copiar o link do documento.
 * @fires fzl-doc-append - Disparado ao solicitar inclusão de conteúdo no documento.
 */
@customElement('fzl-google-doc-editor')
export class FzlGoogleDocEditor extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--fzl-font-family, system-ui, -apple-system, sans-serif);
      box-sizing: border-box;
      color: var(--fzl-color-on-surface, #1f1f1f);
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Card Mode */
    .doc-card {
      background: var(--fzl-surface-card, var(--md-sys-color-surface, #ffffff));
      border: 1px solid var(--fzl-border-color, var(--md-sys-color-outline-variant, #e0e0e0));
      border-radius: var(--fzl-border-radius-lg, 14px);
      padding: 16px 18px;
      transition: all 0.2s ease;
      position: relative;
    }

    .doc-card:hover {
      border-color: var(--fzl-color-primary, #4285F4);
      box-shadow: 0 4px 14px rgba(66, 133, 244, 0.1);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .icon-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: rgba(66, 133, 244, 0.08);
      border-radius: 10px;
    }

    .info {
      flex: 1;
      min-width: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .doc-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
      color: var(--fzl-color-on-surface, #1f1f1f);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge-id {
      display: inline-block;
      font-size: 0.72rem;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--fzl-badge-bg, rgba(0, 0, 0, 0.05));
      color: var(--fzl-badge-color, #666666);
      user-select: all;
    }

    .doc-desc {
      font-size: 0.85rem;
      color: var(--fzl-color-on-surface-variant, #666666);
      margin: 4px 0 0;
      line-height: 1.4;
    }

    .doc-url-text {
      font-size: 0.8rem;
      color: #1a73e8;
      text-decoration: none;
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 4px;
    }

    .doc-url-text:hover {
      text-decoration: underline;
    }

    /* Actions Bar */
    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--fzl-border-radius-sm, 8px);
      padding: 7px 14px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--fzl-color-primary, #1a73e8);
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(26, 115, 232, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      background: #1557b0;
      box-shadow: 0 2px 6px rgba(26, 115, 232, 0.4);
    }

    .btn-outlined {
      background: transparent;
      border-color: var(--fzl-border-color, #dadce0);
      color: var(--fzl-color-on-surface, #3c4043);
    }

    .btn-outlined:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.04);
      border-color: #bdc1c6;
    }

    .btn-danger {
      background: transparent;
      border-color: transparent;
      color: var(--fzl-color-error, #d93025);
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(217, 48, 37, 0.08);
    }

    /* Empty / Linking State */
    .empty-card {
      border: 2px dashed var(--fzl-border-color, #dadce0);
      border-radius: var(--fzl-border-radius-lg, 14px);
      padding: 20px;
      text-align: center;
      background: var(--fzl-surface-empty, rgba(66, 133, 244, 0.02));
    }

    .empty-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 8px 0 4px;
      color: var(--fzl-color-on-surface, #202124);
    }

    .empty-subtitle {
      font-size: 0.85rem;
      color: var(--fzl-color-on-surface-variant, #5f6368);
      margin: 0 0 16px;
    }

    .input-form {
      display: flex;
      gap: 8px;
      max-width: 580px;
      margin: 0 auto;
      flex-wrap: wrap;
    }

    .url-input {
      flex: 1;
      min-width: 240px;
      padding: 9px 14px;
      border: 1px solid var(--fzl-border-color, #dadce0);
      border-radius: 8px;
      font-size: 0.9rem;
      background: var(--fzl-input-bg, #ffffff);
      color: inherit;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .url-input:focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    }

    .error-msg {
      color: var(--fzl-color-error, #d93025);
      font-size: 0.8rem;
      margin-top: 8px;
      text-align: left;
    }

    /* Compact Mode */
    .compact-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      background: var(--fzl-surface-compact, rgba(66, 133, 244, 0.08));
      border: 1px solid rgba(66, 133, 244, 0.25);
      border-radius: 20px;
      font-size: 0.85rem;
    }

    .compact-bar .compact-title {
      font-weight: 600;
      color: #1a73e8;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .compact-bar .compact-title:hover {
      text-decoration: underline;
    }

    /* Preview Frame */
    .preview-container {
      margin-top: 14px;
      border-top: 1px solid var(--fzl-border-color, #e0e0e0);
      padding-top: 14px;
    }

    .preview-frame {
      width: 100%;
      height: 480px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #ffffff;
    }

    /* Dark Mode */
    :host-context([data-fzl-theme='dark']),
    :host([data-fzl-theme='dark']) {
      --fzl-color-on-surface: #e8eaed;
      --fzl-color-on-surface-variant: #9aa0a6;
      --fzl-surface-card: #202124;
      --fzl-border-color: #3c4043;
      --fzl-input-bg: #303134;
      --fzl-badge-bg: rgba(255, 255, 255, 0.1);
      --fzl-badge-color: #dadce0;
    }
  `;

  /** URL completa do Google Docs ou ID do documento. */
  @property({ type: String, attribute: 'doc-url' })
  docUrl = '';

  /** ID direto do documento (se omitido, extrai de doc-url). */
  @property({ type: String, attribute: 'doc-id' })
  docId = '';

  /** Título do documento ou da pregação/anotação vinculada. */
  @property({ type: String })
  override title = '';

  /** Descrição ou resumo complementar do documento. */
  @property({ type: String })
  description = '';

  /** Modo de exibição: 'card' (completo), 'compact' (pílula) ou 'embedded' (com preview). */
  @property({ type: String })
  mode: 'card' | 'compact' | 'embedded' = 'card';

  /** Permite editar ou vincular a URL no componente. */
  @property({ type: Boolean, attribute: 'allow-url-edit' })
  allowUrlEdit = true;

  /** Modo somente leitura (desabilita edições e exclusão do link). */
  @property({ type: Boolean })
  readonly = false;

  /** Placeholder do campo de URL. */
  @property({ type: String })
  placeholder = 'Cole o link do Google Docs (https://docs.google.com/document/d/.../edit)';

  /** Token OAuth2 opcional para requisições diretas à Google Docs API. */
  @property({ type: String, attribute: 'auth-token' })
  authToken = '';

  /** Provedor assíncrono para obter o token de acesso do Google sob demanda. */
  @property({ attribute: false })
  googleTokenProvider: (() => Promise<string | null>) | null = null;

  /** Exibe ou oculta a prévia integrada do documento. */
  @property({ type: Boolean, attribute: 'show-preview' })
  showPreview = false;

  @state()
  private _editingUrl = false;

  @state()
  private _inputUrl = '';

  @state()
  private _copied = false;

  @state()
  private _errorMessage = '';

  @state()
  private _statusMessage = '';

  @state()
  private _busy = false;

  /** Retorna o ID efetivo do Google Docs limpo. */
  get activeDocId(): string | null {
    return this.docId.trim() || extractGoogleDocId(this.docUrl);
  }

  /** Retorna a URL canônica de edição do documento. */
  get canonicalUrl(): string {
    const id = this.activeDocId;
    return id ? buildGoogleDocUrl(id) : this.docUrl.trim();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('docUrl') && !this.docId) {
      const extracted = extractGoogleDocId(this.docUrl);
      if (extracted) {
        this.docId = extracted;
      }
    }
  }

  /**
   * Abre o documento no Google Docs oficial em nova aba ou popup.
   */
  openInGoogleDocs(target = '_blank'): Window | null {
    const url = this.canonicalUrl;
    if (!url) return null;

    const event = new CustomEvent<FzlDocOpenDetail>('fzl-doc-open', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        docId: this.activeDocId || '',
        docUrl: url,
        target,
      },
    });

    const notCancelled = this.dispatchEvent(event);
    if (!notCancelled) return null;

    return window.open(url, target, 'noopener,noreferrer');
  }

  /**
   * Copia a URL do documento para a área de transferência.
   */
  async copyDocUrl(): Promise<boolean> {
    const url = this.canonicalUrl;
    if (!url) return false;

    try {
      await navigator.clipboard.writeText(url);
      this._copied = true;
      setTimeout(() => (this._copied = false), 2500);

      this.dispatchEvent(
        new CustomEvent<FzlDocCopyDetail>('fzl-doc-copy', {
          bubbles: true,
          composed: true,
          detail: {
            docId: this.activeDocId || '',
            docUrl: url,
          },
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Define uma nova URL de documento e emite o evento `fzl-doc-change`.
   */
  setDocUrl(newUrl: string): boolean {
    const trimmed = (newUrl || '').trim();
    if (trimmed.length > 0 && !isValidGoogleDoc(trimmed)) {
      this._errorMessage = 'URL ou ID do Google Docs inválido. Verifique o formato do link.';
      return false;
    }
    const id = extractGoogleDocId(trimmed);

    const previousId = this.activeDocId || undefined;
    this.docUrl = trimmed;
    this.docId = id || '';
    this._errorMessage = '';
    this._editingUrl = false;

    this.dispatchEvent(
      new CustomEvent<FzlDocChangeDetail>('fzl-doc-change', {
        bubbles: true,
        composed: true,
        detail: {
          docId: this.docId,
          docUrl: this.canonicalUrl,
          previousDocId: previousId,
        },
      })
    );
    return true;
  }

  /**
   * Desvincula o documento atual.
   */
  clearDocUrl(): void {
    const previousId = this.activeDocId || undefined;
    this.docUrl = '';
    this.docId = '';
    this._errorMessage = '';
    this._editingUrl = false;

    this.dispatchEvent(
      new CustomEvent<FzlDocChangeDetail>('fzl-doc-change', {
        bubbles: true,
        composed: true,
        detail: {
          docId: '',
          docUrl: '',
          previousDocId: previousId,
        },
      })
    );
  }

  /**
   * Envia texto ou versículos para inserção no Google Docs.
   * Se houver token OAuth2, tenta inserir via Google Docs API batchUpdate.
   * Emite sempre o evento `fzl-doc-append`.
   */
  async appendContent(text: string, title?: string): Promise<boolean> {
    const docId = this.activeDocId;
    if (!docId) {
      this._errorMessage = 'Nenhum documento vinculado para inserção.';
      return false;
    }

    this._busy = true;
    this._statusMessage = 'Enviando conteúdo para o Google Docs...';
    this._errorMessage = '';

    try {
      let token = this.authToken;
      if (!token && this.googleTokenProvider) {
        token = (await this.googleTokenProvider()) || '';
      }

      if (token) {
        // Chamada à Google Docs API v1 (batchUpdate insertText)
        const contentToInsert = title ? `\n\n${title}\n${text}\n` : `\n\n${text}\n`;
        const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  endOfSegmentLocation: {},
                  text: contentToInsert,
                },
              },
            ],
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || `Erro da Google Docs API (${res.status})`;
          throw new Error(errMsg);
        }
      }

      this.dispatchEvent(
        new CustomEvent<FzlDocAppendDetail>('fzl-doc-append', {
          bubbles: true,
          composed: true,
          detail: {
            docId,
            docUrl: this.canonicalUrl,
            text,
            title,
          },
        })
      );

      this._statusMessage = 'Conteúdo inserido com sucesso!';
      setTimeout(() => (this._statusMessage = ''), 3000);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao inserir conteúdo no documento.';
      this._errorMessage = msg;
      return false;
    } finally {
      this._busy = false;
    }
  }

  private _handleFormSubmit(e: Event) {
    e.preventDefault();
    this.setDocUrl(this._inputUrl);
  }

  private _toggleEdit() {
    this._editingUrl = !this._editingUrl;
    this._inputUrl = this.docUrl;
    this._errorMessage = '';
  }

  private _togglePreview() {
    this.showPreview = !this.showPreview;
  }

  override render() {
    const docId = this.activeDocId;
    const hasDoc = Boolean(docId);

    if (this.mode === 'compact') {
      return this._renderCompact(hasDoc, docId);
    }

    if (!hasDoc || this._editingUrl) {
      return this._renderEmptyOrEdit(hasDoc);
    }

    return this._renderCard(docId!);
  }

  private _renderCompact(hasDoc: boolean, _docId: string | null) {
    if (!hasDoc) {
      return html`
        <span class="compact-bar" style="background: rgba(0,0,0,0.04); border-color: #dadce0;">
          ${GOOGLE_DOCS_ICON}
          <span>Nenhum Google Doc</span>
          ${this.allowUrlEdit && !this.readonly
            ? html`<button class="btn btn-outlined" style="padding: 2px 8px; font-size: 0.75rem;" @click=${this._toggleEdit}>Vincular</button>`
            : nothing}
        </span>
      `;
    }

    return html`
      <div class="compact-bar">
        ${GOOGLE_DOCS_ICON}
        <a class="compact-title" href=${this.canonicalUrl} target="_blank" rel="noopener noreferrer" @click=${(e: MouseEvent) => { e.preventDefault(); this.openInGoogleDocs(); }}>
          <span>${this.title || 'Google Doc'}</span>
          ${OPEN_EXTERNAL_ICON}
        </a>
        <button
          type="button"
          class="btn btn-outlined"
          style="padding: 2px 6px; font-size: 0.75rem;"
          title="Copiar link"
          @click=${() => this.copyDocUrl()}
        >
          ${this._copied ? CHECK_ICON : COPY_ICON}
        </button>
      </div>
    `;
  }

  private _renderEmptyOrEdit(isEditing: boolean) {
    return html`
      <div class="empty-card">
        <div style="display: flex; justify-content: center;">
          ${GOOGLE_DOCS_ICON}
        </div>
        <h3 class="empty-title">
          ${isEditing ? 'Editar Link do Google Docs' : 'Vincular Google Docs'}
        </h3>
        <p class="empty-subtitle">
          ${isEditing
            ? 'Atualize a URL do documento para abrir e sincronizar anotações.'
            : 'Conecte um arquivo do Google Docs para editar sermões, esboços e anotações.'}
        </p>

        ${this.allowUrlEdit && !this.readonly
          ? html`
              <form class="input-form" @submit=${this._handleFormSubmit}>
                <input
                  type="url"
                  class="url-input"
                  .value=${this._inputUrl || this.docUrl}
                  @input=${(e: Event) => (this._inputUrl = (e.target as HTMLInputElement).value)}
                  placeholder=${this.placeholder}
                  required
                />
                <button type="submit" class="btn btn-primary" ?disabled=${this._busy}>
                  Salvar
                </button>
                ${isEditing
                  ? html`
                      <button type="button" class="btn btn-outlined" @click=${this._toggleEdit}>
                        Cancelar
                      </button>
                    `
                  : nothing}
              </form>
            `
          : html`<p style="font-size: 0.85rem; color: #888;">Edição de URL desabilitada.</p>`}

        ${this._errorMessage ? html`<p class="error-msg">${this._errorMessage}</p>` : nothing}
      </div>
    `;
  }

  private _renderCard(docId: string) {
    const displayTitle = this.title || 'Documento Google Docs';
    const shortId = docId.length > 18 ? `${docId.slice(0, 10)}...${docId.slice(-6)}` : docId;

    return html`
      <div class="doc-card" role="region" aria-label=${displayTitle}>
        <div class="card-header">
          <div class="icon-wrap">
            ${GOOGLE_DOCS_ICON}
          </div>
          <div class="info">
            <div class="title-row">
              <h3 class="doc-title">${displayTitle}</h3>
              <span class="badge-id" title="ID do Google Docs">${shortId}</span>
            </div>
            ${this.description ? html`<p class="doc-desc">${this.description}</p>` : nothing}
            <a
              class="doc-url-text"
              href=${this.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              @click=${(e: MouseEvent) => { e.preventDefault(); this.openInGoogleDocs(); }}
            >
              ${this.canonicalUrl}
            </a>
          </div>
        </div>

        <div class="card-actions">
          <button
            type="button"
            class="btn btn-primary"
            @click=${() => this.openInGoogleDocs()}
            aria-label="Editar no Google Docs"
          >
            ${OPEN_EXTERNAL_ICON}
            <span>Editar no Google Docs</span>
          </button>

          <button
            type="button"
            class="btn btn-outlined"
            @click=${() => this.copyDocUrl()}
            aria-label="Copiar link do documento"
          >
            ${this._copied ? CHECK_ICON : COPY_ICON}
            <span>${this._copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>

          ${this.mode === 'embedded' || this.showPreview
            ? html`
                <button
                  type="button"
                  class="btn btn-outlined"
                  @click=${this._togglePreview}
                >
                  ${this.showPreview ? 'Ocultar Prévia' : 'Visualizar'}
                </button>
              `
            : nothing}

          ${this.allowUrlEdit && !this.readonly
            ? html`
                <button
                  type="button"
                  class="btn btn-outlined"
                  @click=${this._toggleEdit}
                  title="Trocar URL do documento"
                >
                  ${EDIT_ICON}
                  <span>Alterar</span>
                </button>

                <button
                  type="button"
                  class="btn btn-danger"
                  @click=${this.clearDocUrl}
                  title="Desvincular documento"
                >
                  ${UNLINK_ICON}
                  <span>Desvincular</span>
                </button>
              `
            : nothing}
        </div>

        ${this._statusMessage ? html`<p style="font-size: 0.85rem; color: #1e8e3e; margin: 8px 0 0;">${this._statusMessage}</p>` : nothing}
        ${this._errorMessage ? html`<p class="error-msg">${this._errorMessage}</p>` : nothing}

        ${this.showPreview
          ? html`
              <div class="preview-container">
                <iframe
                  class="preview-frame"
                  src=${buildGoogleDocUrl(docId, { preview: true })}
                  title="Prévia do Google Docs"
                  loading="lazy"
                ></iframe>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

/** Alias registration for consistency with FzlLit conventions. */
@customElement('fzl-lit-google-doc-editor')
export class FzlLitGoogleDocEditor extends FzlGoogleDocEditor {}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-google-doc-editor': FzlGoogleDocEditor;
    'fzl-lit-google-doc-editor': FzlLitGoogleDocEditor;
  }
}
