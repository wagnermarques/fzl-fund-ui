# Grade de Dados Reativa (`fzl-data-grid` / `fzl-es6-data-grid`)

> Componente de tabela/grade de dados tabular para Web Components, inspirado em `dojox/grid/DataGrid`, `dojox/grid/EnhancedGrid` e `dgrid`, com integração reativa ao `FzlStore` (`dojo/store`), paginação, ordenação dinâmica, busca rápida, seleção simples ou múltipla com checkboxes e exportação para CSV.

---

## 1. Visão Geral e Inspiração no Dojo Toolkit

No Dojo Toolkit, as grades de dados do namespace `dijit` e `dojox` (`dojox/grid/DataGrid` e `dojox/grid/EnhancedGrid`) representavam os componentes mais poderosos e complexos da plataforma, combinando estruturas de células flexíveis, adaptadores de stores de dados, modelos de paginação e seleção múltipla.

O `<fzl-data-grid>` (versão **Lit** `<fzl-lit-data-grid>`) e o `<fzl-es6-data-grid>` (versão **Vanilla ES6**) modernizam esse legado para **W3C Web Components nativos**:

1. **Reatividade via Store (`dojo/store`)**:
   - Assina automaticamente as notificações de `store.observe()`. Mutações no store (`add`, `put`, `remove`) refletem instantaneamente no DOM da tabela sem recarregar a tela.
2. **Compatibilidade com Sintaxe Dojo (`structure` e `name`)**:
   - Aceita tanto a nomenclatura moderna `columns: [{ field, label }]` quanto a nomenclatura canônica do Dojo `structure: [{ field, name, width, formatter }]`.
   - Pode ser configurado via JavaScript ou diretamente em HTML através de atributos JSON (`columns='[...]'` ou `structure='[...]'`).
3. **Modos de Seleção (Dojo Selection Modes)**:
   - `selection-mode="single"`: Seleção de linha única com destaque visual (`selected-id`), emitindo `fzl-grid-select`.
   - `selection-mode="multiple"`: Habilita coluna de checkboxes (estilo plugin `selector` do `EnhancedGrid`) com checkbox mestre no cabeçalho (*Select All* / estado indeterminado), emitindo `fzl-grid-selection-change`.
   - `selection-mode="none"`: Tabela puramente de consulta.
4. **Barra de Paginação Integrada (Paging Bar)**:
   - Suporte a paginação com botões Primeira (`⏮`), Anterior (`◀`), Próxima (`▶`), Última (`⏭`), indicador "Página X de Y" e seletor de tamanho de página (`5`, `10`, `25`, `50`, `100` ou `Todos`).
   - Dispara o evento `fzl-grid-page-change`.
5. **Busca e Filtro em Tempo Real**:
   - Campo de busca integrado com filtragem instantânea em qualquer campo visível e contador dinâmico de registros.
6. **Exportação para CSV**:
   - Botão e método programático `grid.exportCsv('relatorio.csv')` com geração UTF-8 com BOM e download direto no navegador.
7. **Acessibilidade Completa (WCAG / ARIA)**:
   - Padrão semântico `role="grid"`, `role="row"`, `role="columnheader"`, `role="gridcell"`, `aria-selected` e `aria-sort`.
   - Suporte a navegação por teclado (`Enter` e `Espaço`).

---

## 2. Exemplo de Uso

### A. Em Lit (`<fzl-data-grid>` / `<fzl-lit-data-grid>`)

```html
<fzl-data-grid
  id="minha-grade"
  selection-mode="multiple"
  page-size="10"
  exportable>
</fzl-data-grid>

<script type="module">
  import { FzlMemoryStore } from '@fzl/core';
  import '@fzl/webcomponents-lit/data-grid';

  const store = new FzlMemoryStore({
    data: [
      { id: '1', ticker: 'FZL11', nome: 'FZL Real Estate', preco: 104.5 },
      { id: '2', ticker: 'ALZR11', nome: 'Alianza Trust', preco: 112.2 },
      { id: '3', ticker: 'HGLG11', nome: 'CSHG Logística', preco: 165.8 },
    ],
    idProperty: 'id'
  });

  const grid = document.getElementById('minha-grade');
  grid.store = store;
  grid.structure = [
    { field: 'ticker', name: 'Ticker', width: '100px', sortable: true },
    { field: 'nome', name: 'Nome do Fundo', sortable: true },
    {
      field: 'preco',
      name: 'Preço',
      align: 'right',
      sortable: true,
      formatter: (v) => `R$ ${Number(v).toFixed(2)}`
    }
  ];

  grid.addEventListener('fzl-grid-selection-change', (e) => {
    console.log('IDs selecionados:', e.detail.selectedIds);
    console.log('Itens selecionados:', e.detail.selectedItems);
  });
</script>
```

