/**
 * Accessibility (a11y) & High-Contrast detection utilities for FZL Web Components.
 *
 * Inspired by Dijit's accessibility (`dijit/a11y`) and high-contrast detection
 * (`dijit/hccss`), adapted for Shadow DOM and modern CSS media queries.
 */

export interface FzlA11yEnvironment {
  /** True when OS/browser forced-colors or high-contrast mode is active */
  highContrast: boolean;
  /** True when user prefers reduced motion */
  reducedMotion: boolean;
  /** Effective text direction ('ltr' or 'rtl') */
  dir: 'ltr' | 'rtl';
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

class FzlA11yManager {
  /**
   * Detects whether High Contrast / Forced Colors mode is active (`forced-colors: active` or `prefers-contrast: more`),
   * or whether `document.documentElement` has a high-contrast theme attribute (`data-theme="high-contrast"`).
   */
  isHighContrast(): boolean {
    if (typeof window === 'undefined') return false;
    if (typeof document !== 'undefined') {
      const theme = document.documentElement?.getAttribute('data-theme');
      if (theme && theme.includes('contrast')) return true;
    }
    if (typeof window.matchMedia === 'function') {
      return (
        window.matchMedia('(forced-colors: active)').matches ||
        window.matchMedia('(prefers-contrast: more)').matches
      );
    }
    return false;
  }

  /**
   * Detects whether the user has requested reduced motion (`prefers-reduced-motion: reduce`).
   */
  prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    if (typeof document !== 'undefined') {
      if (document.documentElement?.hasAttribute('data-reduced-motion')) return true;
    }
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  /**
   * Resolves the effective text direction (`ltr` or `rtl`) for an element,
   * walking up its ancestors / document root.
   */
  getEffectiveDir(element?: HTMLElement | null): 'ltr' | 'rtl' {
    let current: Node | null | undefined = element;
    while (current) {
      if (typeof HTMLElement !== 'undefined' && current instanceof HTMLElement) {
        const dirAttr = current.getAttribute('dir')?.toLowerCase();
        if (dirAttr === 'rtl' || dirAttr === 'ltr') {
          return dirAttr;
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
    if (typeof document !== 'undefined' && document.documentElement?.dir === 'rtl') {
      return 'rtl';
    }
    return 'ltr';
  }

  /**
   * Synchronizes host accessibility context (`data-fzl-hc`, `data-fzl-reduced-motion`, `dir`)
   * on a widget host element.
   */
  syncHostA11yState(host: HTMLElement): FzlA11yEnvironment {
    const highContrast = this.isHighContrast() || host.hasAttribute('data-fzl-hc');
    const reducedMotion = this.prefersReducedMotion() || host.hasAttribute('data-fzl-reduced-motion');
    const dir = this.getEffectiveDir(host);

    if (highContrast) {
      host.setAttribute('data-fzl-hc', '');
    } else {
      host.removeAttribute('data-fzl-hc');
    }

    if (reducedMotion) {
      host.setAttribute('data-fzl-reduced-motion', '');
    } else {
      host.removeAttribute('data-fzl-reduced-motion');
    }

    return { highContrast, reducedMotion, dir };
  }

  /**
   * Finds all keyboard-focusable elements within a container or ShadowRoot.
   */
  getFocusableElements(root: ParentNode): HTMLElement[] {
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    return nodes.filter((el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');
  }

  /**
   * Returns the first keyboard-focusable element within `root`.
   */
  getFirstFocusable(root: ParentNode): HTMLElement | null {
    const list = this.getFocusableElements(root);
    return list[0] ?? null;
  }

  /**
   * Returns the last keyboard-focusable element within `root`.
   */
  getLastFocusable(root: ParentNode): HTMLElement | null {
    const list = this.getFocusableElements(root);
    return list[list.length - 1] ?? null;
  }
}

export const fzlA11y = new FzlA11yManager();
