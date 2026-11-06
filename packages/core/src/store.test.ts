import { describe, expect, it, vi } from 'vitest';
import { FzlMemoryStore, type FzlStoreChangeEvent } from './index';

interface TestProduct {
  id?: string;
  name: string;
  category: string;
  price: number;
  inStock?: boolean;
}

describe('@fzl/core — Data Store (FzlMemoryStore)', () => {
  const sampleData: TestProduct[] = [
    { id: 'p1', name: 'Notebook Pro', category: 'Informática', price: 6500, inStock: true },
    { id: 'p2', name: 'Mouse Sem Fio', category: 'Periféricos', price: 150, inStock: true },
    { id: 'p3', name: 'Teclado Mecânico', category: 'Periféricos', price: 420, inStock: false },
    { id: 'p4', name: 'Monitor 27 Polegadas', category: 'Monitores', price: 1800, inStock: true },
  ];

  it('initializes with seed data and allows retrieval by ID', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    expect(store.get('p1')).toEqual(sampleData[0]);
    expect(store.get('p2')?.name).toBe('Mouse Sem Fio');
    expect(store.get('nonexistent')).toBeUndefined();
    expect(store.getIdentity(sampleData[0])).toBe('p1');
  });

  it('queries items with object filter', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const results = store.query({ category: 'Periféricos' });
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(['p2', 'p3']);
    expect(results.total).toBe(2);
  });

  it('queries items with quick text search across fields', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const results = store.query('sem fio');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('p2');
  });

  it('queries items with custom predicate function', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const expensive = store.query((item) => item.price > 1000);
    expect(expensive.length).toBe(2);
    expect(expensive.map((r) => r.id)).toEqual(['p1', 'p4']);
  });

  it('sorts and paginates query results', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    // Sort ascending by price
    const asc = store.query(undefined, {
      sort: [{ attribute: 'price', descending: false }],
    });
    expect(asc.map((r) => r.price)).toEqual([150, 420, 1800, 6500]);

    // Sort descending by price with pagination (page 1: 2 items)
    const paginated = store.query(undefined, {
      sort: [{ attribute: 'price', descending: true }],
      start: 1,
      count: 2,
    });
    expect(paginated.length).toBe(2);
    expect(paginated.map((r) => r.price)).toEqual([1800, 420]);
    expect(paginated.total).toBe(4);
  });

  it('adds items with auto-generated ID and notifies observers', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const events: FzlStoreChangeEvent<TestProduct>[] = [];
    const unsub = store.observe((e) => events.push(e));

    const newId = store.add({
      name: 'Headset Gamer',
      category: 'Áudio',
      price: 320,
    });

    expect(typeof newId).toBe('string');
    expect(store.get(newId)?.name).toBe('Headset Gamer');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('add');
    expect(events[0].id).toBe(newId);
    expect(events[0].target?.name).toBe('Headset Gamer');

    unsub();
  });

  it('updates existing items with put() and notifies observers', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const events: FzlStoreChangeEvent<TestProduct>[] = [];
    store.observe((e) => events.push(e));

    store.put({ id: 'p2', name: 'Mouse Sem Fio RGB', category: 'Periféricos', price: 180 });

    const updated = store.get('p2');
    expect(updated?.name).toBe('Mouse Sem Fio RGB');
    expect(updated?.price).toBe(180);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('update');
    expect(events[0].id).toBe('p2');
    expect(events[0].previous?.name).toBe('Mouse Sem Fio');
    expect(events[0].target?.name).toBe('Mouse Sem Fio RGB');
  });

  it('removes items with remove() and notifies observers', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const events: FzlStoreChangeEvent<TestProduct>[] = [];
    store.observe((e) => events.push(e));

    const removed = store.remove('p3');
    expect(removed).toBe(true);
    expect(store.get('p3')).toBeUndefined();

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('delete');
    expect(events[0].id).toBe('p3');
    expect(events[0].previous?.name).toBe('Teclado Mecânico');

    // Removing non-existent item returns false
    expect(store.remove('non-existent')).toBe(false);
  });

  it('supports queryResults.observe() for query-level listeners', () => {
    const store = new FzlMemoryStore<TestProduct>({ data: sampleData });
    const results = store.query();
    const mockListener = vi.fn();

    const unsub = results.observe?.(mockListener);

    store.add({ name: 'Webcam 4K', category: 'Vídeo', price: 500 });
    expect(mockListener).toHaveBeenCalled();

    unsub?.();
  });
});
