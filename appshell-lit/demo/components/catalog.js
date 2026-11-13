import litManifest from '@fzl/webcomponents-lit/custom-elements.json'
import es6Manifest from '@fzl/webcomponents-es6/custom-elements.json'
import angularManifest from '@fzl/webcomponents-angular/custom-elements.json'
import { appshellManifest } from './manifest.js'

import buttonDoc from '../../../docs/components/button.md?raw'
import crumbDoc from '../../../docs/components/crumb.md?raw'
import cardListDoc from '../../../docs/components/card-list.md?raw'
import readerChapterviewDoc from '../../../docs/components/reader-chapterview.md?raw'
import connectionStatusDoc from '../../../docs/components/connection-status.md?raw'
import appClockDoc from '../../../docs/components/app-clock.md?raw'
import appVersionDoc from '../../../docs/components/app-version.md?raw'
import navAccordionDoc from '../../../docs/components/nav-accordion.md?raw'
import appHeaderDoc from '../../../docs/components/app-header.md?raw'
import appFooterDoc from '../../../docs/components/app-footer.md?raw'
import consentBannerDoc from '../../../docs/components/consent-banner.md?raw'
import userStatusDoc from '../../../docs/components/user-status.md?raw'
import webPushDoc from '../../../docs/components/web-push.md?raw'
import avatarUploadDoc from '../../../docs/components/avatar-upload.md?raw'
import geoExplorerDoc from '../../../docs/components/geo-explorer.md?raw'
import formDoc from '../../../docs/components/form.md?raw'
import dataGridDoc from '../../../docs/components/data-grid.md?raw'
import readerMarkBarDoc from '../../../docs/components/reader-mark-bar.md?raw'
import interviewTranscriberDoc from '../../../docs/components/interview-transcriber.md?raw'
import contactPickerDoc from '../../../docs/components/contact-picker.md?raw'
import cameraCaptureDoc from '../../../docs/components/camera-capture.md?raw'
import documentPickerDoc from '../../../docs/components/document-picker.md?raw'

/** Categorias taxonômicas para classificação dos Web Components do ecossistema FZL. */
export const componentCategories = [
  {
    id: 'mobile',
    name: 'Mobile & Dispositivos Nativos',
    shortLabel: 'Mobile',
    icon: 'smartphone',
    emoji: '📱',
    description:
      'Integração direta com recursos de hardware do celular e APIs W3C modernas (Contact Picker, MediaDevices, Web Push) com fallback elegante para desktop.',
  },
  {
    id: 'forms',
    name: 'Formulários & Controles de Entrada',
    shortLabel: 'Formulários',
    icon: 'edit_note',
    emoji: '📝',
    description:
      'Controles de entrada de dados, validação agregada, upload/corte de imagem e botões acessíveis com suporte a disparo typematic.',
  },
  {
    id: 'data',
    name: 'Apresentação de Dados & Grades',
    shortLabel: 'Dados & Grades',
    icon: 'table_chart',
    emoji: '📊',
    description:
      'Exibição estruturada de coleções e tabelas de dados reativas conectadas ao FzlStore (dojo/store), com paginação, busca, ordenação e exportação.',
  },
  {
    id: 'navigation',
    name: 'Navegação & Estrutura de Layout',
    shortLabel: 'Navegação',
    icon: 'explore',
    emoji: '🧭',
    description:
      'Orientação espacial (wayfinding), trilhas estruturais (breadcrumbs), menus sanfonados e barras mestras de cabeçalho e rodapé.',
  },
  {
    id: 'multimedia',
    name: 'Multimídia & Pesquisa Qualitativa',
    shortLabel: 'Multimídia',
    icon: 'mic',
    emoji: '🎙️',
    description:
      'Captura de áudio em alta fidelidade, medição sonora em tempo real (VU Meter), transcrição ao vivo e instrumentação de entrevistas de campo.',
  },
  {
    id: 'geo',
    name: 'Geoespacial & Mapas (GIS)',
    shortLabel: 'Geoespacial',
    icon: 'map',
    emoji: '🗺️',
    description:
      'Visualização cartográfica interativa, gerenciamento de camadas vetoriais, alternador de mapas-base e integração às malhas estatísticas do IBGE.',
  },
  {
    id: 'reader',
    name: 'Conteúdo, Leitura & Estudo Interativo',
    shortLabel: 'Leitor & Conteúdo',
    icon: 'menu_book',
    emoji: '📖',
    description:
      'Leitura imersiva, seleção de texto sem conflito com gestos nativos, barra flutuante arrastável de marcações e seletores de capítulos em chips.',
  },
  {
    id: 'system',
    name: 'Sistema, AppShell & Conformidade (LGPD)',
    shortLabel: 'Sistema & LGPD',
    icon: 'security',
    emoji: '⚙️',
    description:
      'Módulos de infraestrutura da casca da aplicação, gestão de consentimento e privacidade (LGPD/GDPR), telemetria de rede, perfil e relógio.',
  },
]

