# Grade de Dados Reativa (`fzl-data-grid`)

> Componente de tabela/grade de dados tabular para Web Components, inspirado em `dojox/grid/DataGrid` e `dgrid`, com integração reativa ao `FzlStore` (`dojo/store`), ordenação dinâmica, busca rápida e seleção acessível.

---

## 1. Visão Geral

O `<fzl-data-grid>` resolve a exibição e manipulação de coleções tabulares de dados com alto desempenho e padrão de acessibilidade:

1. **Reatividade via Store (`dojo/store`)**:
   - Assina automaticamente as notificações de `store.observe()`. Qualquer inserção (`store.add`), atualização (`store.put`) ou exclusão (`store.remove`) reflete de forma instantânea na grade sem necessidade de recarregar a tela.
2. **Ordenação de Colunas**:
   - Cabeçalhos clicáveis com alternância entre ordenação ascendente ($\uparrow$), descendente ($\downarrow$) e padrão.
3. **Filtro / Busca em Tempo Real**:
   - Caixa de pesquisa integrada que filtra instantaneamente linhas que contenham o termo em qualquer atributo visível.
4. **Seleção de Linhas e Ações**:
   - Destaque da linha selecionada sincronizado com o ID primário (`selected-id`), emitindo eventos `fzl-grid-select`.
   - Coluna de ações com botão para remoção direta do item no store.
5. **Acessibilidade e Alto Contraste**:
   - Estrutura semântica com ARIA (`role="grid"`, `role="row"`, `role="columnheader"`, `role="gridcell"`).
   - Suporte completo a navegação por teclado (Enter/Espaço) e compatibilidade com High Contrast Mode.

---

## 2. Exemplo de Uso

```html
<fzl-data-grid id="minha-grade"></fzl-data-grid>

<script type="module">
  import { FzlMemoryStore } from '@fzl/core';
  import '@fzl/webcomponents-lit/data-grid';

  const store = new FzlMemoryStore({
    data: [
      { id: '1', ticker: 'FZL11', nome: 'FZL Real Estate', preco: 104.5 },
      { id: '2', ticker: 'ALZR11', nome: 'Alianza Trust', preco: 112.2 },
    ],
    idProperty: 'id'
  });

  const grid = document.getElementById('minha-grade');
  grid.store = store;
  grid.columns = [
    { field: 'ticker', label: 'Ticker', width: '100px', sortable: true },
    { field: 'nome', label: 'Nome do Fundo', sortable: true },
    {
      field: 'preco',
      label: 'Preço',
      align: 'right',
      sortable: true,
      formatter: (v) => `R$ ${Number(v).toFixed(2)}`
    }
  ];

  grid.addEventListener('fzl-grid-select', (e) => {
    console.log('Linha selecionada:', e.detail.item);
  });
</script>
```

---

## 3. Propriedades e Atributos

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `store` | — | `FzlStore<T>` | `undefined` | Instância do store reativo que alimenta os dados da grade. |
| `columns` | — | `FzlGridColumn[]` | `[]` | Definição das colunas da tabela (`field`, `label`, `width`, `sortable`, `align`, `formatter`). |
| `items` | — | `T[]` | `[]` | Lista estática de itens caso não utilize uma instância de `FzlStore`. |
| `selectedId`| `selected-id` | `string \| number \| null` | `null` | Identificador do registro atualmente selecionado. |
| `searchable`| `searchable` | `boolean` | `true` | Se exibe a barra superior de busca/filtro e metadados. |
| `emptyText` | `empty-text` | `string` | `'Nenhum registro encontrado.'` | Mensagem exibida quando não houver registros. |

---

## 4. Eventos Customizados

| Evento | Objeto `detail` | Descrição |
| :--- | :--- | :--- |
| `fzl-grid-select` | `{ item, id }` | Disparado ao selecionar uma linha da grade. |
| `fzl-grid-delete` | `{ item, id }` | Disparado ao clicar no botão de exclusão de uma linha. |
