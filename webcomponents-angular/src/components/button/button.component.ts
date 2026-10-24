import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { fzlDesignTokensCss } from '@fzl/design-tokens';

export type FzlButtonVariant = 'primary' | 'secondary' | 'danger';
export type FzlButtonSize = 'sm' | 'md' | 'lg';

/**
 * Angular Elements Custom Element button with Shadow DOM encapsulation.
 *
 * @customElement fzl-ng-button
 * @tag fzl-ng-button
 *
 * @attr {'primary' | 'secondary' | 'danger'} [variant='primary'] - Visual appearance variant
 * @attr {'sm' | 'md' | 'lg'} [size='md'] - Size scale of the button
 * @attr {boolean} [disabled=false] - Whether the button is disabled
 * @attr {'button' | 'submit' | 'reset'} [type='button'] - Form button behavior
 *
 * @fires {CustomEvent<{ originalEvent: MouseEvent }>} fzl-click - Dispatched when the button is activated
 *
 * @slot - Content to be displayed inside the button
 *
 * @csspart button - The internal native `<button>` element
 */
@Component({
  selector: 'fzl-ng-button-internal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      part="button"
      [class]="'variant-' + variant + ' size-' + size"
      [type]="type"
      [disabled]="disabled"
      (click)="onClick($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    fzlDesignTokensCss,
    `
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      button {
        font-family: var(--_fzl-font-family);
        font-weight: var(--_fzl-font-weight-medium);
        line-height: var(--_fzl-line-height);
        border: 1px solid transparent;
        border-radius: var(--_fzl-radius-md);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--_fzl-space-2);
        transition: background-color var(--_fzl-transition-fast), border-color var(--_fzl-transition-fast);
        user-select: none;
      }

      button:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
      }

      /* Sizes */
      button.size-sm {
        font-size: var(--_fzl-font-size-xs);
        padding: var(--_fzl-space-1) var(--_fzl-space-2);
      }

      button.size-md {
        font-size: var(--_fzl-font-size-sm);
        padding: var(--_fzl-space-2) var(--_fzl-space-4);
      }

      button.size-lg {
        font-size: var(--_fzl-font-size-md);
        padding: var(--_fzl-space-3) var(--_fzl-space-6);
      }

      /* Variants */
      button.variant-primary {
        background-color: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
      }
      button.variant-primary:hover:not(:disabled) {
        background-color: var(--_fzl-color-primary-hover);
      }
      button.variant-primary:active:not(:disabled) {
        background-color: var(--_fzl-color-primary-active);
      }

      button.variant-secondary {
        background-color: var(--_fzl-color-secondary);
        color: var(--_fzl-color-secondary-contrast);
      }
      button.variant-secondary:hover:not(:disabled) {
        background-color: var(--_fzl-color-secondary-hover);
      }
      button.variant-secondary:active:not(:disabled) {
        background-color: var(--_fzl-color-secondary-active);
      }

      button.variant-danger {
        background-color: var(--_fzl-color-danger);
        color: var(--_fzl-color-danger-contrast);
      }
      button.variant-danger:hover:not(:disabled) {
        background-color: var(--_fzl-color-danger-hover);
      }

      /* Disabled */
      button:disabled {
        background-color: var(--_fzl-color-disabled-bg);
        color: var(--_fzl-color-disabled-text);
        cursor: not-allowed;
        border-color: transparent;
      }
    `
  ]
})
export class FzlNgButtonComponent {
  @Input() variant: FzlButtonVariant = 'primary';
  @Input() size: FzlButtonSize = 'md';
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Output('fzl-click') fzlClick = new EventEmitter<{ originalEvent: MouseEvent }>();

  onClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.fzlClick.emit({ originalEvent: event });
  }
}