/** Catálogo da documentação viva (#/componentes). Cada componente aponta
 *  para a sua especificação em docs/components/ (o texto) e para as
 *  implementações do monorepo; a API (atributos, eventos, slots, parts) e
 *  os controles do palco saem do custom-elements.json de cada pacote. */
export const catalog = [
  {
    id: 'button',
    category: 'forms',
    name: 'Button',
    icon: 'smart_button',
    summary:
      'Botão interativo padronizado, acessível e tematizável via Design Tokens (--fzl-*), com suporte a variantes (primary, secondary, danger), escalas de tamanho (sm, md, lg) e estado desabilitado.',
    doc: buttonDoc,
    slotText: 'Salvar',
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-lit-button',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/button'),
      },
      {
        id: 'es6',
        label: 'Vanilla ES6',
        tag: 'fzl-es6-button',
        packageName: '@fzl/webcomponents-es6',
        manifest: es6Manifest,
        load: () => import('@fzl/webcomponents-es6'),
      },
      {
        id: 'angular',
        label: 'Angular',
        tag: 'fzl-ng-button',
        packageName: '@fzl/webcomponents-angular',
        manifest: angularManifest,
        load: () => import('@fzl/webcomponents-angular'),
      },
    ],
  },
  {
    id: 'crumb',
    category: 'navigation',
    name: 'Crumb (Breadcrumb)',
    icon: 'linear_scale',
    summary:
      'Trilha de navegação estrutural (WCAG 2.4.8) que exibe o caminho completo da visão atual na navegação e oferece o botão "Voltar" para retornar à visão anterior.',
    doc: crumbDoc,
    slotText: '',
    initialValues: {
      path: 'Início / Componentes / Crumb',
      'back-label': 'Voltar',
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-lit-crumb',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/crumb'),
      },
      {
        id: 'es6',
        label: 'Vanilla ES6',
        tag: 'fzl-es6-crumb',
        packageName: '@fzl/webcomponents-es6',
        manifest: es6Manifest,
        load: () => import('@fzl/webcomponents-es6'),
      },
      {
        id: 'angular',
        label: 'Angular',
        tag: 'fzl-ng-crumb',
        packageName: '@fzl/webcomponents-angular',
        manifest: angularManifest,
        load: () => import('@fzl/webcomponents-angular'),
      },
    ],
  },
  {
    id: 'card-list',
    category: 'data',
    name: 'Card List',
    icon: 'dashboard_customize',
    summary:
      'Lista interativa de cards estruturados com suporte a modos de layout (grid, vertical, horizontal), rolagem configurável, ordenação dinâmica, reordenação manual por arrastar-e-soltar / botões acessíveis, filtragem de busca e variação colapsável estilo acordeão com rolagem interna para textos longos.',
    doc: cardListDoc,
    slotText: '',
    initialValues: {
      layout: 'grid',
      'max-height': '500px',
      'allow-sort': true,
      'allow-filter': true,
      'allow-reorder': true,
      'collapsible-cards': true,
      'card-body-max-height': '160px',
      'storage-key': 'fzl-demo-tasks-order',
      'storage-type': 'local',
      'sort-by': '',
      'sort-order': 'asc',
      items: JSON.stringify([
        {
          id: 'task-1',
          title: 'Revisar módulo de Arquitetura Apache Camel',
          subtitle: 'Integração OSGi',
          description: 'Concluir a refatoração das rotas e documentar parâmetros no Blueprint OSGi.',
          category: 'Cursos',
          priority: 'ALTA',
          status: 'EM_ANDAMENTO',
          date: '2026-10-31',
          actionLabel: 'Concluir',
          tags: ['camel', 'karaf']
        },
        {
          id: 'task-2',
          title: 'Pagamento da fatura de serviços Cloud',
          subtitle: 'Infraestrutura AWS',
          description: 'Efetuar pagamento da mensalidade e conciliar notas fiscais no sistema.',
          category: 'Financeiro',
          priority: 'MEDIA',
          status: 'PENDENTE',
          date: '2026-11-05',
          actionLabel: 'Pagar',
          tags: ['financeiro', 'cloud']
        },
        {
          id: 'task-3',
          title: 'Comprar itens de mercado para a semana',
          subtitle: 'Despensa do escritório',
          description: 'Frutas, verduras, café em grãos e itens essenciais de reposição.',
          category: 'Pessoal',
          priority: 'BAIXA',
          status: 'PENDENTE',
          date: '2026-11-02',
          actionLabel: 'Ver lista',
          tags: ['pessoal']
        },
        {
          id: 'task-4',
          title: 'Deploy da nova versão do Appshell',
          subtitle: 'Pipeline CI/CD',
          description: 'Publicar bundle no GitHub Pages e notificar equipe via canal de DevOps.',
          category: 'DevOps',
          priority: 'URGENTE',
          status: 'PENDENTE',
          date: '2026-10-30',
          actionLabel: 'Executar',
          tags: ['deploy', 'release']
        },
        {
          id: 'task-5',
          title: 'Parecer Jurídico & Termos Regulatórios de Fundos',
          subtitle: 'Análise de Enquadramento CVM',
          description: '1. O presente parecer analisa a conformidade do fundo de investimento estruturado sob as resoluções da CVM.\n\n2. Da segregação patrimonial: os ativos integrantes da carteira não se comunicam com o patrimônio da administradora ou custodiante.\n\n3. Do cálculo da cota diária: os critérios de precificação a mercado (Mark-to-Market) devem ser rigorosamente observados ao término de cada dia útil bancário.\n\n4. Dos fatores de risco e disclosure: recomenda-se expressa notificação aos cotistas quanto aos prazos de cotização e liquidação financeira nos resgates extraordinários.',
          category: 'Compliance',
          priority: 'ALTA',
          status: 'EM_ANDAMENTO',
          date: '2026-11-10',
          actionLabel: 'Homologar',
          tags: ['cvm', 'juridico', 'compliance']
        }
      ]),
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-lit-card-list',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/card-list'),
      },
      {
        id: 'es6',
        label: 'Vanilla ES6',
        tag: 'fzl-es6-card-list',
        packageName: '@fzl/webcomponents-es6',
        manifest: es6Manifest,
        load: () => import('@fzl/webcomponents-es6'),
      },
      {
        id: 'angular',
        label: 'Angular',
        tag: 'fzl-ng-card-list',
        packageName: '@fzl/webcomponents-angular',
        manifest: angularManifest,
        load: () => import('@fzl/webcomponents-angular'),
      },
    ],
  },
  {
    id: 'reader-chapterview',
    category: 'reader',
    name: 'Reader ChapterView (Chip)',
    icon: 'label',
    summary:
      'Componente padronizado de chip / tag / badge para leitores, barras de filtros, seleção de capítulos e categorização.',
    doc: readerChapterviewDoc,
    slotText: '',
    initialValues: {
      label: 'Gênesis 1',
      value: 'gen-1',
      count: 31,
      selected: false,
      removable: true,
      disabled: false,
      variant: 'default',
      color: '',
      'remove-aria-label': 'Remover capítulo',
    },
    implementations: [
      {
        id: 'chip',
        label: 'Chip Individual (Lit)',
        tag: 'fzl-reader-chapterview',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/reader-chapterview'),
        initialValues: {
          label: 'Gênesis 1',
          value: 'gen-1',
          count: 31,
          selected: false,
          removable: true,
          disabled: false,
          variant: 'default',
          color: '',
          'remove-aria-label': 'Remover capítulo',
        },
      },
      {
        id: 'group',
        label: 'Grupo de Chips (Lit)',
        tag: 'fzl-reader-chapterview-group',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/reader-chapterview'),
        initialValues: {
          'selection-mode': 'single',
          selected: 'cap-1',
          wrap: true,
          'aria-label': 'Seletor de capítulos e tags',
          items: JSON.stringify([
            { label: 'Gênesis 1', value: 'cap-1', count: 31 },
            { label: 'Gênesis 2', value: 'cap-2', count: 25 },
            { label: 'Gênesis 3', value: 'cap-3', count: 24 },
            { label: 'Doutrina', value: 'tag-doutrina', color: '#1a73e8' },
            { label: 'Oração', value: 'tag-oracao', color: '#1e8e3e' },
            { label: 'Estudo Bíblico', value: 'tag-estudo', color: '#6750a4' },
            { label: 'Tag Removível', value: 'tag-removivel', removable: true },
          ]),
        },
      },
    ],
  },
  {
    id: 'reader-chapterview-group',
    category: 'reader',
    name: 'Reader ChapterView Group',
    icon: 'view_timeline',
    summary:
      'Contêiner de agrupamento para chips com suporte a seleção única/múltipla, navegação roving tabindex e quebra flexível de linha.',
    doc: readerChapterviewDoc,
    slotText: '',
    initialValues: {
      'selection-mode': 'single',
      selected: 'cap-1',
      wrap: true,
      'aria-label': 'Seletor de capítulos e tags',
      items: JSON.stringify([
        { label: 'Gênesis 1', value: 'cap-1', count: 31 },
        { label: 'Gênesis 2', value: 'cap-2', count: 25 },
        { label: 'Gênesis 3', value: 'cap-3', count: 24 },
        { label: 'Doutrina', value: 'tag-doutrina', color: '#1a73e8' },
        { label: 'Oração', value: 'tag-oracao', color: '#1e8e3e' },
        { label: 'Estudo Bíblico', value: 'tag-estudo', color: '#6750a4' },
        { label: 'Tag Removível', value: 'tag-removivel', removable: true },
      ]),
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-reader-chapterview-group',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/reader-chapterview'),
      },
    ],
  },
  {
    id: 'avatar-upload',
    category: 'forms',
    name: 'Avatar Upload & Crop',
    icon: 'account_circle',
    summary:
      'Web Component acessível para upload e recorte redondo ("crop circular") de fotos de perfil com pan, zoom, rotação e saídas em Data URL e Blob prontas para qualquer backend.',
    doc: avatarUploadDoc,
    slotText: '',
    initialValues: {
      name: 'Wagner Marques',
      size: 130,
      'button-label': 'Alterar foto',
      'crop-title': 'Recortar foto de perfil',
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-lit-avatar-upload',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/avatar-upload'),
      },
    ],
  },
  {
    id: 'connection-status',
    category: 'system',
    name: 'Connection Status',
    icon: 'wifi',
    summary:
      'Indicador reativo do estado da conexão de rede (Online / Offline) e do tipo de enlace fornecido pelo networkService, anunciando alterações para leitores de tela (WCAG 4.1.3).',
    doc: connectionStatusDoc,
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'connection-status',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/connection-status.js'),
      },
    ],
  },
  {
    id: 'app-clock',
    category: 'system',
    name: 'App Clock',
    icon: 'schedule',
    summary:
      'Exibe o dia da semana, data e hora local formatados em pt-BR com algarismos tabulares (tabular-nums), atualizando a cada segundo.',
    doc: appClockDoc,
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'app-clock',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/app-clock.js'),
      },
    ],
  },
  {
    id: 'app-version',
    category: 'system',
    name: 'App Version',
    icon: 'tag',
    summary:
      'Exibe a versão empacotada da aplicação (injetada em tempo de build a partir do package.json via __APP_VERSION__), facilitando o diagnóstico e suporte.',
    doc: appVersionDoc,
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'app-version',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/app-version.js'),
      },
    ],
  },
  {
    id: 'nav-accordion',
    category: 'navigation',
    name: 'Nav Accordion',
    icon: 'expand_more',
    summary:
      'Grupo expansível para menus de navegação lateral (drawer). Encapsula <details> e <summary> nativos para acessibilidade por teclado e leitores de tela, suportando aninhamento.',
    doc: navAccordionDoc,
    slotText: 'Item 1 • Item 2 • Item 3',
    initialValues: {
      label: 'Seção de Navegação',
      expanded: true,
      nested: false,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'nav-accordion',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/nav-accordion.js'),
      },
    ],
  },
  {
    id: 'app-header',
    category: 'navigation',
    name: 'App Header',
    icon: 'web_asset',
    summary:
      'Cabeçalho superior do appshell: contém o botão de abertura do menu lateral, o título clicável da aplicação, um slot para ações rápidas e o componente <user-status>.',
    doc: appHeaderDoc,
    slotText: '',
    initialValues: {
      heading: 'Fund Appshell',
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'app-header',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/app-header.js'),
      },
    ],
  },
  {
    id: 'app-footer',
    category: 'navigation',
    name: 'App Footer',
    icon: 'bottom_panel_open',
    summary:
      'Rodapé fixo do appshell que reúne <connection-status>, <app-clock>, um slot para indicadores extras do aplicativo consumidor e <app-version>.',
    doc: appFooterDoc,
    slotText: '',
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'app-footer',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/app-footer.js'),
      },
    ],
  },
  {
    id: 'consent-banner',
    category: 'system',
    name: 'Consent Banner (LGPD)',
    icon: 'cookie',
    summary:
      'Banner de consentimento para medição de uso (Google Analytics 4 / Consent Mode v2). Segue a LGPD dando o mesmo peso visual para "Recusar" e "Aceitar".',
    doc: consentBannerDoc,
    slotText: '',
    initialValues: {
      privacyUrl: '#/config/privacidade',
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'consent-banner',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/consent-banner.js'),
      },
    ],
  },
  {
    id: 'user-status',
    category: 'system',
    name: 'User Status & Notifications',
    icon: 'notifications',
    summary:
      'Exibe o botão "Entrar" quando deslogado ou, quando autenticado, o sino de notificações (<user-notifications>) com contador de avisos não lidos e o avatar com menu da conta.',
    doc: userStatusDoc,
    slotText: '',
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'user-status',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/user-status.js'),
      },
    ],
  },
  {
    id: 'web-push',
    category: 'mobile',
    name: 'Web Push',
    icon: 'send_to_mobile',
    summary:
      'Componente configurável de Web Push (<fzl-web-push> / <web-push-component>) com comportamento headless por padrão e exibição condicional (prompt de permissão, alertas e toasts de mensagens).',
    doc: webPushDoc,
    slotText: '',
    initialValues: {
      'display-mode': 'badge',
      topics: 'alertas,processos',
      'auto-prompt': false,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-web-push',
        packageName: 'fzl-fund-appshell--lit',
        manifest: appshellManifest,
        load: () => import('../../src/webcomponents/web-push.js'),
      },
    ],
  },
  {
    id: 'geo-explorer',
    category: 'geo',
    name: 'Explorador Geográfico & Malhas IBGE',
    icon: 'map',
    summary:
      'Suíte de componentes cartográficos e SIG com Leaflet, grade de tiles Slippy Map (Z/X/Y), Auto-LOD e malhas territoriais do IBGE.',
    doc: geoExplorerDoc,
    slotText: '',
    initialValues: {
      lat: -14.235,
      lng: -51.925,
      zoom: 4,
      basemap: 'carto-positron',
      'show-debug-grid': false,
      'auto-lod': true,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-geo-explorer',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/geo-explorer'),
      },
    ],
  },
  {
    id: 'form',
    category: 'forms',
    name: 'Formulário & Controles de Entrada',
    icon: 'edit_note',
    summary:
      'Formulário orquestrador inspirado no dijit/form/Form e controles básicos (_FormWidget: text-input, number-input, select, checkbox) com validação e serialização de dados.',
    doc: formDoc,
    slotText: '<fzl-text-input name="exemplo" label="Campo de Exemplo" placeholder="Digite algo..." required></fzl-text-input>',
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-form',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/form'),
      },
    ],
  },
  {
    id: 'data-grid',
    category: 'data',
    name: 'DataGrid Reativo',
    icon: 'table_chart',
    summary:
      'Grade de dados tabular reativa inspirada no dojox/grid/DataGrid e dgrid, integrada ao FzlStore (dojo/store) com ordenação, busca e seleção.',
    doc: dataGridDoc,
    slotText: '',
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-data-grid',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/data-grid'),
      },
      {
        id: 'es6',
        label: 'Vanilla ES6',
        tag: 'fzl-es6-data-grid',
        packageName: '@fzl/webcomponents-es6',
        manifest: es6Manifest,
        load: () => import('@fzl/webcomponents-es6'),
      },
      {
        id: 'angular',
        label: 'Angular',
        tag: 'fzl-ng-data-grid',
        packageName: '@fzl/webcomponents-angular',
        manifest: angularManifest,
        load: () => import('@fzl/webcomponents-angular'),
      },
    ],
  },
  {
    id: 'reader-mark-bar',
    category: 'reader',
    name: 'Barra de Marcação do Leitor (Draggable Floating Island)',
    icon: 'brush',
    summary:
      'Barra flutuante arrastável com paleta de cores e ações de estudo bíblico/leitura, sem conflito com o Touch-to-Search do Android e gestos do sistema.',
    doc: readerMarkBarDoc,
    slotText: '',
    initialValues: {
      mode: 'floating',
      visible: true,
      'selected-text': 'O Senhor é o meu pastor; de nada terei falta.',
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-reader-mark-bar',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/reader-mark-bar'),
      },
    ],
  },
  {
    id: 'reader-content',
    category: 'reader',
    name: 'Área de Leitura & Grifos Interativos',
    icon: 'menu_book',
    summary:
      'Container interativo de leitura com seleção de texto em tempo real, suporte aos 3 modos de barra (flutuante arrastável, topo e balão) e aplicação persistente de grifos.',
    doc: readerMarkBarDoc,
    slotText: '',
    initialValues: {
      mode: 'floating',
      'passage-title': 'Salmos 23',
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-reader-content',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/reader-content'),
      },
    ],
  },
  {
    id: 'interview-transcriber',
    category: 'multimedia',
    name: 'Gravador & Transcritor Qualitativo',
    icon: 'mic',
    summary:
      'Componente para gravação de voz (MediaRecorder), medição de nível sonoro com VU Meter (Web Audio API), transcrição assistida ao vivo (Web Speech API) e persistência estruturada de entrevistas qualitativas no backend.',
    doc: interviewTranscriberDoc,
    slotText: '',
    initialValues: {
      'participant-id': 'P-01',
      interviewer: 'Pesquisador Responsável',
      topic: 'Avaliação Qualitativa de Fundos & Percepção de Risco',
      language: 'pt-BR',
      'auto-transcribe': true,
      'allow-download': true,
      'consent-confirmed': true,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-lit-interview-transcriber',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/interview-transcriber'),
      },
    ],
  },
  {
    id: 'contact-picker',
    category: 'mobile',
    name: 'Seletor de Contatos Mobile',
    icon: 'contacts',
    summary:
      'Seletor nativo de contatos móveis (W3C Contact Picker API: navigator.contacts.select) com fallback para vCard (.vcf) e digitação manual.',
    doc: contactPickerDoc,
    slotText: '',
    initialValues: {
      'button-label': 'Selecionar Contato',
      multiple: true,
      properties: 'name,tel,email',
      'allow-import-vcard': true,
      'allow-manual-add': true,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-contact-picker',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/contact-picker'),
      },
    ],
  },
  {
    id: 'camera-capture',
    category: 'mobile',
    name: 'Câmera, Foto & Vídeo',
    icon: 'photo_camera',
    summary:
      'Captura mobile de fotos em alta resolução e gravação de vídeos via MediaRecorder com troca de câmera (frontal/traseira), lanterna (torch), overlays de enquadramento e revisão.',
    doc: cameraCaptureDoc,
    slotText: '',
    initialValues: {
      mode: 'both',
      'facing-mode': 'environment',
      overlay: 'document',
      'max-video-duration': 30,
      'allow-torch': true,
      'allow-flip': true,
      countdown: 0,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-camera-capture',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/camera-capture'),
      },
    ],
  },
  {
    id: 'document-picker',
    category: 'reader',
    categories: ['reader', 'mobile'],
    name: 'Seletor, Leitor & Bookmark de Documentos',
    icon: 'folder_open',
    summary:
      'Pesquisa e abre documentos do sistema de arquivos (mobile ou desktop) para leitura imediata offline, organização em Bookmarks com tags ou upload para o backend.',
    doc: documentPickerDoc,
    slotText: '',
    initialValues: {
      mode: 'all',
      accept: '.txt,.md,.pdf,.csv,.json,.doc,.docx',
      multiple: true,
      'allow-folder-scan': true,
      'start-in': 'documents',
      'enforce-start-in': true,
      'preload-samples': true,
    },
    implementations: [
      {
        id: 'lit',
        label: 'Lit',
        tag: 'fzl-document-picker',
        packageName: '@fzl/webcomponents-lit',
        manifest: litManifest,
        load: () => import('@fzl/webcomponents-lit/document-picker'),
      },
    ],
  },
]

export function findComponent(id) {
  return catalog.find((component) => component.id === id)
}

export function findCategory(categoryId) {
  return componentCategories.find((category) => category.id === categoryId)
}

export function getComponentCategories(component) {
  if (!component) return []
  const ids =
    Array.isArray(component.categories) && component.categories.length > 0
      ? component.categories
      : component.category
        ? [component.category]
        : []
  return ids.map((id) => findCategory(id)).filter(Boolean)
}

export function hasCategory(component, categoryId) {
  if (!component) return false
  if (Array.isArray(component.categories) && component.categories.length > 0) {
    return component.categories.includes(categoryId)
  }
  return component.category === categoryId
}
