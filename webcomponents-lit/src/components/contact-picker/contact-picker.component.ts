import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  FzlContact,
  FzlContactProperty,
  isContactPickerSupported,
  parseVCard,
} from './contact-picker.types';

export * from './contact-picker.types';

export interface FzlContactSelectDetail {
  contacts: FzlContact[];
  isNative: boolean;
}

export interface FzlContactRemoveDetail {
  contact: FzlContact;
  remaining: FzlContact[];
}

export interface FzlContactErrorDetail {
  error: string;
  originalError?: any;
}

/**
 * Mobile-first Contact Picker Web Component (`fzl-contact-picker`).
 *
 * Integrates natively with the W3C Contact Picker API (`navigator.contacts.select`)
 * on supported mobile devices (e.g. Android Chrome), and provides a polished,
 * accessible fallback UI with vCard (.vcf) import and manual contact entry
 * for desktop or unsupported environments.
 *
 * @customElement fzl-contact-picker
 * @tag fzl-contact-picker
 *
 * @attr {boolean} [multiple=false] - Whether multiple contacts can be chosen
 * @attr {string} [properties='name,tel,email'] - Comma-separated list of properties to query ('name', 'tel', 'email', 'address', 'icon')
 * @attr {string} [button-label='Selecionar Contato'] - Text for the primary trigger button
 * @attr {boolean} [allow-import-vcard=true] - Whether to allow importing contacts from .vcf files
 * @attr {boolean} [allow-manual-add=true] - Whether to allow manual contact addition in fallback mode
 * @attr {boolean} [disabled=false] - Disables interaction
 * @attr {boolean} [readonly=false] - Read-only mode showing existing contacts without edit actions
 *
 * @fires {CustomEvent<FzlContactSelectDetail>} fzl-contact-select - Dispatched when one or more contacts are selected
 * @fires {CustomEvent<FzlContactRemoveDetail>} fzl-contact-remove - Dispatched when a contact is removed from the selection
 * @fires {CustomEvent<FzlContactErrorDetail>} fzl-contact-error - Dispatched when an error occurs during selection
 *
 * @csspart container - The root container
 * @csspart trigger-btn - The main trigger button
 * @csspart contacts-list - The selected contacts list container
 * @csspart contact-card - Each individual contact card
 * @csspart modal - The fallback modal dialog
 */
