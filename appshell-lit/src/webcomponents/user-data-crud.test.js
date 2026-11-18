// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlUserDataController,
  FzlCrudBaseController,
  FzlMemoryCrudAdapter,
  FzlIndexedDbCrudAdapter,
  FzlGoogleDriveRemoteAdapter,
  FzlBookmarksController,
  FzlDataGridController,
  FzlSocialAuthController,
} from '@fzl/webcomponents-lit/controllers';

let appCounter = 0;
const uniqueApp = () => `test${Date.now().toString(36)}${appCounter++}`;

const ANA = { id: 'sub-ana', provider: 'google', email: 'ana@example.com' };
const BRUNO = { id: 'sub-bruno', provider: 'google', email: 'bruno@example.com' };

/** Remote adapter double that records calls and can be told to fail. */
function createFakeRemote(provider = 'fake-drive') {
  const files = new Map();
  let counter = 0;
  const remote = {
    provider,
    files,
    failDelete: false,
    failCreate: false,
    calls: [],
    async create(record) {
      remote.calls.push(['create', record.id]);
      if (remote.failCreate) throw new Error('rede caiu');
      const remoteId = `${provider}-${++counter}`;
      files.set(remoteId, record.data);
      return { provider, remoteId, url: `https://remote/${remoteId}` };
    },
    async update(record, ref) {
      remote.calls.push(['update', record.id]);
      files.set(ref.remoteId, record.data);
      return { ...ref };
    },
    async delete(ref) {
      remote.calls.push(['delete', ref.remoteId]);
      if (remote.failDelete) throw new Error('403 sem permissão');
      files.delete(ref.remoteId);
    },
  };
  return remote;
}

describe('FzlUserDataController', () => {
  beforeEach(() => localStorage.clear());

  it('requires a valid appId', () => {
    expect(() => new FzlUserDataController(null, {})).toThrow(/appId/);
    expect(() => new FzlUserDataController(null, { appId: 'a:b' })).toThrow(/appId/);
  });

  it('isolates scoped names per user and closes data with nobody logged in', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    expect(ud.isActive).toBe(false);
    expect(ud.tryScopedName('files')).toBeNull();
    expect(() => ud.scopedName('files')).toThrow(/nenhum usuário/);

    await ud.setUser(ANA);
    const anaName = ud.scopedName('files');
    await ud.setUser(BRUNO);
    const brunoName = ud.scopedName('files');

    expect(anaName).not.toBe(brunoName);
    expect(anaName).not.toContain('sub-ana'); // raw id never in key names
    expect(anaName.startsWith(`fzl-ud:${ud.appId}:`)).toBe(true);
  });

  it('keeps Storage values separated between users', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp(), logoutPolicy: 'keep' });
    await ud.setUser(ANA);
    ud.setItem('draft', 'texto da Ana');
    await ud.setUser(BRUNO);
    expect(ud.getItem('draft')).toBeNull();
    await ud.setUser(ANA);
    expect(ud.getItem('draft')).toBe('texto da Ana');
  });

  it('purges databases and keys of the user who logs out (policy purge, nothing unsynced)', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    await ud.setUser(ANA);
    const db = await ud.openDatabase('files', 1, (d) => d.createObjectStore('items', { keyPath: 'id' }));
    const tx = db.transaction('items', 'readwrite');
    tx.objectStore('items').put({ id: '1', name: 'segredo.docx' });
    await new Promise((r) => (tx.oncomplete = r));
    ud.setItem('draft', 'x');
    const anaScope = ud.scope;

    await ud.logout();
    expect(ud.isActive).toBe(false);
    expect(ud.listKnownScopes()).not.toContain(anaScope);

    await ud.setUser(ANA);
    expect(ud.getItem('draft')).toBeNull();
    const reopened = await ud.openDatabase('files', 1, (d) => d.createObjectStore('items', { keyPath: 'id' }));
    const count = await new Promise((resolve) => {
      const req = reopened.transaction('items').objectStore('items').count();
      req.onsuccess = () => resolve(req.result);
    });
    expect(count).toBe(0);
  });

  it('asks before purging unsynced data and keeps it when refused', async () => {
    const confirmPurge = vi.fn().mockResolvedValue(false);
    const ud = new FzlUserDataController(null, { appId: uniqueApp(), confirmPurge });
    await ud.setUser(ANA);
    ud.setItem('draft', 'não enviado');
    ud.registerParticipant({ countUnsynced: () => 3 });

    await ud.logout();
    expect(confirmPurge).toHaveBeenCalledWith(expect.objectContaining({ unsynced: 3, policy: 'purge' }));
    await ud.setUser(ANA);
    expect(ud.getItem('draft')).toBe('não enviado');
  });

  it('keeps unsynced data when there is no confirmPurge handler', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    await ud.setUser(ANA);
    ud.setItem('draft', 'x');
    ud.registerParticipant({ countUnsynced: () => 1 });
    await ud.logout();
    await ud.setUser(ANA);
    expect(ud.getItem('draft')).toBe('x');
  });

  it('does not purge when the session merely expired', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    await ud.setUser(ANA);
    ud.setItem('draft', 'x');
    await ud.setUser(null, 'expired');
    await ud.setUser(ANA);
    expect(ud.getItem('draft')).toBe('x');
  });

  it('follows an appshell-like auth source (subscribe(user, reason))', async () => {
    let current = null;
    const listeners = new Set();
    const auth = {
      getCurrentUser: () => current,
      subscribe(fn) {
        listeners.add(fn);
        fn(current);
        return () => listeners.delete(fn);
      },
      set(user, reason) {
        current = user;
        listeners.forEach((fn) => fn(user, reason));
      },
    };
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    const off = ud.bindAuth(auth);
    auth.set({ id: 'u1', name: 'Ana', email: 'a@x' }, 'signIn');
    await ud.whenReady();
    expect(ud.user?.id).toBe('u1');
    auth.set(null, 'signOut');
    await ud.whenReady();
    expect(ud.isActive).toBe(false);
    off();
  });

  it('follows FzlSocialAuthController login/logout', async () => {
    const social = new FzlSocialAuthController(null);
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    ud.bindAuth(social);
    // Simulate the controller state after a Google login.
    social._currentUser = { id: 'google-sub', provider: 'google', name: 'Ana', email: 'a@x' };
    social.notifyChange();
    await ud.whenReady();
    expect(ud.user?.provider).toBe('google');
    social.logout();
    await ud.whenReady();
    expect(ud.isActive).toBe(false);
  });
});

