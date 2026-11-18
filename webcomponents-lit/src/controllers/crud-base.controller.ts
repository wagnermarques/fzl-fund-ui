/**
 * @license
 * FZL Software — CRUD Base Reactive Controller (local-first, multi-source persistence)
 */
import { FzlBaseController, type FzlControllerHost } from './base.controller';
import type {
  FzlCrudRecord,
  FzlLocalAdapter,
  FzlRemoteAdapter,
  FzlRemoteRef,
  FzlSyncState
} from './crud-adapters';
import type { FzlDataGridController } from './data-grid.controller';
import type { FzlUserDataController } from './user-data.controller';

export interface FzlCrudBaseControllerOptions<T> {
  /** Browser persistence (first step / cache). */
  local: FzlLocalAdapter<T>;
  /** Final persistence targets (Google Drive, OneDrive, REST…). */
  remotes?: FzlRemoteAdapter<T>[];
  /**
   * Scopes the data per user: reloads on user change, reports unsynced records
   * before a logout purge and clears memory when the scope is purged.
   */
  userData?: FzlUserDataController | null;
  /** Loads on construction (default `true`). */
  autoLoad?: boolean;
  /** `load()` retries pending deletions and pending updates (default `true`). */
  retryPendingOnLoad?: boolean;
  /**
   * Sends to the remotes right after create/update: `true` = every remote,
   * a list = only those providers. Default `false` (sending is an explicit `sync()`).
   */
  autoSync?: boolean | string[];
  /** Confirmation before deleting (e.g. a dialog). Without it, delete proceeds. */
  confirmDelete?: (records: FzlCrudRecord<T>[]) => boolean | Promise<boolean>;
}

export interface FzlCrudWriteOptions {
  /** Overrides `autoSync` for this call. */
  sync?: boolean | string[];
}

export interface FzlRemoteFailure {
  provider: string;
  remoteId: string;
  error: string;
}

export interface FzlCrudDeleteResult {
  /** Removed from every source. */
  deleted: string[];
  /** Kept as tombstones (`pending-delete`) because a remote deletion failed; retried later. */
  pending: { id: string; failures: FzlRemoteFailure[] }[];
  /** `beforeDelete` / `confirmDelete` refused. */
  cancelled: boolean;
}

export interface FzlCrudSyncResult<T> {
  record: FzlCrudRecord<T> | undefined;
  failures: FzlRemoteFailure[];
}

/** Flattened record for grids: `{ id, ...data, syncState, remotes, updatedAt }`. */
export type FzlCrudRow<T> = T & {
  id: string;
  syncState: FzlSyncState;
  remotes: FzlRemoteRef[];
  updatedAt: number;
};

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Controller headless de CRUD *local-first* com persistência em múltiplas fontes.
 *
 * O navegador (adaptador local: IndexedDB, memória…) é o primeiro passo / cache e os
 * adaptadores remotos (Google Drive, OneDrive, REST…) são a persistência final. O
 * controller mantém as duas coerentes:
 *
 * - **delete** = o registro deixa de existir em **todas** as fontes. Ordem: marca uma
 *   *lápide* local (`pending-delete`, some da lista na hora) → apaga em cada remoto →
 *   só então apaga o local. Se um remoto falhar, a lápide fica e `retryPending()`
 *   tenta de novo (o registro nunca "ressuscita" e o arquivo remoto nunca fica órfão);
 * - **create/update** gravam localmente e, conforme `autoSync`/`sync()`, enviam aos remotos;
 * - cada registro carrega `syncState` e `remotes` (onde está persistido).
 *
 * Extensível via herança (`extends FzlCrudBaseController<T>`) pelos hooks protegidos
 * `createId`, `beforeCreate`, `beforeUpdate`, `beforeDelete`, `deleteRemote`,
 * `deleteLocal`, `afterDelete`, `onPartialFailure`, `onSynced`, `onSyncError`,
 * `isUnsynced` e `toRow`.
 */
