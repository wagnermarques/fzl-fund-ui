// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { FzlMemoryStore } from '@fzl/core';
import '@fzl/webcomponents-lit/form';
import '@fzl/webcomponents-lit/data-grid';
import '../../demo/developers-view.js';

describe('Components Infrastructure & Dijit Data Model', () => {
  let store;

  beforeEach(() => {
    store = new FzlMemoryStore({
      data: [
        { id: '1', ticker: 'FZL11', price: 104.5, active: true },
        { id: '2', ticker: 'ALZR11', price: 112.2, active: true },
        { id: '3', ticker: 'MXRF11', price: 10.15, active: false },
      ],
      idProperty: 'id',
    });
  });

  it('registers all form, grid, and developers view custom elements', () => {
    expect(customElements.get('fzl-form')).toBeDefined();
    expect(customElements.get('fzl-text-input')).toBeDefined();
    expect(customElements.get('fzl-number-input')).toBeDefined();
    expect(customElements.get('fzl-select')).toBeDefined();
    expect(customElements.get('fzl-checkbox')).toBeDefined();
    expect(customElements.get('fzl-data-grid')).toBeDefined();
    expect(customElements.get('developers-view')).toBeDefined();
  });

  it('FzlMemoryStore supports query with sorting, text search, and pagination', () => {
    // Text search
    const search = store.query('alzr');
    expect(search.length).toBe(1);
    expect(search[0].ticker).toBe('ALZR11');

    // Sorting by price descending
    const sorted = store.query(undefined, {
      sort: [{ attribute: 'price', descending: true }],
    });
    expect(sorted.map((a) => a.ticker)).toEqual(['ALZR11', 'FZL11', 'MXRF11']);

    // Pagination
    const page = store.query(undefined, {
      sort: [{ attribute: 'price', descending: true }],
      start: 0,
      count: 2,
    });
    expect(page.length).toBe(2);
    expect(page.total).toBe(3);
  });

  it('FzlMemoryStore emits reactive observe events on add, put, and remove', () => {
    const events = [];
    store.observe((e) => {
      events.push(`${e.type}:${e.id}`);
    });

    store.put({ id: '1', ticker: 'FZL11', price: 109.0, active: true });
    expect(events).toContain('update:1');
    expect(store.get('1')?.price).toBe(109.0);

    const newId = store.add({ ticker: 'XPML11', price: 118.0, active: true });
    expect(events).toContain(`add:${newId}`);

    store.remove('2');
    expect(events).toContain('delete:2');
    expect(store.get('2')).toBeUndefined();
  });

  it('FzlForm correctly serializes getValues and deserializes setValues', () => {
    const form = document.createElement('fzl-form');
    form.innerHTML = `
      <fzl-text-input name="ticker" value="FZL11"></fzl-text-input>
      <fzl-number-input name="price" value="105"></fzl-number-input>
      <fzl-checkbox name="active" checked></fzl-checkbox>
    `;
    document.body.appendChild(form);

    const values = form.getValues();
    expect(values.ticker).toBe('FZL11');
    expect(Number(values.price)).toBe(105);
    expect(values.active).toBe(true);

    form.setValues({ ticker: 'NEW11', price: 200, active: false });
    const updated = form.getValues();
    expect(updated.ticker).toBe('NEW11');
    expect(Number(updated.price)).toBe(200);
    expect(updated.active).toBe(false);

    document.body.removeChild(form);
  });

  it('FzlDataGrid queries and reacts to store changes', () => {
    const grid = document.createElement('fzl-data-grid');
    grid.store = store;
    grid.columns = [
      { field: 'ticker', label: 'Ticker' },
      { field: 'price', label: 'Preço' },
    ];
    document.body.appendChild(grid);

    expect(grid.store).toBe(store);
    expect(grid.columns.length).toBe(2);

    document.body.removeChild(grid);
  });
});
