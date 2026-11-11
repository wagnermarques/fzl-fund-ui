import { LitElement, html, css } from 'lit';
import { FzlMemoryStore, fzlRegistry } from '@fzl/core';
import '@fzl/webcomponents-lit/button';
import '@fzl/webcomponents-lit/form';
import '@fzl/webcomponents-lit/data-grid';

const SEED_DATA = [
  {
    id: 'fund_1',
    ticker: 'FZL11',
    name: 'FZL Real Estate Opportunities',
    segment: 'Tijolo',
    price: 104.5,
    assets: 850.4,
    status: 'Ativo',
    active: true,
  },
  {
    id: 'fund_2',
    ticker: 'ALZR11',
    name: 'Alianza Trust Renda Imobiliária',
    segment: 'Renda Urbana',
    price: 112.2,
    assets: 1240.8,
    status: 'Ativo',
    active: true,
  },
  {
    id: 'fund_3',
    ticker: 'HGLG11',
    name: 'CSHG Logística FII',
    segment: 'Logística',
    price: 165.8,
    assets: 5120.0,
    status: 'Ativo',
    active: true,
  },
  {
    id: 'fund_4',
    ticker: 'KNRI11',
    name: 'Kinea Renda Imobiliária',
    segment: 'Híbrido',
    price: 158.3,
    assets: 3890.5,
    status: 'Ativo',
    active: true,
  },
  {
    id: 'fund_5',
    ticker: 'MXRF11',
    name: 'Maxi Renda FII',
    segment: 'Papel',
    price: 10.15,
    assets: 2310.2,
    status: 'Em Captação',
    active: true,
  },
  {
    id: 'fund_6',
    ticker: 'XPML11',
    name: 'XP Malls FII',
    segment: 'Shoppings',
    price: 118.9,
    assets: 4100.7,
    status: 'Ativo',
    active: false,
  },
];

/**
 * Página "Developers" — Infraestrutura de Componentes & Modelo de Dados Dijit.
 *
 * Apresenta a arquitetura unificada de componentes herdada e modernizada a partir
 * do Dojo Toolkit / Dijit (_WidgetBase, registry, _CssStateMixin, a11y, dojo/store,
 * _FormWidget, DataGrid), incluindo laboratório interativo com Store reativo,
 * formulário de dados e grid de dados em tempo real.
 */