export class FzlCrudBaseController<T = Record<string, unknown>> extends FzlBaseController {
  protected readonly local: FzlLocalAdapter<T>;
  protected readonly remotes = new Map<string, FzlRemoteAdapter<T>>();
  protected readonly userData: FzlUserDataController | null;
  private readonly _retryOnLoad: boolean;
  private readonly _autoSync: boolean | string[];
  private readonly _confirmDelete?: FzlCrudBaseControllerOptions<T>['confirmDelete'];
  private _records: FzlCrudRecord<T>[] = [];
  private readonly _busy = new Set<string>();
  private _loading = false;
  private _loaded = false;
  private _lastError: string | null = null;
  private _scope: string | null | undefined;
  private _loadSeq = 0;
  private readonly _cleanups: (() => void)[] = [];

  constructor(host: FzlControllerHost | null | undefined, options: FzlCrudBaseControllerOptions<T>) {
    super(host);
    if (!options?.local) throw new Error('FzlCrudBaseController: o adaptador "local" é obrigatório.');
    this.local = options.local;
    (options.remotes ?? []).forEach((adapter) => this.remotes.set(adapter.provider, adapter));
    this.userData = options.userData ?? null;
    this._retryOnLoad = options.retryPendingOnLoad ?? true;
    this._autoSync = options.autoSync ?? false;
    this._confirmDelete = options.confirmDelete;

    if (this.userData) {
      const userData = this.userData;
      this._scope = userData.scope;
      this._cleanups.push(
        userData.registerParticipant({
          countUnsynced: () => this.unsyncedCount,
          purge: (scope) => {
            if (scope === this._scope) this.resetMemory();
          }
        }),
        userData.subscribe(() => {
          if (userData.scope === this._scope) return;
          this._scope = userData.scope;
          this.resetMemory();
          if (userData.isActive) void this.load();
        })
      );
    }

    if (options.autoLoad !== false) void this.load();
  }

  // --- state ---------------------------------------------------------------

  /** Visible records (tombstones excluded). */
  get items(): FzlCrudRecord<T>[] {
    return this._records.filter((record) => record.syncState !== 'pending-delete');
  }

  /** Every record, including `pending-delete` tombstones. */
  get allRecords(): FzlCrudRecord<T>[] {
    return [...this._records];
  }

  /** Flattened visible records for grids/tables. */
  get rows(): FzlCrudRow<T>[] {
    return this.items.map((record) => this.toRow(record));
  }

  get pendingDeletes(): FzlCrudRecord<T>[] {
    return this._records.filter((record) => record.syncState === 'pending-delete');
  }

  /** Records whose data is not consolidated remotely yet (see `isUnsynced`). */
  get unsyncedCount(): number {
    return this._records.filter((record) => this.isUnsynced(record)).length;
  }

  get isLoading(): boolean {
    return this._loading;
  }

  get isLoaded(): boolean {
    return this._loaded;
  }

  get lastError(): string | null {
    return this._lastError;
  }

  get remoteProviders(): string[] {
    return [...this.remotes.keys()];
  }

  isBusy(id?: string): boolean {
    return id === undefined ? this._busy.size > 0 : this._busy.has(id);
  }

  get(id: string): FzlCrudRecord<T> | undefined {
    return this._records.find((record) => record.id === id);
  }

  addRemote(adapter: FzlRemoteAdapter<T>): this {
    this.remotes.set(adapter.provider, adapter);
    return this;
  }

  removeRemote(provider: string): this {
    this.remotes.delete(provider);
    return this;
  }

  // --- lifecycle ---------------------------------------------------------------

  /** Releases subscriptions (userData, grids). Call when the controller is discarded. */
  dispose(): void {
    this._cleanups.splice(0).forEach((fn) => fn());
  }

  /**
   * Mirrors the visible rows into a `FzlDataGridController` (or any `{ setItems }`).
   * Returns the unbind function.
   */
  bindGrid(grid: Pick<FzlDataGridController<any>, 'setItems'>): () => void {
    const push = () => grid.setItems(this.rows as any[]);
    push();
    const off = this.subscribe(push);
    this._cleanups.push(off);
    return off;
  }

  private resetMemory(): void {
    this._loadSeq++;
    this._records = [];
    this._busy.clear();
    this._loaded = false;
    this._lastError = null;
    this.notifyChange();
  }

