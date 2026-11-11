// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { FzlMemoryStore } from '@fzl/core';
import {
  FzlDataGrid,
  parseGridColumns,
  parseGridItems,
  exportToCsv,
} from '@fzl/webcomponents-lit/data-grid';
import { FzlEs6DataGrid } from '@fzl/webcomponents-es6';
import { FzlNgDataGridComponent } from '@fzl/webcomponents-angular';

describe('DataGrid Helper Functions', () => {
  const sampleColumns = [
    { field: 'ticker', label: 'Ticker', width: '100px' },
    { field: 'name', name: 'Nome do Fundo' }, // Dojo name alias
    { field: 'price', label: 'Cota', align: 'right', formatter: (v) => `R$ ${v}` },
  ];

  const sampleItems = [
    { id: '1', ticker: 'FZL11', name: 'FZL Fund', price: 100 },
    { id: '2', ticker: 'ALZR11', name: 'Alianza Trust', price: 110 },
    { id: '3', ticker: 'HGLG11', name: 'CSHG Logística', price: 160 },
  ];

  it('faz parse de colunas aceitando label ou alias name (Dojo style)', () => {
    const cols = parseGridColumns(sampleColumns);
    expect(cols).toHaveLength(3);
    expect(cols[0].label).toBe('Ticker');
    expect(cols[1].label).toBe('Nome do Fundo');
    expect(cols[2].align).toBe('right');
  });

  it('faz parse de colunas a partir de string JSON', () => {
    const jsonCols = JSON.stringify([{ field: 'id', label: 'ID' }]);
    const cols = parseGridColumns(jsonCols);
    expect(cols).toHaveLength(1);
    expect(cols[0].field).toBe('id');
  });

  it('faz parse de itens a partir de array e de string JSON', () => {
    expect(parseGridItems(sampleItems)).toEqual(sampleItems);
    expect(parseGridItems(JSON.stringify(sampleItems))).toHaveLength(3);
    expect(parseGridItems(null)).toEqual([]);
  });

  it('exporta itens para formato CSV com cabeçalhos e valores formatados', () => {
    const csv = exportToCsv(sampleItems, parseGridColumns(sampleColumns), 'teste.csv');
    expect(csv).toContain('"Ticker";"Nome do Fundo";"Cota"');
    expect(csv).toContain('"FZL11";"FZL Fund";"R$ 100"');
    expect(csv).toContain('"ALZR11";"Alianza Trust";"R$ 110"');
  });
});

