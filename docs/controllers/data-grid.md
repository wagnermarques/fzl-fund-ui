# FzlDataGridController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/data-grid.controller.ts`  
> **Herda de:** `FzlBaseController`

Estado de tabelas e grids: vinculação reativa a `FzlStore` (`store.observe()`) ou a uma lista, com ordenação, busca, paginação, seleção e exportação CSV. Para persistir e apagar registros, combine com o `FzlCrudBaseController` (`crud.bindGrid(grid)`).

## Uso

```ts
const grid = new FzlDataGridController(this, { store, columns: 'nome,pl', pageSize: 20 });
grid.setSearchQuery('alpha');
grid.toggleSort('pl');
grid.exportCsv('fundos.csv');
```

## API

| Membro | Descrição |
| --- | --- |
| `pagedItems`, `sortedItems`, `filteredItems`, `selectedItems`, `totalPages` | Leitura. |
| `setStore` / `setItems` / `setColumns` / `refresh()` | Dados. |
| `setSearchQuery` / `setSort` / `toggleSort` / `setPage` / `setPageSize` | Navegação. |
| `selectRow` / `toggleSelectAllOnPage` / `clearSelection` | Seleção. |
| `exportCsv(filename, allFiltered)` | Exportação. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `getRowId(row, index)` | Identidade da linha. |
| `filterItems(items, query)` | Busca. |
| `sortItems(items, field, desc)` | Ordenação. |

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-grid-sort` | — |
| `fzl-grid-page-change` | — |
| `fzl-grid-select` | — |
| `fzl-grid-selection-change` | — |