  private replace(record: FzlCrudRecord<T>): void {
    const index = this._records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      const next = [...this._records];
      next[index] = record;
      this._records = next;
    } else {
      this._records = [...this._records, record];
    }
  }

  private drop(id: string): void {
    this._records = this._records.filter((record) => record.id !== id);
  }

  private fail(message: string, detail: Record<string, unknown> = {}): void {
    this._lastError = message;
    this.emitHostEvent('fzl-crud-error', { error: message, ...detail });
  }

  // --- read ------------------------------------------------------------------------

  /** Loads the records from the local adapter (and retries pending work if configured). */
  async load(): Promise<FzlCrudRecord<T>[]> {
    const seq = ++this._loadSeq;
    this._loading = true;
    this.notifyChange();
    try {
      const records = await this.local.list();
      if (seq !== this._loadSeq) return this.items; // user changed meanwhile
      this._records = records.sort((a, b) => a.createdAt - b.createdAt);
      this._loaded = true;
      this._lastError = null;
      this.emitHostEvent('fzl-crud-loaded', { records: this.items });
    } catch (err) {
      if (seq === this._loadSeq) this.fail(errorMessage(err), { operation: 'load' });
    } finally {
      if (seq === this._loadSeq) {
        this._loading = false;
        this.notifyChange();
      }
    }
    if (seq === this._loadSeq && this._retryOnLoad && this._loaded) {
      await this.retryPending();
    }
    return this.items;
  }

  // --- create / update ---------------------------------------------------------------

  async create(data: T, options: FzlCrudWriteOptions & { id?: string } = {}): Promise<FzlCrudRecord<T> | null> {
    let prepared: T | false;
    try {
      prepared = await this.beforeCreate(data);
    } catch (err) {
      this.fail(errorMessage(err), { operation: 'create' });
      this.notifyChange();
      return null;
    }
    if (prepared === false) return null;

    const now = Date.now();
    const record: FzlCrudRecord<T> = {
      id: options.id ?? this.createId(prepared),
      data: prepared,
      syncState: 'local-only',
      remotes: [],
      createdAt: now,
      updatedAt: now
    };

    try {
      await this.local.put(record);
    } catch (err) {
      this.fail(errorMessage(err), { operation: 'create', id: record.id });
      this.notifyChange();
      return null;
    }
    this.replace(record);
    this.emitHostEvent('fzl-crud-create', { record });
    this.notifyChange();

    const providers = this.resolveSyncTargets(options.sync);
    if (providers.length) return (await this.sync(record.id, providers)).record ?? record;
    return record;
  }

  async update(
    id: string,
    patch: Partial<T> | ((data: T) => T),
    options: FzlCrudWriteOptions = {}
  ): Promise<FzlCrudRecord<T> | null> {
    const current = this.get(id);
    if (!current || current.syncState === 'pending-delete') return null;
    if (this._busy.has(id)) {
      this.fail('Operação em andamento para este registro.', { operation: 'update', id });
      return null;
    }

    const merged =
      typeof patch === 'function'
        ? (patch as (data: T) => T)(current.data)
        : ({ ...(current.data as object), ...(patch as object) } as T);

    let nextData: T | false;
    try {
      nextData = await this.beforeUpdate(current, merged);
    } catch (err) {
      this.fail(errorMessage(err), { operation: 'update', id });
      this.notifyChange();
      return null;
    }
    if (nextData === false) return null;

    const record: FzlCrudRecord<T> = {
      ...current,
      data: nextData,
      updatedAt: Date.now(),
      syncState: current.remotes.length ? 'dirty' : 'local-only',
      lastError: undefined
    };
    try {
      await this.local.put(record);
    } catch (err) {
      this.fail(errorMessage(err), { operation: 'update', id });
      this.notifyChange();
      return null;
    }
    this.replace(record);
    this.emitHostEvent('fzl-crud-update', { record, previous: current });
    this.notifyChange();

    const explicit = this.resolveSyncTargets(options.sync);
    // A record already persisted remotely is kept in step with those remotes.
    const providers = Array.from(
      new Set([...explicit, ...(options.sync === false ? [] : this.autoSyncExisting(record))])
    );
    if (providers.length) return (await this.sync(id, providers)).record ?? record;
    return record;
  }

  private resolveSyncTargets(sync: FzlCrudWriteOptions['sync']): string[] {
    const value = sync ?? this._autoSync;
    if (value === true) return this.remoteProviders;
    if (Array.isArray(value)) return value.filter((provider) => this.remotes.has(provider));
    return [];
  }

  private autoSyncExisting(record: FzlCrudRecord<T>): string[] {
    if (this._autoSync === false) return [];
    return record.remotes.map((ref) => ref.provider).filter((p) => this.remotes.has(p));
  }

  /**
   * Records that the record is persisted remotely, for apps that send it through their own
   * pipeline instead of `sync()`. Replaces (or adds) the ref of the same provider and marks
   * the record `synced`, so `delete()` reaches the remote copy. When the record does not exist
   * it is created from `data` (e.g. a file that only exists in the cloud). Tombstones and
   * records with an operation in progress are left untouched (`null`).
   */
  async attachRemote(id: string, ref: FzlRemoteRef, data?: T): Promise<FzlCrudRecord<T> | null> {
    if (this._busy.has(id)) return null;
    const current = this.get(id);
    if (current?.syncState === 'pending-delete') return null;

    const now = Date.now();
    const remoteRef: FzlRemoteRef = { ...ref, syncedAt: ref.syncedAt ?? now };
    const record: FzlCrudRecord<T> = current
      ? {
          ...current,
          data: data ?? current.data,
          remotes: [...current.remotes.filter((r) => r.provider !== ref.provider), remoteRef],
          syncState: 'synced',
          updatedAt: now,
          lastError: undefined
        }
      : {
          id,
          data: data ?? ({} as T),
          remotes: [remoteRef],
          syncState: 'synced',
          createdAt: now,
          updatedAt: now
        };

    try {
      await this.local.put(record);
    } catch (err) {
      this.fail(errorMessage(err), { operation: 'attachRemote', id });
      this.notifyChange();
      return null;
    }
    this.replace(record);
    this.emitHostEvent('fzl-crud-sync', { record });
    this.notifyChange();
    return record;
  }

  /**
   * Changes only the local data (e.g. the saved binary of an existing document) without
   * touching `syncState` or `remotes`. Tombstones and busy records are left untouched (`null`).
   */
  async putLocal(id: string, patch: Partial<T> | ((data: T) => T)): Promise<FzlCrudRecord<T> | null> {
    const current = this.get(id);
    if (!current || current.syncState === 'pending-delete' || this._busy.has(id)) return null;
    const data =
      typeof patch === 'function'
        ? (patch as (data: T) => T)(current.data)
        : ({ ...(current.data as object), ...(patch as object) } as T);
    const record: FzlCrudRecord<T> = { ...current, data, updatedAt: Date.now() };
    try {
      await this.local.put(record);
    } catch (err) {
      this.fail(errorMessage(err), { operation: 'putLocal', id });
      this.notifyChange();
      return null;
    }
    this.replace(record);
    this.emitHostEvent('fzl-crud-update', { record, previous: current, localOnly: true });
    this.notifyChange();
    return record;
  }

  // --- sync ------------------------------------------------------------------------------

  /**
   * Sends a record to the remotes (default: every remote it is already in, or every
   * configured remote when it was never sent). Existing refs are updated, new ones created.
   */
  async sync(id: string, providers?: string[]): Promise<FzlCrudSyncResult<T>> {
    let record = this.get(id);
    if (!record || record.syncState === 'pending-delete') return { record, failures: [] };
    if (this._busy.has(id)) {
      return { record, failures: [{ provider: '*', remoteId: '', error: 'Operação em andamento.' }] };
    }

    const targets = (
      providers ?? (record.remotes.length ? record.remotes.map((r) => r.provider) : this.remoteProviders)
    ).filter((provider, i, all) => all.indexOf(provider) === i);

    const failures: FzlRemoteFailure[] = [];
    const previousState = record.syncState;
    let skippedUpdate = false;
    this._busy.add(id);
    record = { ...record, syncState: 'syncing' };
    this.replace(record);
    this.notifyChange();

    let remotes = [...record.remotes];
    for (const provider of targets) {
      const adapter = this.remotes.get(provider);
      const existing = remotes.find((ref) => ref.provider === provider);
      if (!adapter) {
        failures.push({ provider, remoteId: existing?.remoteId ?? '', error: 'Adaptador remoto não configurado.' });
        continue;
      }
      try {
        let ref: FzlRemoteRef;
        if (existing) {
          if (!adapter.update) {
            // create-only remote: the remote copy cannot be refreshed
            if (previousState === 'dirty') skippedUpdate = true;
            continue;
          }
          ref = await adapter.update(record, existing);
        } else {
          ref = await adapter.create(record);
        }
        remotes = [...remotes.filter((r) => r.provider !== provider), { ...ref, syncedAt: ref.syncedAt ?? Date.now() }];
      } catch (err) {
        failures.push({ provider, remoteId: existing?.remoteId ?? '', error: errorMessage(err) });
      }
    }

    const syncState: FzlSyncState = failures.length
      ? 'error'
      : skippedUpdate
        ? 'dirty'
        : remotes.length
          ? 'synced'
          : previousState === 'error'
            ? 'local-only'
            : previousState;
    const finalRecord: FzlCrudRecord<T> = {
      ...record,
      remotes,
      syncState,
      lastError: failures.length ? failures.map((f) => `${f.provider}: ${f.error}`).join('; ') : undefined
    };

    try {
      await this.local.put(finalRecord);
    } catch (err) {
      failures.push({ provider: 'local', remoteId: '', error: errorMessage(err) });
    }
    this._busy.delete(id);
    // A delete may have started on another path; never overwrite a tombstone.
    if (this.get(id)?.syncState !== 'pending-delete') this.replace(finalRecord);

    if (failures.length) {
      this._lastError = finalRecord.lastError ?? null;
      await this.onSyncError(finalRecord, failures);
      this.emitHostEvent('fzl-crud-sync-error', { record: finalRecord, failures });
    } else {
      await this.onSynced(finalRecord);
      this.emitHostEvent('fzl-crud-sync', { record: finalRecord });
    }
    this.notifyChange();
    return { record: finalRecord, failures };
  }

  // --- delete ----------------------------------------------------------------------------

  /**
   * Deletes from **every** persistence source (remote first, then local).
   * Records whose remote deletion fails stay as `pending-delete` tombstones.
   */
  async delete(idOrIds: string | string[], options: { skipConfirm?: boolean } = {}): Promise<FzlCrudDeleteResult> {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const records = ids
      .map((id) => this.get(id))
      .filter((record): record is FzlCrudRecord<T> => Boolean(record) && !this._busy.has(record!.id));
    const result: FzlCrudDeleteResult = { deleted: [], pending: [], cancelled: false };
    if (!records.length) return result;

    const fresh = records.filter((record) => record.syncState !== 'pending-delete');
    if (fresh.length && !options.skipConfirm) {
      let allowed: boolean;
      try {
        allowed = await this.beforeDelete(fresh);
      } catch (err) {
        this.fail(errorMessage(err), { operation: 'delete' });
        allowed = false;
      }
      if (!allowed) {
        result.cancelled = true;
        return result;
      }
    }

    for (const record of records) {
      const outcome = await this.deleteOne(record);
      if (outcome.length) result.pending.push({ id: record.id, failures: outcome });
      else result.deleted.push(record.id);
    }
    this.notifyChange();
    return result;
  }

  private async deleteOne(original: FzlCrudRecord<T>): Promise<FzlRemoteFailure[]> {
    const id = original.id;
    this._busy.add(id);

    // 1. Tombstone: disappears from the list now, survives reloads until done.
    let record: FzlCrudRecord<T> = { ...original, syncState: 'pending-delete', updatedAt: Date.now() };
    try {
      await this.local.put(record);
    } catch (err) {
      this._busy.delete(id);
      const failure = { provider: 'local', remoteId: '', error: errorMessage(err) };
      this.fail(failure.error, { operation: 'delete', id });
      return [failure];
    }
    this.replace(record);
    this.notifyChange();

    // 2. Remote copies.
    const failures: FzlRemoteFailure[] = [];
    for (const ref of [...record.remotes]) {
      const adapter = this.remotes.get(ref.provider);
      try {
        if (!adapter) throw new Error('Adaptador remoto não configurado.');
        await this.deleteRemote(ref, record, adapter);
        record = { ...record, remotes: record.remotes.filter((r) => r !== ref) };
      } catch (err) {
        failures.push({ provider: ref.provider, remoteId: ref.remoteId, error: errorMessage(err) });
      }
    }

    // 3a. Some remote failed: keep the tombstone (with what is left) for retryPending().
    if (failures.length) {
      record = {
        ...record,
        deleteAttempts: (record.deleteAttempts ?? 0) + 1,
        lastError: failures.map((f) => `${f.provider}: ${f.error}`).join('; ')
      };
      try {
        await this.local.put(record);
      } catch {
        // memory keeps the tombstone anyway
      }
      this.replace(record);
      this._busy.delete(id);
      this._lastError = record.lastError ?? null;
      await this.onPartialFailure(record, failures);
      this.emitHostEvent('fzl-crud-delete-pending', { record, failures });
      return failures;
    }

    // 3b. Every remote is gone: remove locally.
    try {
      await this.deleteLocal(record);
    } catch (err) {
      this._busy.delete(id);
      const failure = { provider: 'local', remoteId: '', error: errorMessage(err) };
      this.fail(failure.error, { operation: 'delete', id });
      return [failure];
    }
    this.drop(id);
    this._busy.delete(id);
    await this.afterDelete(original);
    this.emitHostEvent('fzl-crud-delete', { record: original });
    return [];
  }

  /**
   * Retries the pending work: tombstones (`pending-delete`) and records changed after
   * their last sync (`dirty`) or whose sync failed (`error`) that already have remotes.
   */
  async retryPending(): Promise<{ deleted: string[]; pending: string[]; synced: string[] }> {
    const summary = { deleted: [] as string[], pending: [] as string[], synced: [] as string[] };
    const tombstones = this.pendingDeletes.map((record) => record.id);
    if (tombstones.length) {
      const result = await this.delete(tombstones, { skipConfirm: true });
      summary.deleted.push(...result.deleted);
      summary.pending.push(...result.pending.map((p) => p.id));
    }
    const stale = this._records.filter(
      (record) => (record.syncState === 'dirty' || record.syncState === 'error') && record.remotes.length
    );
    for (const record of stale) {
      const { failures } = await this.sync(record.id);
      if (!failures.length) summary.synced.push(record.id);
    }
    return summary;
  }

  // --- protected hooks -----------------------------------------------------------------------

  protected createId(_data: T): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Validate/transform before creating; `false` cancels. */
  protected async beforeCreate(data: T): Promise<T | false> {
    return data;
  }

  /** Validate/transform before updating; `false` cancels. */
  protected async beforeUpdate(_current: FzlCrudRecord<T>, next: T): Promise<T | false> {
    return next;
  }

  /** Gate before deleting (e.g. a dialog that says the file also leaves Google Drive). */
  protected async beforeDelete(records: FzlCrudRecord<T>[]): Promise<boolean> {
    return this._confirmDelete ? Boolean(await this._confirmDelete(records)) : true;
  }

  /** Deletes one remote copy. Default: the adapter's `delete()`. */
  protected async deleteRemote(
    ref: FzlRemoteRef,
    record: FzlCrudRecord<T>,
    adapter: FzlRemoteAdapter<T>
  ): Promise<void> {
    await adapter.delete(ref, record);
  }

  /** Deletes the local copy. Default: the local adapter's `delete()`. */
  protected async deleteLocal(record: FzlCrudRecord<T>): Promise<void> {
    await this.local.delete(record.id);
  }

  protected async afterDelete(_record: FzlCrudRecord<T>): Promise<void> {
    // Extensível em subclasses
  }

  /** A remote deletion failed; the record stays as a tombstone. */
  protected async onPartialFailure(_record: FzlCrudRecord<T>, _failures: FzlRemoteFailure[]): Promise<void> {
    // Extensível em subclasses
  }

  protected async onSynced(_record: FzlCrudRecord<T>): Promise<void> {
    // Extensível em subclasses
  }

  protected async onSyncError(_record: FzlCrudRecord<T>, _failures: FzlRemoteFailure[]): Promise<void> {
    // Extensível em subclasses
  }

  /**
   * Whether a record would be lost (or leave an orphan remotely) if the local data were
   * purged now. Default: every state but `synced`.
   */
  protected isUnsynced(record: FzlCrudRecord<T>): boolean {
    return record.syncState !== 'synced';
  }

  protected toRow(record: FzlCrudRecord<T>): FzlCrudRow<T> {
    return {
      ...(record.data as object),
      id: record.id,
      syncState: record.syncState,
      remotes: record.remotes,
      updatedAt: record.updatedAt
    } as FzlCrudRow<T>;
  }
}
