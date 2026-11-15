// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlBaseController,
  FzlCloudUploadController,
  FzlDocxReaderController,
  FzlBookmarksController,
  FzlDataGridController,
  FzlSocialAuthController
} from '@fzl/webcomponents-lit/controllers';
import { createMinimalDocxBytes } from '@fzl/webcomponents-lit/document-picker';
import '@fzl/webcomponents-lit/social-login';
import '@fzl/webcomponents-lit/file-manager';
import { FzlMemoryStore } from '@fzl/core';

function createMockHost() {
  const controllers = [];
  const dispatched = [];
  return {
    controllers,
    dispatched,
    requestUpdate: vi.fn(),
    addController: vi.fn((c) => controllers.push(c)),
    removeController: vi.fn((c) => {
      const idx = controllers.indexOf(c);
      if (idx >= 0) controllers.splice(idx, 1);
    }),
    dispatchEvent: vi.fn((ev) => {
      dispatched.push(ev);
      return true;
    })
  };
}

describe('Headless & Reactive Controllers (@fzl/webcomponents-lit/controllers)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('FzlBaseController', () => {
    it('registra no host, dispara requestUpdate, subscribe() e emitHostEvent()', () => {
      class DemoController extends FzlBaseController {
        value = 0;
        increment() {
          this.value += 1;
          this.emitHostEvent('demo-inc', { value: this.value });
          this.notifyChange();
        }
      }

      const host = createMockHost();
      const ctrl = new DemoController(host);
      expect(host.addController).toHaveBeenCalledWith(ctrl);

      const snapshots = [];
      const unsubscribe = ctrl.subscribe(() => snapshots.push(ctrl.value));

      ctrl.hostConnected();
      ctrl.increment();
      expect(host.requestUpdate).toHaveBeenCalledTimes(1);
      expect(snapshots).toEqual([1]);
      expect(host.dispatched[0].type).toBe('demo-inc');
      expect(host.dispatched[0].detail).toEqual({ value: 1 });

      unsubscribe();
      ctrl.increment();
      expect(snapshots).toEqual([1]);
      expect(host.requestUpdate).toHaveBeenCalledTimes(2);

      ctrl.detachHost();
      expect(host.removeController).toHaveBeenCalledWith(ctrl);
    });
  });

  describe('FzlCloudUploadController', () => {
    it('executa upload headless atualizando status, contadores e subscribers', async () => {
      const customUploader = vi.fn(async (file) => ({
        success: true,
        provider: 'custom',
        fileId: 'srv-101',
        fileUrl: `https://storage.local/${file.name}`
      }));

      const ctrl = new FzlCloudUploadController(null, {
        config: { provider: 'custom', customUploader }
      });

      const statuses = [];
      ctrl.subscribe(() => statuses.push(ctrl.status));

      const file = new File(['conteudo fidc'], 'regulamento.txt', { type: 'text/plain' });
      const result = await ctrl.uploadFile(file);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('srv-101');
      expect(ctrl.status).toBe('uploaded');
      expect(ctrl.uploadCount).toBe(1);
      expect(statuses).toEqual(['uploading', 'uploaded']);

      ctrl.reset();
      expect(ctrl.status).toBe('idle');
      expect(ctrl.lastResult).toBeNull();
    });

    it('permite extensão via herança (extends) com beforeUpload, performUpload e afterUpload', async () => {
      const seenContext = [];
      const afterHooks = [];

      class RegulatedUploadController extends FzlCloudUploadController {
        protectedRulesBlocked = ['.exe', '.bat'];

        async beforeUpload(file) {
          if (this.protectedRulesBlocked.some((ext) => file.name.endsWith(ext))) {
            return false;
          }
          return new File([file], `audited-${file.name}`, { type: file.type });
        }

        async performUpload(file, _config, context) {
          seenContext.push({ fileName: file.name, ...context });
          return {
            success: true,
            provider: 's3',
            fileId: `s3-${file.name}`
          };
        }

        async afterUpload(file, result) {
          afterHooks.push(`${file.name}:${result.fileId}`);
        }
      }

      const host = createMockHost();
      const ctrl = new RegulatedUploadController(host, {
        config: { provider: 's3', s3Bucket: 'fidc-docs' },
        context: { tenant: 'fzl-fundos' }
      });

      const blocked = await ctrl.uploadFile(new File(['bad'], 'script.exe'));
      expect(blocked.success).toBe(false);
      expect(ctrl.uploadCount).toBe(0);

      const allowed = await ctrl.uploadFile(new File(['ok'], 'parecer.pdf'));
      expect(allowed.success).toBe(true);
      expect(allowed.fileId).toBe('s3-audited-parecer.pdf');
      expect(seenContext[0]).toEqual({
        fileName: 'audited-parecer.pdf',
        tenant: 'fzl-fundos'
      });
      expect(afterHooks).toEqual(['audited-parecer.pdf:s3-audited-parecer.pdf']);
    });
  });

  describe('FzlDocxReaderController', () => {
    it('lê .docx nativo, filtra blocos, aplica zoom e gera study verses', async () => {
      const docxBytes = createMinimalDocxBytes([
        'Relatório Trimestral FIDC',
        'Cláusula de liquidez diária para cotas seniores.',
        'Conclusão da auditoria independente.'
      ]);
      const docxFile = new File([docxBytes], 'relatorio.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const ctrl = new FzlDocxReaderController(null, { fontSize: 15, minFontSize: 12, maxFontSize: 22 });
      const doc = await ctrl.openFile(docxFile);

      expect(doc.name).toBe('relatorio.docx');
      expect(ctrl.blocks.length).toBe(3);
      expect(ctrl.wordCount ?? doc.wordCount).toBeGreaterThan(5);

      ctrl.setSearchQuery('liquidez');
      const filtered = ctrl.getFilteredBlocks();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].text).toContain('liquidez diária');

      const verses = ctrl.toStudyVerses();
      expect(verses).toHaveLength(1);
      expect(verses[0].id).toBe('verse-1');

      ctrl.zoomIn(10);
      expect(ctrl.fontSize).toBe(22);
      ctrl.zoomOut(20);
      expect(ctrl.fontSize).toBe(12);

      ctrl.close();
      expect(ctrl.hasDocument).toBe(false);
    });

    it('permite subclasse transformar blocos ao abrir documento (transformBlocks)', async () => {
      class RedactingReaderController extends FzlDocxReaderController {
        transformBlocks(blocks) {
          return blocks.map((b) =>
            b.type === 'table'
              ? b
              : { ...b, text: b.text.replace(/CONFIDENCIAL/gi, '[SIGILOSO]') }
          );
        }
      }

      const reader = new RedactingReaderController();
      const doc = await reader.openDocument({
        id: 'doc-1',
        name: 'minuta.txt',
        textContent: 'Cláusula CONFIDENCIAL do regulamento.'
      });

      expect(doc.textContent).toBe('Cláusula [SIGILOSO] do regulamento.');
      expect(reader.blocks[0].text).toBe('Cláusula [SIGILOSO] do regulamento.');
    });
  });

  describe('FzlBookmarksController', () => {
    it('persiste favoritos, tags, notas e sincroniza evento storage entre abas', () => {
      const host = createMockHost();
      const ctrl = new FzlBookmarksController(host, { storageKey: 'fzl:test-bm' });
      ctrl.hostConnected();

      const added = ctrl.toggleBookmark({
        id: 'doc-99',
        name: 'prospecto.pdf',
        tags: ['FIDC']
      });
      expect(added).toBe(true);
      expect(ctrl.isBookmarked('doc-99')).toBe(true);

      expect(ctrl.addTag('doc-99', 'Prioridade')).toBe(true);
      expect(ctrl.addTag('doc-99', 'Prioridade')).toBe(false);
      expect(ctrl.get('doc-99')?.tags).toEqual(['FIDC', 'Prioridade']);

      ctrl.setNotes('doc-99', 'Revisar Anexo II');
      expect(ctrl.get('doc-99')?.notes).toBe('Revisar Anexo II');

      const reloaded = new FzlBookmarksController(null, { storageKey: 'fzl:test-bm' });
      expect(reloaded.count).toBe(1);
      expect(reloaded.get('doc-99')?.notes).toBe('Revisar Anexo II');

      localStorage.setItem(
        'fzl:test-bm',
        JSON.stringify([{ id: 'doc-ext', name: 'externo.md', tags: ['sync'] }])
      );
      window.dispatchEvent(new StorageEvent('storage', { key: 'fzl:test-bm' }));
      expect(ctrl.isBookmarked('doc-ext')).toBe(true);

      ctrl.clear();
      expect(ctrl.count).toBe(0);
      ctrl.hostDisconnected();
    });

    it('permite extensão via herança sobrescrevendo validateTag()', () => {
      class NormalizedTagBookmarksController extends FzlBookmarksController {
        validateTag(tag) {
          const clean = tag.trim().toLowerCase();
          return clean.length >= 3 ? clean : null;
        }
      }

      const bm = new NormalizedTagBookmarksController(null, {
        storageKey: 'fzl:test-bm-custom',
        autoLoad: false
      });
      bm.addBookmark({ id: 'b1', name: 'arquivo.md', tags: ['AB', ' Compliance '] });
      expect(bm.get('b1')?.tags).toEqual(['compliance']);
      expect(bm.addTag('b1', 'ok')).toBe(false);
      expect(bm.addTag('b1', '  Regulatório ')).toBe(true);
      expect(bm.get('b1')?.tags).toEqual(['compliance', 'regulatório']);
    });
  });

  describe('FzlDataGridController', () => {
    it('reage automaticamente a mutações no FzlMemoryStore, ordena, filtra e pagina', () => {
      const store = new FzlMemoryStore({
        data: [
          { id: '1', nome: 'FIDC Beta', cota: 120 },
          { id: '2', nome: 'FIDC Alpha', cota: 250 },
          { id: '3', nome: 'FIP Gamma', cota: 90 }
        ]
      });

      const host = createMockHost();
      const grid = new FzlDataGridController(host, {
        store,
        pageSize: 2,
        selectionMode: 'multiple',
        columns: [
          { field: 'nome', label: 'Nome' },
          { field: 'cota', label: 'Cota' }
        ]
      });

      let notifications = 0;
      grid.subscribe(() => {
        notifications += 1;
      });

      expect(grid.totalItems).toBe(3);
      expect(grid.totalPages).toBe(2);
      expect(grid.pagedItems).toHaveLength(2);

      grid.toggleSort('cota');
      expect(grid.sortedItems.map((i) => i.id)).toEqual(['3', '1', '2']);
      grid.toggleSort('cota');
      expect(grid.sortedItems.map((i) => i.id)).toEqual(['2', '1', '3']);

      store.add({ id: '4', nome: 'FIM Delta', cota: 500 });
      expect(grid.totalItems).toBe(4);
      expect(grid.sortedItems[0].id).toBe('4');
      expect(host.requestUpdate).toHaveBeenCalled();
      expect(notifications).toBeGreaterThanOrEqual(3);

      grid.selectRow(grid.pagedItems[0]);
      grid.toggleSelectAllOnPage();
      expect(grid.selectedIds.length).toBe(2);

      grid.setSearchQuery('Alpha');
      expect(grid.filteredItems.map((i) => i.id)).toEqual(['2']);
      grid.setSearchQuery('');

      grid.hostDisconnected();
      const beforeDisconnectUpdates = notifications;
      store.remove('3');
      expect(notifications).toBe(beforeDisconnectUpdates);
    });
  });

  describe('FzlSocialAuthController & Integração com Web Components', () => {
    it('realiza login/logout headless e permite sobrescrever onAuthenticated()', async () => {
      class TenantSocialController extends FzlSocialAuthController {
        async onAuthenticated(result) {
          return {
            ...result,
            user: {
              ...result.user,
              name: `${result.user.name} [Tenant FZL]`
            }
          };
        }
      }

      const auth = new TenantSocialController(null, { demoDelayMs: 5 });
      const res = await auth.loginWithGoogle();

      expect(auth.isAuthenticated).toBe(true);
      expect(res?.user.name).toContain('[Tenant FZL]');

      auth.logout();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.currentUser).toBeNull();
    });

    it('expõe controllers integrados em <fzl-social-login>, <fzl-document-picker> e <fzl-file-manager>', async () => {
      const socialEl = document.createElement('fzl-social-login');
      const pickerEl = document.createElement('fzl-document-picker');
      const fmEl = document.createElement('fzl-file-manager');

      document.body.append(socialEl, pickerEl, fmEl);
      await Promise.all([socialEl.updateComplete, pickerEl.updateComplete, fmEl.updateComplete]);

      expect(socialEl.authController).toBeInstanceOf(FzlSocialAuthController);
      expect(pickerEl.uploadController).toBeInstanceOf(FzlCloudUploadController);
      expect(pickerEl.readerController).toBeInstanceOf(FzlDocxReaderController);
      expect(fmEl.uploadController).toBeInstanceOf(FzlCloudUploadController);
      expect(fmEl.readerController).toBeInstanceOf(FzlDocxReaderController);

      socialEl.remove();
      pickerEl.remove();
      fmEl.remove();
    });
  });
});
