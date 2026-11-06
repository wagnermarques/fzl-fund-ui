/**
 * @fzl/core — Data Store API (FzlStore & FzlMemoryStore).
 *
 * Architecturally modeled after Dojo Toolkit's `dojo/store`
 * (Memory Store, QueryResults, and Observable store notifications).
 *
 * Provides a clean, framework-agnostic data abstraction for Web Components
 * (Forms, DataGrids, Selects, Trees, and Visualizers).
 */

export type FzlId = string | number;

/**
 * Event notification dispatched when an object is added, updated, or removed from a Store.
 */
export interface FzlStoreChangeEvent<T, Id extends FzlId = FzlId> {
  type: 'add' | 'update' | 'delete';
  id: Id;
  target?: T;
  previous?: T;
}

export type FzlStoreObserver<T, Id extends FzlId = FzlId> = (
  event: FzlStoreChangeEvent<T, Id>
) => void;

export interface FzlQuerySort<T> {
  attribute: keyof T;
  descending?: boolean;
}

export interface FzlQueryOptions<T> {
  sort?: Array<FzlQuerySort<T>> | ((a: T, b: T) => number);
  start?: number;
  count?: number;
}

export type FzlQueryPredicate<T> =
  | Partial<T>
  | ((item: T) => boolean)
  | string
  | undefined;

export interface FzlQueryResults<T> extends Array<T> {
  total: number;
  observe?(
    listener: (object: T, removedFrom: number, insertedInto: number) => void
  ): () => void;
}

/**
 * Fundamental Store interface conforming to the Dojo / Dijit `dojo/store/api/Store` specification.
 */
export interface FzlStore<T extends Record<string, any>, Id extends FzlId = FzlId> {
  /** The attribute name identifying the primary key (default: 'id') */
  readonly idProperty: string;

  /** Retrieves an object by its unique identifier */
  get(id: Id): T | undefined;

  /** Returns the unique identifier for a given object */
  getIdentity(item: T): Id;

  /**
   * Stores an object, updating it if it already exists or inserting it if new.
   * Returns the object's identity.
   */
  put(item: T, options?: { id?: Id; overwrite?: boolean }): Id;

  /**
   * Inserts a new object into the store. Generates an ID if not present.
   * Throws an error if an object with the same identity already exists.
   */
  add(item: T, options?: { id?: Id; overwrite?: boolean }): Id;

  /**
   * Removes an object from the store by its identifier.
   * Returns true if the object was removed, false otherwise.
   */
  remove(id: Id): boolean;

  /**
   * Queries the store for objects matching the filter, with optional sorting and pagination.
   */
  query(query?: FzlQueryPredicate<T>, options?: FzlQueryOptions<T>): FzlQueryResults<T>;

  /**
   * Subscribes to all mutations (add, update, delete) on this store.
   * Returns a cleanup function to unsubscribe.
   */
  observe(listener: FzlStoreObserver<T, Id>): () => void;

  /**
   * Replaces all records in the store with the given array of items.
   */
  setData(data: T[]): void;
}

let _autoIdCounter = 1;

/**
 * In-memory store implementation (`dojo/store/Memory`).
 *
 * Features fast ID indexing, attribute and predicate querying, multi-field sorting,
 * pagination slicing, and observable reactive change events.
 */
