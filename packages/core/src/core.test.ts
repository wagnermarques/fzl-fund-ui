import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  fzlRegistry,
  fzlFocus,
  fzlA11y,
  FzlTypematicController,
  FzlWidgetController,
  FzlKeyNavController,
  type FzlRegistrableWidget,
} from './index';

describe('@fzl/core — Widget Registry (fzlRegistry)', () => {
  beforeEach(() => {
    fzlRegistry.clear();
  });

  it('generates unique widget IDs and registers/unregisters widgets', () => {
    const attrs = new Map<string, string>();
    const fakeHost = {
      tagName: 'FZL-LIT-BUTTON',
      id: '',
      getAttribute(name: string) {
        return attrs.get(name) ?? null;
      },
      setAttribute(name: string, val: string) {
        attrs.set(name, val);
      },
    } as unknown as HTMLElement;

    const widget: FzlRegistrableWidget = {
      widgetId: '',
      hostElement: fakeHost,
    };

    const assignedId = fzlRegistry.add(widget);
    expect(assignedId).toBe('fzl_lit_button_0');
    expect(widget.widgetId).toBe('fzl_lit_button_0');
    expect(fzlRegistry.length).toBe(1);
    expect(fzlRegistry.byId('fzl_lit_button_0')).toBe(widget);

    fzlRegistry.remove(assignedId);
    expect(fzlRegistry.length).toBe(0);
    expect(fzlRegistry.byId('fzl_lit_button_0')).toBeUndefined();
  });

  it('uses existing host id attribute when present', () => {
    const fakeHost = {
      tagName: 'FZL-ES6-CRUMB',
      id: 'my-custom-crumb',
      getAttribute(name: string) {
        return name === 'id' ? 'my-custom-crumb' : null;
      },
      setAttribute() {},
    } as unknown as HTMLElement;

    const widget: FzlRegistrableWidget = {
      widgetId: '',
      hostElement: fakeHost,
    };

    const id = fzlRegistry.add(widget);
    expect(id).toBe('my-custom-crumb');
    expect(fzlRegistry.byId('my-custom-crumb')).toBe(widget);
  });
});