describe('FzlCrudBaseController', () => {
  it('creates locally as local-only and exposes grid rows', async () => {
    const ctrl = new FzlCrudBaseController(null, { local: new FzlMemoryCrudAdapter() });
    await ctrl.load();
    const record = await ctrl.create({ name: 'entrevista.docx' });
    expect(record.syncState).toBe('local-only');
    expect(ctrl.rows[0]).toMatchObject({ id: record.id, name: 'entrevista.docx', syncState: 'local-only' });
    expect(ctrl.unsyncedCount).toBe(1);
  });

  it('syncs to a remote and keeps the reference', async () => {
    const remote = createFakeRemote();
    const ctrl = new FzlCrudBaseController(null, { local: new FzlMemoryCrudAdapter(), remotes: [remote] });
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' });
    const { record: synced, failures } = await ctrl.sync(record.id);
    expect(failures).toEqual([]);
    expect(synced.syncState).toBe('synced');
    expect(synced.remotes[0]).toMatchObject({ provider: 'fake-drive', remoteId: 'fake-drive-1' });
    expect(ctrl.unsyncedCount).toBe(0);
  });

  it('autoSync sends on create and keeps remotes up to date on update', async () => {
    const remote = createFakeRemote();
    const ctrl = new FzlCrudBaseController(null, {
      local: new FzlMemoryCrudAdapter(),
      remotes: [remote],
      autoSync: true,
    });
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' });
    expect(record.syncState).toBe('synced');
    const updated = await ctrl.update(record.id, { name: 'b.docx' });
    expect(updated.syncState).toBe('synced');
    expect(remote.calls).toEqual([
      ['create', record.id],
      ['update', record.id],
    ]);
  });

  it('update without sync marks a synced record as dirty', async () => {
    const remote = createFakeRemote();
    const ctrl = new FzlCrudBaseController(null, { local: new FzlMemoryCrudAdapter(), remotes: [remote] });
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' }, { sync: true });
    const updated = await ctrl.update(record.id, { name: 'b.docx' });
    expect(updated.syncState).toBe('dirty');
  });

  it('delete removes from the remote first and then locally', async () => {
    const remote = createFakeRemote();
    const local = new FzlMemoryCrudAdapter();
    const host = { requestUpdate: vi.fn(), dispatchEvent: vi.fn() };
    const ctrl = new FzlCrudBaseController(host, { local, remotes: [remote] });
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' }, { sync: true });
    expect(remote.files.size).toBe(1);

    const result = await ctrl.delete(record.id);
    expect(result).toEqual({ deleted: [record.id], pending: [], cancelled: false });
    expect(remote.files.size).toBe(0);
    expect(await local.get(record.id)).toBeUndefined();
    expect(ctrl.items).toHaveLength(0);
    const types = host.dispatchEvent.mock.calls.map(([ev]) => ev.type);
    expect(types).toContain('fzl-crud-delete');
  });

  it('keeps a tombstone when the remote deletion fails, and retryPending finishes it', async () => {
    const remote = createFakeRemote();
    const local = new FzlMemoryCrudAdapter();
    const ctrl = new FzlCrudBaseController(null, { local, remotes: [remote] });
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' }, { sync: true });

    remote.failDelete = true;
    const result = await ctrl.delete(record.id);
    expect(result.deleted).toEqual([]);
    expect(result.pending[0].failures[0].error).toMatch(/403/);
    expect(ctrl.items).toHaveLength(0); // gone from the grid
    const tombstone = await local.get(record.id);
    expect(tombstone.syncState).toBe('pending-delete'); // survives a reload
    expect(tombstone.remotes).toHaveLength(1); // the remote reference is not lost
    expect(remote.files.size).toBe(1);
    expect(ctrl.unsyncedCount).toBe(1);

    // A new controller (page reload) retries the pending deletion on load.
    remote.failDelete = false;
    const reloaded = new FzlCrudBaseController(null, { local, remotes: [remote], autoLoad: false });
    await reloaded.load();
    expect(remote.files.size).toBe(0);
    expect(await local.get(record.id)).toBeUndefined();
    expect(reloaded.allRecords).toHaveLength(0);
  });

  it('delete is cancelled by confirmDelete', async () => {
    const confirmDelete = vi.fn().mockResolvedValue(false);
    const ctrl = new FzlCrudBaseController(null, { local: new FzlMemoryCrudAdapter(), confirmDelete });
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' });
    const result = await ctrl.delete(record.id);
    expect(result.cancelled).toBe(true);
    expect(confirmDelete).toHaveBeenCalledWith([expect.objectContaining({ id: record.id })]);
    expect(ctrl.items).toHaveLength(1);
  });

  it('subclass hooks can veto creation and customize remote deletion', async () => {
    const remote = createFakeRemote();
    class FilesCrud extends FzlCrudBaseController {
      deleted = [];
      async beforeCreate(data) {
        return data.name.endsWith('.exe') ? false : { ...data, name: data.name.trim() };
      }
      async deleteRemote(ref, record, adapter) {
        this.deleted.push(ref.remoteId);
        await adapter.delete(ref, record);
      }
    }
    const ctrl = new FilesCrud(null, { local: new FzlMemoryCrudAdapter(), remotes: [remote] });
    await ctrl.load();
    expect(await ctrl.create({ name: 'virus.exe' })).toBeNull();
    const record = await ctrl.create({ name: '  ok.docx ' }, { sync: true });
    expect(record.data.name).toBe('ok.docx');
    await ctrl.delete(record.id);
    expect(ctrl.deleted).toEqual(['fake-drive-1']);
  });

  it('bindGrid mirrors the rows into FzlDataGridController', async () => {
    const ctrl = new FzlCrudBaseController(null, { local: new FzlMemoryCrudAdapter() });
    const grid = new FzlDataGridController(null, { columns: 'name' });
    ctrl.bindGrid(grid);
    await ctrl.load();
    const record = await ctrl.create({ name: 'a.docx' });
    expect(grid.allItems.map((r) => r.id)).toEqual([record.id]);
    await ctrl.delete(record.id);
    expect(grid.allItems).toHaveLength(0);
  });
});

