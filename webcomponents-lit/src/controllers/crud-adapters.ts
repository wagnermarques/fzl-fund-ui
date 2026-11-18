/**
 * @license
 * FZL Software — Persistence adapters for FzlCrudBaseController
 *
 * A record lives in one *local* adapter (browser: IndexedDB / memory — the first
 * step, or cache) and may be consolidated in any number of *remote* adapters
 * (Google Drive, OneDrive, REST…). The CRUD controller keeps both consistent.
 */
import {
  deleteFromGoogleDrive,
  deleteFromOneDrive,
  FzlCloudStorageError,
  updateGoogleDriveFile,
  updateOneDriveFile,
  uploadToGoogleDrive,
  uploadToOneDrive,
  type FzlUploadResult
} from '../components/common/cloud-storage';
import type { FzlUserDataController } from './user-data.controller';

/**
 * Synchronization state of a record:
 * - `local-only`     only in the browser (never sent);
 * - `syncing`        being sent;
 * - `synced`         consolidated in every remote it was sent to;
 * - `dirty`          changed locally after the last sync;
 * - `pending-delete` deletion requested; waiting for the remote deletion (tombstone);
 * - `error`          last sync failed (see `lastError`).
 */
export type FzlSyncState = 'local-only' | 'syncing' | 'synced' | 'dirty' | 'pending-delete' | 'error';

/** Where a record is persisted remotely. */
export interface FzlRemoteRef {
  provider: string;
  remoteId: string;
  url?: string;
  syncedAt?: number;
}

export interface FzlCrudRecord<T = Record<string, unknown>> {
  id: string;
  data: T;
  syncState: FzlSyncState;
  remotes: FzlRemoteRef[];
  createdAt: number;
  updatedAt: number;
  lastError?: string;
  /** Failed remote-deletion attempts (tombstones are retried by `retryPending()`). */
  deleteAttempts?: number;
}

export interface FzlLocalAdapter<T = Record<string, unknown>> {
  list(): Promise<FzlCrudRecord<T>[]>;
  get(id: string): Promise<FzlCrudRecord<T> | undefined>;
  put(record: FzlCrudRecord<T>): Promise<void>;
  delete(id: string): Promise<void>;
  clear?(): Promise<void>;
}

export interface FzlRemoteAdapter<T = Record<string, unknown>> {
  /** Must match `FzlRemoteRef.provider` of the refs it handles. */
  readonly provider: string;
  /** Sends the record and returns where it was stored. */
  create(record: FzlCrudRecord<T>): Promise<FzlRemoteRef>;
  /** Replaces the remote content. Optional: without it, updates only mark the record `dirty`. */
  update?(record: FzlCrudRecord<T>, ref: FzlRemoteRef): Promise<FzlRemoteRef>;
  /** Removes the remote copy. Must resolve when it is already gone (idempotent). */
  delete(ref: FzlRemoteRef, record: FzlCrudRecord<T>): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local: memory
// ---------------------------------------------------------------------------

/** In-memory local adapter (tests, prototypes, data that must not survive a reload). */
export class FzlMemoryCrudAdapter<T = Record<string, unknown>> implements FzlLocalAdapter<T> {
  private readonly _records = new Map<string, FzlCrudRecord<T>>();

  constructor(initial: FzlCrudRecord<T>[] = []) {
    initial.forEach((record) => this._records.set(record.id, record));
  }

  async list(): Promise<FzlCrudRecord<T>[]> {
    return [...this._records.values()].map((record) => ({ ...record, remotes: [...record.remotes] }));
  }

  async get(id: string): Promise<FzlCrudRecord<T> | undefined> {
    const record = this._records.get(id);
    return record ? { ...record, remotes: [...record.remotes] } : undefined;
  }

  async put(record: FzlCrudRecord<T>): Promise<void> {
    this._records.set(record.id, { ...record, remotes: [...record.remotes] });
  }

