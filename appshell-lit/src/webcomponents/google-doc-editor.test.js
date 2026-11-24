// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@fzl/webcomponents-lit/google-doc-editor';
import {
  extractGoogleDocId,
  buildGoogleDocUrl,
  isValidGoogleDoc,
} from '@fzl/webcomponents-lit/google-doc-editor';

describe('FzlGoogleDocEditor Web Component (<fzl-google-doc-editor>)', () => {
  /** @type {import('@fzl/webcomponents-lit/google-doc-editor').FzlGoogleDocEditor} */
  let el;
  const SAMPLE_URL = 'https://docs.google.com/document/d/1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94/edit?tab=t.0';
  const EXPECTED_ID = '1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94';

  beforeEach(async () => {
    el = document.createElement('fzl-google-doc-editor');
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
  });

  it('registra os custom elements fzl-google-doc-editor e fzl-lit-google-doc-editor', () => {
    expect(customElements.get('fzl-google-doc-editor')).toBeDefined();
    expect(customElements.get('fzl-lit-google-doc-editor')).toBeDefined();
  });

  describe('Utilitários de URL (extractGoogleDocId, buildGoogleDocUrl, isValidGoogleDoc)', () => {
    it('extrai o ID corretamente de URLs de Google Docs completas e parciais', () => {
      expect(extractGoogleDocId(SAMPLE_URL)).toBe(EXPECTED_ID);
      expect(extractGoogleDocId(`https://docs.google.com/document/d/${EXPECTED_ID}`)).toBe(EXPECTED_ID);
      expect(extractGoogleDocId(EXPECTED_ID)).toBe(EXPECTED_ID);
      expect(extractGoogleDocId('https://outro.com/documento/123')).toBeNull();
      expect(extractGoogleDocId('')).toBeNull();
    });

    it('valida corretamente URLs e IDs válidos do Google Docs', () => {
      expect(isValidGoogleDoc(SAMPLE_URL)).toBe(true);
      expect(isValidGoogleDoc(EXPECTED_ID)).toBe(true);
      expect(isValidGoogleDoc('https://example.com')).toBe(false);
      expect(isValidGoogleDoc(null)).toBe(false);
    });

    it('constrói URLs canônicas e com parâmetros de tab ou preview', () => {
      expect(buildGoogleDocUrl(EXPECTED_ID)).toBe(`https://docs.google.com/document/d/${EXPECTED_ID}/edit`);
      expect(buildGoogleDocUrl(EXPECTED_ID, { tab: 't.0' })).toBe(`https://docs.google.com/document/d/${EXPECTED_ID}/edit?tab=t.0`);
      expect(buildGoogleDocUrl(EXPECTED_ID, { preview: true })).toBe(`https://docs.google.com/document/d/${EXPECTED_ID}/preview`);
    });
  });

  describe('Renderização e Modos', () => {
    it('renderiza estado vazio com input quando nenhum documento está vinculado', () => {
      const emptyCard = el.shadowRoot.querySelector('.empty-card');
      const input = el.shadowRoot.querySelector('.url-input');
      expect(emptyCard).not.toBeNull();
      expect(input).not.toBeNull();
      expect(emptyCard.textContent).toContain('Vincular Google Docs');
    });

    it('renderiza modo card com título, ID e botões de ação quando vinculado', async () => {
      el.docUrl = SAMPLE_URL;
      el.title = 'Estudo sobre Salmos';
      el.description = 'Anotações e esboço para o sermão de domingo.';
      await el.updateComplete;

      const card = el.shadowRoot.querySelector('.doc-card');
      const title = el.shadowRoot.querySelector('.doc-title');
      const badge = el.shadowRoot.querySelector('.badge-id');
      const desc = el.shadowRoot.querySelector('.doc-desc');

      expect(card).not.toBeNull();
      expect(title.textContent).toBe('Estudo sobre Salmos');
      expect(badge.textContent).toContain('1pbBa5e81D');
      expect(desc.textContent).toContain('Anotações e esboço');

      const openBtn = el.shadowRoot.querySelector('.btn-primary');
      expect(openBtn.textContent).toContain('Editar no Google Docs');
    });

    it('renderiza modo compact (pílula) quando mode="compact"', async () => {
      el.docUrl = SAMPLE_URL;
      el.title = 'Esboço';
      el.mode = 'compact';
      await el.updateComplete;

      const compactBar = el.shadowRoot.querySelector('.compact-bar');
      expect(compactBar).not.toBeNull();
      expect(compactBar.textContent).toContain('Esboço');
    });
  });

  describe('Ações e Eventos', () => {
    it('dispara fzl-doc-open ao abrir o documento', async () => {
      el.docUrl = SAMPLE_URL;
      await el.updateComplete;

      const openSpy = vi.fn();
      el.addEventListener('fzl-doc-open', openSpy);
      vi.spyOn(window, 'open').mockImplementation(() => null);

      el.openInGoogleDocs();

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy.mock.calls[0][0].detail.docId).toBe(EXPECTED_ID);
      expect(window.open).toHaveBeenCalledWith(
        `https://docs.google.com/document/d/${EXPECTED_ID}/edit`,
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('copia a URL para a área de transferência e emite fzl-doc-copy', async () => {
      el.docUrl = SAMPLE_URL;
      await el.updateComplete;

      const copySpy = vi.fn();
      el.addEventListener('fzl-doc-copy', copySpy);

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const success = await el.copyDocUrl();
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith(`https://docs.google.com/document/d/${EXPECTED_ID}/edit`);
      expect(copySpy).toHaveBeenCalledTimes(1);
    });

    it('permite alterar URL via setDocUrl emitindo fzl-doc-change', async () => {
      const changeSpy = vi.fn();
      el.addEventListener('fzl-doc-change', changeSpy);

      const ok = el.setDocUrl(SAMPLE_URL);
      expect(ok).toBe(true);
      expect(el.activeDocId).toBe(EXPECTED_ID);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy.mock.calls[0][0].detail.docId).toBe(EXPECTED_ID);
    });

    it('permite desvincular documento via clearDocUrl emitindo fzl-doc-change', async () => {
      el.docUrl = SAMPLE_URL;
      await el.updateComplete;

      const changeSpy = vi.fn();
      el.addEventListener('fzl-doc-change', changeSpy);

      el.clearDocUrl();
      expect(el.activeDocId).toBeNull();
      expect(el.docUrl).toBe('');
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy.mock.calls[0][0].detail.docId).toBe('');
    });
  });
});