describe('FzlCrudBaseController + FzlUserDataController + IndexedDB', () => {
  beforeEach(() => localStorage.clear());

  it('each user sees only their own records, and stores Blobs', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp(), logoutPolicy: 'keep' });
    await ud.setUser(ANA);
    const local = new FzlIndexedDbCrudAdapter({ dbName: 'files', userData: ud });
    const ctrl = new FzlCrudBaseController(null, { local, userData: ud, autoLoad: false });
    await ctrl.load();
    await ctrl.create({ name: 'ana.txt', file: new File(['olá'], 'ana.txt', { type: 'text/plain' }) });

    await ud.setUser(BRUNO);
    await vi.waitFor(() => expect(ctrl.isLoaded).toBe(true));
    expect(ctrl.items).toHaveLength(0);
    await ctrl.create({ name: 'bruno.txt' });

    await ud.setUser(ANA);
    await vi.waitFor(() => expect(ctrl.items.map((r) => r.data.name)).toEqual(['ana.txt']));
    const file = ctrl.items[0].data.file;
    expect(file).toBeInstanceOf(Blob);
    expect(await file.text()).toBe('olá');
  });

  it('logout with nothing unsynced purges the user database', async () => {
    const remote = createFakeRemote();
    const ud = new FzlUserDataController(null, { appId: uniqueApp() });
    await ud.setUser(ANA);
    const local = new FzlIndexedDbCrudAdapter({ dbName: 'files', userData: ud });
    const ctrl = new FzlCrudBaseController(null, { local, remotes: [remote], userData: ud, autoLoad: false });
    await ctrl.load();
    await ctrl.create({ name: 'a.docx' }, { sync: true });

    await ud.logout();
    expect(ctrl.items).toHaveLength(0);
    await ud.setUser(ANA);
    await vi.waitFor(() => expect(ctrl.isLoaded).toBe(true));
    expect(ctrl.items).toHaveLength(0); // purged: synced copy lives on the remote
  });

  it('logout with unsynced records asks; refusing keeps them for the next login', async () => {
    const confirmPurge = vi.fn().mockResolvedValue(false);
    const ud = new FzlUserDataController(null, { appId: uniqueApp(), confirmPurge });
    await ud.setUser(ANA);
    const local = new FzlIndexedDbCrudAdapter({ dbName: 'files', userData: ud });
    const ctrl = new FzlCrudBaseController(null, { local, userData: ud, autoLoad: false });
    await ctrl.load();
    await ctrl.create({ name: 'rascunho.docx' });

    await ud.logout();
    expect(confirmPurge).toHaveBeenCalledWith(expect.objectContaining({ unsynced: 1 }));
    expect(ctrl.items).toHaveLength(0); // nothing visible while logged out
    await ud.setUser(ANA);
    await vi.waitFor(() => expect(ctrl.items.map((r) => r.data.name)).toEqual(['rascunho.docx']));
  });
});

