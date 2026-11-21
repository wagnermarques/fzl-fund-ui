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

// ------------------------------------------------------------------ fase 2
import { anchorSelection, buildTextQuote } from '@fzl/webcomponents-lit/document-reader';

const DOC = 'Primeiro parágrafo com texto.\n\nSegundo bloco: o projeto mudou a rotina.\n\nTerceiro: o projeto ajudou.';

function textNodeOf(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  return walker.nextNode();
}

describe('anchorSelection / buildTextQuote', () => {
  it('buildTextQuote returns text with prefix/suffix context', () => {
    const start = DOC.indexOf('o projeto mudou');
    const q = buildTextQuote(DOC, start, start + 9, 8);
    expect(q).toEqual({ text: 'o projeto', prefix: ' bloco: ', suffix: ' mudou a' });
  });

  it('keeps offsets when the text still matches', () => {
    const start = DOC.indexOf('Segundo');
    expect(anchorSelection(DOC, { start, end: start + 7, text: 'Segundo' })).toEqual({ start, end: start + 7 });
  });

  it('re-anchors by quote + context when the document changed', () => {
    const start = DOC.lastIndexOf('o projeto');
    const saved = { start, end: start + 9, ...buildTextQuote(DOC, start, start + 9) };
    const edited = 'Novo início inserido.\n\n' + DOC;
    const found = anchorSelection(edited, saved);
    expect(edited.slice(found.start, found.end)).toBe('o projeto');
    // second occurrence ("Terceiro: o projeto"), chosen by prefix/suffix
    expect(found.start).toBe(edited.lastIndexOf('o projeto'));
  });

  it('returns null when the text no longer exists', () => {
    expect(anchorSelection('outro texto', { start: 0, end: 5, text: 'sumiu', prefix: '', suffix: '' })).toBeNull();
  });
});

