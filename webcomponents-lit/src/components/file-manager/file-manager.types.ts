import type { FzlDocxBlock } from '../document-picker/docx-parser';
import type { FzlDocumentCategory } from '../document-picker/document-picker.types';

export type FzlFileSourceStatus =
  | 'bookmarked-only'
  | 'uploaded-only'
  | 'synced'
  | 'pending-upload';

export type FzlFileManagerViewMode = 'table' | 'grid';

export interface FzlManagedFile {
  id: string;
  name: string;
  folder: string; // e.g. "/" or "/pareceres" or "/relatorios"
  size: number;
  extension: string;
  category: FzlDocumentCategory;
  status: FzlFileSourceStatus;
  downloadUrl?: string;
  uploadedAt?: number;
  uploadedBy?: string;
  bookmarkedAt?: number;
  lastReadAt?: number;
  readProgress?: number; // 0 to 100 percentage
  tags: string[];
  notes?: string;
  textContent?: string;
  docxBlocks?: FzlDocxBlock[];
  objectUrl?: string;
}

export interface FzlFileManagerFolder {
  path: string;
  name: string;
  count: number;
}

export const SAMPLE_MANAGED_FILES: FzlManagedFile[] = [
  {
    id: 'file-despacho-etec',
    name: 'Despacho_Etec_Aproveitamento.docx',
    folder: '/processos/2026',
    size: 24576,
    extension: '.docx',
    category: 'text',
    status: 'synced',
    uploadedAt: Date.UTC(2026, 10, 12, 14, 30),
    uploadedBy: 'Diretoria Acadêmica',
    bookmarkedAt: Date.UTC(2026, 10, 12, 15, 0),
    lastReadAt: Date.UTC(2026, 10, 13, 9, 15),
    readProgress: 65,
    tags: ['etec', 'aproveitamento', 'despacho'],
    notes: 'Despacho homologado de aproveitamento de estudos.',
    textContent:
      'DESPACHO\n\n' +
      'Considerando o disposto nos artigos 43 e 44 do Regimento Comum das Escolas Técnicas Estaduais...\n\n' +
      'O (A) Diretor (a) da Etec ZONA LESTE, no uso de suas atribuições legais, em face do pedido de aproveitamento...\n\n' +
      'Inglês Instrumental | deferido o aproveitamento de estudos',
    docxBlocks: [
      {
        type: 'heading',
        level: 1,
        text: 'DESPACHO',
        runs: [{ text: 'DESPACHO', bold: true }],
      },
      {
        type: 'paragraph',
        text: 'Considerando o disposto nos artigos 43 e 44 do Regimento Comum das Escolas Técnicas Estaduais do Centro Paula Souza.',
        runs: [
          {
            text: 'Considerando o disposto nos artigos 43 e 44 do Regimento Comum das Escolas Técnicas Estaduais do Centro Paula Souza.',
          },
        ],
      },
      {
        type: 'paragraph',
        text: 'O (A) Diretor (a) da Etec ZONA LESTE, decide:',
        runs: [
          { text: 'O (A) Diretor (a) da Etec ' },
          { text: 'ZONA LESTE', bold: true },
          { text: ', decide:' },
        ],
      },
      {
        type: 'table',
        rows: [
          ['Componente (s) Curricular(es)', 'Resultado'],
          ['Inglês Instrumental', 'deferido o aproveitamento de estudos'],
        ],
        text: 'Componente (s) Curricular(es) | Resultado\nInglês Instrumental | deferido o aproveitamento de estudos',
      },
    ],
  },
  {
    id: 'file-parecer-comissao',
    name: 'Doc_13.1_Parecer_da_Comissao_anexo_I.docx',
    folder: '/processos/2026',
    size: 38912,
    extension: '.docx',
    category: 'text',
    status: 'uploaded-only',
    uploadedAt: Date.UTC(2026, 10, 11, 10, 0),
    uploadedBy: 'Comissão de Professores',
    readProgress: 100,
    tags: ['parecer', 'comissão'],
    textContent:
      'PARECER DA COMISSÃO DE PROFESSORES\n\n' +
      'A comissão avaliadora analisou as ementas e histórico escolar apresentados pelo candidato e manifesta-se favorável ao deferimento.',
    docxBlocks: [
      {
        type: 'heading',
        level: 2,
        text: 'PARECER DA COMISSÃO DE PROFESSORES',
        runs: [{ text: 'PARECER DA COMISSÃO DE PROFESSORES', bold: true }],
      },
      {
        type: 'paragraph',
        text: 'A comissão avaliadora analisou as ementas e histórico escolar apresentados pelo candidato e manifesta-se favorável ao deferimento.',
        runs: [
          {
            text: 'A comissão avaliadora analisou as ementas e histórico escolar apresentados pelo candidato e manifesta-se favorável ao deferimento.',
          },
        ],
      },
    ],
  },
  {
    id: 'file-governanca-md',
    name: 'notas-governanca-fidc.md',
    folder: '/estudos/fundos',
    size: 1024,
    extension: '.md',
    category: 'text',
    status: 'bookmarked-only',
    bookmarkedAt: Date.UTC(2026, 10, 10, 12, 0),
    lastReadAt: Date.UTC(2026, 10, 13, 11, 0),
    readProgress: 80,
    tags: ['governança', 'estudo', 'cvm'],
    notes: 'Caderno de estudo pessoal offline.',
    textContent:
      '# Notas de Estudo: Governança em Fundos Estruturados\n\n' +
      'A segregação de funções entre administrador fiduciário, gestor de recursos e custodiante é pilar essencial.',
  },
  {
    id: 'file-relatorio-cvm',
    name: 'relatorio-anual-enquadramento.pdf',
    folder: '/relatorios',
    size: 2457600,
    extension: '.pdf',
    category: 'pdf',
    status: 'uploaded-only',
    uploadedAt: Date.UTC(2026, 9, 30, 18, 0),
    uploadedBy: 'Compliance FZL',
    readProgress: 35,
    tags: ['cvm', 'anual', 'auditoria'],
  },
  {
    id: 'file-dados-carteira',
    name: 'dados-fechamento-outubro.json',
    folder: '/estudos/fundos',
    size: 4096,
    extension: '.json',
    category: 'data',
    status: 'pending-upload',
    bookmarkedAt: Date.UTC(2026, 10, 13, 8, 0),
    tags: ['json', 'carteira', 'pendente'],
    textContent: JSON.stringify(
      {
        fundo: 'FZL Alpha FIDC',
        mes: '2026-10',
        pl: 142500000.0,
        cotistas: 48,
        status: 'Auditado',
      },
      null,
      2
    ),
  },
];