export class FzlContactPicker extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: inherit;
      }

      .fzl-contact-picker-root {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3, 12px);
        width: 100%;
      }

      .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2, 8px);
      }

      .actions-group {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2, 8px);
        flex-wrap: wrap;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        font-weight: 500;
        border-radius: var(--_fzl-radius-md, 6px);
        cursor: pointer;
        transition: all var(--_fzl-transition-fast, 150ms);
        border: 1px solid transparent;
        text-decoration: none;
        outline: none;
      }

      .btn:focus-visible {
        box-shadow: var(--_fzl-focus-ring);
      }

      .btn-primary {
        background-color: var(--_fzl-color-primary, #0284c7);
        color: #ffffff;
      }

      .btn-primary:hover:not(:disabled) {
        background-color: var(--_fzl-color-primary-hover, #0369a1);
      }

      .btn-secondary {
        background-color: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #1e293b);
        border-color: var(--_fzl-color-border, #cbd5e1);
      }

      .btn-secondary:hover:not(:disabled) {
        background-color: var(--_fzl-color-surface-hover, #f1f5f9);
        border-color: var(--_fzl-color-primary, #0284c7);
      }

      .btn-sm {
        padding: 4px 8px;
        font-size: var(--_fzl-font-size-xs, 0.775rem);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .api-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--_fzl-font-size-xs, 0.72rem);
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        background: #e0f2fe;
        color: #0369a1;
      }

      .api-badge.native {
        background: #dcfce7;
        color: #166534;
      }

      /* Selected Contacts Grid / List */
      .contacts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--_fzl-space-3, 12px);
        width: 100%;
      }

      .contact-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        background: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 8px);
        box-shadow: var(--_fzl-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
        position: relative;
        transition: transform 150ms ease, box-shadow 150ms ease;
      }

      .contact-card:hover {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .contact-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0284c7, #38bdf8);
        color: #ffffff;
        font-size: 1.1rem;
        font-weight: 600;
        flex-shrink: 0;
        user-select: none;
      }

      .contact-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }

      .contact-info {
        flex: 1;
        min-width: 0;
      }

      .contact-name {
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--_fzl-color-text, #0f172a);
        margin: 0 0 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .contact-org {
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        color: var(--_fzl-color-text-muted, #64748b);
        margin-bottom: 6px;
      }

      .contact-details {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .contact-detail-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        color: var(--_fzl-color-text, #334155);
        word-break: break-all;
      }

      .contact-detail-icon {
        color: #94a3b8;
        font-size: 0.8rem;
        flex-shrink: 0;
      }

      .btn-remove {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.1rem;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        line-height: 1;
        transition: color 150ms, background-color 150ms;
      }

      .btn-remove:hover {
        color: #ef4444;
        background-color: #fee2e2;
      }

      /* Empty State */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        border: 2px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 8px);
        background: var(--_fzl-color-surface-hover, #f8fafc);
        text-align: center;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .empty-icon {
        font-size: 2.2rem;
        margin-bottom: 8px;
      }

      /* Fallback Modal */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
      }

      .modal-dialog {
        background: var(--_fzl-color-surface, #ffffff);
        border-radius: var(--_fzl-radius-lg, 12px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modalIn 200ms ease-out;
      }

      @keyframes modalIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .modal-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        color: var(--_fzl-color-text, #0f172a);
      }

      .modal-body {
        padding: 16px 18px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 18px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border-top: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .form-label {
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        font-weight: 600;
        color: var(--_fzl-color-text, #334155);
      }

      .form-input {
        padding: 8px 12px;
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        font-family: inherit;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        outline: none;
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #0f172a);
        transition: border-color 150ms;
      }

      .form-input:focus {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: var(--_fzl-focus-ring);
      }

      .drop-zone {
        border: 2px dashed #94a3b8;
        border-radius: var(--_fzl-radius-md, 8px);
        padding: 18px;
        text-align: center;
        cursor: pointer;
        background: #f8fafc;
        transition: all 150ms ease;
      }

      .drop-zone:hover, .drop-zone.is-dragover {
        border-color: var(--_fzl-color-primary, #0284c7);
        background: #f0f9ff;
      }

      .drop-zone-icon {
        font-size: 1.8rem;
        margin-bottom: 4px;
      }

      .drop-zone-text {
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        color: #64748b;
      }

      .error-alert {
        padding: 8px 12px;
        background-color: #fee2e2;
        color: #b91c1c;
        border-radius: 6px;
        font-size: var(--_fzl-font-size-xs, 0.775rem);
      }

      .preset-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 6px;
        cursor: pointer;
        transition: background 150ms;
      }

      .preset-item:hover {
        background: #f1f5f9;
        border-color: var(--_fzl-color-primary, #0284c7);
      }
    `,
  ];

  @property({ type: Boolean }) multiple = false;
  @property({ type: String }) properties = 'name,tel,email';
  @property({ type: String, attribute: 'button-label' }) buttonLabel = 'Selecionar Contato';
  @property({ type: Boolean, attribute: 'allow-import-vcard' }) allowImportVcard = true;
  @property({ type: Boolean, attribute: 'allow-manual-add' }) allowManualAdd = true;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;

  @property({ type: Array })
  get selectedContacts(): FzlContact[] {
    return this._selectedContacts;
  }
  set selectedContacts(val: FzlContact[]) {
    const old = this._selectedContacts;
    this._selectedContacts = Array.isArray(val) ? val : [];
    this.requestUpdate('selectedContacts', old);
  }

  @property({ type: Object })
  presetContacts: FzlContact[] | string = [];

  @state() private _selectedContacts: FzlContact[] = [];
  @state() private _isNativeSupported = false;
  @state() private _showModal = false;
  @state() private _modalTab: 'manual' | 'vcard' | 'presets' = 'manual';
  @state() private _manualName = '';
  @state() private _manualTel = '';
  @state() private _manualEmail = '';
  @state() private _manualOrg = '';
  @state() private _errorMessage = '';
  @state() private _isDragOver = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._isNativeSupported = isContactPickerSupported();
  }

  get parsedPresetContacts(): FzlContact[] {
    if (Array.isArray(this.presetContacts)) return this.presetContacts;
    if (typeof this.presetContacts === 'string' && this.presetContacts.trim()) {
      try {
        const parsed = JSON.parse(this.presetContacts);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }

  /**
   * Opens the contact picker (native if supported, otherwise fallback modal).
   */
  async openPicker(): Promise<void> {
    if (this.disabled || this.readonly) return;
    this._errorMessage = '';

    if (this._isNativeSupported) {
      try {
        const rawProps = this.properties
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean) as FzlContactProperty[];

        const supportedProps =
          typeof (navigator as any).contacts?.getProperties === 'function'
            ? await (navigator as any).contacts.getProperties()
            : ['name', 'tel', 'email', 'address', 'icon'];

        const queryProps = rawProps.filter((p) => supportedProps.includes(p));
        const finalProps = queryProps.length > 0 ? queryProps : ['name', 'tel', 'email'];

        const rawResults: any[] = await (navigator as any).contacts.select(finalProps, {
          multiple: this.multiple,
        });

        if (Array.isArray(rawResults) && rawResults.length > 0) {
          const mapped: FzlContact[] = rawResults.map((c, idx) => ({
            id: `native-${Date.now()}-${idx}`,
            name: c.name || [],
            tel: c.tel || [],
            email: c.email || [],
            address: c.address || [],
            icon: c.icon || [],
          }));

          this._addContacts(mapped, true);
        }
      } catch (err: any) {
        // TypeError: AbortError occurs when user cancels native picker
        if (err?.name !== 'AbortError') {
          this._errorMessage = `Erro no seletor nativo: ${err?.message || err}`;
          this.dispatchEvent(
            new CustomEvent<FzlContactErrorDetail>('fzl-contact-error', {
              bubbles: true,
              composed: true,
              detail: { error: this._errorMessage, originalError: err },
            })
          );
        }
      }
    } else {
      // Fallback modal
      this._openModal();
    }
  }

  private _openModal(): void {
    this._errorMessage = '';
    const presets = this.parsedPresetContacts;
    if (presets.length > 0) {
      this._modalTab = 'presets';
    } else if (this.allowManualAdd) {
      this._modalTab = 'manual';
    } else {
      this._modalTab = 'vcard';
    }
    this._showModal = true;
  }

  private _closeModal(): void {
    this._showModal = false;
    this._resetManualForm();
  }

  private _resetManualForm(): void {
    this._manualName = '';
    this._manualTel = '';
    this._manualEmail = '';
    this._manualOrg = '';
    this._errorMessage = '';
  }

  private _addContacts(newContacts: FzlContact[], isNative: boolean): void {
    if (this.multiple) {
      // Prevent duplicates by tel/email or name
      const existingKeys = new Set(
        this._selectedContacts.map(
          (c) => `${c.name?.[0] || ''}-${c.tel?.[0] || ''}-${c.email?.[0] || ''}`
        )
      );

      const toAdd = newContacts.filter(
        (c) => !existingKeys.has(`${c.name?.[0] || ''}-${c.tel?.[0] || ''}-${c.email?.[0] || ''}`)
      );

      this._selectedContacts = [...this._selectedContacts, ...toAdd];
    } else {
      this._selectedContacts = newContacts.slice(0, 1);
    }

    this.dispatchEvent(
      new CustomEvent<FzlContactSelectDetail>('fzl-contact-select', {
        bubbles: true,
        composed: true,
        detail: { contacts: this._selectedContacts, isNative },
      })
    );
  }

  removeContact(id: string): void {
    if (this.readonly || this.disabled) return;
    const removed = this._selectedContacts.find((c) => c.id === id);
    if (!removed) return;

    this._selectedContacts = this._selectedContacts.filter((c) => c.id !== id);

    this.dispatchEvent(
      new CustomEvent<FzlContactRemoveDetail>('fzl-contact-remove', {
        bubbles: true,
        composed: true,
        detail: { contact: removed, remaining: this._selectedContacts },
      })
    );
  }

  clear(): void {
    if (this.readonly || this.disabled) return;
    this._selectedContacts = [];
  }

  private _submitManualContact(): void {
    const name = this._manualName.trim();
    const tel = this._manualTel.trim();
    const email = this._manualEmail.trim();
    const org = this._manualOrg.trim();

    if (!name && !tel && !email) {
      this._errorMessage = 'Preencha ao menos o nome, telefone ou e-mail.';
      return;
    }

    const contact: FzlContact = {
      id: `manual-${Date.now()}`,
      name: name ? [name] : [],
      tel: tel ? [tel] : [],
      email: email ? [email] : [],
      organization: org || undefined,
    };

    this._addContacts([contact], false);
    this._closeModal();
  }

  private async _handleVCardFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.vcf') && file.type !== 'text/vcard') {
      this._errorMessage = 'Formato inválido. Selecione um arquivo vCard (.vcf).';
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseVCard(text);
      if (parsed.length === 0) {
        this._errorMessage = 'Nenhum contato encontrado no arquivo vCard.';
        return;
      }
      this._addContacts(parsed, false);
      this._closeModal();
    } catch (err: any) {
      this._errorMessage = `Erro ao processar vCard: ${err?.message || err}`;
    }
  }

  private _getInitials(name?: string[]): string {
    const n = name?.[0]?.trim();
    if (!n) return '👤';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  override render() {
    return html`
      <div class="fzl-contact-picker-root" part="container">
        <!-- Header & Action Bar -->
        <div class="picker-header">
          <div class="actions-group">
            <button
              type="button"
              class="btn btn-primary"
              part="trigger-btn"
              ?disabled=${this.disabled || this.readonly}
              @click=${this.openPicker}
            >
              <span aria-hidden="true">📇</span>
              ${this.buttonLabel}
            </button>

            ${!this._isNativeSupported && (this.allowImportVcard || this.allowManualAdd)
              ? html`
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    ?disabled=${this.disabled || this.readonly}
                    @click=${this._openModal}
                    title="Adicionar contato manualmente ou importar vCard"
                  >
                    ➕ Adicionar / vCard
                  </button>
                `
              : ''}

            ${this._selectedContacts.length > 0 && !this.readonly
              ? html`
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    ?disabled=${this.disabled}
                    @click=${this.clear}
                    title="Limpar todos os contatos selecionados"
                  >
                    Limpar (${this._selectedContacts.length})
                  </button>
                `
              : ''}
          </div>

          <span
            class="api-badge ${this._isNativeSupported ? 'native' : ''}"
            title="${this._isNativeSupported
              ? 'W3C Contact Picker API nativa ativa neste dispositivo'
              : 'Modo compatibilidade: formulário manual e importação vCard'}"
          >
            ${this._isNativeSupported ? '📱 Agenda Nativa' : '💻 Modo Web / vCard'}
          </span>
        </div>

        <!-- Selected Contacts -->
        ${this._selectedContacts.length > 0
          ? html`
              <div class="contacts-grid" part="contacts-list">
                ${this._selectedContacts.map((contact) => {
                  const name = contact.name?.[0] || 'Contato sem nome';
                  const tel = contact.tel?.[0];
                  const email = contact.email?.[0];
                  const org = contact.organization;

                  return html`
                    <div class="contact-card" part="contact-card">
                      <div class="contact-avatar">
                        ${this._getInitials(contact.name)}
                      </div>

                      <div class="contact-info">
                        <h4 class="contact-name" title="${name}">${name}</h4>
                        ${org ? html`<div class="contact-org">${org}</div>` : ''}

                        <div class="contact-details">
                          ${tel
                            ? html`
                                <div class="contact-detail-item">
                                  <span class="contact-detail-icon">📞</span>
                                  <a href="tel:${tel}" style="color: inherit; text-decoration: none;">
                                    ${tel}
                                  </a>
                                </div>
                              `
                            : ''}
                          ${email
                            ? html`
                                <div class="contact-detail-item">
                                  <span class="contact-detail-icon">✉️</span>
                                  <a href="mailto:${email}" style="color: inherit; text-decoration: none;">
                                    ${email}
                                  </a>
                                </div>
                              `
                            : ''}
                        </div>
                      </div>

                      ${!this.readonly && !this.disabled
                        ? html`
                            <button
                              type="button"
                              class="btn-remove"
                              aria-label="Remover ${name}"
                              title="Remover contato"
                              @click=${() => this.removeContact(contact.id)}
                            >
                              &times;
                            </button>
                          `
                        : ''}
                    </div>
                  `;
                })}
              </div>
            `
          : html`
              <div class="empty-state">
                <span class="empty-icon">📇</span>
                <p style="margin: 0 0 4px 0; font-weight: 500;">Nenhum contato selecionado</p>
                <span style="font-size: 0.8rem;">
                  ${this._isNativeSupported
                    ? 'Toque em "Selecionar Contato" para abrir a agenda do celular.'
                    : 'Clique para escolher contatos da lista, importar vCard ou digitar os dados.'}
                </span>
              </div>
            `}

        <!-- Fallback Modal -->
        ${this._showModal
          ? html`
              <div
                class="modal-backdrop"
                @click=${(e: Event) => {
                  if (e.target === e.currentTarget) this._closeModal();
                }}
              >
                <div
                  class="modal-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-title"
                  part="modal"
                >
                  <div class="modal-header">
                    <h3 class="modal-title" id="modal-title">Selecionar / Adicionar Contato</h3>
                    <button
                      type="button"
                      class="btn-remove"
                      @click=${this._closeModal}
                      aria-label="Fechar"
                    >
                      &times;
                    </button>
                  </div>

                  <div style="display: flex; border-bottom: 1px solid #cbd5e1; background: #f8fafc; padding: 0 16px;">
                    ${this.parsedPresetContacts.length > 0
                      ? html`
                          <button
                            type="button"
                            class="btn"
                            style="border-radius: 0; border-bottom: 2px solid ${this._modalTab === 'presets' ? '#0284c7' : 'transparent'}; background: none; font-size: 0.8rem;"
                            @click=${() => {
                              this._modalTab = 'presets';
                            }}
                          >
                            Lista de Contatos (${this.parsedPresetContacts.length})
                          </button>
                        `
                      : ''}
                    ${this.allowManualAdd
                      ? html`
                          <button
                            type="button"
                            class="btn"
                            style="border-radius: 0; border-bottom: 2px solid ${this._modalTab === 'manual' ? '#0284c7' : 'transparent'}; background: none; font-size: 0.8rem;"
                            @click=${() => {
                              this._modalTab = 'manual';
                            }}
                          >
                            Digitar Contato
                          </button>
                        `
                      : ''}
                    ${this.allowImportVcard
                      ? html`
                          <button
                            type="button"
                            class="btn"
                            style="border-radius: 0; border-bottom: 2px solid ${this._modalTab === 'vcard' ? '#0284c7' : 'transparent'}; background: none; font-size: 0.8rem;"
                            @click=${() => {
                              this._modalTab = 'vcard';
                            }}
                          >
                            Importar vCard (.vcf)
                          </button>
                        `
                      : ''}
                  </div>

                  <div class="modal-body">
                    ${this._errorMessage
                      ? html`<div class="error-alert">${this._errorMessage}</div>`
                      : ''}

                    <!-- Presets Tab -->
                    ${this._modalTab === 'presets'
                      ? html`
                          <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${this.parsedPresetContacts.map((c) => {
                              const name = c.name?.[0] || 'Contato';
                              const tel = c.tel?.[0];
                              const email = c.email?.[0];

                              return html`
                                <div
                                  class="preset-item"
                                  @click=${() => {
                                    this._addContacts([c], false);
                                    this._closeModal();
                                  }}
                                >
                                  <div>
                                    <strong style="font-size: 0.875rem;">${name}</strong>
                                    <div style="font-size: 0.75rem; color: #64748b;">
                                      ${tel ? `📞 ${tel}` : ''} ${email ? `✉️ ${email}` : ''}
                                    </div>
                                  </div>
                                  <span style="font-size: 0.8rem; color: #0284c7;">Selecionar &rarr;</span>
                                </div>
                              `;
                            })}
                          </div>
                        `
                      : ''}

                    <!-- Manual Tab -->
                    ${this._modalTab === 'manual'
                      ? html`
                          <div class="form-group">
                            <label class="form-label">Nome Completo</label>
                            <input
                              type="text"
                              class="form-input"
                              placeholder="ex.: Wagner Marques"
                              .value=${this._manualName}
                              @input=${(e: Event) => {
                                this._manualName = (e.target as HTMLInputElement).value;
                              }}
                            />
                          </div>

                          <div class="form-group">
                            <label class="form-label">Telefone / Celular</label>
                            <input
                              type="tel"
                              class="form-input"
                              placeholder="ex.: +55 (11) 98765-4321"
                              .value=${this._manualTel}
                              @input=${(e: Event) => {
                                this._manualTel = (e.target as HTMLInputElement).value;
                              }}
                            />
                          </div>

                          <div class="form-group">
                            <label class="form-label">E-mail</label>
                            <input
                              type="email"
                              class="form-input"
                              placeholder="ex.: contato@exemplo.com.br"
                              .value=${this._manualEmail}
                              @input=${(e: Event) => {
                                this._manualEmail = (e.target as HTMLInputElement).value;
                              }}
                            />
                          </div>

                          <div class="form-group">
                            <label class="form-label">Organização / Cargo (Opcional)</label>
                            <input
                              type="text"
                              class="form-input"
                              placeholder="ex.: FZL Investimentos"
                              .value=${this._manualOrg}
                              @input=${(e: Event) => {
                                this._manualOrg = (e.target as HTMLInputElement).value;
                              }}
                            />
                          </div>
                        `
                      : ''}

                    <!-- vCard Tab -->
                    ${this._modalTab === 'vcard'
                      ? html`
                          <div
                            class="drop-zone ${this._isDragOver ? 'is-dragover' : ''}"
                            @dragover=${(e: DragEvent) => {
                              e.preventDefault();
                              this._isDragOver = true;
                            }}
                            @dragleave=${() => {
                              this._isDragOver = false;
                            }}
                            @drop=${(e: DragEvent) => {
                              e.preventDefault();
                              this._isDragOver = false;
                              this._handleVCardFiles(e.dataTransfer?.files || null);
                            }}
                            @click=${() => {
                              this.shadowRoot?.getElementById('vcfInput')?.click();
                            }}
                          >
                            <div class="drop-zone-icon">📁</div>
                            <strong style="font-size: 0.875rem;">Clique ou arraste um arquivo .vcf</strong>
                            <div class="drop-zone-text">
                              Suporte a arquivos de exportação da agenda do Google, iPhone/iCloud ou Android.
                            </div>
                            <input
                              type="file"
                              id="vcfInput"
                              accept=".vcf,text/vcard"
                              style="display: none;"
                              @change=${(e: Event) => {
                                this._handleVCardFiles((e.target as HTMLInputElement).files);
                              }}
                            />
                          </div>
                        `
                      : ''}
                  </div>

                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" @click=${this._closeModal}>
                      Cancelar
                    </button>
                    ${this._modalTab === 'manual'
                      ? html`
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            @click=${this._submitManualContact}
                          >
                            Confirmar Contato
                          </button>
                        `
                      : ''}
                  </div>
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

export class FzlLitContactPicker extends FzlContactPicker {}

// Register both custom elements
if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-contact-picker')) {
    customElements.define('fzl-contact-picker', FzlContactPicker);
  }
  if (!customElements.get('fzl-lit-contact-picker')) {
    customElements.define('fzl-lit-contact-picker', FzlLitContactPicker);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-contact-picker': FzlContactPicker;
    'fzl-lit-contact-picker': FzlContactPicker;
  }
}
