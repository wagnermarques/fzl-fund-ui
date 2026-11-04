/**
 * Infrastructure Widget Mixins & Controllers for FZL Web Components.
 *
 * Inspired by Dijit's infrastructure widgets (`_WidgetBase`, `_CssStateMixin`,
 * `_FocusMixin`, `_KeyNavContainer`), adapted for Custom Elements v1 (Vanilla ES6,
 * LitElement, and Angular Elements).
 */

import { fzlRegistry, type FzlRegistrableWidget } from './registry';
import { fzlFocus } from './focus';
import { fzlA11y } from './a11y';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;

export type FzlCleanupHandle = (() => void) | { remove(): void } | { disconnect(): void };

export interface FzlWidgetLifecycleElement extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
}

/**
 * Controller that manages a single widget's lifecycle, registry entry,
 * owned cleanup handles, CSS interaction states, and focus tracking.
 *
 * Can be used directly inside Angular Elements components or wrapped by
 * `FzlWidgetMixin` for Vanilla ES6 and Lit Custom Elements.
 */
export class FzlWidgetController implements FzlRegistrableWidget {
  widgetId: string = '';
  readonly hostElement: HTMLElement;
  private _handles: Array<() => void> = [];
  private _hovered = false;
  private _active = false;
  private _focused = false;
  private _cssStateCleanup: (() => void) | null = null;

  constructor(hostElement: HTMLElement) {
    this.hostElement = hostElement;
  }

  /**
   * Registers the widget in `fzlRegistry`, syncs accessibility attributes,
   * and attaches CSS state & focus listeners.
   */
  connect(options: { trackCssState?: boolean; trackFocus?: boolean } = {}): void {
    fzlRegistry.add(this);
    fzlA11y.syncHostA11yState(this.hostElement);

    if (options.trackCssState !== false || options.trackFocus !== false) {
      this._attachInteractionListeners();
    }
  }

  /**
   * Unregisters the widget from `fzlRegistry` and runs all owned cleanup handles.
   */
  disconnect(): void {
    if (this._cssStateCleanup) {
      this._cssStateCleanup();
      this._cssStateCleanup = null;
    }
    while (this._handles.length > 0) {
      const cleanup = this._handles.pop();
      try {
        cleanup?.();
      } catch {
        // Ignore cleanup errors on destroy
      }
    }
    fzlRegistry.remove(this.hostElement);
  }

  /**
   * Registers one or more cleanup callbacks, AbortControllers, or Observers
   * to be automatically cleaned up when the widget disconnects (`dijit/_WidgetBase.own`).
   */
  own(...handles: FzlCleanupHandle[]): void {
    for (const handle of handles) {
      if (typeof handle === 'function') {
        this._handles.push(handle);
      } else if (handle && typeof (handle as { remove(): void }).remove === 'function') {
        this._handles.push(() => (handle as { remove(): void }).remove());
      } else if (handle && typeof (handle as { disconnect(): void }).disconnect === 'function') {
        this._handles.push(() => (handle as { disconnect(): void }).disconnect());
      }
    }
  }

  /**
   * Dispatches a composed, bubbling CustomEvent from the host element.
   */
  emit<T>(
    eventName: string,
    detail: T,
    options: { bubbles?: boolean; composed?: boolean; cancelable?: boolean } = {}
  ): boolean {
    const event = new CustomEvent<T>(eventName, {
      detail,
      bubbles: options.bubbles ?? true,
      composed: options.composed ?? true,
      cancelable: options.cancelable ?? false,
    });
    return this.hostElement.dispatchEvent(event);
  }

  get hovered(): boolean {
    return this._hovered;
  }

  get active(): boolean {
    return this._active;
  }

  get focused(): boolean {
    return this._focused;
  }

  private _isDisabled(): boolean {
    return (
      this.hostElement.hasAttribute('disabled') &&
      this.hostElement.getAttribute('disabled') !== 'false'
    );
  }

