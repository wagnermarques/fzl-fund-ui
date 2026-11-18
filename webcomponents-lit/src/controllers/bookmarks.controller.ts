/**
 * @license
 * FZL Software — Bookmarks Persistence Reactive Controller
 */
import {
  detectDocumentCategory,
  type FzlDocumentBookmark
} from '../components/document-picker/document-picker.types';
import { FzlBaseController, type FzlControllerHost } from './base.controller';
import type { FzlUserDataController } from './user-data.controller';

export type FzlBookmarkInput = Partial<FzlDocumentBookmark> & {
  id: string;
  name: string;
};

export interface FzlBookmarksControllerOptions {
  storageKey?: string;
  storage?: Storage | null;
  maxTextPersistLength?: number;
  autoLoad?: boolean;
  /**
   * Isola os favoritos por usuário: a chave vira `userData.scopedName(storageKey)`,
   * recarrega ao trocar de usuário e fica vazia (sem persistir) sem ninguém logado.
   */
  userData?: FzlUserDataController | null;
}

/**
 * Controller reativo e headless para favoritos (`bookmarks`) de documentos
 * com persistência local, tags, notas e sincronização automática entre abas (`storage` event).
 *
 * Extensível via herança (`extends FzlBookmarksController`) pelos hooks protegidos
 * `validateTag`, `serializeBookmark` e `getStorage`.
 */
export class FzlBookmarksController extends FzlBaseController {
  private _storageKey: string;
  private readonly _customStorage: Storage | null | undefined;
  private readonly _maxTextPersistLength: number;
  private _items: FzlDocumentBookmark[] = [];
  private _baseKey: string;
  private _userData: FzlUserDataController | null = null;
  private _userDataCleanup: (() => void) | null = null;
  private readonly _onStorageEvent = (event: StorageEvent): void => {
    if (!this._storageKey) return;
    if (event.key === null || event.key === this._storageKey) {
      this.load();
    }
  };

  constructor(host?: FzlControllerHost | null, options: FzlBookmarksControllerOptions = {}) {
    super(host);
    this._baseKey = options.storageKey ?? 'fzl:document-bookmarks';
    this._storageKey = this._baseKey;
    this._customStorage = options.storage;
    this._maxTextPersistLength = options.maxTextPersistLength ?? 250_000;
    if (options.userData) {
      this.bindUserData(options.userData, options.autoLoad !== false);
    } else if (options.autoLoad !== false) {
      this.load();
    }
  }

  /**
   * Vincula um `FzlUserDataController`: os favoritos passam a ser do usuário ativo.
   * Retorna a função que desfaz o vínculo (volta à chave global).
   */
  bindUserData(userData: FzlUserDataController, loadNow = true): () => void {
    this.unbindUserData();
    this._userData = userData;
    const apply = (force: boolean): void => {
      const next = userData.tryScopedName(this._baseKey) ?? '';
      if (!force && next === this._storageKey) return;
      this._storageKey = next;
      if (next) {
        this.load();
      } else {
        this._items = [];
        this.notifyChange();
      }
    };
    const offScope = userData.subscribe(() => apply(false));
    const offParticipant = userData.registerParticipant({
      purge: (scope) => {
        if (scope === userData.scope) {
          this._items = [];
          this.notifyChange();
        }
      }
    });
    this._userDataCleanup = () => {
      offScope();
      offParticipant();
    };
    if (loadNow) apply(true);
    else this._storageKey = userData.tryScopedName(this._baseKey) ?? '';
    return () => this.unbindUserData();
  }

  unbindUserData(): void {
    if (!this._userData) return;
    this._userDataCleanup?.();
    this._userDataCleanup = null;
    this._userData = null;
    this._storageKey = this._baseKey;
    this.load();
  }

  get storageKey(): string {
    return this._storageKey;
  }

  get items(): FzlDocumentBookmark[] {
    return this._items.map((item) => ({
      ...item,
      tags: [...item.tags]
    }));
  }

  get count(): number {
    return this._items.length;
  }

  setStorageKey(key: string): this {
    if (this._baseKey === key) return this;
    this._baseKey = key;
    this._storageKey = this._userData ? (this._userData.tryScopedName(key) ?? '') : key;
    if (this._storageKey) {
      this.load();
    } else {
      this._items = [];
      this.notifyChange();
    }
    return this;
  }