describe('FzlDataGrid (Lit Implementation)', () => {
  let grid;

  const testData = [
    { id: '1', ticker: 'FZL11', name: 'FZL Fund', segment: 'Tijolo', price: 105 },
    { id: '2', ticker: 'XPML11', name: 'XP Malls', segment: 'Shoppings', price: 115 },
    { id: '3', ticker: 'KNRI11', name: 'Kinea Renda', segment: 'Híbrido', price: 155 },
    { id: '4', ticker: 'MXRF11', name: 'Maxi Renda', segment: 'Papel', price: 10 },
  ];

  const testColumns = [
    { field: 'ticker', label: 'Ticker', sortable: true },
    { field: 'name', label: 'Nome', sortable: true },
    { field: 'price', label: 'Preço', align: 'right', sortable: true },
  ];

  beforeEach(async () => {
    grid = new FzlDataGrid();
    grid.columns = testColumns;
    grid.items = testData;
    document.body.appendChild(grid);
    await grid.updateComplete;
  });

  afterEach(() => {
    if (grid && grid.parentNode) {
      grid.parentNode.removeChild(grid);
    }
  });

  it('renderiza colunas e linhas da tabela', () => {
    const ths = grid.shadowRoot.querySelectorAll('th');
    expect(ths.length).toBeGreaterThanOrEqual(testColumns.length);

    const rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(testData.length);
  });

  it('seleciona linha em modo single e emite evento fzl-grid-select', async () => {
    let selectedDetail = null;
    grid.addEventListener('fzl-grid-select', (e) => {
      selectedDetail = e.detail;
    });

    const firstRow = grid.shadowRoot.querySelector('tbody tr');
    firstRow.click();
    await grid.updateComplete;

    expect(selectedDetail).toBeTruthy();
    expect(selectedDetail.id).toBe('1');
    expect(grid.selectedId).toBe('1');
  });

  it('suporta modo de seleção múltipla (dojo selector) com checkboxes', async () => {
    grid.selectionMode = 'multiple';
    await grid.updateComplete;

    let changeDetail = null;
    grid.addEventListener('fzl-grid-selection-change', (e) => {
      changeDetail = e.detail;
    });

    const chkSelectAll = grid.shadowRoot.querySelector('thead input[type="checkbox"]');
    expect(chkSelectAll).toBeTruthy();

    // Selecionar todos
    chkSelectAll.checked = true;
    chkSelectAll.dispatchEvent(new Event('change'));
    await grid.updateComplete;

    expect(grid.selectedIds).toHaveLength(testData.length);
    expect(changeDetail.selectedIds).toHaveLength(testData.length);
    expect(changeDetail.selectedItems).toHaveLength(testData.length);
  });

  it('pagina os itens e navega entre páginas', async () => {
    grid.pageSize = 2;
    grid.page = 1;
    await grid.updateComplete;

    let rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    // Ir para próxima página
    const btnNext = grid.shadowRoot.querySelector('button[title="Próxima página"]');
    btnNext.click();
    await grid.updateComplete;

    expect(grid.page).toBe(2);
    rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('filtra registros via campo de busca', async () => {
    const searchInput = grid.shadowRoot.querySelector('.search-box input');
    expect(searchInput).toBeTruthy();

    searchInput.value = 'Maxi';
    searchInput.dispatchEvent(new Event('input'));
    await grid.updateComplete;

    const rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('MXRF11');
  });

  it('reage a mutações do FzlMemoryStore reativo (dojo/store observe)', async () => {
    const store = new FzlMemoryStore({
      data: [
        { id: '10', ticker: 'TEST11', name: 'Teste Fund', price: 50 },
      ],
      idProperty: 'id',
    });

    grid.store = store;
    await grid.updateComplete;

    let rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('TEST11');

    // Adiciona no store reativo
    store.add({ id: '20', ticker: 'NOVO11', name: 'Novo Fundo', price: 75 });
    await grid.updateComplete;

    rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(grid.shadowRoot.innerHTML).toContain('NOVO11');
  });
});

describe('FzlEs6DataGrid (Vanilla ES6 Implementation)', () => {
  let grid;

  const testData = [
    { id: '1', ticker: 'FZL11', name: 'FZL Fund', price: 100 },
    { id: '2', ticker: 'XPML11', name: 'XP Malls', price: 110 },
    { id: '3', ticker: 'KNRI11', name: 'Kinea Renda', price: 150 },
  ];

  const testColumns = [
    { field: 'ticker', label: 'Ticker' },
    { field: 'name', label: 'Nome' },
    { field: 'price', label: 'Preço' },
  ];

  beforeEach(() => {
    grid = new FzlEs6DataGrid();
    grid.columns = testColumns;
    grid.items = testData;
    document.body.appendChild(grid);
  });

  afterEach(() => {
    if (grid && grid.parentNode) {
      grid.parentNode.removeChild(grid);
    }
  });

  it('instancia o componente Vanilla ES6 e renderiza shadow root', () => {
    expect(grid).toBeInstanceOf(FzlEs6DataGrid);
    const ths = grid.shadowRoot.querySelectorAll('th');
    expect(ths.length).toBeGreaterThanOrEqual(testColumns.length);

    const rows = grid.shadowRoot.querySelectorAll('tbody tr');
    expect(rows.length).toBe(testData.length);
  });

  it('seleciona linha e emite fzl-grid-select em Vanilla ES6', () => {
    let selectEvent = null;
    grid.addEventListener('fzl-grid-select', (e) => {
      selectEvent = e.detail;
    });

    const firstRow = grid.shadowRoot.querySelector('tbody tr[data-index="0"]');
    firstRow.click();

    expect(selectEvent).toBeTruthy();
    expect(selectEvent.id).toBe('1');
    expect(grid.selectedId).toBe('1');
  });

  it('suporta ordenação de colunas e paginação em Vanilla ES6', () => {
    grid.pageSize = 2;
    let rows = grid.shadowRoot.querySelectorAll('tbody tr[data-index]');
    expect(rows.length).toBe(2);

    const btnNext = grid.shadowRoot.getElementById('btnNext');
    btnNext.click();

    expect(grid.page).toBe(2);
    rows = grid.shadowRoot.querySelectorAll('tbody tr[data-index]');
    expect(rows.length).toBe(1);
  });
});

describe('FzlNgDataGridComponent (Angular Elements)', () => {
  it('instancia a classe do componente Angular e valida lógica de colunas e itens', () => {
    const hostEl = document.createElement('div');
    const comp = new FzlNgDataGridComponent({ nativeElement: hostEl });

    comp.columns = [
      { field: 'ticker', label: 'Ticker' },
      { field: 'price', label: 'Preço' }
    ];
    comp.items = [
      { id: '1', ticker: 'FZL11', price: 100 },
      { id: '2', ticker: 'ALZR11', price: 110 }
    ];

    expect(comp.parsedColumns).toHaveLength(2);
    expect(comp.allFilteredItems).toHaveLength(2);
    expect(comp.totalCount).toBe(2);
    expect(comp.isRowSelected({ id: '1' })).toBe(false);

    comp.selectedId = '1';
    expect(comp.isRowSelected({ id: '1' })).toBe(true);

    // Teste de exportação CSV
    const csv = comp.exportCsv('test-ng.csv');
    expect(csv).toContain('"Ticker";"Preço"');
    expect(csv).toContain('"FZL11";"100"');
  });

  it('integra com FzlStore e suporta filtragem e paginação no Angular', () => {
    const hostEl = document.createElement('div');
    const comp = new FzlNgDataGridComponent({ nativeElement: hostEl });

    const store = new FzlMemoryStore({
      data: [
        { id: '1', ticker: 'FZL11', name: 'FZL Fund' },
        { id: '2', ticker: 'XPML11', name: 'XP Malls' },
        { id: '3', ticker: 'KNRI11', name: 'Kinea Renda' }
      ],
      idProperty: 'id'
    });

    comp.store = store;
    comp.pageSize = 2;
    comp.page = 1;

    expect(comp.totalCount).toBe(3);
    expect(comp.totalPages).toBe(2);
    expect(comp.pagedItems).toHaveLength(2);

    comp.setPage(2);
    expect(comp.page).toBe(2);
    expect(comp.pagedItems).toHaveLength(1);
  });
});
