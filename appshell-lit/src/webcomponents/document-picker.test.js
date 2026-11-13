// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@fzl/webcomponents-lit/document-picker';

function createTextFile(name, content, type = 'text/plain') {
  return new File([content], name, { type, lastModified: 1700000000000 });
}

describe('FzlDocumentPicker Web Component (<fzl-document-picker>)', () => {
  /** @type {import('@fzl/webcomponents-lit/document-picker').FzlDocumentPicker} */
  let el;
  const storageKey = 'fzl-test-doc-bookmarks';

  beforeEach(async () => {
    localStorage.clear();
    el = document.createElement('fzl-document-picker');
    el.storageKey = storageKey;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el?.remove();
    localStorage.clear();
  });

  it('registra os custom elements fzl-document-picker e fzl-lit-document-picker', () => {
    expect(customElements.get('fzl-document-picker')).toBeDefined();
    expect(customElements.get('fzl-lit-document-picker')).toBeDefined();
  });

  it('adiciona arquivos locais, decodifica texto e emite fzl-document-select', async () => {
    const selectedSpy = vi.fn();
    el.addEventListener('fzl-document-select', selectedSpy);

    const file = createTextFile('relatorio.md', '# Título\n\nPrimeiro parágrafo de estudo.', 'text/markdown');
    const added = await el.addFiles([file]);
    await el.updateComplete;

    expect(added.length).toBe(1);
    expect(added[0].name).toBe('relatorio.md');
    expect(added[0].category).toBe('text');
    expect(added[0].textContent).toContain('Primeiro parágrafo de estudo');
    expect(selectedSpy).toHaveBeenCalledTimes(1);
  });

  it('abre o leitor integrado, ajusta fonte, busca texto e fecha corretamente', async () => {
    const readSpy = vi.fn();
    el.addEventListener('fzl-document-read', readSpy);

    const [doc] = await el.addFiles([
      createTextFile('artigo.txt', 'Linha um sobre fundos.\nLinha dois com compliance.'),
    ]);
    await el.updateComplete;

    el.openReader(doc.id);
    await el.updateComplete;

    expect(readSpy).toHaveBeenCalledTimes(1);
    const reader = el.shadowRoot.querySelector('.reader-panel');
    expect(reader).not.toBeNull();
    expect(reader.textContent).toContain('artigo.txt');

    const searchInput = el.shadowRoot.querySelector('.reader-search-input');
    searchInput.value = 'compliance';
    searchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    const highlighted = el.shadowRoot.querySelector('.reader-body mark');
    expect(highlighted).not.toBeNull();
    expect(highlighted.textContent.toLowerCase()).toBe('compliance');

    el.closeReader();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.reader-panel')).toBeNull();
  });

  it('salva e persiste documentos nos bookmarks com tags e filtro', async () => {
    const bmAddSpy = vi.fn();
    el.addEventListener('fzl-document-bookmark-add', bmAddSpy);

    const [doc] = await el.addFiles([
      createTextFile('norma.txt', 'Diretrizes de governança e auditoria.'),
    ]);
    const isSaved = el.toggleBookmark(doc.id, ['governança', 'auditoria']);
    await el.updateComplete;

    expect(isSaved).toBe(true);
    expect(bmAddSpy).toHaveBeenCalledTimes(1);
    expect(el.getBookmarks().length).toBe(1);
    expect(el.getBookmarks()[0].tags).toEqual(['governança', 'auditoria']);

    const rawStored = localStorage.getItem(storageKey);
    expect(rawStored).not.toBeNull();
    expect(JSON.parse(rawStored).length).toBe(1);

    // Recria elemento para validar persistência automática do bookmark
    const el2 = document.createElement('fzl-document-picker');
    el2.storageKey = storageKey;
    document.body.appendChild(el2);
    await el2.updateComplete;
    expect(el2.getBookmarks().length).toBe(1);
    expect(el2.getBookmarks()[0].name).toBe('norma.txt');
    el2.remove();
  });

  it('envia documento via uploadHandler customizado e emite eventos de sucesso', async () => {
    const successSpy = vi.fn();
    const handler = vi.fn().mockResolvedValue({ id: 'srv-101', ok: true });
    el.uploadHandler = handler;
    el.addEventListener('fzl-document-upload-success', successSpy);

    const [doc] = await el.addFiles([
      createTextFile('dados.json', '{"codigo": 175}', 'application/json'),
    ]);
    el.addTag(doc.id, 'cvm');

    const ok = await el.uploadDocument(doc.id);
    await el.updateComplete;

    expect(ok).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].tags).toEqual(['cvm']);
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(el.getDocuments()[0].uploadStatus).toBe('uploaded');
  });

  it('valida tamanho máximo e emite fzl-document-error quando excedido', async () => {
    const errorSpy = vi.fn();
    el.addEventListener('fzl-document-error', errorSpy);
    el.maxFileSize = 10;

    const oversized = createTextFile('grande.txt', 'Conteúdo com bem mais de 10 bytes.');
    const added = await el.addFiles([oversized]);
    await el.updateComplete;

    expect(added.length).toBe(0);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot.querySelector('.error-banner')).not.toBeNull();
  });

  it('emite fzl-document-open-study com parágrafos estruturados para o leitor de estudo', async () => {
    const studySpy = vi.fn();
    el.addEventListener('fzl-document-open-study', studySpy);

    const [doc] = await el.addFiles([
      createTextFile('estudo.md', 'Parágrafo 1.\n\nParágrafo 2.'),
    ]);
    el.openReader(doc.id);
    await el.updateComplete;

    const studyBtn = el.shadowRoot.querySelector('.btn-study');
    expect(studyBtn).not.toBeNull();
    studyBtn.click();

    expect(studySpy).toHaveBeenCalledTimes(1);
    expect(studySpy.mock.calls[0][0].detail.verses).toEqual([
      { num: 1, text: 'Parágrafo 1.' },
      { num: 2, text: 'Parágrafo 2.' },
    ]);
  });
});