describe('@fzl/core — Typematic Controller (FzlTypematicController)', () => {
  it('fires immediately and accelerates on subsequent ticks until stopped', () => {
    vi.useFakeTimers();
    try {
      const controller = new FzlTypematicController();
      const counts: number[] = [];
      const fakeEvent = {} as MouseEvent;

      controller.start(
        fakeEvent,
        (count) => {
          counts.push(count);
        },
        { initialDelay: 200, minDelay: 50, subsequentDelayFactor: 0.5 }
      );

      // Immediate tick (0)
      expect(counts).toEqual([0]);
      expect(controller.isActive).toBe(true);

      // After 200ms -> tick 1
      vi.advanceTimersByTime(200);
      expect(counts).toEqual([0, 1]);

      // Next delay is 200 * 0.5 = 100ms -> tick 2
      vi.advanceTimersByTime(100);
      expect(counts).toEqual([0, 1, 2]);

      // Next delay is 100 * 0.5 = 50ms (minDelay) -> tick 3
      vi.advanceTimersByTime(50);
      expect(counts).toEqual([0, 1, 2, 3]);

      controller.stop();
      expect(controller.isActive).toBe(false);

      vi.advanceTimersByTime(500);
      expect(counts).toEqual([0, 1, 2, 3]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('@fzl/core — Keyboard Navigation Controller (FzlKeyNavController)', () => {
  function createFakeItems(count: number) {
    const items: HTMLElement[] = [];
    for (let i = 0; i < count; i++) {
      const attrs = new Map<string, string>();
      const el: Record<string, unknown> = {
        tagName: 'BUTTON',
        tabIndex: -1,
        focused: false,
        setAttribute(k: string, v: string) {
          attrs.set(k, v);
          if (k === 'tabindex') el.tabIndex = Number(v);
        },
        getAttribute(k: string) {
          return attrs.get(k) ?? null;
        },
        focus() {
          for (const other of items) {
            (other as unknown as { focused: boolean }).focused = false;
          }
          el.focused = true;
        },
        contains(node: Node | null) {
          return node === (el as unknown as Node);
        },
      };
      items.push(el as unknown as HTMLElement);
    }
    return items;
  }

  it('synchronizes roving tabindex (0 on active item, -1 on siblings)', () => {
    const items = createFakeItems(3);
    const host = { getAttribute: () => 'ltr' } as unknown as HTMLElement;
    const keyNav = new FzlKeyNavController(host, {
      orientation: 'horizontal',
      getItems: () => items,
    });

    keyNav.syncTabIndices();
    expect(items.map((el) => el.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);

    keyNav.focusItem(2);
    expect(items.map((el) => el.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);
  });

  it('navigates across items with ArrowRight, ArrowLeft, Home, and End with wrap-around', () => {
    const items = createFakeItems(3);
    const host = { getAttribute: () => 'ltr' } as unknown as HTMLElement;
    const keyNav = new FzlKeyNavController(host, {
      orientation: 'horizontal',
      getItems: () => items,
    });

    keyNav.syncTabIndices();

    const makeKeyEvent = (key: string) =>
      ({
        key,
        target: items[keyNav.focusedIndex],
        composedPath: () => [items[keyNav.focusedIndex]],
        preventDefault: vi.fn(),
      }) as unknown as KeyboardEvent;

    // 0 -> ArrowRight -> 1
    expect(keyNav.handleKeyDown(makeKeyEvent('ArrowRight'))).toBe(true);
    expect(keyNav.focusedIndex).toBe(1);

    // 1 -> End -> 2
    expect(keyNav.handleKeyDown(makeKeyEvent('End'))).toBe(true);
    expect(keyNav.focusedIndex).toBe(2);

    // 2 -> ArrowRight (wraps) -> 0
    expect(keyNav.handleKeyDown(makeKeyEvent('ArrowRight'))).toBe(true);
    expect(keyNav.focusedIndex).toBe(0);

    // 0 -> ArrowLeft (wraps) -> 2
    expect(keyNav.handleKeyDown(makeKeyEvent('ArrowLeft'))).toBe(true);
    expect(keyNav.focusedIndex).toBe(2);

    // 2 -> Home -> 0
    expect(keyNav.handleKeyDown(makeKeyEvent('Home'))).toBe(true);
    expect(keyNav.focusedIndex).toBe(0);
  });
});

describe('@fzl/core — Widget Controller & A11y Helpers', () => {
  beforeEach(() => {
    fzlRegistry.clear();
  });

  it('manages owned cleanup handles on disconnect', () => {
    const listeners = new Map<string, EventListener>();
    const fakeHost = {
      tagName: 'FZL-LIT-CARD-LIST',
      id: 'cards-1',
      getAttribute(k: string) {
        return k === 'id' ? 'cards-1' : null;
      },
      setAttribute() {},
      removeAttribute() {},
      hasAttribute() {
        return false;
      },
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
      dispatchEvent() {
        return true;
      },
    } as unknown as HTMLElement;

    const ctrl = new FzlWidgetController(fakeHost);
    let cleanedUp = false;
    ctrl.connect();
    ctrl.own(() => {
      cleanedUp = true;
    });

    expect(fzlRegistry.byId('cards-1')).toBe(ctrl);
    expect(cleanedUp).toBe(false);

    ctrl.disconnect();
    expect(cleanedUp).toBe(true);
    expect(fzlRegistry.byId('cards-1')).toBeUndefined();
  });

  it('fzlA11y resolves effective text direction and fzlFocus tracks active stack', () => {
    expect(fzlA11y.getEffectiveDir(null)).toBe('ltr');
    expect(fzlFocus.activeStack).toEqual([]);
  });
});