describe('FzlBookmarksController + FzlUserDataController', () => {
  beforeEach(() => localStorage.clear());

  it('keeps bookmarks per user', async () => {
    const ud = new FzlUserDataController(null, { appId: uniqueApp(), logoutPolicy: 'keep' });
    await ud.setUser(ANA);
    const bm = new FzlBookmarksController(null, { userData: ud });
    bm.addBookmark({ id: 'd1', name: 'ana.docx' });
    expect(bm.count).toBe(1);

    await ud.setUser(BRUNO);
    expect(bm.count).toBe(0);
    await ud.setUser(null);
    expect(bm.count).toBe(0);
    await ud.setUser(ANA);
    expect(bm.items.map((b) => b.id)).toEqual(['d1']);
  });
});

describe('FzlGoogleDriveRemoteAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  const record = {
    id: 'r1',
    data: { file: new File(['x'], 'a.docx', { type: 'application/octet-stream' }) },
    syncState: 'local-only',
    remotes: [],
    createdAt: 0,
    updatedAt: 0,
  };

  it('uploads, then moves to the trash on delete by default', async () => {
    const fetchMock = vi.fn(async (url, init) => {
      if (init.method === 'POST') {
        return new Response(JSON.stringify({ id: 'drive-1', webViewLink: 'https://drive/1' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new FzlGoogleDriveRemoteAdapter({ getToken: () => 'tok' });
    const ref = await adapter.create(record);
    expect(ref).toMatchObject({ provider: 'google-drive', remoteId: 'drive-1', url: 'https://drive/1' });

    await adapter.delete(ref, record);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://www.googleapis.com/drive/v3/files/drive-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ trashed: true });
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('permanentDelete uses DELETE, and a 404 counts as already deleted', async () => {
    const fetchMock = vi.fn(async () => new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new FzlGoogleDriveRemoteAdapter({ getToken: () => 'tok', permanentDelete: true });
    await expect(adapter.delete({ provider: 'google-drive', remoteId: 'gone' }, record)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('fails without a token and on other HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('forbidden', { status: 403 })));
    const noToken = new FzlGoogleDriveRemoteAdapter({ getToken: () => null });
    await expect(noToken.delete({ provider: 'google-drive', remoteId: 'x' }, record)).rejects.toThrow(/login/);
    const adapter = new FzlGoogleDriveRemoteAdapter({ getToken: () => 'tok' });
    await expect(adapter.delete({ provider: 'google-drive', remoteId: 'x' }, record)).rejects.toThrow(/403/);
  });
});