  private _attachInteractionListeners(): void {
    if (this._cssStateCleanup) return;
    const host = this.hostElement;

    const onPointerEnter = () => {
      if (this._isDisabled()) return;
      this._hovered = true;
      host.setAttribute('data-fzl-hovered', '');
    };

    const onPointerLeave = () => {
      this._hovered = false;
      this._active = false;
      host.removeAttribute('data-fzl-hovered');
      host.removeAttribute('data-fzl-active');
    };

    const onPointerDown = () => {
      if (this._isDisabled()) return;
      this._active = true;
      host.setAttribute('data-fzl-active', '');
    };

    const onPointerUp = () => {
      this._active = false;
      host.removeAttribute('data-fzl-active');
    };

    const onFocusIn = (e: FocusEvent) => {
      const wasFocused = this._focused;
      this._focused = true;
      host.setAttribute('data-fzl-focused', '');
      const deepTarget = fzlFocus.getDeepActiveElement() ?? (e.target as HTMLElement);
      fzlFocus.notifyFocus(deepTarget);
      if (!wasFocused) {
        this.emit('fzl-focus', { widgetId: this.widgetId, originalEvent: e });
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as Node | null;
      if (related && (host.contains(related) || host.shadowRoot?.contains(related))) {
        return;
      }
      this._focused = false;
      this._active = false;
      host.removeAttribute('data-fzl-focused');
      host.removeAttribute('data-fzl-active');
      this.emit('fzl-blur', { widgetId: this.widgetId, originalEvent: e });
    };

    host.addEventListener('pointerenter', onPointerEnter);
    host.addEventListener('pointerleave', onPointerLeave);
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('focusin', onFocusIn);
    host.addEventListener('focusout', onFocusOut);

    this._cssStateCleanup = () => {
      host.removeEventListener('pointerenter', onPointerEnter);
      host.removeEventListener('pointerleave', onPointerLeave);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('focusin', onFocusIn);
      host.removeEventListener('focusout', onFocusOut);
    };
  }
}

export interface FzlWidgetInterface extends FzlRegistrableWidget {
  readonly fzlWidget: FzlWidgetController;
  own(...handles: FzlCleanupHandle[]): void;
  emit<T>(
    eventName: string,
    detail: T,
    options?: { bubbles?: boolean; composed?: boolean; cancelable?: boolean }
  ): boolean;
  connectedCallback(): void;
  disconnectedCallback(): void;
}

/**
 * Class Mixin providing `_WidgetBase`, `_CssStateMixin`, and `_FocusMixin` capabilities
 * to any `HTMLElement` or `LitElement` subclass.
 */
export function FzlWidgetMixin<TBase extends Constructor<FzlWidgetLifecycleElement>>(
  Base: TBase
): TBase & Constructor<FzlWidgetInterface> {
  class FzlWidgetMixed extends Base implements FzlWidgetInterface {
    private _fzlController?: FzlWidgetController;

    get fzlWidget(): FzlWidgetController {
      if (!this._fzlController) {
        this._fzlController = new FzlWidgetController(this);
      }
      return this._fzlController;
    }

    get widgetId(): string {
      return this.fzlWidget.widgetId;
    }

    set widgetId(val: string) {
      this.fzlWidget.widgetId = val;
    }

    get hostElement(): HTMLElement {
      return this;
    }

    own(...handles: FzlCleanupHandle[]): void {
      this.fzlWidget.own(...handles);
    }

    emit<T>(
      eventName: string,
      detail: T,
      options?: { bubbles?: boolean; composed?: boolean; cancelable?: boolean }
    ): boolean {
      return this.fzlWidget.emit(eventName, detail, options);
    }

    override connectedCallback(): void {
      super.connectedCallback?.();
      this.fzlWidget.connect();
    }

    override disconnectedCallback(): void {
      this.fzlWidget.disconnect();
      super.disconnectedCallback?.();
    }
  }

  return FzlWidgetMixed;
}

/**
 * Keyboard Navigation Container controller (`dijit/_KeyNavContainer`).
 *
 * Implements WAI-ARIA roving tabindex (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`,
 * `Home`, `End`) across a dynamic set of navigable child elements inside a widget.
 */
export interface FzlKeyNavOptions {
  /** Returns the ordered array of navigable child HTMLElements */
  getItems: () => HTMLElement[];
  /** Navigation orientation: 'horizontal' | 'vertical' | 'both' (default: 'both') */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Whether arrow navigation wraps around from last to first and vice-versa (default: true) */
  wrap?: boolean;
  /** Whether to manage roving tabindex="0" / "-1" on items (default: true) */
  rovingTabIndex?: boolean;
}

export class FzlKeyNavController {
  private _focusedIndex = 0;
  private _host: HTMLElement;
  private _options: FzlKeyNavOptions;

