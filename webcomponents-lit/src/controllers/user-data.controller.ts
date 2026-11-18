/**
 * @license
 * FZL Software — User-Scoped Local Data Reactive Controller
 */
import { FzlBaseController, type FzlControllerHost } from './base.controller';

/** Minimal identity needed to isolate local data. `id` must be stable (e.g. OAuth `sub`). */
export interface FzlUserIdentity {
  id: string;
  provider?: string | null;
  email?: string | null;
  name?: string | null;
}

/**
 * What happens to the local data of a user when they log out:
 * - `keep`:  data stays on disk (isolated by namespace) for the next login of the same user;
 * - `purge`: data is erased; if there is unsynced data, `confirmPurge` is asked first;
 * - `ask`:   `confirmPurge` is always asked.
 *
 * Whatever the policy, data is always isolated per user: another user never sees it.
 */
export type FzlLogoutPolicy = 'keep' | 'purge' | 'ask';

export interface FzlPurgeRequest {
  scope: string;
  user: FzlUserIdentity;
  /** Records not yet consolidated in the final persistence (sum of every participant). */
  unsynced: number;
  policy: FzlLogoutPolicy;
  reason?: string;
}

/**
 * Something that keeps data inside a user scope (a CRUD controller, a bookmarks list...).
 * Registered with {@link FzlUserDataController.registerParticipant}.
 */
export interface FzlUserDataParticipant {
  /** How many records of the current scope are not consolidated remotely yet. */
  countUnsynced?(): number | Promise<number>;
  /** Called when a scope is purged, before the databases and keys are removed. */
  purge?(scope: string): void | Promise<void>;
}

/**
 * Any auth source with `subscribe()`: `FzlSocialAuthController`, the appshell `authService`
 * (`subscribe((user, reason) => ...)`) or an app-specific service.
 */
export interface FzlAuthSource {
  subscribe(listener: (...args: any[]) => void): () => void;
  readonly currentUser?: unknown;
  getCurrentUser?(): unknown;
}

export interface FzlUserDataControllerOptions {
  /** Application namespace (e.g. `'caqdas'`). Two apps on the same origin never share data. */
  appId: string;
  /** Default `'purge'`. */
  logoutPolicy?: FzlLogoutPolicy;
  /**
   * Asked before purging when the policy is `ask`, or when it is `purge` and there is
   * unsynced data. Without it, the data is kept (never lost silently).
   */
  confirmPurge?: (request: FzlPurgeRequest) => boolean | Promise<boolean>;
  /** Initial user (optional; usually comes from `bindAuth()`). */
  user?: FzlUserIdentity | null;
  /** Storage for scoped keys (default `localStorage`). */
  storage?: Storage | null;
  /** IndexedDB factory (default global `indexedDB`; inject `fake-indexeddb` in tests). */
  indexedDB?: IDBFactory | null;
}

const KEY_ROOT = 'fzl-ud';

