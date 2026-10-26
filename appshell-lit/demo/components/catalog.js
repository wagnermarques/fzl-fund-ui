import litManifest from '@fzl/webcomponents-lit/custom-elements.json'
import es6Manifest from '@fzl/webcomponents-es6/custom-elements.json'
import angularManifest from '@fzl/webcomponents-angular/custom-elements.json'
import buttonDoc from '../../../docs/components/button.md?raw'

/** Catálogo da documentação viva (#/componentes). Cada componente aponta
 *  para a sua especificação em docs/components/ (o texto) e para as
 *  implementações do monorepo; a API (atributos, eventos, slots, parts) e
 *  os controles do palco saem do custom-elements.json de cada pacote
 *  (`npm run analyze` na raiz do monorepo). O pacote de cada implementação
 *  só é carregado quando a aba dela é aberta — o Angular pesa ~425 KB. */
export const catalog = [
  {
    id: 'button',
    name: 'Button',
    icon: 'smart_button',
    summary: 'Botão com variantes, tamanhos e estado desabilitado.',
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
]

export function findComponent(id) {
  return catalog.find((component) => component.id === id)
}
