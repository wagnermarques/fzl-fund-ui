// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { pdfPagesToBlocks, extractPdfBlocks, readerPlainText } from '@fzl/webcomponents-lit/document-reader';

/** Builds pdf.js-like items: one item per line, top to bottom. */
function page(n, lines, { size = 10, top = 780, gap = 14, height = 842 } = {}) {
  const items = [];
  let y = top;
  for (const line of lines) {
    if (line === null) {
      y -= gap; // blank line = extra gap
      continue;
    }
    const spec = typeof line === 'string' ? { text: line } : line;
    const s = spec.size ?? size;
    items.push({ str: spec.text, transform: [s, 0, 0, s, spec.x ?? 72, y], width: spec.text.length * s * 0.5, height: s, hasEOL: true });
    y -= spec.gap ?? gap;
  }
  return { page: n, items, height };
}


describe('pdfPagesToBlocks', () => {
  it('joins lines into paragraphs and splits on vertical gaps', () => {
    const blocks = pdfPagesToBlocks([
      page(1, [
        'A entrevista começou com uma pergunta sobre a',
        'experiência da participante com o programa de',
        'formação continuada.',
        null,
        'Depois falamos sobre a rotina da escola e os',
        'desafios de acesso à internet.',
      ]),
    ]);
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        page: 1,
        text: 'A entrevista começou com uma pergunta sobre a experiência da participante com o programa de formação continuada.',
      },
      { type: 'paragraph', page: 1, text: 'Depois falamos sobre a rotina da escola e os desafios de acesso à internet.' },
    ]);
  });

  it('removes end-of-line hyphenation only before lowercase', () => {
    const [b] = pdfPagesToBlocks([page(1, ['Havia muita difi-', 'culdade em acessar a Inter-', 'Net na escola municipal.'])]);
    expect(b.text).toBe('Havia muita dificuldade em acessar a Inter- Net na escola municipal.');
    const [c] = pdfPagesToBlocks([page(1, ['texto com hífen', 'normal'])], { dehyphenate: false });
    expect(c.text).toBe('texto com hífen normal');
  });

  it('detects headings by font size', () => {
    const blocks = pdfPagesToBlocks([
      page(1, [{ text: 'Capítulo 1', size: 18, gap: 24 }, 'Primeira linha do corpo do texto que segue', 'e continua aqui.', 'Mais uma linha de corpo para a mediana.']),
    ]);
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: 'Capítulo 1', page: 1 });
    expect(blocks[1].type).toBe('paragraph');
  });

  it('removes repeated headers/footers and page numbers, keeps page per block', () => {
    const mk = (n, body) => page(n, ['Revista de Educação — vol. 12', ...body, String(n)]);
    const blocks = pdfPagesToBlocks([
      mk(1, ['Texto da primeira página que termina a frase.']),
      mk(2, ['Texto da segunda página que termina a frase.']),
      mk(3, ['Texto da terceira página que termina a frase.']),
    ]);
    expect(blocks.map((b) => [b.page, b.text])).toEqual([
      [1, 'Texto da primeira página que termina a frase.'],
      [2, 'Texto da segunda página que termina a frase.'],
      [3, 'Texto da terceira página que termina a frase.'],
    ]);
  });

  it('continues a paragraph across pages when the sentence did not end', () => {
    const blocks = pdfPagesToBlocks([
      page(1, ['O professor relatou que a falta de equipamentos', 'dificultava o trabalho com os']),
      page(2, ['alunos do turno da noite.', null, 'Novo parágrafo aqui.']),
    ]);
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      page: 1,
      text: 'O professor relatou que a falta de equipamentos dificultava o trabalho com os alunos do turno da noite.',
    });
    expect(blocks[1]).toMatchObject({ page: 2, text: 'Novo parágrafo aqui.' });
    const split = pdfPagesToBlocks(
      [page(1, ['frase sem fim', 'continua']), page(2, ['na outra página'])],
      { mergeAcrossPages: false },
    );
    expect(split.map((b) => b.page)).toEqual([1, 2]);
  });

  it('joins runs of the same line with spaces based on x gaps', () => {
    const items = [
      { str: 'Olá', transform: [10, 0, 0, 10, 72, 700], width: 15 },
      { str: 'mundo', transform: [10, 0, 0, 10, 90, 700], width: 25 },
      { str: 'junto', transform: [10, 0, 0, 10, 115, 700], width: 25, hasEOL: true },
    ];
    expect(pdfPagesToBlocks([{ page: 1, items }])[0].text).toBe('Olá mundojunto');
  });
});

function fakePdfjs(pages, { title } = {}) {
  const destroy = vi.fn();
  return {
    destroy,
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: pages.length,
        getPage: async (n) => ({
          getTextContent: async () => ({ items: [...pages[n - 1].items, { type: 'beginMarkedContent' }] }),
          getViewport: () => ({ height: 842 }),
          cleanup: () => {},
        }),
        getMetadata: async () => ({ info: title ? { Title: title } : {} }),
        destroy,
      }),
    })),
  };
}

