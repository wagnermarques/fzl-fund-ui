import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetController, addTypematicListener } from '@fzl/core';

// Angular's AOT compiler requires `styles` to be static, and fzlDesignTokensCss is
// built at runtime from the token map (NG1010). It is adopted into the shadow root
// instead; one sheet is shared by every instance.
let tokensSheet: CSSStyleSheet | undefined;

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
 * @attr {boolean} [typematic=false] - Enables typematic repeat firing of `fzl-click` while held down
 *
 * @fires {CustomEvent<{ originalEvent: MouseEvent | KeyboardEvent; repeatCount?: number }>} fzl-click - Dispatched when the button is activated
 * @fires {CustomEvent<{ widgetId: string; originalEvent: FocusEvent }>} fzl-focus - Dispatched when the widget gains focus
 * @fires {CustomEvent<{ widgetId: string; originalEvent: FocusEvent }>} fzl-blur - Dispatched when the widget loses focus
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
export class FzlNgButtonComponent implements OnInit, OnChanges, OnDestroy {
  readonly fzlWidget: FzlWidgetController;
  private _typematicCleanup: (() => void) | null = null;
  private _lastTypematicTick = false;

  constructor(private readonly _host: ElementRef<HTMLElement>) {
    this.fzlWidget = new FzlWidgetController(_host.nativeElement);
    // ShadowDom encapsulation attaches the shadow root before the component is created.
    const root = _host.nativeElement.shadowRoot;
    if (!root) return;
    if (!tokensSheet) {
      tokensSheet = new CSSStyleSheet();
      tokensSheet.replaceSync(fzlDesignTokensCss);
    }
    root.adoptedStyleSheets = [tokensSheet, ...root.adoptedStyleSheets];
  }

  @Input() variant: FzlButtonVariant = 'primary';
  @Input() size: FzlButtonSize = 'md';
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() typematic: boolean | string = false;

  @Output('fzl-click') fzlClick = new EventEmitter<{ originalEvent: MouseEvent | KeyboardEvent; repeatCount?: number }>();

  get isTypematic(): boolean {
    if (typeof this.typematic === 'string') return this.typematic !== 'false';
    return Boolean(this.typematic);
  }

  ngOnInit(): void {
    this.fzlWidget.connect();
    this._syncTypematic();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['typematic']) {
      this._syncTypematic();
    }
  }

  ngOnDestroy(): void {
    if (this._typematicCleanup) {
      this._typematicCleanup();
      this._typematicCleanup = null;
    }
    this.fzlWidget.disconnect();
  }

  private _syncTypematic(): void {
    if (this._typematicCleanup) {
      this._typematicCleanup();
      this._typematicCleanup = null;
    }
    if (!this.isTypematic) return;
    const btn = this._host.nativeElement.shadowRoot?.querySelector('button');
    if (!btn) return;
    this._typematicCleanup = addTypematicListener(btn, (count, event) => {
      if (this.disabled) return;
      this._lastTypematicTick = true;
      this.fzlClick.emit({ originalEvent: event, repeatCount: count });
    });
  }

  onClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (this.isTypematic && this._lastTypematicTick) {
      this._lastTypematicTick = false;
      return;
    }
    this.fzlClick.emit({ originalEvent: event });
  }
}