  constructor(host: HTMLElement, options: FzlKeyNavOptions) {
    this._host = host;
    this._options = options;
  }

  get focusedIndex(): number {
    return this._focusedIndex;
  }

  set focusedIndex(index: number) {
    this._focusedIndex = Math.max(0, index);
    this.syncTabIndices();
  }

  /**
   * Synchronizes `tabindex="0"` on the active item and `tabindex="-1"` on all other items
   * so the container acts as a single tab stop (WAI-ARIA roving tabindex).
   */
  syncTabIndices(): void {
    if (this._options.rovingTabIndex === false) return;
    const items = this._options.getItems();
    if (items.length === 0) return;

    if (this._focusedIndex >= items.length) {
      this._focusedIndex = items.length - 1;
    }
    if (this._focusedIndex < 0) {
      this._focusedIndex = 0;
    }

    items.forEach((item, idx) => {
      item.setAttribute('tabindex', idx === this._focusedIndex ? '0' : '-1');
    });
  }

  /**
   * Focuses the child item at `index` and updates roving tabindex.
   */
  focusItem(index: number): HTMLElement | null {
    const items = this._options.getItems();
    if (items.length === 0) return null;

    const wrap = this._options.wrap ?? true;
    let targetIdx = index;
    if (wrap) {
      targetIdx = ((index % items.length) + items.length) % items.length;
    } else {
      targetIdx = Math.max(0, Math.min(index, items.length - 1));
    }

    this._focusedIndex = targetIdx;
    this.syncTabIndices();
    const target = items[targetIdx];
    if (target) {
      fzlFocus.focus(target);
    }
    return target ?? null;
  }

  /**
   * Handles `keydown` events for arrow navigation, `Home`, and `End`.
   * Returns `true` if the key was handled.
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    // Do not intercept arrow keys inside text inputs or selects
    const composedTarget = (event.composedPath?.()[0] ?? event.target) as HTMLElement | null;
    if (
      composedTarget &&
      (composedTarget.tagName === 'INPUT' ||
        composedTarget.tagName === 'TEXTAREA' ||
        composedTarget.tagName === 'SELECT')
    ) {
      return false;
    }

    const items = this._options.getItems();
    if (items.length === 0) return false;

    const orientation = this._options.orientation ?? 'both';
    const isRtl = fzlA11y.getEffectiveDir(this._host) === 'rtl';

    // Determine which item currently holds or contains focus
    const activeEl = fzlFocus.getDeepActiveElement();
    const currentIdx = items.findIndex((item) => item === activeEl || item.contains(activeEl));
    if (currentIdx !== -1) {
      this._focusedIndex = currentIdx;
    }

    const prevHoriz = isRtl ? 'ArrowRight' : 'ArrowLeft';
    const nextHoriz = isRtl ? 'ArrowLeft' : 'ArrowRight';

    switch (event.key) {
      case prevHoriz:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          this.focusItem(this._focusedIndex - 1);
          return true;
        }
        break;
      case nextHoriz:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          this.focusItem(this._focusedIndex + 1);
          return true;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          this.focusItem(this._focusedIndex - 1);
          return true;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          this.focusItem(this._focusedIndex + 1);
          return true;
        }
        break;
      case 'Home':
        event.preventDefault();
        this.focusItem(0);
        return true;
      case 'End':
        event.preventDefault();
        this.focusItem(items.length - 1);
        return true;
    }

    return false;
  }
}
