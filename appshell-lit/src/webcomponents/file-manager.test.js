// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@fzl/webcomponents-lit/file-manager';

describe('FzlFileManager Web Component (<fzl-file-manager>)', () => {
  /** @type {import('@fzl/webcomponents-lit/file-manager').FzlFileManager} */
  let el;
  const storageKey = 'fzl-test-fm-bookmarks';

  beforeEach(async () => {
    localStorage.clear();
    el = document.createElement('fzl-file-manager');
    el.storageKey = storageKey;
    el.preloadSamples = true;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el?.remove();
    localStorage.clear();
  });

  it('registra os custom elements fzl-file-manager e fzl-lit-file-manager', () => {
    expect(customElements.get('fzl-file-manager')).toBeDefined();
    expect(customElements.get('fzl-lit-file-manager')).toBeDefined();
  });

  it('carrega arquivos com status distintos (synced, uploaded-only, bookmarked-only, pending-upload)', () => {
    const files = el.getFiles();
    expect(files.length).toBeGreaterThanOrEqual(4);

    const statuses = new Set(files.map((f) => f.status));
    expect(statuses.has('synced')).toBe(true);
    expect(statuses.has('uploaded-only')).toBe(true);
    expect(statuses.has('bookmarked-only')).toBe(true);
    expect(statuses.has('pending-upload')).toBe(true);
  });

  it('permite alternar modo de visualização entre Tabela e Grade', async () => {
    expect(el.viewMode).toBe('table');
    expect(el.shadowRoot.querySelector('.fm-table')).not.toBeNull();
    expect(el.shadowRoot.querySelector('.fm-grid')).toBeNull();

    const gridBtn = el.shadowRoot.querySelectorAll('.fm-view-btn')[1];
    gridBtn.click();
    await el.updateComplete;

    expect(el.viewMode).toBe('grid');
    expect(el.shadowRoot.querySelector('.fm-grid')).not.toBeNull();
    expect(el.shadowRoot.querySelector('.fm-table')).toBeNull();
  });

  it('filtra arquivos por status ao clicar nos chips', async () => {
    const chips = Array.from(el.shadowRoot.querySelectorAll('.fm-chip'));
    const favChip = chips.find((c) => c.textContent.includes('Favoritos'));
    expect(favChip).toBeDefined();

    favChip.click();
    await el.updateComplete;

    const rows = el.shadowRoot.querySelectorAll('.fm-table tbody tr');
    // Deve exibir apenas os bookmarked-only e synced
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(
        row.textContent.includes('Favorito') || row.textContent.includes('Sincronizado')
      ).toBe(true);
    }
  });

  it('navega em pastas e atualiza breadcrumbs', async () => {
    expect(el.currentFolder).toBe('/');
    el.navigateToFolder('/processos/2026');
    await el.updateComplete;

    expect(el.currentFolder).toBe('/processos/2026');
    const crumbs = Array.from(el.shadowRoot.querySelectorAll('.fm-crumb-link'));
    expect(crumbs.some((c) => c.textContent.includes('processos'))).toBe(true);
    expect(crumbs.some((c) => c.textContent.includes('2026'))).toBe(true);
  });

  it('abre leitor embutido ao clicar em Continuar Leitura e atualiza progresso', async () => {
    const readSpy = vi.fn();
    el.addEventListener('fzl-file-read', readSpy);

    const firstFile = el.getFiles()[0];
    el.openReader(firstFile.id);
    await el.updateComplete;

    expect(readSpy).toHaveBeenCalledTimes(1);
    const reader = el.shadowRoot.querySelector('.reader-panel');
    expect(reader).not.toBeNull();
    expect(reader.textContent).toContain(firstFile.name);

    // Fecha leitor
    const closeBtn = reader.querySelector('.btn-close-reader');
    closeBtn.click();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.reader-panel')).toBeNull();
  });

  it('alterna favorito (bookmark) e emite fzl-file-bookmark-toggle', async () => {
    const toggleSpy = vi.fn();
    el.addEventListener('fzl-file-bookmark-toggle', toggleSpy);

    const uploadOnly = el.getFiles().find((f) => f.status === 'uploaded-only');
    expect(uploadOnly).toBeDefined();

    const isFav = el.toggleBookmark(uploadOnly.id);
    await el.updateComplete;

    expect(isFav).toBe(true);
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(el.getFiles().find((f) => f.id === uploadOnly.id)?.status).toBe('synced');
  });

  it('suporta fetchHandler customizado para carregar arquivos de API remota', async () => {
    const customHandler = vi.fn().mockResolvedValue([
      {
        id: 'api-1',
        name: 'contrato-remoto.docx',
        folder: '/',
        size: 12000,
        extension: '.docx',
        category: 'text',
        status: 'uploaded-only',
        tags: ['contrato'],
        textContent: 'Texto do contrato remoto.',
      },
    ]);

    el.includeLocalBookmarks = false;
    el.fetchHandler = customHandler;
    await el.refresh();
    await el.updateComplete;

    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(el.getFiles().length).toBe(1);
    expect(el.getFiles()[0].name).toBe('contrato-remoto.docx');
  });

  it('exibe link "Abrir no Google Docs ↗" tanto na tabela quanto na grade e leitor', async () => {
    // file-despacho-etec possui googleDocsUrl / externalViewerUrl nos SAMPLE_MANAGED_FILES
    const docsLink = el.shadowRoot.querySelector('.btn-external');
    expect(docsLink).not.toBeNull();
    expect(docsLink.getAttribute('href')).toContain('https://docs.google.com/document/d/');
    expect(docsLink.textContent).toContain('Abrir no Google Docs ↗');

    // Alterna para visualização em grade
    el.viewMode = 'grid';
    await el.updateComplete;
    const gridDocsLink = el.shadowRoot.querySelector('.btn-external');
    expect(gridDocsLink).not.toBeNull();
    expect(gridDocsLink.getAttribute('href')).toContain('https://docs.google.com/document/d/');

    // Abre no leitor
    el.openReader('file-despacho-etec');
    await el.updateComplete;
    const readerDocsLink = el.shadowRoot.querySelector('.reader-header .btn-external');
    expect(readerDocsLink).not.toBeNull();
  });

  it('faz upload de arquivo pendente diretamente para Google Drive e atualiza status para synced', async () => {
    const pending = el.getFiles().find((f) => f.status === 'pending-upload');
    expect(pending).toBeDefined();

    el.storageProvider = 'google-drive';
    el.googleDriveFolderId = '1folder_drive_fm';
    el.googleDriveConvertToDocs = true;
    el.googleAuthToken = 'token-google-drive-fm';

    const origFetch = window.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url, init) => {
      expect(url).toContain('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      expect(init.headers.Authorization).toBe('Bearer token-google-drive-fm');
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          id: 'gdrive-fm-100',
          name: pending.name,
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://docs.google.com/document/d/gdrive-fm-100/edit',
        }),
      };
    });
    window.fetch = mockFetch;

    try {
      const success = await el.uploadFile(pending.id);
      expect(success).toBe(true);

      const updated = el.getFiles().find((f) => f.id === pending.id);
      expect(updated.status).toBe('synced');
      expect(updated.storageProvider).toBe('google-drive');
      expect(updated.googleDriveFileId).toBe('gdrive-fm-100');
      expect(updated.googleDocsUrl).toBe('https://docs.google.com/document/d/gdrive-fm-100/edit');
      expect(updated.externalViewerLabel).toBe('Abrir no Google Docs ↗');
    } finally {
      window.fetch = origFetch;
    }
  });

  it('faz upload de arquivo pendente para Microsoft OneDrive via Graph API', async () => {
    const pending = el.getFiles().find((f) => f.status === 'pending-upload');
    el.storageProvider = 'onedrive';
    el.oneDriveFolderId = 'onedrive-folder-xyz';
    el.oneDriveAuthToken = 'onedrive-token-123';

    const origFetch = window.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url, init) => {
      expect(url).toContain('https://graph.microsoft.com/v1.0/me/drive/items/onedrive-folder-xyz:/');
      expect(init.method).toBe('PUT');
      expect(init.headers.Authorization).toBe('Bearer onedrive-token-123');
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          id: 'od-item-123',
          name: pending.name,
          webUrl: 'https://1drv.ms/w/s!od-item-123',
        }),
      };
    });
    window.fetch = mockFetch;

    try {
      const success = await el.uploadFile(pending.id);
      expect(success).toBe(true);

      const updated = el.getFiles().find((f) => f.id === pending.id);
      expect(updated.status).toBe('synced');
      expect(updated.storageProvider).toBe('onedrive');
      expect(updated.externalViewerUrl).toBe('https://1drv.ms/w/s!od-item-123');
      expect(updated.externalViewerLabel).toBe('Abrir no OneDrive ↗');
    } finally {
      window.fetch = origFetch;
    }
  });
});
