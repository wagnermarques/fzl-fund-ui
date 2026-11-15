// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlBaseController,
  FzlCloudUploadController,
  FzlDocxReaderController,
  FzlBookmarksController,
  FzlDataGridController,
  FzlSocialAuthController,
  FzlPersonalCloudDocsController
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

function createMockJwt(payloadObj) {
  const encode = (obj) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(payloadObj)}.sig`;
}

function stubGoogleGis(user = {}) {
  const credential = createMockJwt({
    sub: user.sub || 'google-sub-123',
    name: user.name || 'Ana Google',
    email: user.email || 'ana.silva@gmail.com',
    picture: user.picture || 'https://lh3.googleusercontent.com/a/ana'
  });
  vi.stubGlobal('google', {
    accounts: {
      id: {
        initialize: (opts) => {
          window.__fzlGisCallback = opts.callback;
        },
        prompt: () => {
          window.__fzlGisCallback?.({ credential });
        }
      },
      oauth2: {
        initTokenClient: (opts) => ({
          requestAccessToken: () => {
            opts.callback({ access_token: user.accessToken || 'ya29.mock-drive-token' });
          }
        })
      }
    }
  });
  return { credential };
}

function stubMicrosoftPopup(user = {}) {
  const idToken = createMockJwt({
    sub: user.sub || 'ms-sub-456',
    name: user.name || 'Carlos Microsoft',
    email: user.email || 'carlos.souza@outlook.com'
  });
  const popup = {
    closed: false,
    close: vi.fn(),
    location: {
      hash: `#access_token=${user.accessToken || 'EwB_mock_ms_token'}&id_token=${idToken}`
    }
  };
  return vi.spyOn(window, 'open').mockReturnValue(popup);
}