describe('extractPdfBlocks', () => {
  it('requires options.pdfjs', async () => {
    await expect(extractPdfBlocks(new ArrayBuffer(1), {})).rejects.toThrow(/options\.pdfjs/);
  });

  it('extracts blocks, text, pageCount, title and progress with an injected pdf.js', async () => {
    const pdfjs = fakePdfjs(
      [page(1, ['Primeira página com texto suficiente para não ser OCR.']), page(2, ['Segunda página com mais texto suficiente aqui.'])],
      { title: 'Entrevista 7' },
    );
    const progress = [];
    const res = await extractPdfBlocks(new Blob(['%PDF']), { pdfjs: async () => pdfjs, onProgress: (p, t) => progress.push([p, t]) });
    expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Uint8Array), isEvalSupported: false }));
    expect(res.pageCount).toBe(2);
    expect(res.pagesRead).toBe(2);
    expect(res.needsOcr).toBe(false);
    expect(res.title).toBe('Entrevista 7');
    expect(res.blocks.map((b) => b.page)).toEqual([1, 2]);
    expect(res.text).toBe(readerPlainText(res.blocks));
    expect(progress).toEqual([[1, 2], [2, 2]]);
    expect(pdfjs.destroy).toHaveBeenCalled();
  });

  it('flags scanned PDFs (no text layer) with needsOcr', async () => {
    const res = await extractPdfBlocks(new Uint8Array([1]), { pdfjs: fakePdfjs([{ items: [] }, { items: [] }]) });
    expect(res).toMatchObject({ blocks: [], needsOcr: true, pageCount: 2 });
  });

  it('honors maxPages and AbortSignal', async () => {
    const pages = [page(1, ['um texto qualquer de teste']), page(2, ['dois']), page(3, ['três'])];
    const res = await extractPdfBlocks(new Uint8Array([1]), { pdfjs: fakePdfjs(pages), maxPages: 1 });
    expect(res.pagesRead).toBe(1);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(extractPdfBlocks(new Uint8Array([1]), { pdfjs: fakePdfjs(pages), signal: ctrl.signal })).rejects.toThrow();
  });

  it('blocks render in the reader with page markers', async () => {
    await import('@fzl/webcomponents-lit/document-reader');
    const res = await extractPdfBlocks(new Uint8Array([1]), {
      pdfjs: fakePdfjs([page(1, ['Página um, frase completa.']), page(2, ['Página dois, frase completa.'])]),
    });
    const el = document.createElement('fzl-document-reader');
    el.blocks = res.blocks;
    document.body.appendChild(el);
    await el.updateComplete;
    expect([...el.shadowRoot.querySelectorAll('.pg')].map((m) => m.dataset.label)).toEqual(['p. 1', 'p. 2']);
    el.remove();
  });
});

describe('<fzl-document-picker> pdfTextExtractor', () => {
  it('fills textContent/docxBlocks (with page) for PDFs when an extractor is set', async () => {
    await import('@fzl/webcomponents-lit/document-picker');
    const picker = document.createElement('fzl-document-picker');
    document.body.appendChild(picker);
    const pdfjs = fakePdfjs([page(1, ['Título de teste com frase.']), page(2, ['Outra página com frase.'])]);
    picker.pdfTextExtractor = (file) => extractPdfBlocks(file, { pdfjs });
    const file = new File(['%PDF-1.4'], 'artigo.pdf', { type: 'application/pdf' });
    const [doc] = await picker.addFiles([file]);
    expect(doc.textContent).toBe('Título de teste com frase.\n\nOutra página com frase.');
    expect(doc.docxBlocks.map((b) => [b.type, b.page, b.runs[0].text])).toEqual([
      ['paragraph', 1, 'Título de teste com frase.'],
      ['paragraph', 2, 'Outra página com frase.'],
    ]);
    expect(doc.pageCount).toBe(2);
    expect(doc.pdfNeedsOcr).toBe(false);
    picker.remove();
  });

  it('keeps the old behavior without extractor and reports extractor errors', async () => {
    const picker = document.createElement('fzl-document-picker');
    document.body.appendChild(picker);
    const file = new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });
    let [doc] = await picker.addFiles([file]);
    expect(doc.textContent).toBeUndefined();
    const errors = [];
    picker.addEventListener('fzl-document-error', (e) => errors.push(e.detail.error));
    picker.pdfTextExtractor = async () => {
      throw new Error('PDF protegido');
    };
    [doc] = await picker.addFiles([new File(['x'], 'b.pdf', { type: 'application/pdf' })]);
    expect(errors).toEqual(['PDF protegido']);
    expect(doc.textContent).toBeUndefined();
    picker.remove();
  });
});
