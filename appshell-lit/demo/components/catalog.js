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

/** Catálogo da documentação viva (#/componentes). Cada componente aponta
 *  para a sua especificação em docs/components/ (o texto) e para as
 *  implementações do monorepo; a API (atributos, eventos, slots, parts) e
 *  os controles do palco saem do custom-elements.json de cada pacote. */
export const catalog = [
  {
    id: 'button',
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
    name: 'Card List',
    icon: 'dashboard_customize',
    summary:
      'Lista interativa de cards estruturados com suporte a modos de layout (grid, vertical, horizontal), rolagem configurável, ordenação dinâmica por múltiplos campos, reordenação manual por arrastar-e-soltar / botões acessíveis e filtragem de busca.',
    doc: cardListDoc,
    slotText: '',
    initialValues: {
      layout: 'grid',
      'max-height': '450px',
      'allow-sort': true,
      'allow-filter': true,
      'allow-reorder': true,
      'sort-by': '',
      'sort-order': 'asc',
      items: JSON.stringify([
        {
          id: 'task-1',
          title: 'Revisar módulo de Arquitetura Apache Camel',
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
          description: 'Publicar bundle no GitHub Pages e notificar equipe via canal de DevOps.',
          category: 'DevOps',
          priority: 'URGENTE',
          status: 'PENDENTE',
          date: '2026-10-30',
          actionLabel: 'Executar',
          tags: ['deploy', 'release']
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
    id: 'connection-status',
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
]

export function findComponent(id) {
  return catalog.find((component) => component.id === id)
}
