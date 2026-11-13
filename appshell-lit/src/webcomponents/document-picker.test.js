// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMinimalDocxBytes } from '@fzl/webcomponents-lit/document-picker';

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

  it('usa pasta padrão existente (start-in="documents") na File System Access API e permite alternar na UI', async () => {
    expect(el.startIn).toBe('documents');

    const chips = Array.from(el.shadowRoot.querySelectorAll('.start-dir-chip'));
    expect(chips.length).toBe(4);
    expect(chips[0].classList.contains('active')).toBe(true);

    const downloadsChip = chips.find((c) => c.textContent.includes('Downloads'));
    downloadsChip.click();
    await el.updateComplete;
    expect(el.startIn).toBe('downloads');

    const mockFile = createTextFile('na-downloads.txt', 'Conteúdo da pasta Downloads.');
    const showOpenFilePicker = vi.fn().mockResolvedValue([
      { kind: 'file', name: 'na-downloads.txt', getFile: async () => mockFile },
    ]);
    const origOpen = window.showOpenFilePicker;
    window.showOpenFilePicker = showOpenFilePicker;

    try {
      await el.openNativeFilePicker();
      expect(showOpenFilePicker).toHaveBeenCalledTimes(1);
      const callOpts = showOpenFilePicker.mock.calls[0][0];
      expect(callOpts.startIn).toBe('downloads');
      expect(callOpts.id).toMatch(/^[A-Za-z0-9_-]{1,32}$/);
    } finally {
      window.showOpenFilePicker = origOpen;
    }
  });

  it('passa startIn e mode="read" ao acionar openDirectoryScanner', async () => {
    const mockFile = createTextFile('pasta.md', '# Documento da pasta');
    const showDirectoryPicker = vi.fn().mockResolvedValue({
      kind: 'directory',
      name: 'Documentos',
      async *values() {
        yield { kind: 'file', name: 'pasta.md', getFile: async () => mockFile };
      },
    });
    const origDir = window.showDirectoryPicker;
    window.showDirectoryPicker = showDirectoryPicker;

    try {
      el.startIn = 'documents';
      await el.openDirectoryScanner();
      expect(showDirectoryPicker).toHaveBeenCalledTimes(1);
      const callOpts = showDirectoryPicker.mock.calls[0][0];
      expect(callOpts.startIn).toBe('documents');
      expect(callOpts.mode).toBe('read');
      expect(callOpts.id).toMatch(/^[A-Za-z0-9_-]{1,32}$/);
      expect(el.getDocuments()[0].name).toBe('pasta.md');
    } finally {
      window.showDirectoryPicker = origDir;
    }
  });

  it('popula exemplos reativamente ao definir preload-samples e via loadSampleDocuments()', async () => {
    expect(el.getDocuments().length).toBe(0);

    el.setAttribute('preload-samples', '');
    await el.updateComplete;
    expect(el.getDocuments().length).toBe(3);

    // Remover um documento e recarregar exemplos
    const firstId = el.getDocuments()[0].id;
    el.removeDocument(firstId);
    expect(el.getDocuments().length).toBe(2);

    const loadBtn = el.shadowRoot.querySelector('.btn-load-samples');
    expect(loadBtn).not.toBeNull();
    loadBtn.click();
    await el.updateComplete;
    expect(el.getDocuments().length).toBe(3);
  });

  it('decodifica arquivo .docx nativamente sem dependências externas e renderiza títulos, formatação e tabela', async () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Relatório de Governança</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Atenção: </w:t></w:r>
      <w:r><w:rPr><w:i/></w:rPr><w:t>item regulatório.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Checklist mensal</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Fundo</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Status</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>FIDC Alpha</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Conforme</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

    const docxBytes = createMinimalDocxBytes(sampleXml);
    const docxFile = new File(
      [docxBytes],
      'parecer-oficial.docx',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    );

    const added = await el.addFiles([docxFile]);
    await el.updateComplete;

    expect(added.length).toBe(1);
    expect(added[0].extension).toBe('.docx');
    expect(added[0].category).toBe('text');
    expect(added[0].textContent).toContain('Relatório de Governança');
    expect(added[0].textContent).toContain('FIDC Alpha');
    expect(added[0].docxBlocks?.length).toBe(4);

    el.openReader(added[0].id);
    await el.updateComplete;

    const docxView = el.shadowRoot.querySelector('.docx-view');
    expect(docxView).not.toBeNull();
    expect(docxView.querySelector('.docx-h1')?.textContent).toContain('Relatório de Governança');
    expect(docxView.querySelector('strong')?.textContent).toContain('Atenção:');
    expect(docxView.querySelector('em')?.textContent).toContain('item regulatório.');
    expect(docxView.querySelector('.docx-list-item')?.textContent).toContain('Checklist mensal');
    expect(docxView.querySelectorAll('.docx-table tr').length).toBe(2);

    // Verifica busca realçada dentro da visualização DOCX
    const searchInput = el.shadowRoot.querySelector('.reader-search-input');
    searchInput.value = 'FIDC Alpha';
    searchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    const highlighted = docxView.querySelector('mark');
    expect(highlighted).not.toBeNull();
    expect(highlighted.textContent).toBe('FIDC Alpha');
  });

  it('extrai conteúdo .docx envolto em controles de conteúdo (w:sdt), caixas de texto (w:txbxContent) e campos (w:fldSimple)', async () => {
    const templateXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:body>
    <w:p>
      <mc:AlternateContent>
        <mc:Choice Requires="wps">
          <w:drawing>
            <w:txbxContent>
              <w:p><w:r><w:t>DESPACHO</w:t></w:r></w:p>
            </w:txbxContent>
          </w:drawing>
        </mc:Choice>
        <mc:Fallback>
          <w:pict>
            <w:txbxContent>
              <w:p><w:r><w:t>DESPACHO (fallback duplicado)</w:t></w:r></w:p>
            </w:txbxContent>
          </w:pict>
        </mc:Fallback>
      </mc:AlternateContent>
    </w:p>
    <w:sdt>
      <w:sdtContent>
        <w:p>
          <w:r><w:t>O (A) Diretor (a) da Etec </w:t></w:r>
          <w:sdt><w:sdtContent><w:r><w:t>ZONA LESTE</w:t></w:r></w:sdtContent></w:sdt>
          <w:r><w:t>, requerido pelo aluno (a) </w:t></w:r>
          <w:fldSimple w:instr="MERGEFIELD ALUNO"><w:r><w:t>Fábio Assato Rossi</w:t></w:r></w:fldSimple>
          <w:r><w:t>, decide:</w:t></w:r>
        </w:p>
        <w:tbl>
          <w:sdt>
            <w:sdtContent>
              <w:tr>
                <w:tc><w:p><w:r><w:t>Componente (s) Curricular(es)</w:t></w:r></w:p></w:tc>
                <w:tc><w:p><w:r><w:t>Resultado</w:t></w:r></w:p></w:tc>
              </w:tr>
              <w:tr>
                <w:tc><w:p><w:r><w:t>Inglês Instrumental</w:t></w:r></w:p></w:tc>
                <w:tc><w:p><w:r><w:t>deferido o aproveitamento de estudos</w:t></w:r></w:p></w:tc>
              </w:tr>
            </w:sdtContent>
          </w:sdt>
        </w:tbl>
      </w:sdtContent>
    </w:sdt>
  </w:body>
</w:document>`;

    const docxBytes = createMinimalDocxBytes(templateXml);
    const docxFile = new File(
      [docxBytes],
      'DESPACHO.docx',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    );

    const added = await el.addFiles([docxFile]);
    await el.updateComplete;

    expect(added.length).toBe(1);
    const parsedText = added[0].textContent || '';
    expect(parsedText).toContain('DESPACHO');
    expect(parsedText).not.toContain('fallback duplicado');
    expect(parsedText).toContain('ZONA LESTE');
    expect(parsedText).toContain('Fábio Assato Rossi');
    expect(parsedText).toContain('Inglês Instrumental');
    expect(parsedText).toContain('deferido o aproveitamento de estudos');

    el.openReader(added[0].id);
    await el.updateComplete;
    const docxView = el.shadowRoot.querySelector('.docx-view');
    expect(docxView).not.toBeNull();
    expect(docxView.textContent).toContain('DESPACHO');
    expect(docxView.textContent).toContain('Fábio Assato Rossi');
    expect(docxView.querySelectorAll('.docx-table tr').length).toBe(2);
  });
});