describe('<fzl-document-reader> selection & annotations', () => {
  it('rangeToSelection maps a DOM range to canonical offsets, quote and block', async () => {
    const el = await mount({ text: DOC });
    const blocks = el.shadowRoot.querySelectorAll('.blk');
    const node = textNodeOf(blocks[1]);
    const range = document.createRange();
    const local = node.data.indexOf('o projeto');
    range.setStart(node, local);
    range.setEnd(node, local + 9);
    const sel = el.rangeToSelection(range);
    const start = DOC.indexOf('o projeto');
    expect(sel.start).toBe(start);
    expect(sel.end).toBe(start + 9);
    expect(sel.text).toBe('o projeto');
    expect(sel.prefix).toBe(DOC.slice(start - 32, start));
    expect(sel.suffix).toBe(DOC.slice(start + 9, start + 41));
    expect(sel.blockIndex).toBe(1);
  });

  it('selection across blocks uses \\n\\n between them and trims whitespace', async () => {
    const el = await mount({ text: DOC });
    const blocks = el.shadowRoot.querySelectorAll('.blk');
    const a = textNodeOf(blocks[0]);
    const b = textNodeOf(blocks[1]);
    const range = document.createRange();
    range.setStart(a, a.data.length - 7); // " texto." region
    range.setEnd(b, 7);
    const sel = el.rangeToSelection(range);
    expect(sel.text).toBe('texto.\n\nSegundo');
    expect(DOC.slice(sel.start, sel.end)).toBe(sel.text);
    expect([sel.blockIndex, sel.endBlockIndex]).toEqual([0, 1]);
  });

  it('draws annotations without changing the text and keeps offsets valid', async () => {
    const start = DOC.indexOf('o projeto mudou');
    const el = await mount({
      text: DOC,
      annotations: [
        { id: 'a1', start, end: start + 15, color: 'tomato', title: 'Mudança' },
        { id: 'a2', start: start + 2, end: start + 9 },
      ],
    });
    const blocks = el.shadowRoot.querySelectorAll('.blk');
    expect(blocks[1].textContent).toBe('Segundo bloco: o projeto mudou a rotina.');
    const marks = [...blocks[1].querySelectorAll('mark.ann')];
    expect(marks.map((m) => m.textContent)).toEqual(['o ', 'projeto', ' mudou']);
    expect(marks[1].dataset.ids).toBe('a1 a2');
    expect(marks[1].dataset.top).toBe('a2');
    expect(marks[1].classList.contains('multi')).toBe(true);
    expect(marks[0].title).toBe('Mudança');

    // a range inside a mark still maps to the right offsets
    const node = textNodeOf(marks[1]);
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 7);
    expect(el.rangeToSelection(range)).toMatchObject({ start: start + 2, end: start + 9, text: 'projeto' });
  });

  it('annotation spanning two blocks is drawn in both', async () => {
    const el = await mount({ text: DOC, annotations: [{ id: 'x', start: 20, end: 45 }] });
    const blocks = el.shadowRoot.querySelectorAll('.blk');
    expect(blocks[0].querySelector('mark').textContent).toBe(DOC.slice(20, 29));
    expect(blocks[1].querySelector('mark').textContent).toBe(DOC.slice(31, 45));
  });

  it('ignores invalid annotations and marks the active one', async () => {
    const el = await mount({
      text: DOC,
      annotations: [{ id: 'bad', start: 10, end: 5 }, { id: 'ok', start: 0, end: 8 }, { start: 0, end: 3 }],
      activeAnnotation: 'ok',
    });
    const marks = el.shadowRoot.querySelectorAll('mark.ann');
    expect(marks.length).toBe(1);
    expect(marks[0].classList.contains('active')).toBe(true);
  });

  it('clicking a highlight emits fzl-reader-annotation-click', async () => {
    const el = await mount({ text: DOC, annotations: [{ id: 'k1', start: 0, end: 8, title: 'T' }] });
    const got = [];
    el.addEventListener('fzl-reader-annotation-click', (e) => got.push(e.detail));
    el.shadowRoot.querySelector('mark.ann').click();
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe('k1');
    expect(got[0].annotation.title).toBe('T');
  });

  it('scrollToAnnotation finds rendered highlights', async () => {
    const el = await mount({ text: DOC, annotations: [{ id: 'z', start: 0, end: 8 }] });
    expect(await el.scrollToAnnotation('z')).toBe(true);
    expect(el.shadowRoot.querySelector('mark.ann').classList.contains('flash')).toBe(true);
    expect(await el.scrollToAnnotation('nope')).toBe(false);
  });

  it('emits fzl-reader-selection / -clear from the document selection', async () => {
    const el = await mount({ text: DOC });
    const events = [];
    el.addEventListener('fzl-reader-selection', (e) => events.push(['sel', e.detail.text]));
    el.addEventListener('fzl-reader-selection-clear', () => events.push(['clear']));

    const node = textNodeOf(el.shadowRoot.querySelectorAll('.blk')[2]);
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 8);
    vi.spyOn(el, 'getSelectionRange').mockReturnValue(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    expect(el.selection.text).toBe('Terceiro');

    el.getSelectionRange.mockReturnValue(null);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    expect(el.selection).toBeNull();
    expect(events).toEqual([['sel', 'Terceiro'], ['clear']]);
  });

  it('keeps the selection while focus is in slotted popover UI', async () => {
    const el = await mount({ text: DOC });
    const input = document.createElement('input');
    input.slot = 'selection-popover';
    el.appendChild(input);
    await el.updateComplete;

    const node = textNodeOf(el.shadowRoot.querySelector('.blk'));
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 8);
    const spy = vi.spyOn(el, 'getSelectionRange').mockReturnValue(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    await el.updateComplete;
    const pop = el.shadowRoot.querySelector('.sel-pop');
    expect(el.selection.text).toBe('Primeiro');

    input.focus();
    spy.mockReturnValue(null);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    expect(el.selection).not.toBeNull();

    el.clearSelection();
    await el.updateComplete;
    expect(el.selection).toBeNull();
    expect(pop.hidden).toBe(true);
  });

  it('changing the content clears the selection', async () => {
    const el = await mount({ text: DOC });
    const node = textNodeOf(el.shadowRoot.querySelector('.blk'));
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 8);
    vi.spyOn(el, 'getSelectionRange').mockReturnValue(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    const cleared = vi.fn();
    el.addEventListener('fzl-reader-selection-clear', cleared);
    el.text = 'outro';
    await el.updateComplete;
    expect(cleared).toHaveBeenCalled();
  });
});