  async delete(id: string): Promise<void> {
    this._records.delete(id);
  }

  async clear(): Promise<void> {
    this._records.clear();
  }
}

// ---------------------------------------------------------------------------
// Local: IndexedDB (optionally scoped per user)
// ---------------------------------------------------------------------------

interface StoredBlob {
  __fzlBlob: true;
  type: string;
  name?: string;
  lastModified?: number;
  data: ArrayBuffer;
}

const isBlob = (value: unknown): value is Blob =>
  typeof Blob !== 'undefined' && value instanceof Blob;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isStoredBlob = (value: unknown): value is StoredBlob =>
  Boolean(value && typeof value === 'object' && (value as StoredBlob).__fzlBlob === true);

async function encodeData(data: unknown): Promise<unknown> {
  if (isBlob(data)) {
    const file = data as Blob & { name?: string; lastModified?: number };
    return {
      __fzlBlob: true,
      type: data.type,
      name: typeof file.name === 'string' ? file.name : undefined,
      lastModified: typeof file.lastModified === 'number' ? file.lastModified : undefined,
      data: await data.arrayBuffer()
    } satisfies StoredBlob;
  }
  if (!isPlainObject(data)) return data;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) out[key] = await encodeData(value);
  return out;
}

function decodeData(data: unknown): unknown {
  if (isStoredBlob(data)) {
    if (data.name !== undefined && typeof File !== 'undefined') {
      return new File([data.data], data.name, { type: data.type, lastModified: data.lastModified });
    }
    return new Blob([data.data], { type: data.type });
  }
  if (!isPlainObject(data)) return data;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) out[key] = decodeData(value);
  return out;
}

function requestToPromise<R>(request: IDBRequest<R>): Promise<R> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new DOMException('Transaction aborted', 'AbortError'));
  });
}

export interface FzlIndexedDbCrudAdapterOptions {
  /** Database name (scoped automatically when `userData` is given). */
  dbName: string;
  storeName?: string;
  /** Isolates the database per user. Strongly recommended for user data. */
  userData?: FzlUserDataController | null;
  /** Custom factory (tests). Ignored when `userData` is given (it has its own). */
  indexedDB?: IDBFactory | null;
}

/**
 * IndexedDB local adapter. `Blob`/`File` values (top level of `data` or nested in plain
 * objects) are stored as `ArrayBuffer` and rebuilt on read, which works in every engine.
 * With `userData`, the database follows the active user: a different user opens a
 * different database, and with nobody logged in the adapter is empty and read-only.
 */
export class FzlIndexedDbCrudAdapter<T = Record<string, unknown>> implements FzlLocalAdapter<T> {
  readonly dbName: string;
  readonly storeName: string;
  private readonly _userData: FzlUserDataController | null;
  private readonly _factory: IDBFactory | null | undefined;
  private _db: Promise<IDBDatabase> | null = null;

  constructor(options: FzlIndexedDbCrudAdapterOptions) {
    this.dbName = options.dbName;
    this.storeName = options.storeName ?? 'records';
    this._userData = options.userData ?? null;
    this._factory = options.indexedDB;
  }

