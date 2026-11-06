import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import './text-input.component';
import './number-input.component';
import './select.component';
import './checkbox.component';

/**
 * Form Container Component inspired by Dijit `dijit/form/Form`.
 *
 * Scans child controls, manages collective form validation, values serialization,
 * dirty state checking, and submission events.
 *
 * @customElement fzl-form
 * @tag fzl-form
 */
export class FzlForm extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }

      form {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
    `
  ];

  @property({ type: String }) name = '';

  private _initialValues: Record<string, any> = {};

  private _getControlElements(): HTMLElement[] {
    const selector = 'fzl-text-input, fzl-number-input, fzl-select, fzl-checkbox, input, select, textarea';
    const light = Array.from(this.querySelectorAll<HTMLElement>(selector));
    const shadow = this.shadowRoot ? Array.from(this.shadowRoot.querySelectorAll<HTMLElement>(selector)) : [];
    return [...light, ...shadow];
  }

  getValues(): Record<string, any> {
    const values: Record<string, any> = {};
    const controls = this._getControlElements();

    for (const el of controls) {
      const name = (el as any).name || el.getAttribute('name');
      if (!name) continue;

      const tag = el.tagName.toLowerCase();
      if (tag === 'fzl-checkbox' || ('checked' in el && (el as HTMLInputElement).type === 'checkbox')) {
        values[name] = Boolean((el as any).checked || el.hasAttribute('checked'));
      } else if ('value' in el && (el as any).value !== undefined) {
        values[name] = (el as any).value;
      } else {
        const attrVal = el.getAttribute('value');
        if (attrVal !== null) values[name] = attrVal;
      }
    }
    return values;
  }

  setValues(data: Record<string, any>): void {
    const controls = this._getControlElements();

    for (const el of controls) {
      const name = (el as any).name || el.getAttribute('name');
      if (!name || !(name in data)) continue;

      const val = data[name];
      const tag = el.tagName.toLowerCase();
      if (tag === 'fzl-checkbox' || ('checked' in el && (el as HTMLInputElement).type === 'checkbox')) {
        (el as any).checked = Boolean(val);
        if (val) {
          el.setAttribute('checked', '');
        } else {
          el.removeAttribute('checked');
        }
      } else if ('value' in el) {
        (el as any).value = val;
      }
    }
  }

  validate(): boolean {
    const controls = this._getControlElements();
    let allValid = true;

    for (const el of controls) {
      if (typeof (el as any).validate === 'function') {
        const valid = (el as any).validate();
        if (!valid) allValid = false;
      } else if (typeof (el as any).checkValidity === 'function') {
        const valid = (el as any).checkValidity();
        if (!valid) allValid = false;
      }
    }
    return allValid;
  }

  reset(): void {
    const controls = this._getControlElements();
    for (const el of controls) {
      if (typeof (el as any).reset === 'function') {
        (el as any).reset();
      } else if ('value' in el) {
        (el as any).value = '';
      }
    }
  }

  isDirty(): boolean {
    const current = this.getValues();
    const keys = new Set([...Object.keys(current), ...Object.keys(this._initialValues)]);
    for (const key of keys) {
      if (current[key] !== this._initialValues[key]) {
        return true;
      }
    }
    return false;
  }

  private _handleSubmit(e: Event): void {
    e.preventDefault();
    if (this.validate()) {
      const values = this.getValues();
      this.emit('fzl-submit', values);
    }
  }

  override render() {
    return html`
      <form
        name=${this.name}
        @submit=${this._handleSubmit}
        @fzl-change=${(e: CustomEvent) => {
          this.emit('fzl-change', {
            detail: e.detail,
            values: this.getValues(),
          });
        }}
      >
        <slot></slot>
      </form>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-form')) {
  customElements.define('fzl-form', FzlForm);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-form': FzlForm;
  }
}