export class DevelopersView extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 24px 80px;
      font-family: var(--_fzl-font-family, system-ui, sans-serif);
      color: var(--md-sys-color-on-surface, #1e293b);
      box-sizing: border-box;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Hero / Header */
    .hero {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--md-sys-color-primary-container, #e0f2fe);
      color: var(--md-sys-color-on-primary-container, #0369a1);
      margin-bottom: 12px;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
      color: var(--md-sys-color-on-surface, #0f172a);
    }

    .subtitle {
      font-size: 1.05rem;
      line-height: 1.6;
      color: var(--md-sys-color-on-surface-variant, #475569);
      margin: 0 0 16px;
      max-width: 900px;
    }

    .pill-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .pill {
      font-size: 0.8rem;
      padding: 4px 10px;
      background: var(--md-sys-color-surface-container-high, #f1f5f9);
      color: var(--md-sys-color-on-surface-variant, #334155);
      border-radius: 6px;
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      font-family: monospace;
    }

    /* Section Cards Grid */
    .section-title {
      font-size: 1.35rem;
      font-weight: 600;
      margin: 36px 0 16px;
      color: var(--md-sys-color-on-surface, #0f172a);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      padding: 18px;
      background: var(--md-sys-color-surface-container-low, #ffffff);
      border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--md-sys-color-primary, #0284c7);
    }

    .card p {
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--md-sys-color-on-surface-variant, #475569);
      margin: 0;
    }

    .card code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
    }

    /* Interactive Playground */
    .playground-box {
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      border-radius: 16px;
      background: var(--md-sys-color-surface, #ffffff);
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      margin-bottom: 40px;
    }

    .playground-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
    }

    .playground-header h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
    }

    .playground-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .playground-layout {
        grid-template-columns: 1fr;
      }
    }

    /* Form Card */
    .form-card {
      background: var(--md-sys-color-surface-container-lowest, #f8fafc);
      border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-card h4 {
      margin: 0 0 6px;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 150ms ease;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--_fzl-color-primary, #0284c7);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #0369a1;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    /* Telemetry / Log Panel */
    .telemetry-panel {
      margin-top: 24px;
      padding: 16px;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 10px;
      font-family: monospace;
      font-size: 0.8rem;
      overflow-x: auto;
    }

    .telemetry-title {
      font-weight: 600;
      color: #38bdf8;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .log-list {
      max-height: 120px;
      overflow-y: auto;
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .log-item {
      display: flex;
      gap: 8px;
    }

    .log-time {
      color: #94a3b8;
    }

    .log-tag-add { color: #4ade80; font-weight: bold; }
    .log-tag-update { color: #fbbf24; font-weight: bold; }
    .log-tag-delete { color: #f87171; font-weight: bold; }

    /* Code Reference */
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  `;

  _store = new FzlMemoryStore({
    data: JSON.parse(JSON.stringify(SEED_DATA)),
    idProperty: 'id',
  });

  static properties = {
    _selectedFundId: { state: true },
    _logEntries: { state: true },
    _registryCount: { state: true },
  };

  constructor() {
    super();
    this._selectedFundId = 'fund_1';
    this._logEntries = [
      {
        time: new Date().toLocaleTimeString(),
        type: 'info',
        msg: 'FzlMemoryStore inicializado com 6 registros seed.',
      },
    ];
    this._registryCount = fzlRegistry.length;
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindStoreEvents();
  }

  _bindStoreEvents() {
    this._store.observe((event) => {
      const time = new Date().toLocaleTimeString();
      let msg = '';
      if (event.type === 'add') {
        msg = `[ADD] Novo registro '${event.target?.ticker}' (id: ${event.id})`;
      } else if (event.type === 'update') {
        msg = `[UPDATE] Registro '${event.target?.ticker}' atualizado no Store`;
      } else if (event.type === 'delete') {
        msg = `[DELETE] Registro id: ${event.id} removido do Store`;
      }

      this._logEntries = [{ time, type: event.type, msg }, ...this._logEntries.slice(0, 19)];
      this.requestUpdate();
    });
  }

  _handleGridSelect(e) {
    const { item, id } = e.detail;
    this._selectedFundId = id;
    const form = this.shadowRoot?.querySelector('fzl-form');
    if (form && item) {
      form.setValues({
        ticker: item.ticker,
        name: item.name,
        segment: item.segment,
        price: item.price,
        assets: item.assets,
        status: item.status,
        active: item.active,
      });
    }
  }

  _handleGridDelete(e) {
    if (this._selectedFundId === e.detail.id) {
      this._handleNewRecord();
    }
  }

  _handleNewRecord() {
    this._selectedFundId = null;
    const form = this.shadowRoot?.querySelector('fzl-form');
    if (form) {
      form.reset();
      form.setValues({
        ticker: '',
        name: '',
        segment: 'Tijolo',
        price: 100,
        assets: 500,
        status: 'Ativo',
        active: true,
      });
    }
  }

  _handleFormSubmit(e) {
    const values = e.detail;
    if (this._selectedFundId) {
      // Update existing item in Store (store.put)
      this._store.put({
        id: this._selectedFundId,
        ticker: values.ticker,
        name: values.name,
        segment: values.segment,
        price: Number(values.price),
        assets: Number(values.assets),
        status: values.status,
        active: Boolean(values.active),
      });
    } else {
      // Add new item into Store (store.add)
      const newId = this._store.add({
        ticker: values.ticker,
        name: values.name,
        segment: values.segment,
        price: Number(values.price),
        assets: Number(values.assets),
        status: values.status,
        active: Boolean(values.active),
      });
      this._selectedFundId = newId;
    }
  }

  _handleResetSeed() {
    this._store.setData(JSON.parse(JSON.stringify(SEED_DATA)));
    this._selectedFundId = 'fund_1';
    const first = this._store.get('fund_1');
    const form = this.shadowRoot?.querySelector('fzl-form');
    if (form && first) {
      form.setValues(first);
    }
    this._logEntries = [
      {
        time: new Date().toLocaleTimeString(),
        type: 'info',
        msg: 'Dataset resetado para os dados originais.',
      },
      ...this._logEntries,
    ];
  }

  firstUpdated() {
    // Populate form with initial selected record
    const record = this._store.get('fund_1');
    const form = this.shadowRoot?.querySelector('fzl-form');
    if (form && record) {
      form.setValues(record);
    }
  }

  render() {
    const gridColumns = [
      { field: 'ticker', label: 'Ticker', width: '100px', sortable: true },
      { field: 'name', label: 'Nome do Fundo', sortable: true },
      { field: 'segment', label: 'Segmento', width: '140px', sortable: true },
      {
        field: 'price',
        label: 'Cota (R$)',
        width: '110px',
        align: 'right',
        sortable: true,
        formatter: (val) => `R$ ${Number(val).toFixed(2)}`,
      },
      {
        field: 'assets',
        label: 'Patrimônio (M)',
        width: '130px',
        align: 'right',
        sortable: true,
        formatter: (val) => `R$ ${Number(val).toFixed(1)}M`,
      },
      {
        field: 'status',
        label: 'Status',
        width: '110px',
        align: 'center',
        sortable: true,
        formatter: (val) => {
          const bg = val === 'Ativo' ? '#dcfce7' : val === 'Em Captação' ? '#fef3c7' : '#fee2e2';
          const fg = val === 'Ativo' ? '#166534' : val === 'Em Captação' ? '#854d0e' : '#991b1b';
          return html`<span style="background: ${bg}; color: ${fg}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${val}</span>`;
        },
      },
    ];

    const segmentOptions = [
      { value: 'Tijolo', label: 'Tijolo' },
      { value: 'Papel', label: 'Papel' },
      { value: 'Híbrido', label: 'Híbrido' },
      { value: 'Logística', label: 'Logística' },
      { value: 'Renda Urbana', label: 'Renda Urbana' },
      { value: 'Shoppings', label: 'Shoppings' },
      { value: 'Desenvolvimento', label: 'Desenvolvimento' },
    ];

    const statusOptions = [
      { value: 'Ativo', label: 'Ativo' },
      { value: 'Em Captação', label: 'Em Captação' },
      { value: 'Em Liquidação', label: 'Em Liquidação' },
    ];

    return html`
      <div class="hero">
        <div class="hero-badge">
          <span>&#9881;</span> Architecture & Components Infrastructure
        </div>
        <h1>Infraestrutura de Componentes</h1>
        <p class="subtitle">
          Arquitetura base inspirada nos padrões do <strong>Dojo Toolkit / Dijit</strong> e
          modernizada para W3C Custom Elements v1. Provê registro global de componentes, ciclo
          de vida limpo com descarte automático de recursos (<code>own</code>), estados de
          interação, acessibilidade e um <strong>Modelo de Dados Reativo</strong> (<code>dojo/store</code>).
        </p>

        <div class="pill-list">
          <span class="pill">@fzl/core</span>
          <span class="pill">dijit/_WidgetBase</span>
          <span class="pill">dijit/registry</span>
          <span class="pill">dojo/store/Memory</span>
          <span class="pill">dijit/form/Form</span>
          <span class="pill">dojox/grid/DataGrid</span>
          <span class="pill">WCAG 2.1 AA</span>
        </div>
      </div>

      <!-- Pilares Arquiteturais -->
      <h2 class="section-title">
        <span>&#127959;</span> Pilares da Infraestrutura (@fzl/core)
      </h2>
      <div class="cards-grid">
        <div class="card">
          <div class="card-header">
            <span>&#128225;</span> Registro Centralizado
          </div>
          <p>
            Inspirado no <code>dijit/registry</code>. O singleton <code>fzlRegistry</code> mapeia
            cada componente instanciado na árvore DOM via <code>WeakMap</code> e chave única,
            permitindo buscas rápidas por ID (<code>byId</code>) ou elemento (<code>byNode</code>)
            sem vazamento de memória.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>&#128260;</span> Ciclo de Vida e Recursos (own)
          </div>
          <p>
            Herança de <code>dijit/_WidgetBase.own()</code>. Através do <code>FzlWidgetMixin</code>,
            qualquer listener, timer, <code>AbortController</code> ou subscrição adicionado via
            <code>this.own(...)</code> é descartado automaticamente no <code>disconnectedCallback()</code>.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>&#127912;</span> Estados de Interação (_CssStateMixin)
          </div>
          <p>
            Sincronização reativa de ponteiro e foco sem código repetitivo. Adiciona
            automaticamente os atributos <code>data-fzl-hovered</code>, <code>data-fzl-active</code> e
            <code>data-fzl-focused</code> ao elemento hospedeiro.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>&#9855;</span> Acessibilidade e Foco
          </div>
          <p>
            Rastreamento de foco profundo através de Shadow DOM boundaries via <code>fzlFocus</code>,
            navegação de teclado com <em>roving tabindex</em> (<code>FzlKeyNavController</code>) e
            repetição acelerada de botões via <code>FzlTypematicController</code>.
          </p>
        </div>
      </div>

      <!-- Modelo de Dados Dijit -->
      <h2 class="section-title">
        <span>&#128451;</span> Modelo de Dados Reativo (dojo/store)
      </h2>
      <div class="card" style="margin-bottom: 24px;">
        <p>
          O <strong><code>FzlStore</code></strong> implementa a especificação canônica do
          <code>dojo/store/api/Store</code>: métodos puros de consulta e mutação
          (<code>get</code>, <code>query</code>, <code>put</code>, <code>add</code>, <code>remove</code>,
          <code>getIdentity</code>) com suporte a <strong>observabilidade reativa</strong> (<code>observe()</code>).
        </p>
        <p>
          Isso desacopla completamente os dados dos componentes visuais. Quando o Store é mutado
          (seja por um formulário, por uma chamada de backend ou por um WebSocket), todos os
          componentes assinantes (como o <strong>DataGrid</strong> ou selects) reagem e se
          atualizam automaticamente.
        </p>
      </div>

      <!-- Laboratório Interativo -->
      <h2 class="section-title">
        <span>&#9889;</span> Laboratório Interativo: Store + Form + DataGrid
      </h2>

      <div class="playground-box">
        <div class="playground-header">
          <div>
            <h3>Carteira de Fundos Imobiliários & Ativos</h3>
            <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">
              Exercitando o <code>FzlMemoryStore</code>, o formulário <code>&lt;fzl-form&gt;</code> e a grade <code>&lt;fzl-data-grid&gt;</code>.
            </p>
          </div>
          <button type="button" class="btn btn-secondary" @click=${this._handleResetSeed}>
            &#8635; Restaurar Dados Originais
          </button>
        </div>

        <div class="playground-layout">
          <!-- Coluna Esquerda: DataGrid Reativo -->
          <div>
            <fzl-data-grid
              .store=${this._store}
              .columns=${gridColumns}
              .selectedId=${this._selectedFundId}
              @fzl-grid-select=${this._handleGridSelect}
              @fzl-grid-delete=${this._handleGridDelete}
            ></fzl-data-grid>
            <p style="font-size: 0.78rem; color: #64748b; margin-top: 8px;">
              &#128161; Dica: Clique em qualquer linha para carregar os dados no formulário, ordene clicando nos cabeçalhos ou filtre pela caixa de busca.
            </p>
          </div>

          <!-- Coluna Direita: Formulário de Edição/Inclusão -->
          <div class="form-card">
            <h4>
              <span>${this._selectedFundId ? 'Editar Ativo' : 'Novo Ativo'}</span>
              ${this._selectedFundId
                ? html`<span style="font-size: 0.75rem; color: #0284c7; font-weight: normal;">#${this._selectedFundId}</span>`
                : ''}
            </h4>

            <fzl-form @fzl-submit=${this._handleFormSubmit}>
              <fzl-text-input
                name="ticker"
                label="Código / Ticker"
                placeholder="Ex: FZL11"
                required
                minlength="4"
                maxlength="6"
              ></fzl-text-input>

              <fzl-text-input
                name="name"
                label="Nome do Fundo"
                placeholder="Ex: Fundo Imobiliário Alpha"
                required
              ></fzl-text-input>

              <fzl-select
                name="segment"
                label="Segmento"
                .options=${segmentOptions}
                required
              ></fzl-select>

              <fzl-number-input
                name="price"
                label="Preço da Cota"
                prefix="R$ "
                step="0.5"
                min="1"
                required
              ></fzl-number-input>

              <fzl-number-input
                name="assets"
                label="Patrimônio Líquido"
                suffix=" M"
                step="10"
                min="0"
                required
              ></fzl-number-input>

              <fzl-select
                name="status"
                label="Situação"
                .options=${statusOptions}
                required
              ></fzl-select>

              <fzl-checkbox
                name="active"
                label="Incluir na carteira ativa"
              ></fzl-checkbox>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                  ${this._selectedFundId ? 'Salvar (store.put)' : 'Inserir (store.add)'}
                </button>
                <button type="button" class="btn btn-secondary" @click=${this._handleNewRecord}>
                  + Novo Registro
                </button>
              </div>
            </fzl-form>
          </div>
        </div>

        <!-- Telemetria do Store -->
        <div class="telemetry-panel">
          <div class="telemetry-title">
            <span>Console de Eventos do Store (store.observe)</span>
            <span style="font-size: 0.72rem; color: #94a3b8;">${this._logEntries.length} eventos registrados</span>
          </div>
          <ul class="log-list">
            ${this._logEntries.map(
              (entry) => html`
                <li class="log-item">
                  <span class="log-time">[${entry.time}]</span>
                  <span class="log-tag-${entry.type}">${entry.msg}</span>
                </li>
              `
            )}
          </ul>
        </div>
      </div>

      <!-- Snippets de Código -->
      <h2 class="section-title">
        <span>&#128187;</span> Exemplos de Implementação
      </h2>

      <p style="font-size: 0.9rem; color: #475569;">
        Exemplo de como instanciar o <code>FzlMemoryStore</code> e conectá-lo a um formulário e grid:
      </p>

      <pre><code>import { FzlMemoryStore } from '@fzl/core';
import '@fzl/webcomponents-lit/form';
import '@fzl/webcomponents-lit/data-grid';

// 1. Criação do Store (dojo/store)
const store = new FzlMemoryStore({
  data: [
    { id: '1', ticker: 'FZL11', name: 'FZL Fund', price: 104.5 }
  ],
  idProperty: 'id'
});

// 2. Conectar DataGrid ao Store
const grid = document.querySelector('fzl-data-grid');
grid.store = store;

// 3. Ouvir mutações reativas
store.observe((event) => {
  console.log('Store mutado:', event.type, event.target);
});

// 4. Inserir ou atualizar dados
store.put({ id: '1', ticker: 'FZL11', name: 'FZL Fund', price: 108.0 });
</code></pre>

      <!-- Sessão Programadores: Acessibilidade & Novos Widgets A11y -->
      <h2 class="section-title">
        <span>♿</span> Sessão Programadores: Acessibilidade & Novos Widgets A11y (Roadmap WCAG 2.2 / LBI)
      </h2>
      <p style="font-size: 0.95rem; line-height: 1.6; color: var(--md-sys-color-on-surface-variant, #475569); max-width: 950px;">
        Diretrizes técnicas para desenvolvedores do monorepo e equipes de produtos que integram o AppShell.
        O sistema adota o padrão <strong>Docs-as-Code</strong> com especificação completa documentada no
        <strong><a href="#/docs" style="color: var(--_fzl-color-primary, #0284c7); text-decoration: underline;">ADR-008 (docs/architecture/008-accessibility-architecture-and-widgets.md)</a></strong>.
      </p>

      <div class="cards-grid" style="margin-top: 16px;">
        <div class="card">
          <div class="card-header">
            <span>🔊</span> &lt;fzl-lit-speech-reader&gt; (Text-to-Speech)
          </div>
          <p>
            Vocalização nativa de conteúdo textual através da <code>Web Speech API</code> (<code>window.speechSynthesis</code>).
            Permite aos cartões, artigos e modais serem ouvidos por pessoas com baixa visão, dislexia ou em multitarefa,
            com destaque visual sincronizado (<em>sentence highlighting</em> via <code>onboundary</code>).
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>⏭️</span> &lt;fzl-lit-skip-link&gt; (Pular Navegação)
          </div>
          <p>
            Em conformidade com o <strong>WCAG 2.4.1 (Bypass Blocks - Nível A)</strong>. Link invisível no topo da página
            que salta para <code>#main-content</code> ao receber foco por teclado (<code>Tab</code>), poupando usuários de
            navegar repetidamente pelos menus.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>📏</span> &lt;fzl-lit-reading-guide&gt; (Régua de Foco)
          </div>
          <p>
            Suporte cognitivo para <strong>TDAH, dislexia e rastreamento visual (WCAG 1.4.8 AAA)</strong>. Régua semitransparente
            que isola a linha de leitura atual e reduz a distração visual do restante da tela.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>🛡️</span> &lt;fzl-lit-focus-trap&gt; (Guardião de Foco)
          </div>
          <p>
            Em conformidade com o <strong>WCAG 2.1.2</strong>. Garante que o ciclo de navegação por <code>Tab</code> permaneça
            estritamente confinado dentro de modais, gavetas e menus laterais abertos, sem vazar para elementos inativos de fundo.
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>⌨️</span> &lt;fzl-lit-keyboard-shortcuts&gt;
          </div>
          <p>
            Central de ajuda acessível acionada por tecla única (<code>?</code> ou <code>Alt + /</code>), exibindo a lista
            de atalhos rápidos do sistema para navegação sem mouse (<strong>WCAG 2.1.4</strong>).
          </p>
        </div>

        <div class="card">
          <div class="card-header">
            <span>🤟</span> &lt;fzl-lit-vlibras-widget&gt; (LIBRAS)
          </div>
          <p>
            Conformidade com a <strong>Lei Brasileira de Inclusão (LBI nº 13.146/2015)</strong> e e-MAG. Integração padronizada
            com o avatar 3D do VLibras para tradução de interface e relatórios para a Língua Brasileira de Sinais.
          </p>
        </div>
      </div>

      <div class="card" style="margin-top: 16px; background: var(--md-sys-color-surface-container-lowest, #f8fafc);">
        <h4 style="margin: 0 0 8px; font-size: 0.95rem; font-weight: 600;">
          💡 Regras Essenciais para o Desenvolvedor:
        </h4>
        <ul style="font-size: 0.88rem; line-height: 1.6; margin: 0; padding-left: 20px; color: var(--md-sys-color-on-surface-variant, #475569);">
          <li><strong>Ativação por Gesto do Usuário:</strong> O <code>speechSynthesis.speak()</code> só pode ser acionado por clique ou teclado explícito do usuário.</li>
          <li><strong>Mitigação do Bug dos 15 Segundos no Chromium:</strong> Para textos longos, segmente o conteúdo em frases antes de vocalizar.</li>
          <li><strong>Descarte Limpo (own / disconnectedCallback):</strong> Sempre invoque <code>speechSynthesis.cancel()</code> ao desmontar o componente ou trocar de rota.</li>
          <li><strong>Isolamento Multi-Tenant:</strong> As preferências de acessibilidade e voz devem usar chaves de <code>localStorage</code> com prefixo da aplicação (<code>&lt;app&gt;:a11y:preferences</code>).</li>
        </ul>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('developers-view')) {
  customElements.define('developers-view', DevelopersView);
}
