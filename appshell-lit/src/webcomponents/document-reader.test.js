// @vitest-environment happy-dom
import { describe, expect, it, afterEach, vi } from 'vitest';
import '@fzl/webcomponents-lit/document-reader';
import {
  readerBlocksFromText,
  readerPlainText,
  readerBlockOffsets,
  normalizeReaderBlocks,
} from '@fzl/webcomponents-lit/document-reader';

async function mount(props = {}) {
  const el = document.createElement('fzl-document-reader');
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.overflow = '';
});

describe('document-reader helpers', () => {
  it('readerBlocksFromText splits on blank lines and keeps single line breaks', () => {
    const blocks = readerBlocksFromText('Primeiro\r\nainda primeiro\r\n\r\n\r\nSegundo  \n\n');
    expect(blocks).toEqual([
      { type: 'paragraph', text: 'Primeiro\nainda primeiro' },
      { type: 'paragraph', text: 'Segundo' },
    ]);
  });

  it('readerPlainText joins blocks with \\n\\n (no list bullets) and offsets match', () => {
    const blocks = normalizeReaderBlocks([
      { type: 'heading', level: 1, text: 'Título', runs: [] },
      { type: 'list-item', text: 'item' },
      { type: 'paragraph', text: 'fim' },
    ]);
    const text = readerPlainText(blocks);
    expect(text).toBe('Título\n\nitem\n\nfim');
    const offsets = readerBlockOffsets(blocks);
    expect(offsets).toEqual([0, 8, 14]);
    blocks.forEach((b, i) => expect(text.slice(offsets[i], offsets[i] + b.text.length)).toBe(b.text));
  });
});

describe('<fzl-document-reader>', () => {
  it('registers both tags', () => {
    expect(customElements.get('fzl-document-reader')).toBeDefined();
    expect(customElements.get('fzl-lit-document-reader')).toBeDefined();
  });

  it('renders text as paragraphs and exposes plainText', async () => {
    const el = await mount({ text: 'Um\n\nDois' });
    const blocks = el.shadowRoot.querySelectorAll('.blk');
    expect(blocks.length).toBe(2);
    expect(blocks[1].textContent).toBe('Dois');
    expect(blocks[1].dataset.offset).toBe('4');
    expect(el.plainText).toBe('Um\n\nDois');
  });

  it('blocks take precedence over text and render headings/list items', async () => {
    const el = await mount({
      text: 'ignorado',
      blocks: [
        { type: 'heading', level: 2, text: 'Cap. 1' },
        { type: 'list-item', text: 'a' },
      ],
    });
    const root = el.shadowRoot;
    expect(root.querySelector('h3.blk').textContent).toBe('Cap. 1');
    expect(root.querySelector('.blk.li').textContent).toBe('a');
    expect(el.plainText).toBe('Cap. 1\n\na');
  });

  it('shows the empty state without content', async () => {
    const el = await mount();
    expect(el.shadowRoot.querySelector('.empty')).not.toBeNull();
  });

  it('shows title/meta and hides the toolbar on demand', async () => {
    const el = await mount({ text: 'x', documentTitle: 'Entrevista 3', meta: 'DOCX' });
    expect(el.shadowRoot.querySelector('.title').textContent).toBe('Entrevista 3');
    expect(el.shadowRoot.querySelector('.meta').textContent).toBe('DOCX');
    el.hideToolbar = true;
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.bar')).toBeNull();
  });

  it('A-/A+ change the font size within limits and emit preferences', async () => {
    const el = await mount({ text: 'x', fontSize: 34 });
    const events = [];
    el.addEventListener('fzl-reader-preferences-change', (e) => events.push(e.detail));
    el.stepFontSize(1);
    el.stepFontSize(1); // capped at 36
    await el.updateComplete;
    expect(el.fontSize).toBe(36);
    expect(events).toEqual([{ fontSize: 36, readingWidth: 'narrow' }]);
    expect(el.shadowRoot.querySelector('.page').style.fontSize).toBe('36px');
    el.fontSize = 3;
    await el.updateComplete;
    expect(el.fontSize).toBe(12);
  });

  it('toggles reading width', async () => {
    const el = await mount({ text: 'x' });
    el.toggleReadingWidth();
    await el.updateComplete;
    expect(el.readingWidth).toBe('wide');
    expect(el.getAttribute('reading-width')).toBe('wide');
    expect(el.shadowRoot.querySelector('.page').classList.contains('wide')).toBe(true);
  });

  it('falls back to immersive mode without the Fullscreen API and exits with Esc', async () => {
    const el = await mount({ text: 'x' });
    Object.defineProperty(el, 'nativeFullscreenSupported', { get: () => false });
    const events = [];
    el.addEventListener('fzl-reader-fullscreen-change', (e) => events.push(e.detail));

    await el.toggleFullscreen();
    await el.updateComplete;
    expect(el.fullscreen).toBe(true);
    expect(el.getAttribute('fullscreen-mode')).toBe('immersive');
    expect(document.documentElement.style.overflow).toBe('hidden');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;
    expect(el.fullscreen).toBe(false);
    expect(el.hasAttribute('fullscreen')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(events).toEqual([
      { fullscreen: true, mode: 'immersive' },
      { fullscreen: false, mode: null },
    ]);
  });

  it('uses the native Fullscreen API when available', async () => {
    const el = await mount({ text: 'x' });
    let fsElement = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsElement });
    Object.defineProperty(el, 'nativeFullscreenSupported', { get: () => true });
    el.requestFullscreen = vi.fn(async () => {
      fsElement = el;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    const exit = vi.fn(async () => {
      fsElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });

    await el.enterFullscreen();
    expect(el.requestFullscreen).toHaveBeenCalled();
    expect(el.fullscreenMode).toBe('native');

    await el.exitFullscreen();
    expect(exit).toHaveBeenCalled();
    expect(el.fullscreen).toBe(false);

    delete document.fullscreenElement;
    delete document.exitFullscreen;
  });

  it('falls back to immersive when requestFullscreen is rejected', async () => {
    const el = await mount({ text: 'x' });
    Object.defineProperty(el, 'nativeFullscreenSupported', { get: () => true });
    el.requestFullscreen = vi.fn(async () => {
      throw new Error('denied');
    });
    await el.enterFullscreen();
    expect(el.fullscreenMode).toBe('immersive');
    await el.exitFullscreen();
    expect(el.fullscreen).toBe(false);
  });

  it('projects app buttons into the actions slot', async () => {
    const el = await mount({ text: 'x' });
    const btn = document.createElement('button');
    btn.slot = 'actions';
    el.appendChild(btn);
    const slot = el.shadowRoot.querySelector('slot[name="actions"]');
    expect(slot.assignedElements()).toContain(btn);
  });
});