/** cyrb53: small, fast, non-cryptographic 53-bit hash, used only to keep ids out of key names. */
function hash53(input: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function readJsonArray(storage: Storage | null, key: string): string[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeJsonArray(storage: Storage | null, key: string, values: string[]): void {
  if (!storage) return;
  try {
    if (values.length) storage.setItem(key, JSON.stringify(values));
    else storage.removeItem(key);
  } catch {
    // quota / private mode: the registry is best effort
  }
}

/**
 * Controller headless que isola os dados locais (IndexedDB e `Storage`) por usuário
 * e aplica a política de limpeza no logout.
 *
 * Cada usuário recebe um *escopo* (`fzl-ud:<appId>:<hash do usuário>`): todo banco
 * IndexedDB e toda chave de storage aberta por este controller carrega esse prefixo,
 * então trocar de usuário — mesmo sem logout (aba fechada, token expirado) — nunca
 * mostra os dados do anterior. No logout a política (`keep` | `purge` | `ask`) decide
 * se os dados do escopo que saiu são apagados.
 *
 * Extensível via herança (`extends FzlUserDataController`) pelos hooks protegidos
 * `resolveUserScope`, `toIdentity`, `countUnsynced`, `shouldPurgeOnLogout`,
 * `confirmPurge`, `onBeforePurge`, `onAfterPurge` e `onUserChanged`.
 */
export class FzlUserDataController extends FzlBaseController {
  readonly appId: string;
  private _policy: FzlLogoutPolicy;
  private readonly _confirmPurge?: FzlUserDataControllerOptions['confirmPurge'];
  private readonly _customStorage: Storage | null | undefined;
  private readonly _customIdb: IDBFactory | null | undefined;
  private _user: FzlUserIdentity | null = null;
  private _scope: string | null = null;
  private _transition: Promise<void> = Promise.resolve();
  private readonly _openDbs = new Map<string, Promise<IDBDatabase>>();
  private readonly _participants = new Set<FzlUserDataParticipant>();

  constructor(host: FzlControllerHost | null | undefined, options: FzlUserDataControllerOptions) {
    super(host);
    if (!options?.appId || /[:\s]/.test(options.appId)) {
      throw new Error('FzlUserDataController: "appId" é obrigatório e não pode conter ":" nem espaços.');
    }
    this.appId = options.appId;
    this._policy = options.logoutPolicy ?? 'purge';
    this._confirmPurge = options.confirmPurge;
    this._customStorage = options.storage;
    this._customIdb = options.indexedDB;
    if (options.user) {
      this._user = options.user;
      this._scope = this.resolveUserScope(options.user);
      this.rememberScope(this._scope);
    }
  }

  // --- state ---------------------------------------------------------------

  get user(): FzlUserIdentity | null {
    return this._user;
  }

  /** Current scope id, or `null` with nobody logged in (no data can be opened then). */
  get scope(): string | null {
    return this._scope;
  }

  get isActive(): boolean {
    return this._scope !== null;
  }

  get logoutPolicy(): FzlLogoutPolicy {
    return this._policy;
  }

  setLogoutPolicy(policy: FzlLogoutPolicy): this {
    this._policy = policy;
    this.notifyChange();
    return this;
  }

  /** Resolves when the pending user transition (logout handling, purge, switch) is done. */
  whenReady(): Promise<void> {
    return this._transition;
  }

  // --- naming --------------------------------------------------------------

  private scopePrefix(scope: string): string {
    return `${KEY_ROOT}:${this.appId}:${scope}:`;
  }

  private get scopesRegistryKey(): string {
    return `${KEY_ROOT}:${this.appId}:__scopes`;
  }

  private dbRegistryKey(scope: string): string {
    return `${this.scopePrefix(scope)}__dbs`;
  }

  private requireScope(): string {
    if (!this._scope) {
      throw new Error('FzlUserDataController: nenhum usuário ativo — os dados locais estão fechados.');
    }
    return this._scope;
  }

  /**
   * Name scoped to the current user — use it for IndexedDB names and `Storage` keys
   * (e.g. `<fzl-audio-capture .dbName=${userData.scopedName('audio')}>`).
   * Throws with nobody logged in.
   */
  scopedName(name: string): string {
    return `${this.scopePrefix(this.requireScope())}${name}`;
  }

  /** Same as {@link scopedName}, but returns `null` instead of throwing with nobody logged in. */
  tryScopedName(name: string): string | null {
    return this._scope ? this.scopedName(name) : null;
  }

  /** Scopes that have (or had) data in this browser for this app. */
  listKnownScopes(): string[] {
    return readJsonArray(this.getStorage(), this.scopesRegistryKey);
  }

  private rememberScope(scope: string): void {
    const storage = this.getStorage();
    const scopes = readJsonArray(storage, this.scopesRegistryKey);
    if (!scopes.includes(scope)) writeJsonArray(storage, this.scopesRegistryKey, [...scopes, scope]);
  }

  // --- user lifecycle --------------------------------------------------------

  /**
   * Changes the active user. Transitions are serialized: the logout policy of the
   * previous user runs (and finishes) before the new scope becomes active.
   */
  setUser(user: FzlUserIdentity | null, reason?: string): Promise<void> {
    this._transition = this._transition
      .catch(() => undefined)
      .then(() => this.applyUser(user, reason));
    return this._transition;
  }

  /** Same as `setUser(null, reason)`. */
  logout(reason = 'signOut'): Promise<void> {
    return this.setUser(null, reason);
  }

  private async applyUser(next: FzlUserIdentity | null, reason?: string): Promise<void> {
    const nextScope = next ? this.resolveUserScope(next) : null;
    const previous = this._user;
    const previousScope = this._scope;

    if (nextScope === previousScope) {
      this._user = next;
      return;
    }

    if (previous && previousScope) {
      await this.handleLogout(previous, previousScope, reason);
    }

    this.closeDatabases();
    this._user = next;
    this._scope = nextScope;
    if (nextScope) this.rememberScope(nextScope);

    await this.onUserChanged(previous, next);
    this.emitHostEvent('fzl-user-data-scope-change', {
      previousScope,
      scope: nextScope,
      user: next,
      reason
    });
    this.notifyChange();
  }

  private async handleLogout(user: FzlUserIdentity, scope: string, reason?: string): Promise<void> {
    const unsynced = await this.getUnsyncedCount();
    const request: FzlPurgeRequest = { scope, user, unsynced, policy: this._policy, reason };

    if (!this.shouldPurgeOnLogout(request)) {
      this.emitHostEvent('fzl-user-data-kept', request);
      return;
    }

    const needsConfirmation = this._policy === 'ask' || unsynced > 0;
    const confirmed = needsConfirmation ? await this.confirmPurge(request) : true;
    if (!confirmed) {
      this.emitHostEvent('fzl-user-data-kept', request);
      return;
    }
    await this.purge(scope);
  }

  /**
   * Connects the controller to an auth source. Accepts `FzlSocialAuthController`
   * (reads `currentUser`), the appshell `authService` (`getCurrentUser()` /
   * `subscribe((user, reason) => …)`) or anything with the same shape.
   * Returns the unbind function.
   */
  bindAuth(source: FzlAuthSource, mapUser?: (raw: unknown) => FzlUserIdentity | null): () => void {
    const read = (args: unknown[]): FzlUserIdentity | null => {
      let raw: unknown;
      if (typeof source.getCurrentUser === 'function') raw = source.getCurrentUser();
      else if ('currentUser' in source) raw = source.currentUser;
      else raw = args[0];
      if (!raw) return null;
      return mapUser ? mapUser(raw) : this.toIdentity(raw);
    };
    let lastScope: string | null | undefined;
    const sync = (args: unknown[]): void => {
      const user = read(args);
      const scope = user ? this.resolveUserScope(user) : null;
      if (scope === lastScope) return; // ignore unrelated notifications (busy flags, tokens...)
      lastScope = scope;
      void this.setUser(user, typeof args[1] === 'string' ? args[1] : undefined);
    };
    const off = source.subscribe((...args: unknown[]) => sync(args));
    sync([]);
    return off;
  }

  // --- participants & unsynced data -----------------------------------------

  /** Registers a participant (CRUD, bookmarks…). Returns the unregister function. */
  registerParticipant(participant: FzlUserDataParticipant): () => void {
    this._participants.add(participant);
    return () => {
      this._participants.delete(participant);
    };
  }

  /** Sum of the unsynced records of every participant plus {@link countUnsynced}. */
  async getUnsyncedCount(): Promise<number> {
    let total = await this.countUnsynced();
    for (const participant of [...this._participants]) {
      if (participant.countUnsynced) {
        try {
          total += Number(await participant.countUnsynced()) || 0;
        } catch {
          // a failing participant must not block logout
        }
      }
    }
    return total;
  }

  // --- IndexedDB -------------------------------------------------------------

  /**
   * Opens (or reuses) an IndexedDB database scoped to the current user.
   * `upgrade` runs on `onupgradeneeded`, as in `indexedDB.open()`.
   */
  openDatabase(
    name: string,
    version = 1,
    upgrade?: (db: IDBDatabase, oldVersion: number, tx: IDBTransaction | null) => void
  ): Promise<IDBDatabase> {
    const scope = this.requireScope();
    const fullName = this.scopedName(name);
    const cached = this._openDbs.get(fullName);
    if (cached) return cached;

    const factory = this.getIndexedDb();
    if (!factory) return Promise.reject(new Error('IndexedDB não é suportado neste navegador.'));

    const registryKey = this.dbRegistryKey(scope);
    const storage = this.getStorage();
    const known = readJsonArray(storage, registryKey);
    if (!known.includes(fullName)) writeJsonArray(storage, registryKey, [...known, fullName]);

    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(fullName, version);
      request.onupgradeneeded = (event) => {
        upgrade?.(request.result, (event as IDBVersionChangeEvent).oldVersion, request.transaction);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this._openDbs.delete(fullName);
        };
        resolve(db);
      };
      request.onerror = () => {
        this._openDbs.delete(fullName);
        reject(request.error);
      };
      request.onblocked = () => {
        this._openDbs.delete(fullName);
        reject(new Error('Abertura do IndexedDB bloqueada por outra aba.'));
      };
    });
    this._openDbs.set(fullName, promise);
    return promise;
  }

  private closeDatabases(prefix?: string): void {
    for (const [name, pending] of [...this._openDbs]) {
      if (prefix && !name.startsWith(prefix)) continue;
      this._openDbs.delete(name);
      pending.then((db) => db.close()).catch(() => undefined);
    }
  }

  // --- Storage -----------------------------------------------------------------

  getItem(key: string): string | null {
    const storage = this.getStorage();
    if (!storage || !this._scope) return null;
    try {
      return storage.getItem(this.scopedName(key));
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): boolean {
    const storage = this.getStorage();
    if (!storage || !this._scope) return false;
    try {
      storage.setItem(this.scopedName(key), value);
      return true;
    } catch {
      return false;
    }
  }

  removeItem(key: string): void {
    const storage = this.getStorage();
    if (!storage || !this._scope) return;
    try {
      storage.removeItem(this.scopedName(key));
    } catch {
      // ignore
    }
  }

  // --- purge ---------------------------------------------------------------------

  /**
   * Erases every database and storage key of a scope (default: the current one),
   * after notifying the participants. Returns the databases removed.
   */
  async purge(scope: string | null = this._scope): Promise<string[]> {
    if (!scope) return [];
    const prefix = this.scopePrefix(scope);
    await this.onBeforePurge(scope);
    for (const participant of [...this._participants]) {
      try {
        await participant.purge?.(scope);
      } catch {
        // keep purging the rest
      }
    }

    this.closeDatabases(prefix);
    const storage = this.getStorage();
    const databases = new Set(readJsonArray(storage, this.dbRegistryKey(scope)));
    const factory = this.getIndexedDb();
    const listing = factory as (IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> }) | null;
    if (listing && typeof listing.databases === 'function') {
      try {
        for (const info of await listing.databases()) {
          if (info.name?.startsWith(prefix)) databases.add(info.name);
        }
      } catch {
        // not supported everywhere
      }
    }
    if (factory) {
      await Promise.all([...databases].map((name) => this.deleteDatabase(factory, name)));
    }

    if (storage) {
      try {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(prefix)) keys.push(key);
        }
        keys.forEach((key) => storage.removeItem(key));
      } catch {
        // ignore
      }
      writeJsonArray(
        storage,
        this.scopesRegistryKey,
        readJsonArray(storage, this.scopesRegistryKey).filter((s) => s !== scope)
      );
    }

    const removed = [...databases];
    await this.onAfterPurge(scope, removed);
    this.emitHostEvent('fzl-user-data-purged', { scope, databases: removed });
    this.notifyChange();
    return removed;
  }

  private deleteDatabase(factory: IDBFactory, name: string): Promise<void> {
    return new Promise((resolve) => {
      const request = factory.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      // Another tab still holds it open: the deletion completes once it closes.
      request.onblocked = () => resolve();
    });
  }

  // --- protected hooks -----------------------------------------------------------

  /** Maps a raw user (social user, appshell user…) to {@link FzlUserIdentity}. */
  protected toIdentity(raw: unknown): FzlUserIdentity | null {
    if (!raw || typeof raw !== 'object') return null;
    const user = raw as Record<string, unknown>;
    const id = user.id ?? user.sub ?? user.uid;
    if (id === undefined || id === null || id === '') return null;
    return {
      id: String(id),
      provider: typeof user.provider === 'string' ? user.provider : null,
      email: typeof user.email === 'string' ? user.email : null,
      name: typeof user.name === 'string' ? user.name : null
    };
  }

  /** Scope id of a user. Default: hash of `provider:id` (the raw id never appears in key names). */
  protected resolveUserScope(user: FzlUserIdentity): string {
    return `u${hash53(`${user.provider ?? 'user'}:${user.id}`)}`;
  }

  /** Extra unsynced count, besides the registered participants. */
  protected countUnsynced(): number | Promise<number> {
    return 0;
  }

  /**
   * Whether the logout should try to purge. Default: policy is not `keep` and the
   * session did not merely expire (an expired token is not a voluntary logout).
   */
  protected shouldPurgeOnLogout(request: FzlPurgeRequest): boolean {
    return request.policy !== 'keep' && request.reason !== 'expired';
  }

  /** Confirmation before purging. Default: the `confirmPurge` option, or keep the data. */
  protected async confirmPurge(request: FzlPurgeRequest): Promise<boolean> {
    return this._confirmPurge ? Boolean(await this._confirmPurge(request)) : false;
  }

  protected async onBeforePurge(_scope: string): Promise<void> {
    // Extensível em subclasses
  }

  protected async onAfterPurge(_scope: string, _databases: string[]): Promise<void> {
    // Extensível em subclasses
  }

  protected async onUserChanged(
    _previous: FzlUserIdentity | null,
    _next: FzlUserIdentity | null
  ): Promise<void> {
    // Extensível em subclasses
  }

  protected getStorage(): Storage | null {
    if (this._customStorage !== undefined) return this._customStorage;
    return typeof localStorage !== 'undefined' ? localStorage : null;
  }

  protected getIndexedDb(): IDBFactory | null {
    if (this._customIdb !== undefined) return this._customIdb;
    return typeof indexedDB !== 'undefined' ? indexedDB : null;
  }
}