describe('<fzl-document-reader> pendingRange', () => {
  it('draws the pending passage (not clickable) and combines it with annotations', async () => {
    const el = await mount({ text: DOC, annotations: [{ id: 'a', start: 0, end: 8 }], pendingRange: { start: 4, end: 18 } });
    const block = el.shadowRoot.querySelector('.blk');
    expect(block.textContent).toBe(DOC.split('\n\n')[0]);
    const marks = [...block.querySelectorAll('mark.ann')];
    expect(marks.map((m) => [m.textContent, m.classList.contains('pending'), m.dataset.ids ?? null])).toEqual([
      ['Prim', false, 'a'],
      ['eiro', true, 'a'],
      [' parágrafo', true, null],
    ]);
    const clicks = vi.fn();
    el.addEventListener('fzl-reader-annotation-click', clicks);
    marks[2].click();
    expect(clicks).not.toHaveBeenCalled();
    el.pendingRange = null;
    await el.updateComplete;
    expect(block.querySelectorAll('mark.pending').length).toBe(0);
  });

  it('keeps the selection while pendingRange overlaps it', async () => {
    const el = await mount({ text: DOC });
    const node = textNodeOf(el.shadowRoot.querySelector('.blk'));
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 8);
    const spy = vi.spyOn(el, 'getSelectionRange').mockReturnValue(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    el.pendingRange = { start: el.selection.start, end: el.selection.end };
    spy.mockReturnValue(null);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    expect(el.selection?.text).toBe('Primeiro');
  });
});

describe('<fzl-document-reader> popover timing', () => {
  it('fires fzl-reader-selection after the popover is visible and autofocuses its field', async () => {
    const el = await mount({ text: DOC, popoverAutofocus: true });
    const input = document.createElement('input');
    input.slot = 'selection-popover';
    el.appendChild(input);
    await el.updateComplete;
    let hiddenAtEvent = null;
    el.addEventListener('fzl-reader-selection', () => {
      hiddenAtEvent = el.shadowRoot.querySelector('.sel-pop').hidden;
    });
    const node = textNodeOf(el.shadowRoot.querySelector('.blk'));
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 8);
    vi.spyOn(el, 'getSelectionRange').mockReturnValue(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    expect(hiddenAtEvent).toBe(false);
    expect(document.activeElement).toBe(input);
  });
});

import { snapRangeToWords } from '@fzl/webcomponents-lit/document-reader';

describe('snap-to-words', () => {
  it('snapRangeToWords expands partial words (accents, hyphen, apostrophe)', () => {
    const t = 'a dificuldade de acessar a internet na escola';
    const s = t.indexOf('uldade');
    const e = t.indexOf('escola') + 3;
    const r = snapRangeToWords(t, s, e);
    expect(t.slice(r.start, r.end)).toBe('dificuldade de acessar a internet na escola');
    const u = 'o guarda-chuva d’água ação';
    const r2 = snapRangeToWords(u, u.indexOf('chu'), u.indexOf('água') + 2);
    expect(u.slice(r2.start, r2.end)).toBe('guarda-chuva d’água');
    expect(snapRangeToWords('um, dois', 0, 3)).toEqual({ start: 0, end: 3 });
  });

  it('emits the snapped selection and updates the visible selection', async () => {
    const el = await mount({ text: DOC, snapToWords: true });
    const node = textNodeOf(el.shadowRoot.querySelectorAll('.blk')[1]);
    const range = document.createRange();
    const i = node.data.indexOf('projeto');
    range.setStart(node, i + 2);
    range.setEnd(node, i + 11); // "ojeto mud"
    const select = vi.spyOn(el, 'selectOffsets');
    vi.spyOn(el, 'getSelectionRange').mockReturnValue(range);
    const got = [];
    el.addEventListener('fzl-reader-selection', (e) => got.push(e.detail.text));
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 200));
    expect(got).toEqual(['projeto mudou']);
    const start = DOC.indexOf('projeto mudou');
    expect(select).toHaveBeenCalledWith(start, start + 13);
    expect(el.offsetsToRange(start, start + 13).toString()).toBe('projeto mudou');
  });
});

