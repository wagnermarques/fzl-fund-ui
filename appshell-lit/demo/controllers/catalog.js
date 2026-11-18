import overviewDoc from '../../../docs/components/controllers.md?raw'
import baseDoc from '../../../docs/controllers/base.md?raw'
import userDataDoc from '../../../docs/controllers/user-data.md?raw'
import crudBaseDoc from '../../../docs/controllers/crud-base.md?raw'
import dataGridDoc from '../../../docs/controllers/data-grid.md?raw'
import bookmarksDoc from '../../../docs/controllers/bookmarks.md?raw'
import socialAuthDoc from '../../../docs/controllers/social-auth.md?raw'
import cloudUploadDoc from '../../../docs/controllers/cloud-upload.md?raw'
import personalCloudDocsDoc from '../../../docs/controllers/personal-cloud-docs.md?raw'
import docxReaderDoc from '../../../docs/controllers/docx-reader.md?raw'

export { overviewDoc }

/** Grupos da página #/controllers. */
export const controllerGroups = [
  {
    id: 'foundation',
    name: 'Fundação',
    description: 'A classe que todos estendem: ciclo de vida do host, modo headless e eventos.',
  },
  {
    id: 'data',
    name: 'Dados do usuário & Persistência',
    description:
      'Isolamento por usuário, CRUD local-first com consistência entre o navegador e a persistência final, grids e favoritos.',
  },
  {
    id: 'cloud',
    name: 'Autenticação & Nuvem',
    description: 'Login social (Google / Microsoft) e envio para Drive, OneDrive, S3 ou REST.',
  },
  {
    id: 'content',
    name: 'Conteúdo',
    description: 'Leitura estruturada de documentos.',
  },
]

/** Controllers extensíveis de @fzl/webcomponents-lit/controllers. `parent` monta a árvore de herança. */
export const controllers = [
  {
    id: 'base',
    name: 'FzlBaseController',
    group: 'foundation',
    parent: null,
    icon: 'account_tree',
    summary: 'Base de todos: ciclo de vida do host (Lit), subscribe() headless e emitHostEvent().',
    doc: baseDoc,
  },
  {
    id: 'user-data',
    name: 'FzlUserDataController',
    group: 'data',
    parent: 'base',
    icon: 'folder_shared',
    isNew: true,
    summary:
      'Isola IndexedDB e localStorage por usuário e aplica a política de logout (purge | ask | keep) sem perder dados não sincronizados.',
    doc: userDataDoc,
  },
  {
    id: 'crud-base',
    name: 'FzlCrudBaseController',
    group: 'data',
    parent: 'base',
    icon: 'dataset',
    isNew: true,
    summary:
      'CRUD local-first multi-fonte: apagar do grid apaga de todas as fontes (lápide → remotos → local). Adaptadores IndexedDB, Google Drive e OneDrive.',
    doc: crudBaseDoc,
  },
  {
    id: 'data-grid',
    name: 'FzlDataGridController',
    group: 'data',
    parent: 'base',
    icon: 'table_chart',
    summary: 'Estado de tabelas: FzlStore, ordenação, busca, paginação, seleção e CSV.',
    doc: dataGridDoc,
  },
  {
    id: 'bookmarks',
    name: 'FzlBookmarksController',
    group: 'data',
    parent: 'base',
    icon: 'bookmarks',
    summary: 'Favoritos com tags e notas, sincronizados entre abas e (com userData) por usuário.',
    doc: bookmarksDoc,
  },
  {
    id: 'social-auth',
    name: 'FzlSocialAuthController',
    group: 'cloud',
    parent: 'base',
    icon: 'login',
    summary: 'Login com Google (GIS) e Microsoft (Entra) com escopos de Drive/OneDrive.',
    doc: socialAuthDoc,
  },
  {
    id: 'cloud-upload',
    name: 'FzlCloudUploadController',
    group: 'cloud',
    parent: 'base',
    icon: 'cloud_upload',
    summary: 'Upload multi-provedor (rest, google-drive, s3, onedrive, custom) com status reativo.',
    doc: cloudUploadDoc,
  },
  {
    id: 'personal-cloud-docs',
    name: 'FzlPersonalCloudDocsController',
    group: 'cloud',
    parent: 'cloud-upload',
    icon: 'cloud_sync',
    summary: 'Envia para a nuvem pessoal da conta logada: Google Docs/Drive ou OneDrive.',
    doc: personalCloudDocsDoc,
  },
  {
    id: 'docx-reader',
    name: 'FzlDocxReaderController',
    group: 'content',
    parent: 'base',
    icon: 'article',
    summary: 'Leitura de .docx (OOXML nativo) e texto, com busca, zoom e study-verses.',
    doc: docxReaderDoc,
  },
]

export function findController(id) {
  return controllers.find((controller) => controller.id === id)
}
