// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import '@fzl/webcomponents-lit/reader-mark-bar';
import '@fzl/webcomponents-lit/reader-content';
import { DEFAULT_MARK_COLORS } from '@fzl/webcomponents-lit/reader-mark-bar';

describe('Reader Selection & Mark Bar (<fzl-reader-mark-bar>)', () => {
  it('registers custom elements in customElements registry', () => {
    expect(customElements.get('fzl-reader-mark-bar')).toBeDefined();
    expect(customElements.get('fzl-reader-content')).toBeDefined();
  });

  it('initializes with default floating mode and 6 highlight colors', () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    expect(bar.mode).toBe('floating');
    expect(bar.visible).toBe(false);
    expect(bar.colors.length).toBe(6);
    expect(bar.colors).toEqual(DEFAULT_MARK_COLORS);
  });

  it('showAt() updates visibility, selected text, and calculates safe initial position', () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    document.body.appendChild(bar);

    expect(bar.visible).toBe(false);
    bar.showAt(undefined, 'O Senhor é o meu pastor');

    expect(bar.visible).toBe(true);
    expect(bar.selectedText).toBe('O Senhor é o meu pastor');
    expect(bar.style.left).toBeDefined();
    expect(bar.style.top).toBeDefined();

    document.body.removeChild(bar);
  });

  it('toggleVerticalPosition() flips position between elevated bottom and top', () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    document.body.appendChild(bar);

    bar.showAt(undefined, 'Texto de teste');
    const initialTop = parseFloat(bar.style.top);

    // Flip to top
    bar.toggleVerticalPosition();
    const flippedTop = parseFloat(bar.style.top);
    expect(flippedTop).toBe(70);

    // Flip back
    bar.toggleVerticalPosition();
    const restoredTop = parseFloat(bar.style.top);
    expect(restoredTop).toBe(initialTop);

    document.body.removeChild(bar);
  });

  it('hide() sets visible to false and dispatches fzl-bar-close event', () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    document.body.appendChild(bar);

    bar.showAt(undefined, 'Versículo 1');
    expect(bar.visible).toBe(true);

    let closed = false;
    bar.addEventListener('fzl-bar-close', (e) => {
      closed = true;
      expect(e.detail.selectedText).toBe('Versículo 1');
    });

    bar.hide();
    expect(bar.visible).toBe(false);
    expect(closed).toBe(true);

    document.body.removeChild(bar);
  });

  it('dispatches fzl-mark when color button is clicked', async () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    bar.selectedText = 'Bondade e fidelidade';
    document.body.appendChild(bar);
    await bar.updateComplete;

    let markDetail = null;
    bar.addEventListener('fzl-mark', (e) => {
      markDetail = e.detail;
    });

    const yellowBtn = bar.renderRoot.querySelector('.color-btn');
    expect(yellowBtn).toBeTruthy();
    yellowBtn.click();

    expect(markDetail).toBeTruthy();
    expect(markDetail.color.id).toBe('yellow');
    expect(markDetail.text).toBe('Bondade e fidelidade');

    document.body.removeChild(bar);
  });

  it('dispatches fzl-reader-action when action buttons are clicked', async () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    bar.selectedText = 'Águas tranquilas';
    document.body.appendChild(bar);
    await bar.updateComplete;

    const actions = [];
    bar.addEventListener('fzl-reader-action', (e) => {
      actions.push(e.detail.action);
    });

    const actionBtns = bar.renderRoot.querySelectorAll('.action-btn');
    expect(actionBtns.length).toBeGreaterThan(0);

    // Click first action button (underline)
    actionBtns[0].click();
    expect(actions).toContain('underline');

    document.body.removeChild(bar);
  });

  it('handles invalid or non-JSON colors attribute gracefully without crashing', async () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    bar.setAttribute('colors', 'DEFAULT_MARK_COLORS');
    document.body.appendChild(bar);
    await bar.updateComplete;

    expect(bar.colors).toEqual(DEFAULT_MARK_COLORS);
    const colorBtns = bar.renderRoot.querySelectorAll('.color-btn');
    expect(colorBtns.length).toBe(6);

    // Test with invalid arbitrary string
    bar.setAttribute('colors', 'invalid-non-json');
    await bar.updateComplete;
    expect(bar.colors).toEqual(DEFAULT_MARK_COLORS);

    // Test defensive rendering when property is forced to null
    // @ts-ignore
    bar.colors = null;
    await bar.updateComplete;
    const fallbackBtns = bar.renderRoot.querySelectorAll('.color-btn');
    expect(fallbackBtns.length).toBe(6);

    document.body.removeChild(bar);
  });

  it('parses custom JSON array in colors attribute correctly', async () => {
    const bar = document.createElement('fzl-reader-mark-bar');
    const customColors = [
      { id: 'gold', name: 'Ouro', bg: '#ffd700', border: '#b8860b' },
      { id: 'cyan', name: 'Ciano', bg: '#00ffff', border: '#008b8b' },
    ];
    bar.setAttribute('colors', JSON.stringify(customColors));
    document.body.appendChild(bar);
    await bar.updateComplete;

    expect(bar.colors.length).toBe(2);
    expect(bar.colors[0].id).toBe('gold');
    const colorBtns = bar.renderRoot.querySelectorAll('.color-btn');
    expect(colorBtns.length).toBe(2);

    document.body.removeChild(bar);
  });
});

describe('Reader Content Container (<fzl-reader-content>)', () => {
  it('handles non-JSON verses attribute gracefully without crashing', async () => {
    const reader = document.createElement('fzl-reader-content');
    reader.setAttribute('verses', 'DEFAULT_PASSAGE');
    document.body.appendChild(reader);
    await reader.updateComplete;

    const verses = reader.renderRoot.querySelectorAll('.verse');
    expect(verses.length).toBe(6);

    document.body.removeChild(reader);
  });

  it('renders passage title, metadata and verses correctly', async () => {
    const reader = document.createElement('fzl-reader-content');
    reader.passageTitle = 'Salmos 23';
    document.body.appendChild(reader);
    await reader.updateComplete;

    const titleEl = reader.renderRoot.querySelector('.passage-title');
    expect(titleEl?.textContent).toBe('Salmos 23');

    const verses = reader.renderRoot.querySelectorAll('.verse');
    expect(verses.length).toBe(6);

    const markBar = reader.renderRoot.querySelector('fzl-reader-mark-bar');
    expect(markBar).toBeTruthy();
    expect(markBar.mode).toBe('floating');

    document.body.removeChild(reader);
  });

  it('mode switching updates reader and mark bar mode', async () => {
    const reader = document.createElement('fzl-reader-content');
    document.body.appendChild(reader);
    await reader.updateComplete;

    const modeChips = reader.renderRoot.querySelectorAll('.mode-chip');
    expect(modeChips.length).toBe(3);

    // Switch to top mode
    modeChips[1].click();
    await reader.updateComplete;
    expect(reader.mode).toBe('top');

    const markBar = reader.renderRoot.querySelector('fzl-reader-mark-bar');
    expect(markBar.mode).toBe('top');

    document.body.removeChild(reader);
  });
});
