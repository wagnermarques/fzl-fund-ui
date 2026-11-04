/**
 * Focus tracking, active widget stack, and focus restoration across Shadow DOM.
 *
 * Inspired by Dijit's focus manager (`dijit/focus`), adapted for Shadow DOM
 * `activeElement` traversal and Custom Elements.
 */

import { fzlRegistry, type FzlRegistrableWidget } from './registry';

export type FzlFocusSubscriber = (
  activeNode: HTMLElement | null,
  activeStack: FzlRegistrableWidget[]
) => void;

class FzlFocusManager {
  private _curNode: HTMLElement | null = null;
  private _activeStack: FzlRegistrableWidget[] = [];
  private _subscribers = new Set<FzlFocusSubscriber>();
  private _listening = false;

  /**
   * The deepest currently focused HTMLElement (piercing Shadow DOM).
   */
  get curNode(): HTMLElement | null {
    if (typeof document !== 'undefined') {
      const deep = this.getDeepActiveElement();
      if (deep) this._curNode = deep;
    }
    return this._curNode;
  }

  /**
   * Stack of active widgets from outer ancestor widget to innermost focused widget.
   */
  get activeStack(): readonly FzlRegistrableWidget[] {
    return this._activeStack;
  }

  /**
   * Traverses `document.activeElement` and nested `shadowRoot.activeElement`
   * to return the actual focused element.
   */
  getDeepActiveElement(root: Document | ShadowRoot | null = typeof document !== 'undefined' ? document : null): HTMLElement | null {
    if (!root || !root.activeElement) return null;
    let active: Element | null = root.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return (typeof HTMLElement !== 'undefined' && active instanceof HTMLElement) ? active : null;
  }

  /**
   * Programmatically focuses a target element or widget and updates the active stack.
   */
  focus(target: HTMLElement | FzlRegistrableWidget | null | undefined, options?: FocusOptions): void {
    if (!target) return;
    const el = 'hostElement' in target ? target.hostElement : target;
    if (typeof el.focus === 'function') {
      el.focus(options);
      this._onFocusNode(this.getDeepActiveElement() ?? el);
    }
  }

  /**
   * Captures a function that restores focus to the currently focused element
   * or a fallback selector within a root container (useful after DOM re-renders or list reordering).
   */
  bookmarkFocus(root?: ParentNode | null, fallbackSelector?: string): () => void {
    const previous = this.getDeepActiveElement();
    return () => {
      if (previous && previous.isConnected && typeof previous.focus === 'function') {
        previous.focus();
        return;
      }
      if (root && fallbackSelector) {
        const replacement = root.querySelector<HTMLElement>(fallbackSelector);
        if (replacement && typeof replacement.focus === 'function') {
          replacement.focus();
        }
      }
    };
  }

  /**
   * Subscribes to changes in the active node and widget stack.
   * Returns an unsubscribe function.
   */
  subscribe(listener: FzlFocusSubscriber): () => void {
    this._ensureGlobalListeners();
    this._subscribers.add(listener);
    return () => {
      this._subscribers.delete(listener);
    };
  }

  /**
   * Notifies the focus manager that a node inside a widget gained focus.
   */
  notifyFocus(node: HTMLElement | null): void {
    this._onFocusNode(node);
  }

  private _ensureGlobalListeners(): void {
    if (this._listening || typeof document === 'undefined') return;
    this._listening = true;

    document.addEventListener(
      'focusin',
      (e: FocusEvent) => {
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        const target = (path[0] instanceof HTMLElement ? path[0] : (e.target as HTMLElement)) || null;
        this._onFocusNode(target);
      },
      true
    );

    document.addEventListener(
      'focusout',
      (e: FocusEvent) => {
        if (!e.relatedTarget) {
          this._onFocusNode(null);
        }
      },
      true
    );
  }

  private _onFocusNode(node: HTMLElement | null): void {
    this._curNode = node;
    const newStack = this._computeWidgetStack(node);
    this._activeStack = newStack;
    for (const sub of this._subscribers) {
      sub(this._curNode, this._activeStack);
    }
  }

  private _computeWidgetStack(node: Node | null): FzlRegistrableWidget[] {
    const stack: FzlRegistrableWidget[] = [];
    let current: Node | null = node;
    while (current) {
      if (typeof HTMLElement !== 'undefined' && current instanceof HTMLElement) {
        const widget = fzlRegistry.byNode(current);
        if (widget && !stack.includes(widget)) {
          stack.unshift(widget);
        }
      }
      if (current.parentNode) {
        current = current.parentNode;
      } else if (typeof ShadowRoot !== 'undefined' && current instanceof ShadowRoot) {
        current = current.host;
      } else {
        break;
      }
    }
    return stack;
  }
}

export const fzlFocus = new FzlFocusManager();
