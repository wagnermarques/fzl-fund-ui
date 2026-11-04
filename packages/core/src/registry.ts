/**
 * Central widget instance registry for FZL Web Components.
 *
 * Inspired by Dijit's widget registry (`dijit/registry`), adapted for
 * Custom Elements v1 and Shadow DOM boundaries.
 */

export interface FzlRegistrableWidget {
  /** Unique widget identifier (defaults to host `id` or auto-generated `fzl_widget_N`) */
  widgetId: string;
  /** The host HTMLElement for this widget */
  readonly hostElement: HTMLElement;
}

class FzlWidgetRegistry {
  private _widgets = new Map<string, FzlRegistrableWidget>();
  private _hostToWidget = new WeakMap<HTMLElement, FzlRegistrableWidget>();
  private _typeCounters = new Map<string, number>();

  /**
   * Generates a unique ID for a widget based on its tag or type name.
   */
  getUniqueId(prefix: string = 'fzl_widget'): string {
    const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    let count = this._typeCounters.get(cleanPrefix) ?? 0;
    let candidate = `${cleanPrefix}_${count}`;
    while (this._widgets.has(candidate) || (typeof document !== 'undefined' && document.getElementById(candidate))) {
      count++;
      candidate = `${cleanPrefix}_${count}`;
    }
    this._typeCounters.set(cleanPrefix, count + 1);
    return candidate;
  }

  /**
   * Registers a widget instance. If the host element has an `id` attribute,
   * it is used as `widgetId`; otherwise a unique ID is assigned.
   */
  add(widget: FzlRegistrableWidget): string {
    const host = widget.hostElement;
    if (!widget.widgetId) {
      const existingId = host.getAttribute('id');
      widget.widgetId = existingId || this.getUniqueId(host.tagName || 'fzl_widget');
    }
    if (!host.getAttribute('data-fzl-widget-id')) {
      host.setAttribute('data-fzl-widget-id', widget.widgetId);
    }
    this._widgets.set(widget.widgetId, widget);
    this._hostToWidget.set(host, widget);
    return widget.widgetId;
  }

  /**
   * Removes a widget by its `widgetId` or host element.
   */
  remove(idOrHost: string | HTMLElement): void {
    if (typeof idOrHost === 'string') {
      const widget = this._widgets.get(idOrHost);
      if (widget) {
        this._hostToWidget.delete(widget.hostElement);
        this._widgets.delete(idOrHost);
      }
    } else {
      const widget = this._hostToWidget.get(idOrHost);
      if (widget) {
        this._widgets.delete(widget.widgetId);
        this._hostToWidget.delete(idOrHost);
      }
    }
  }

  /**
   * Retrieves a registered widget by its `widgetId`.
   */
  byId<T extends FzlRegistrableWidget = FzlRegistrableWidget>(id: string): T | undefined {
    return this._widgets.get(id) as T | undefined;
  }

  /**
   * Retrieves a registered widget associated with a specific host DOM node.
   */
  byNode<T extends FzlRegistrableWidget = FzlRegistrableWidget>(node: Node | null | undefined): T | undefined {
    if (!node || typeof HTMLElement === 'undefined') return undefined;
    if (node instanceof HTMLElement) {
      const direct = this._hostToWidget.get(node);
      if (direct) return direct as T;
      const idAttr = node.getAttribute('data-fzl-widget-id') || node.id;
      if (idAttr && this._widgets.has(idAttr)) {
        return this._widgets.get(idAttr) as T;
      }
    }
    return undefined;
  }

  /**
   * Walks up the DOM and Shadow DOM tree (`parentNode` / `ShadowRoot.host`)
   * to find the nearest enclosing FZL widget.
   */
  getEnclosingWidget<T extends FzlRegistrableWidget = FzlRegistrableWidget>(
    node: Node | null | undefined
  ): T | undefined {
    let current: Node | null | undefined = node;
    while (current) {
      if (typeof HTMLElement !== 'undefined' && current instanceof HTMLElement) {
        const match = this.byNode<T>(current);
        if (match) return match;
      }
      if (current.parentNode) {
        current = current.parentNode;
      } else if (typeof ShadowRoot !== 'undefined' && current instanceof ShadowRoot) {
        current = current.host;
      } else {
        break;
      }
    }
    return undefined;
  }

  /**
   * Returns all registered widgets underneath `root` (including inside Shadow roots).
   */
  findWidgets(root?: ParentNode | null): FzlRegistrableWidget[] {
    if (!root) {
      return Array.from(this._widgets.values());
    }
    const results: FzlRegistrableWidget[] = [];
    for (const widget of this._widgets.values()) {
      if (this._isDescendantOf(widget.hostElement, root)) {
        results.push(widget);
      }
    }
    return results;
  }

  /**
   * Returns all currently registered widgets as an array.
   */
  toArray(): FzlRegistrableWidget[] {
    return Array.from(this._widgets.values());
  }

  /**
   * Number of currently registered widgets.
   */
  get length(): number {
    return this._widgets.size;
  }

  /**
   * Clears all registered widgets (primarily for unit testing).
   */
  clear(): void {
    this._widgets.clear();
    this._typeCounters.clear();
  }

  private _isDescendantOf(node: Node, root: ParentNode): boolean {
    let current: Node | null = node;
    while (current) {
      if (current === root) return true;
      if (current.parentNode) {
        current = current.parentNode;
      } else if (typeof ShadowRoot !== 'undefined' && current instanceof ShadowRoot) {
        current = current.host;
      } else {
        break;
      }
    }
    return false;
  }
}

export const fzlRegistry = new FzlWidgetRegistry();