  private upgrade = (db: IDBDatabase): void => {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    }
  };

  /** `null` when scoped and nobody is logged in. */
  private open(): Promise<IDBDatabase> | null {
    if (this._userData) {
      if (!this._userData.isActive) return null;
      return this._userData.openDatabase(this.dbName, 1, this.upgrade);
    }
    if (this._db) return this._db;
    const factory = this._factory ?? (typeof indexedDB !== 'undefined' ? indexedDB : null);
    if (!factory) return Promise.reject(new Error('IndexedDB não é suportado neste navegador.'));
    this._db = new Promise((resolve, reject) => {
      const request = factory.open(this.dbName, 1);
      request.onupgradeneeded = () => this.upgrade(request.result);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this._db = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        this._db = null;
        reject(request.error);
      };
    });
    return this._db;
  }

  private requireOpen(): Promise<IDBDatabase> {
    const db = this.open();
    if (!db) return Promise.reject(new Error('Nenhum usuário ativo: armazenamento local fechado.'));
    return db;
  }

  async list(): Promise<FzlCrudRecord<T>[]> {
    const pending = this.open();
    if (!pending) return [];
    const db = await pending;
    const tx = db.transaction(this.storeName, 'readonly');
    const all = await requestToPromise(tx.objectStore(this.storeName).getAll());
    return (all as FzlCrudRecord<unknown>[]).map(
      (record) => ({ ...record, data: decodeData(record.data) }) as FzlCrudRecord<T>
    );
  }

  async get(id: string): Promise<FzlCrudRecord<T> | undefined> {
    const pending = this.open();
    if (!pending) return undefined;
    const db = await pending;
    const tx = db.transaction(this.storeName, 'readonly');
    const record = (await requestToPromise(tx.objectStore(this.storeName).get(id))) as
      | FzlCrudRecord<unknown>
      | undefined;
    return record ? ({ ...record, data: decodeData(record.data) } as FzlCrudRecord<T>) : undefined;
  }

  async put(record: FzlCrudRecord<T>): Promise<void> {
    // Encode before opening the transaction: it auto-commits across awaits.
    const stored = { ...record, remotes: [...record.remotes], data: await encodeData(record.data) };
    const db = await this.requireOpen();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).put(stored);
    await transactionDone(tx);
  }

  async delete(id: string): Promise<void> {
    const db = await this.requireOpen();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).delete(id);
    await transactionDone(tx);
  }

  async clear(): Promise<void> {
    const pending = this.open();
    if (!pending) return;
    const db = await pending;
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).clear();
    await transactionDone(tx);
  }

  close(): void {
    const pending = this._db;
    this._db = null;
    pending?.then((db) => db.close()).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Remote: Google Drive / OneDrive
// ---------------------------------------------------------------------------

type TokenProvider = () => Promise<string | null | undefined> | string | null | undefined;

export interface FzlFileRemoteAdapterOptions<T> {
  /** OAuth2 token (e.g. `() => socialAuth.requestCloudAccessToken('google')`). */
  getToken: TokenProvider;
  /** Extracts the file to send from a record. Default: `data.file` or `data.blob`. */
  getFile?: (record: FzlCrudRecord<T>) => Blob | null | undefined;
}

function defaultGetFile<T>(record: FzlCrudRecord<T>): Blob | null {
  const data = record.data as Record<string, unknown> | null;
  const candidate = data && (data.file ?? data.blob);
  return isBlob(candidate) ? candidate : null;
}

function asFile(blob: Blob, fallbackName: string): File {
  if (typeof File !== 'undefined' && blob instanceof File) return blob;
  return new File([blob], fallbackName, { type: blob.type });
}

function refFromResult(provider: string, result: FzlUploadResult): FzlRemoteRef {
  if (!result.success || !result.fileId) {
    throw new Error(result.error || `Envio para ${provider} falhou.`);
  }
  return {
    provider,
    remoteId: result.fileId,
    url: result.externalViewerUrl ?? result.fileUrl,
    syncedAt: Date.now()
  };
}

abstract class FzlFileRemoteAdapter<T> implements FzlRemoteAdapter<T> {
  abstract readonly provider: string;
  protected readonly getTokenFn: TokenProvider;
  protected readonly getFileFn: (record: FzlCrudRecord<T>) => Blob | null | undefined;

  constructor(options: FzlFileRemoteAdapterOptions<T>) {
    this.getTokenFn = options.getToken;
    this.getFileFn = options.getFile ?? defaultGetFile;
  }

  protected async token(): Promise<string> {
    const token = await this.getTokenFn();
    if (!token) throw new Error(`Sem autorização para ${this.provider}: faça login novamente.`);
    return token;
  }

  protected file(record: FzlCrudRecord<T>): File {
    const blob = this.getFileFn(record);
    if (!blob) throw new Error(`Registro "${record.id}" não tem arquivo para enviar.`);
    return asFile(blob, record.id);
  }

  abstract create(record: FzlCrudRecord<T>): Promise<FzlRemoteRef>;
  abstract update(record: FzlCrudRecord<T>, ref: FzlRemoteRef): Promise<FzlRemoteRef>;
  protected abstract remove(ref: FzlRemoteRef, token: string): Promise<void>;

  async delete(ref: FzlRemoteRef): Promise<void> {
    try {
      await this.remove(ref, await this.token());
    } catch (err) {
      // Already gone remotely: the goal (not existing there) is reached.
      if (err instanceof FzlCloudStorageError && err.isNotFound) return;
      throw err;
    }
  }
}

export interface FzlGoogleDriveRemoteAdapterOptions<T> extends FzlFileRemoteAdapterOptions<T> {
  folderId?: string;
  convertToDocs?: boolean;
  /** `false` (default) moves to the Drive trash (recoverable); `true` deletes for good. */
  permanentDelete?: boolean;
}

/** Google Drive remote adapter (`drive.file` scope is enough). */
export class FzlGoogleDriveRemoteAdapter<T = Record<string, unknown>> extends FzlFileRemoteAdapter<T> {
  readonly provider = 'google-drive';
  private readonly _opts: FzlGoogleDriveRemoteAdapterOptions<T>;

  constructor(options: FzlGoogleDriveRemoteAdapterOptions<T>) {
    super(options);
    this._opts = options;
  }

  async create(record: FzlCrudRecord<T>): Promise<FzlRemoteRef> {
    const result = await uploadToGoogleDrive(this.file(record), {
      folderId: this._opts.folderId,
      convertToDocs: this._opts.convertToDocs,
      token: await this.token()
    });
    return refFromResult(this.provider, result);
  }

  async update(record: FzlCrudRecord<T>, ref: FzlRemoteRef): Promise<FzlRemoteRef> {
    const result = await updateGoogleDriveFile(ref.remoteId, this.file(record), { token: await this.token() });
    return { ...refFromResult(this.provider, result), url: result.externalViewerUrl ?? ref.url };
  }

  protected remove(ref: FzlRemoteRef, token: string): Promise<void> {
    return deleteFromGoogleDrive(ref.remoteId, { token, permanent: this._opts.permanentDelete });
  }
}

export interface FzlOneDriveRemoteAdapterOptions<T> extends FzlFileRemoteAdapterOptions<T> {
  folderId?: string;
  driveId?: string;
}

/** Microsoft OneDrive remote adapter (deleted items go to the OneDrive recycle bin). */
export class FzlOneDriveRemoteAdapter<T = Record<string, unknown>> extends FzlFileRemoteAdapter<T> {
  readonly provider = 'onedrive';
  private readonly _opts: FzlOneDriveRemoteAdapterOptions<T>;

  constructor(options: FzlOneDriveRemoteAdapterOptions<T>) {
    super(options);
    this._opts = options;
  }

  async create(record: FzlCrudRecord<T>): Promise<FzlRemoteRef> {
    const result = await uploadToOneDrive(this.file(record), {
      folderId: this._opts.folderId,
      driveId: this._opts.driveId,
      token: await this.token()
    });
    return refFromResult(this.provider, result);
  }

  async update(record: FzlCrudRecord<T>, ref: FzlRemoteRef): Promise<FzlRemoteRef> {
    const result = await updateOneDriveFile(ref.remoteId, this.file(record), {
      token: await this.token(),
      driveId: this._opts.driveId
    });
    return refFromResult(this.provider, result);
  }

  protected remove(ref: FzlRemoteRef, token: string): Promise<void> {
    return deleteFromOneDrive(ref.remoteId, { token, driveId: this._opts.driveId });
  }
}
