/** Leitura do Custom Elements Manifest (custom-elements.json) para a
 *  documentação viva. */

/** Manifesto dos web components nativos do appshell. */
export const appshellManifest = {
  schemaVersion: '1.0.0',
  readme: '',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/connection-status.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Indicador reativo do estado da conexão de rede (Online / Offline) e tipo de enlace (Wi-Fi, 4G, etc.), com anúncios acessíveis para leitores de tela (WCAG 4.1.3).',
          name: 'ConnectionStatus',
          tagName: 'connection-status',
          customElement: true,
          attributes: [],
          events: [
            {
              name: 'network:online',
              type: { text: 'CustomEvent<{ kind?: string }>' },
              description: 'Disparado pelo networkService quando a conexão de rede retorna.',
            },
            {
              name: 'network:offline',
              type: { text: 'CustomEvent<void>' },
              description: 'Disparado pelo networkService quando a conexão cai.',
            },
          ],
          slots: [],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'connection-status', declaration: { name: 'ConnectionStatus' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/app-clock.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Exibe o dia da semana, data e hora local formatados em pt-BR com algarismos tabulares (tabular-nums), atualizando a cada segundo.',
          name: 'AppClock',
          tagName: 'app-clock',
          customElement: true,
          attributes: [],
          events: [],
          slots: [],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'app-clock', declaration: { name: 'AppClock' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/app-version.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Exibe a versão empacotada da aplicação injetada em tempo de build a partir do package.json via __APP_VERSION__.',
          name: 'AppVersion',
          tagName: 'app-version',
          customElement: true,
          attributes: [],
          events: [],
          slots: [],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'app-version', declaration: { name: 'AppVersion' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/nav-accordion.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Grupo expansível para menus de navegação lateral (drawer). Encapsula <details> e <summary> nativos para acessibilidade e suporta aninhamento.',
          name: 'NavAccordion',
          tagName: 'nav-accordion',
          customElement: true,
          attributes: [
            {
              name: 'label',
              type: { text: 'string' },
              default: "'Seção de Navegação'",
              description: 'Título exibido no cabeçalho do acordeão.',
            },
            {
              name: 'expanded',
              type: { text: 'boolean' },
              default: 'true',
              description: 'Indica se o acordeão inicia aberto.',
            },
            {
              name: 'nested',
              type: { text: 'boolean' },
              default: 'false',
              description: 'Aplica recuo adicional para sub-acordeões aninhados.',
            },
          ],
          events: [],
          slots: [
            {
              name: '',
              description: 'Itens de menu (<md-list>) ou sub-acordeões exibidos quando expandido.',
            },
          ],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'nav-accordion', declaration: { name: 'NavAccordion' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/app-header.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Cabeçalho superior do appshell: contém o botão de abertura do menu lateral, o título clicável da aplicação, slot para ações rápidas e o user-status.',
          name: 'AppHeader',
          tagName: 'app-header',
          customElement: true,
          attributes: [
            {
              name: 'heading',
              type: { text: 'string' },
              default: "'Fund Appshell'",
              description: 'Título principal exibido na barra superior.',
            },
          ],
          events: [
            {
              name: 'menu-toggle',
              type: { text: 'CustomEvent<void>' },
              description: 'Disparado quando o usuário clica no botão de menu (hambúrguer).',
            },
          ],
          slots: [
            {
              name: '',
              description: 'Ações rápidas customizadas posicionadas à esquerda do <user-status>.',
            },
          ],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'app-header', declaration: { name: 'AppHeader' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/app-footer.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Rodapé fixo do appshell que reúne <connection-status>, <app-clock>, slot para indicadores extras e <app-version>.',
          name: 'AppFooter',
          tagName: 'app-footer',
          customElement: true,
          attributes: [],
          events: [],
          slots: [
            {
              name: '',
              description: 'Itens extras inseridos no rodapé à esquerda da versão.',
            },
          ],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'app-footer', declaration: { name: 'AppFooter' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/consent-banner.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Banner de consentimento para medição de uso (Google Analytics 4 / Consent Mode v2) de acordo com a LGPD.',
          name: 'ConsentBanner',
          tagName: 'consent-banner',
          customElement: true,
          attributes: [
            {
              name: 'privacyUrl',
              type: { text: 'string' },
              default: "'#/config/privacidade'",
              description: 'URL opcional para a política de privacidade ("Saiba mais").',
            },
          ],
          events: [
            {
              name: 'consent:change',
              type: { text: "CustomEvent<'granted' | 'denied'>" },
              description: 'Disparado quando o usuário aceita ou recusa a medição analítica.',
            },
          ],
          slots: [],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'consent-banner', declaration: { name: 'ConsentBanner' } }],
    },
    {
      kind: 'javascript-module',
      path: 'src/webcomponents/user-status.js',
      declarations: [
        {
          kind: 'class',
          description:
            'Exibe o botão "Entrar" quando deslogado ou, quando autenticado, o sino de notificações (<user-notifications>) e o avatar com menu da conta.',
          name: 'UserStatus',
          tagName: 'user-status',
          customElement: true,
          attributes: [],
          events: [
            {
              name: 'notification:new',
              type: { text: 'CustomEvent<{ notification: object }>' },
              description: 'Disparado ao receber nova notificação no sino.',
            },
          ],
          slots: [],
          cssParts: [],
        },
      ],
      exports: [{ kind: 'custom-element-definition', name: 'user-status', declaration: { name: 'UserStatus' } }],
    },
  ],
}

/** A declaração do custom element `tag` no manifesto, ou undefined. */
export function findDeclaration(manifest, tag) {
  for (const mod of manifest?.modules ?? []) {
    for (const declaration of mod.declarations ?? []) {
      if (declaration.tagName === tag) return declaration
    }
  }
  return undefined
}

/** "'sm' | 'md' | 'lg'" -> ['sm', 'md', 'lg']; null se o tipo não for uma
 *  união de literais de texto (ex.: um tipo nomeado como FzlButtonVariant). */
export function literalOptions(typeText) {
  if (!typeText) return null
  const parts = typeText.split('|').map((part) => part.trim())
  const values = parts.map((part) => /^(['"])(.*)\1$/.exec(part)?.[2])
  return values.every((value) => value !== undefined) ? values : null
}

/** "'primary'" -> 'primary', "false" -> false; undefined se não houver. */
function parseDefault(text) {
  if (text === undefined) return undefined
  if (text === 'true' || text === 'false') return text === 'true'
  return /^(['"])(.*)\1$/.exec(text)?.[2] ?? text
}

/** Os atributos de uma implementação como controles do palco:
 *  { name, description, kind: 'options' | 'boolean' | 'text', options?, default }.
 *  Ignora atributos privados internos iniciados com '_'. */
export function controlsFor(implementation, siblings) {
  const declaration = findDeclaration(implementation.manifest, implementation.tag)
  return (declaration?.attributes ?? [])
    .filter((attribute) => !attribute.name.startsWith('_'))
    .map((attribute) => {
      let options = literalOptions(attribute.type?.text)
      if (!options) {
        for (const sibling of siblings) {
          const other = findDeclaration(sibling.manifest, sibling.tag)?.attributes?.find((a) => a.name === attribute.name)
          options = literalOptions(other?.type?.text)
          if (options) break
        }
      }
      const kind = options ? 'options' : attribute.type?.text === 'boolean' ? 'boolean' : 'text'
      return { name: attribute.name, description: attribute.description ?? '', kind, options, default: parseDefault(attribute.default) }
    })
}
