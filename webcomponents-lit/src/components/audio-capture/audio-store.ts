import type { FzlAudioRecording } from './audio-capture.types';

export const FZL_AUDIO_DEFAULT_DB_NAME = 'fzl-audio-capture';
export const FZL_AUDIO_DEFAULT_STORE_NAME = 'recordings';
const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
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

/**
 * Shape persisted in IndexedDB. The audio is stored as an `ArrayBuffer` rather than a
 * `Blob`: ArrayBuffers survive structured cloning in every engine (older WebKit could not
 * store Blobs in IndexedDB), and the Blob is rebuilt on read.
 */
interface StoredAudioRecord extends Omit<FzlAudioRecording, 'blob'> {
  data: ArrayBuffer;
}

async function toStored(recording: FzlAudioRecording): Promise<StoredAudioRecord> {
  const { blob, ...meta } = recording;
  return { ...meta, data: await blob.arrayBuffer() };
}

function fromStored(record: StoredAudioRecord): FzlAudioRecording {
  const { data, ...meta } = record;
  return { ...meta, blob: new Blob([data], { type: meta.mimeType }) };
}

export function isIndexedDbSupported(factory?: IDBFactory): boolean {
  return Boolean(factory ?? (typeof indexedDB !== 'undefined' ? indexedDB : undefined));
}

/**
 * Small IndexedDB repository for audio recordings.
 *
 * Each record is a {@link FzlAudioRecording}; the audio binary is persisted as an
 * `ArrayBuffer` and returned as a `Blob`, keyed by `id`, with a `createdAt` index used
 * to list recordings newest first.
 *
 * The connection is opened lazily and shared per instance. A custom `IDBFactory`
 * may be injected (useful for tests).
 */
export class FzlAudioStore {
  readonly dbName: string;
  readonly storeName: string;
  private readonly _factory?: IDBFactory;
  private _dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    dbName: string = FZL_AUDIO_DEFAULT_DB_NAME,
    storeName: string = FZL_AUDIO_DEFAULT_STORE_NAME,
    factory?: IDBFactory
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this._factory = factory;
  }

  private _open(): Promise<IDBDatabase> {
    if (this._dbPromise) return this._dbPromise;

    const factory = this._factory ?? (typeof indexedDB !== 'undefined' ? indexedDB : undefined);
    if (!factory) {
      return Promise.reject(new Error('IndexedDB não é suportado neste navegador.'));
    }

    this._dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(this.dbName, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Let other tabs upgrade the schema: drop our handle when asked.
        db.onversionchange = () => {
          db.close();
          this._dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        this._dbPromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        this._dbPromise = null;
        reject(new Error('Abertura do IndexedDB bloqueada por outra aba.'));
      };
    });
    return this._dbPromise;
  }

  /** Inserts or replaces a recording. */
  async save(recording: FzlAudioRecording): Promise<FzlAudioRecording> {
    // Read the bytes before opening the transaction: it auto-commits across awaits.
    const stored = await toStored(recording);
    const db = await this._open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).put(stored);
    await transactionDone(tx);
    return recording;
  }

  /** Returns one recording (with its Blob), or `undefined` when not found. */
  async get(id: string): Promise<FzlAudioRecording | undefined> {
    const db = await this._open();
    const tx = db.transaction(this.storeName, 'readonly');
    const record = await requestToPromise<StoredAudioRecord | undefined>(tx.objectStore(this.storeName).get(id));
    return record ? fromStored(record) : undefined;
  }

  /** Returns every stored recording, newest first. */
  async list(): Promise<FzlAudioRecording[]> {
    const db = await this._open();
    const tx = db.transaction(this.storeName, 'readonly');
    const all = await requestToPromise<StoredAudioRecord[]>(
      tx.objectStore(this.storeName).index('createdAt').getAll()
    );
    return all.reverse().map(fromStored);
  }

  /** Renames a recording. Resolves to the updated record, or `undefined` when not found. */
  async rename(id: string, name: string): Promise<FzlAudioRecording | undefined> {
    const existing = await this.get(id);
    if (!existing) return undefined;
    return this.save({ ...existing, name });
  }

  async delete(id: string): Promise<void> {
    const db = await this._open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).delete(id);
    await transactionDone(tx);
  }

  async clear(): Promise<void> {
    const db = await this._open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).clear();
    await transactionDone(tx);
  }

  /** Closes the connection. The next call reopens it. */
  close(): void {
    const pending = this._dbPromise;
    this._dbPromise = null;
    pending?.then((db) => db.close()).catch(() => {});
  }
}