describe('Headless & Reactive Controllers (@fzl/webcomponents-lit/controllers)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete window.google;
    delete window.__fzlGisCallback;
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
    it('falha com erro explícito e emite evento quando Client IDs não estão configurados', async () => {
      const host = createMockHost();
      const auth = new FzlSocialAuthController(host);

      const gRes = await auth.loginWithGoogle();
      expect(gRes).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.errorMessage).toBe('Google Client ID não configurado.');
      expect(
        host.dispatched.some(
          (ev) => ev.type === 'fzl-social-login-error' && ev.detail?.provider === 'google'
        )
      ).toBe(true);

      const msRes = await auth.loginWithMicrosoft();
      expect(msRes).toBeNull();
      expect(auth.errorMessage).toBe('Microsoft Client ID não configurado.');
      expect(
        host.dispatched.some(
          (ev) => ev.type === 'fzl-social-login-error' && ev.detail?.provider === 'microsoft'
        )
      ).toBe(true);

      await expect(auth.requestCloudAccessToken('google')).rejects.toThrow(
        'Google Client ID não configurado.'
      );
      await expect(auth.requestCloudAccessToken('microsoft')).rejects.toThrow(
        'Microsoft Client ID não configurado.'
      );
    });

    it('realiza login/logout headless via GIS, requestCloudAccessToken e onAuthenticated()', async () => {
      stubGoogleGis({ name: 'Joana Silva', email: 'joana@gmail.com' });

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

      const auth = new TenantSocialController(null, {
        googleClientId: 'google-client-id.apps.googleusercontent.com'
      });
      const res = await auth.loginWithGoogle();

      expect(auth.isAuthenticated).toBe(true);
      expect(res?.user.name).toBe('Joana Silva [Tenant FZL]');
      expect(res?.user.email).toBe('joana@gmail.com');

      const token = await auth.requestCloudAccessToken('google');
      expect(token).toBe('ya29.mock-drive-token');
      expect(auth.accessToken).toBe('ya29.mock-drive-token');

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

  describe('FzlPersonalCloudDocsController & bindSocialAuth (Google Docs / OneDrive)', () => {
    it('loga com conta pessoal Google e envia .docx convertido para Google Docs', async () => {
      stubGoogleGis({ email: 'investidor@gmail.com' });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'gdrive-123',
          name: 'oficio-pessoal.docx',
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://docs.google.com/document/d/gdrive-123/edit'
        })
      });

      const host = createMockHost();
      const personalDocs = new FzlPersonalCloudDocsController(host, {
        convertToGoogleDocs: true,
        authConfig: { googleClientId: 'google-client-id.apps.googleusercontent.com' }
      });

      const userRes = await personalDocs.loginWithGoogle();
      expect(userRes?.provider).toBe('google');
      expect(personalDocs.targetCloudLabel).toBe('Google Docs');

      const docxBytes = createMinimalDocxBytes(['Ofício Pessoal', 'Enviado via conta Google.']);
      const docxFile = new File([docxBytes], 'oficio-pessoal.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const result = await personalDocs.uploadToPersonalCloud(docxFile);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toContain('https://www.googleapis.com/upload/drive/v3/files');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('google-drive');
      expect(result.externalViewerUrl).toBe('https://docs.google.com/document/d/gdrive-123/edit');
      expect(result.externalViewerLabel).toBe('Abrir no Google Docs ↗');
      expect(personalDocs.lastViewerUrl).toBe(result.externalViewerUrl);
      expect(personalDocs.lastViewerLabel).toBe('Abrir no Google Docs ↗');
      expect(host.dispatched.some((ev) => ev.type === 'fzl-personal-cloud-uploaded')).toBe(true);
    });

    it('loga com conta pessoal Microsoft e envia documento para OneDrive', async () => {
      stubMicrosoftPopup({ email: 'carlos.ms@outlook.com' });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'onedrive-456',
          name: 'minuta-ms.docx',
          webUrl: 'https://onedrive.live.com/edit?id=onedrive-456'
        })
      });

      const personalDocs = new FzlPersonalCloudDocsController(null, {
        authConfig: { microsoftClientId: 'ms-client-id' }
      });

      await personalDocs.loginWithMicrosoft();
      expect(personalDocs.targetCloudLabel).toBe('Microsoft OneDrive');

      const docxFile = new File(['conteudo docx'], 'minuta-ms.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const result = await personalDocs.uploadToPersonalCloud(docxFile);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toContain('https://graph.microsoft.com/v1.0/me/drive');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('onedrive');
      expect(result.externalViewerUrl).toBe('https://onedrive.live.com/edit?id=onedrive-456');
      expect(result.externalViewerLabel).toBe('Abrir no OneDrive ↗');
    });

    it('emite auth-required quando deslogado e suporta autoLoginProvider automático', async () => {
      stubGoogleGis();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'gdrive-auto-1',
          name: 'rascunho.docx',
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://docs.google.com/document/d/gdrive-auto-1/edit'
        })
      });

      const host = createMockHost();
      const personalDocs = new FzlPersonalCloudDocsController(host, {
        authConfig: { googleClientId: 'google-client-id.apps.googleusercontent.com' }
      });

      const doc = new File(['texto simples'], 'rascunho.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const blocked = await personalDocs.uploadToPersonalCloud(doc);
      expect(blocked.success).toBe(false);
      expect(host.dispatched.some((ev) => ev.type === 'fzl-personal-cloud-auth-required')).toBe(
        true
      );

      const autoResult = await personalDocs.uploadToPersonalCloud(doc, {
        autoLoginProvider: 'google'
      });
      expect(autoResult.success).toBe(true);
      expect(personalDocs.isAuthenticated).toBe(true);
      expect(autoResult.externalViewerUrl).toContain('docs.google.com/document/d/');
    });

    it('permite extensão por herança sobrescrevendo onPersonalDocUploaded()', async () => {
      stubGoogleGis({ email: 'auditor@fzl.com.br' });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'gdrive-audit-9',
          name: 'termo.docx',
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://docs.google.com/document/d/gdrive-audit-9/edit'
        })
      });

      const auditTrail = [];

      class AuditedPersonalDocsController extends FzlPersonalCloudDocsController {
        async onPersonalDocUploaded(file, result, user) {
          auditTrail.push({
            file: file.name,
            user: user.email,
            viewerUrl: result.externalViewerUrl
          });
        }
      }

      const ctrl = new AuditedPersonalDocsController(null, {
        authConfig: { googleClientId: 'google-client-id.apps.googleusercontent.com' },
        autoLoginProvider: 'google'
      });

      const file = new File(['doc auditado'], 'termo.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const result = await ctrl.uploadToPersonalCloud(file);

      expect(result.success).toBe(true);
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0]).toMatchObject({
        file: 'termo.docx',
        user: 'auditor@fzl.com.br'
      });
      expect(auditTrail[0].viewerUrl).toBe('https://docs.google.com/document/d/gdrive-audit-9/edit');
    });

    it('conecta <fzl-document-picker>.bindSocialAuth(socialLogin.authController) e envia para o Google Docs', async () => {
      stubGoogleGis();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'gdrive-picker-77',
          name: 'ata-comite.docx',
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://docs.google.com/document/d/gdrive-picker-77/edit'
        })
      });

      const socialEl = document.createElement('fzl-social-login');
      const pickerEl = document.createElement('fzl-document-picker');
      socialEl.googleClientId = 'google-client-id.apps.googleusercontent.com';

      document.body.append(socialEl, pickerEl);
      await Promise.all([socialEl.updateComplete, pickerEl.updateComplete]);

      const unbind = pickerEl.bindSocialAuth(socialEl.authController, {
        convertToGoogleDocs: true
      });

      await socialEl.loginWithGoogle();
      expect(pickerEl.storageProvider).toBe('google-drive');
      expect(pickerEl.googleDriveConvertToDocs).toBe(true);

      const docxBytes = createMinimalDocxBytes(['Ata de Comitê', 'Aprovada pela conta pessoal.']);
      const docxFile = new File([docxBytes], 'ata-comite.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const [item] = await pickerEl.addFiles([docxFile]);

      const ok = await pickerEl.uploadDocument(item.id);
      expect(ok).toBe(true);

      const uploaded = pickerEl.getDocuments().find((d) => d.id === item.id);
      expect(uploaded?.uploadStatus).toBe('uploaded');
      expect(uploaded?.storageProvider).toBe('google-drive');
      expect(uploaded?.googleDocsUrl).toBe('https://docs.google.com/document/d/gdrive-picker-77/edit');
      expect(uploaded?.externalViewerLabel).toBe('Abrir no Google Docs ↗');

      unbind();
      socialEl.remove();
      pickerEl.remove();
    });
  });
});