export class FzlMemoryStore<T extends Record<string, any>, Id extends FzlId = FzlId>
  implements FzlStore<T, Id>
{
  readonly idProperty: string;
  private _data: T[] = [];
  private _index = new Map<Id, T>();
  private _observers = new Set<FzlStoreObserver<T, Id>>();

  constructor(options: { data?: T[]; idProperty?: string } = {}) {
    this.idProperty = options.idProperty ?? 'id';
    if (options.data && Array.isArray(options.data)) {
      this.setData(options.data);
    }
  }

  get(id: Id): T | undefined {
    const item = this._index.get(id);
    return item ? { ...item } : undefined;
  }

  getIdentity(item: T): Id {
    return item[this.idProperty] as Id;
  }

  put(item: T, options: { id?: Id; overwrite?: boolean } = {}): Id {
    const id = (options.id !== undefined ? options.id : this.getIdentity(item)) ?? this._generateId();
    const cloned = { ...item, [this.idProperty]: id };
    const existing = this._index.get(id);

    if (existing) {
      if (options.overwrite === false) {
        throw new Error(`Item with id '${id}' already exists in store and overwrite is disabled.`);
      }
      const previous = { ...existing };
      const index = this._data.findIndex((d) => this.getIdentity(d) === id);
      if (index !== -1) {
        this._data[index] = cloned;
      }
      this._index.set(id, cloned);
      this._notify({ type: 'update', id, target: cloned, previous });
      return id;
    } else {
      this._data.push(cloned);
      this._index.set(id, cloned);
      this._notify({ type: 'add', id, target: cloned });
      return id;
    }
  }

  add(item: T, options: { id?: Id; overwrite?: boolean } = {}): Id {
    const id = (options.id !== undefined ? options.id : this.getIdentity(item)) ?? this._generateId();
    if (this._index.has(id)) {
      throw new Error(`Item with id '${id}' already exists in store.`);
    }
    return this.put(item, { ...options, id, overwrite: false });
  }

  remove(id: Id): boolean {
    const existing = this._index.get(id);
    if (!existing) {
      return false;
    }
    const previous = { ...existing };
    this._index.delete(id);
    const index = this._data.findIndex((d) => this.getIdentity(d) === id);
    if (index !== -1) {
      this._data.splice(index, 1);
    }
    this._notify({ type: 'delete', id, previous });
    return true;
  }

  query(query?: FzlQueryPredicate<T>, options?: FzlQueryOptions<T>): FzlQueryResults<T> {
    let results = this._data.slice();

    // 1. Filtering
    if (query !== undefined) {
      if (typeof query === 'function') {
        results = results.filter(query);
      } else if (typeof query === 'string') {
        const needle = query.trim().toLowerCase();
        if (needle.length > 0) {
          results = results.filter((item) => {
            return Object.values(item).some((val) => {
              if (val === null || val === undefined) return false;
              return String(val).toLowerCase().includes(needle);
            });
          });
        }
      } else if (typeof query === 'object' && query !== null) {
        results = results.filter((item) => {
          for (const [key, expected] of Object.entries(query)) {
            if (expected === undefined || expected === '') continue;
            const actual = item[key];
            if (typeof expected === 'string' && typeof actual === 'string') {
              if (!actual.toLowerCase().includes(expected.toLowerCase())) return false;
            } else if (actual !== expected) {
              return false;
            }
          }
          return true;
        });
      }
    }

    const total = results.length;

    // 2. Sorting
    if (options?.sort) {
      if (typeof options.sort === 'function') {
        results.sort(options.sort);
      } else if (Array.isArray(options.sort)) {
        const sortDefs = options.sort;
        results.sort((a, b) => {
          for (const sortDef of sortDefs) {
            const valA = a[sortDef.attribute];
            const valB = b[sortDef.attribute];
            if (valA === valB) continue;
            let comparison = 0;
            if (valA === null || valA === undefined) comparison = -1;
            else if (valB === null || valB === undefined) comparison = 1;
            else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
            else comparison = String(valA).localeCompare(String(valB));

            return sortDef.descending ? -comparison : comparison;
          }
          return 0;
        });
      }
    }

    // 3. Slicing / Pagination
    if (options?.start !== undefined || options?.count !== undefined) {
      const start = options.start ?? 0;
      const count = options.count !== undefined ? options.count : results.length;
      results = results.slice(start, start + count);
    }

    const queryResults = results as FzlQueryResults<T>;
    queryResults.total = total;

    // Observable query listener
    queryResults.observe = (listener) => {
      return this.observe((event) => {
        // Query observer notification
        if (event.type === 'add' && event.target) {
          listener(event.target, -1, 0);
        } else if (event.type === 'delete' && event.previous) {
          listener(event.previous, 0, -1);
        } else if (event.type === 'update' && event.target) {
          listener(event.target, 0, 0);
        }
      });
    };

    return queryResults;
  }

  observe(listener: FzlStoreObserver<T, Id>): () => void {
    this._observers.add(listener);
    return () => {
      this._observers.delete(listener);
    };
  }

  setData(data: T[]): void {
    this._data = [];
    this._index.clear();
    for (const item of data) {
      const id = this.getIdentity(item) ?? this._generateId();
      const cloned = { ...item, [this.idProperty]: id };
      this._data.push(cloned);
      this._index.set(id, cloned);
    }
  }

  private _notify(event: FzlStoreChangeEvent<T, Id>): void {
    for (const observer of this._observers) {
      try {
        observer(event);
      } catch (err) {
        console.error('[FzlMemoryStore] observer error:', err);
      }
    }
  }

  private _generateId(): Id {
    return `fzl_item_${Date.now()}_${_autoIdCounter++}` as Id;
  }
}