describe('page markers', () => {
  const blocks = [
    { type: 'paragraph', text: 'um', page: 1 },
    { type: 'paragraph', text: 'dois', page: 1 },
    { type: 'paragraph', text: 'três', page: 2 },
  ];

  it('renders a marker when the page changes, without adding text', async () => {
    const el = await mount({ blocks });
    const markers = [...el.shadowRoot.querySelectorAll('.pg')];
    expect(markers.map((m) => m.dataset.label)).toEqual(['p. 1', 'p. 2']);
    expect(markers.every((m) => m.textContent === '')).toBe(true);
    expect(el.plainText).toBe('um\n\ndois\n\ntrês');
    expect(el.pageAt(el.plainText.indexOf('três'))).toBe(2);
  });

  it('selection reports page and endPage', async () => {
    const el = await mount({ blocks });
    const b = el.shadowRoot.querySelectorAll('.blk');
    const range = document.createRange();
    range.setStart(textNodeOf(b[1]), 0);
    range.setEnd(textNodeOf(b[2]), 4);
    expect(el.rangeToSelection(range)).toMatchObject({ text: 'dois\n\ntrês', page: 1, endPage: 2 });
  });

  it('no page fields without pages', async () => {
    const el = await mount({ text: DOC });
    const range = document.createRange();
    const n = textNodeOf(el.shadowRoot.querySelector('.blk'));
    range.setStart(n, 0);
    range.setEnd(n, 8);
    expect(el.rangeToSelection(range).page).toBeUndefined();
  });
});

describe('aside panel', () => {
  it('shows a toolbar toggle only with aside content and toggles the panel', async () => {
    const el = await mount({ text: DOC });
    expect(el.shadowRoot.querySelector('button[aria-label="Abrir painel"]')).toBeNull();
    const list = document.createElement('ul');
    list.slot = 'aside';
    el.appendChild(list);
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const btn = el.shadowRoot.querySelector('button[aria-label="Abrir painel"]');
    expect(btn).not.toBeNull();
    const aside = el.shadowRoot.querySelector('.aside');
    expect(aside.hidden).toBe(true);
    const events = [];
    el.addEventListener('fzl-reader-aside-toggle', (e) => events.push(e.detail.open));
    btn.click();
    await el.updateComplete;
    expect(el.asideOpen).toBe(true);
    expect(el.hasAttribute('aside-open')).toBe(true);
    expect(aside.hidden).toBe(false);
    el.toggleAside(false);
    await el.updateComplete;
    expect(events).toEqual([true, false]);
  });
});

describe('PDF mode in <fzl-document-reader>', () => {
  it('switches to PDF view mode when pdfSource is provided and toggles mode', async () => {
    const el = await mount({ text: DOC });
    expect(el.viewMode).toBe('text');

    el.pdfSource = new Uint8Array([1, 2, 3]);
    await el.updateComplete;
    expect(el.viewMode).toBe('pdf');

    // Toggles back to text
    el.toggleViewMode();
    await el.updateComplete;
    expect(el.viewMode).toBe('text');

    el.toggleViewMode();
    await el.updateComplete;
    expect(el.viewMode).toBe('pdf');
  });

  it('steps and resets PDF scale within bounds', async () => {
    const el = await mount({ pdfSource: new Uint8Array([1, 2, 3]) });
    await el.updateComplete;
    expect(el.pdfScale).toBe(1.15);

    el.stepPdfScale(0.2);
    expect(el.pdfScale).toBeCloseTo(1.35);

    el.resetPdfScale();
    expect(el.pdfScale).toBe(1.15);

    // Test upper bound
    el.stepPdfScale(3.0);
    expect(el.pdfScale).toBe(2.5);

    // Test lower bound
    el.stepPdfScale(-5.0);
    expect(el.pdfScale).toBe(0.6);
  });

  it('renders annotations in PDF mode and emits fzl-reader-annotation-click', async () => {
    const el = await mount({
      pdfSource: new Uint8Array([1, 2, 3]),
      annotations: [
        {
          id: 'q1',
          start: 0,
          end: 10,
          page: 1,
          color: '#2563eb',
          title: 'Trecho 1',
          rects: [{ left: 0.1, top: 0.2, width: 0.5, height: 0.05 }],
        },
      ],
    });
    // Mock pdfDoc
    el._pdfDoc = {
      numPages: 1,
      getPage: async () => ({
        getViewport: () => ({ width: 600, height: 800 }),
        render: () => ({ promise: Promise.resolve() }),
        getTextContent: async () => ({ items: [] }),
      }),
    };
    el._pdfPageCount = 1;
    await el.updateComplete;

    const highlight = el.shadowRoot.querySelector('.pdf-highlight');
    expect(highlight).not.toBeNull();
    expect(highlight.style.left).toBe('10%');
    expect(highlight.style.top).toBe('20%');

    let clicked = null;
    el.addEventListener('fzl-reader-annotation-click', (e) => {
      clicked = e.detail;
    });

    const annEl = el.shadowRoot.querySelector('.pdf-annotation');
    annEl.click();
    expect(clicked?.id).toBe('q1');
  });
});