### B. Em Vanilla ES6 (`<fzl-es6-data-grid>`)

```html
<fzl-es6-data-grid
  id="grade-es6"
  columns='[{"field":"ticker","label":"Ticker"},{"field":"nome","label":"Nome"}]'
  items='[{"id":"1","ticker":"FZL11","nome":"FZL Real Estate"}]'
  selection-mode="single"
  page-size="5">
</fzl-es6-data-grid>

<script type="module">
  import '@fzl/webcomponents-es6';
</script>
```

---

## 3. Propriedades e Atributos

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `store` | — | `FzlStore<T>` | `undefined` | Instância do store reativo (`dojo/store`) que alimenta os dados da grade. |
| `columns` | `columns` | `FzlGridColumn[] \| string` | `[]` | Definição das colunas da tabela (`field`, `label`, `width`, `sortable`, `align`, `formatter`). |
| `structure` | `structure` | `FzlGridColumn[] \| string` | `[]` | Alias compatível com Dojo `dojox/grid/DataGrid`. |
| `items` | `items` | `T[] \| string` | `[]` | Lista de dados caso não utilize uma instância de `FzlStore`. |
| `selectionMode` | `selection-mode` | `'none' \| 'single' \| 'multiple'` | `'single'` | Modo de seleção de linhas. |
| `selectedId`| `selected-id` | `string \| number \| null` | `null` | Identificador do registro selecionado em modo `single`. |
| `selectedIds`| `selected-ids` | `(string \| number)[]` | `[]` | Lista de IDs selecionados em modo `multiple`. |
| `pagination`| `pagination` | `boolean` | `true` | Ativa/desativa a barra de paginação inferior. |
| `pageSize` | `page-size` | `number` | `10` | Quantidade de registros por página (0 para exibir todos). |
| `page` | `page` | `number` | `1` | Página atual exibida (índice baseado em 1). |
| `pageSizes` | `page-sizes` | `number[]` | `[5, 10, 25, 50, 100]` | Opções do seletor de tamanho de página. |
| `searchable`| `searchable` | `boolean` | `true` | Se exibe a barra superior de busca/filtro. |
| `exportable`| `exportable` | `boolean` | `true` | Se exibe o botão de exportação para CSV. |
| `emptyText` | `empty-text` | `string` | `'Nenhum registro encontrado.'` | Mensagem exibida quando não houver registros. |

---

## 4. Métodos Públicos

- **`exportCsv(filename = 'export.csv'): string`**: Gera o arquivo CSV formatado com os dados atuais filtrados e dispara o download no navegador.

---

## 5. Eventos Customizados

| Evento | Objeto `detail` | Descrição |
| :--- | :--- | :--- |
| `fzl-grid-select` | `{ item: T, id: any }` | Disparado ao selecionar uma linha em modo `single`. |
| `fzl-grid-selection-change` | `{ selectedIds: any[], selectedItems: T[] }` | Disparado quando a seleção múltipla é alterada via checkboxes. |
| `fzl-grid-page-change` | `{ page: number, pageSize: number }` | Disparado quando a página ou o tamanho da página é modificado. |
| `fzl-grid-delete` | `{ item: T, id: any }` | Disparado ao clicar no botão de exclusão de uma linha. |

---

## 6. Mapeamento de Conceitos: Dojo Grid vs FZL DataGrid

| Recurso no Dojo (`dojox/grid/DataGrid`) | Recurso no Fzl (`<fzl-data-grid>` / `<fzl-es6-data-grid>`) |
| :--- | :--- |
| `structure = [{ field, name, width, formatter }]` | `structure` ou `columns = [{ field, label, width, formatter }]` |
| `store = new dojo/store/Memory()` | `store = new FzlMemoryStore()` (implementa `dojo/store`) |
| `rowsPerPage: 10` | `page-size="10"` |
| `selectionMode: 'single' \| 'multiple'` | `selection-mode="single" \| "multiple"` |
| `EnhancedGrid plugin: selector` (checkboxes) | Modo `selection-mode="multiple"` nativo com Select All |
| `grid.sort()` | Clique no cabeçalho com ordenação ascendente/descendente |
| `grid.filter()` | Barra de busca rápida com filtragem reativa instantânea |