  override hostConnected(): void {
    super.hostConnected();
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', this._onStorageEvent);
    }
  }

  override hostDisconnected(): void {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', this._onStorageEvent);
    }
    super.hostDisconnected();
  }

  isBookmarked(id: string): boolean {
    return this._items.some((item) => item.id === id);
  }

  get(id: string): FzlDocumentBookmark | undefined {
    const found = this._items.find((item) => item.id === id);
    return found ? { ...found, tags: [...found.tags] } : undefined;
  }

  /**
   * Carrega favoritos do storage configurado e notifica observadores.
   */
  load(): FzlDocumentBookmark[] {
    const storage = this.getStorage();
    if (!storage || !this._storageKey) {
      return this.items;
    }

    try {
      const raw = storage.getItem(this._storageKey);
      if (!raw) {
        this._items = [];
      } else {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this._items = parsed
            .filter(
              (entry): entry is FzlBookmarkInput =>
                Boolean(entry && typeof entry === 'object' && 'id' in entry && 'name' in entry)
            )
            .map((entry) => this.serializeBookmark(entry));
        }
      }
    } catch {
      // Ignora JSON corrompido ou falha de leitura no storage
    }

    this.emitHostEvent('fzl-bookmarks-loaded', { bookmarks: this.items });
    this.notifyChange();
    return this.items;
  }

  /**
   * Persiste a lista atual de favoritos no storage configurado.
   */
  save(): boolean {
    const storage = this.getStorage();
    if (!storage || !this._storageKey) return false;
    try {
      const serialized = this._items.map((item) => this.serializeBookmark(item));
      storage.setItem(this._storageKey, JSON.stringify(serialized));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Alterna (ou força) o estado de favorito de um documento, persistindo no storage.
   */
  toggleBookmark(item: FzlBookmarkInput, force?: boolean): boolean {
    const existsIndex = this._items.findIndex((b) => b.id === item.id);
    const shouldBookmark = force !== undefined ? force : existsIndex < 0;

    if (shouldBookmark) {
      const nextBookmark = this.serializeBookmark({
        ...(existsIndex >= 0 ? this._items[existsIndex] : {}),
        ...item,
        bookmarkedAt: item.bookmarkedAt ?? Date.now()
      });
      if (existsIndex >= 0) {
        const copy = [...this._items];
        copy[existsIndex] = nextBookmark;
        this._items = copy;
      } else {
        this._items = [...this._items, nextBookmark];
      }
      this.save();
      this.emitHostEvent('fzl-bookmark-add', {
        bookmark: nextBookmark,
        bookmarks: this.items
      });
      this.notifyChange();
      return true;
    }

    if (existsIndex >= 0) {
      const removed = this._items[existsIndex];
      this._items = this._items.filter((b) => b.id !== item.id);
      this.save();
      this.emitHostEvent('fzl-bookmark-remove', {
        bookmark: removed,
        bookmarks: this.items
      });
      this.notifyChange();
    }
    return false;
  }

  /**
   * Adiciona ou atualiza um favorito existente.
   */
  addBookmark(item: FzlBookmarkInput): FzlDocumentBookmark {
    this.toggleBookmark(item, true);
    return this.get(item.id) as FzlDocumentBookmark;
  }

  /**
   * Remove um favorito pelo identificador.
   */
  removeBookmark(id: string): boolean {
    const existed = this.isBookmarked(id);
    if (!existed) return false;
    this.toggleBookmark({ id, name: id }, false);
    return true;
  }

  /**
   * Adiciona uma tag validada a um documento favoritado.
   */
  addTag(id: string, rawTag: string): boolean {
    const validTag = this.validateTag(rawTag);
    if (!validTag) return false;
    const index = this._items.findIndex((b) => b.id === id);
    if (index < 0) return false;

    const current = this._items[index];
    if (current.tags.includes(validTag)) return false;

    const updated: FzlDocumentBookmark = {
      ...current,
      tags: [...current.tags, validTag]
    };
    const next = [...this._items];
    next[index] = updated;
    this._items = next;
    this.save();
    this.emitHostEvent('fzl-bookmark-tag-change', {
      bookmark: updated,
      bookmarks: this.items
    });
    this.notifyChange();
    return true;
  }

  /**
   * Remove uma tag de um documento favoritado.
   */
  removeTag(id: string, tag: string): boolean {
    const index = this._items.findIndex((b) => b.id === id);
    if (index < 0) return false;

    const current = this._items[index];
    if (!current.tags.includes(tag)) return false;

    const updated: FzlDocumentBookmark = {
      ...current,
      tags: current.tags.filter((t) => t !== tag)
    };
    const next = [...this._items];
    next[index] = updated;
    this._items = next;
    this.save();
    this.emitHostEvent('fzl-bookmark-tag-change', {
      bookmark: updated,
      bookmarks: this.items
    });
    this.notifyChange();
    return true;
  }

  /**
   * Atualiza as anotações de um favorito.
   */
  setNotes(id: string, notes: string): boolean {
    const index = this._items.findIndex((b) => b.id === id);
    if (index < 0) return false;
    const current = this._items[index];
    if (current.notes === notes) return false;

    const updated: FzlDocumentBookmark = { ...current, notes };
    const next = [...this._items];
    next[index] = updated;
    this._items = next;
    this.save();
    this.notifyChange();
    return true;
  }

  /**
   * Remove todos os favoritos armazenados.
   */
  clear(): void {
    this._items = [];
    this.save();
    this.emitHostEvent('fzl-bookmarks-cleared', { bookmarks: [] });
    this.notifyChange();
  }

  /**
   * Hook protegido para validação e normalização de tags em subclasses.
   */
  protected validateTag(tag: string): string | null {
    const clean = tag.trim();
    return clean.length > 0 ? clean : null;
  }

  /**
   * Hook protegido para serializar um item de favorito antes da persistência.
   */
  protected serializeBookmark(item: FzlBookmarkInput): FzlDocumentBookmark {
    const detected =
      item.category && item.extension !== undefined
        ? { category: item.category, extension: item.extension }
        : detectDocumentCategory(item.name, item.type);

    const validatedTags = Array.from(
      new Set(
        (Array.isArray(item.tags) ? item.tags : [])
          .map((t) => this.validateTag(String(t)))
          .filter((t): t is string => Boolean(t))
      )
    );

    const textOk =
      typeof item.textContent === 'string' &&
      item.textContent.length <= this._maxTextPersistLength;

    return {
      id: item.id,
      name: item.name,
      size: item.size ?? 0,
      type: item.type ?? 'application/octet-stream',
      extension: detected.extension,
      category: detected.category,
      lastModified: item.lastModified ?? Date.now(),
      textContent: textOk ? item.textContent : undefined,
      docxBlocks:
        item.docxBlocks && (!item.textContent || textOk) ? item.docxBlocks : undefined,
      tags: validatedTags,
      notes: item.notes,
      bookmarkedAt: item.bookmarkedAt ?? Date.now()
    };
  }

  /**
   * Hook protegido que resolve o backend de `Storage` utilizado para persistência.
   */
  protected getStorage(): Storage | null {
    if (this._customStorage !== undefined) {
      return this._customStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return null;
  }
}
