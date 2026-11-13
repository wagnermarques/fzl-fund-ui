export type FzlDocumentCategory =
  | 'text'
  | 'pdf'
  | 'spreadsheet'
  | 'data'
  | 'image'
  | 'other';

export type FzlDocumentUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export type FzlDocumentPickerMode = 'all' | 'read' | 'bookmark' | 'upload';

export type FzlWellKnownDirectory =
  | 'documents'
  | 'downloads'
  | 'desktop'
  | 'pictures'
  | 'music'
  | 'videos';

export const WELL_KNOWN_DIRECTORIES: ReadonlyArray<{
  id: FzlWellKnownDirectory;
  label: string;
}> = [
  { id: 'documents', label: 'Documentos' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'desktop', label: 'Área de Trabalho' },
  { id: 'pictures', label: 'Imagens' },
];

const VALID_WELL_KNOWN_DIRS: ReadonlySet<string> = new Set([
  'documents',
  'downloads',
  'desktop',
  'pictures',
  'music',
  'videos',
]);

/**
 * Normalizes a well-known OS starting directory, defaulting to `'documents'`.
 */
export function normalizeWellKnownDirectory(value?: string): FzlWellKnownDirectory {
  const clean = (value || '').trim().toLowerCase();
  if (VALID_WELL_KNOWN_DIRS.has(clean)) {
    return clean as FzlWellKnownDirectory;
  }
  return 'documents';
}

/**
 * Builds File System Access API `startIn` and `id` options (matching `/^[A-Za-z0-9_-]{1,32}$/`).
 * When `enforceStartIn` is true, appends a fresh suffix so browsers do not reopen stale unmounted paths.
 */
export function createPickerStartOptions(
  startIn?: string,
  enforceStartIn = true
): { startIn: FzlWellKnownDirectory; id: string } {
  const normalized = normalizeWellKnownDirectory(startIn);
  const id = enforceStartIn
    ? `fzl_${normalized.slice(0, 8)}_${Date.now().toString(36)}`
    : `fzl_${normalized}`;
  return {
    startIn: normalized,
    id: id.slice(0, 32),
  };
}

export interface FzlDocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  category: FzlDocumentCategory;
  lastModified: number;
  textContent?: string;
  objectUrl?: string;
  file?: File;
  tags: string[];
  notes?: string;
  bookmarked: boolean;
  bookmarkedAt?: number;
  uploadStatus: FzlDocumentUploadStatus;
  uploadError?: string;
}

export interface FzlDocumentBookmark {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  category: FzlDocumentCategory;
  lastModified: number;
  textContent?: string;
  tags: string[];
  notes?: string;
  bookmarkedAt: number;
}

export interface FzlDocumentUploadPayload {
  document: FzlDocumentItem;
  file?: File;
  textContent?: string;
  tags: string[];
  notes?: string;
  timestamp: string;
}

/**
 * Detects extension and semantic category from file name and MIME type.
 */
export function detectDocumentCategory(
  name: string,
  mimeType = ''
): { extension: string; category: FzlDocumentCategory } {
  const parts = name.toLowerCase().split('.');
  const extension = parts.length > 1 ? `.${parts.pop()}` : '';
  const mime = mimeType.toLowerCase();

  if (extension === '.pdf' || mime === 'application/pdf') {
    return { extension: extension || '.pdf', category: 'pdf' };
  }
  if (
    extension === '.csv' ||
    extension === '.tsv' ||
    extension === '.xlsx' ||
    extension === '.xls' ||
    mime.includes('csv') ||
    mime.includes('spreadsheet')
  ) {
    return { extension: extension || '.csv', category: 'spreadsheet' };
  }
  if (extension === '.json' || extension === '.xml' || mime.includes('json')) {
    return { extension: extension || '.json', category: 'data' };
  }
  if (
    ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extension) ||
    mime.startsWith('image/')
  ) {
    return { extension: extension || '.png', category: 'image' };
  }
  if (
    ['.txt', '.md', '.markdown', '.log', '.rtf', '.html'].includes(extension) ||
    mime.startsWith('text/')
  ) {
    return { extension: extension || '.txt', category: 'text' };
  }

  return { extension, category: 'other' };
}

/**
 * Checks whether a document's contents can be decoded as UTF-8 text.
 */
export function isTextReadable(category: FzlDocumentCategory, ext: string): boolean {
  if (category === 'text' || category === 'data') return true;
  if (category === 'spreadsheet' && ['.csv', '.tsv'].includes(ext.toLowerCase())) {
    return true;
  }
  return false;
}

/**
 * Formats a byte size into human-readable B / KB / MB units.
 */
export function formatDocumentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Estimates word count and reading time (~200 wpm) for text content.
 */
export function estimateReadingStats(text?: string): { words: number; minutes: number } {
  if (!text || !text.trim()) {
    return { words: 0, minutes: 0 };
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { words, minutes };
}

/**
 * Checks browser support for File System Access API (`showOpenFilePicker`).
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function'
  );
}

/**
 * Checks browser support for Directory Picker API (`showDirectoryPicker`).
 */
export function isDirectoryPickerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  );
}

export const SAMPLE_DOCUMENTS: FzlDocumentItem[] = [
  {
    id: 'sample-md-study',
    name: 'notas-governanca-fidc.md',
    size: 842,
    type: 'text/markdown',
    extension: '.md',
    category: 'text',
    lastModified: Date.UTC(2026, 10, 10),
    textContent:
      '# Notas de Estudo: Governança em Fundos Estruturados\n\n' +
      'A segregação de funções entre administrador fiduciário, gestor de recursos e custodiante é pilar essencial na supervisão de fundos.\n\n' +
      'Pontos-chave para auditoria documental:\n' +
      '1. Verificação periódica do lastro e elegibilidade dos direitos creditórios.\n' +
      '2. Conciliação diária de caixa e reservas de liquidez.\n' +
      '3. Transparência nos relatórios mensais enviados aos cotistas.',
    tags: ['governança', 'estudo', 'cvm'],
    notes: 'Material de apoio para leitura rápida offline.',
    bookmarked: true,
    bookmarkedAt: Date.UTC(2026, 10, 10),
    uploadStatus: 'idle',
  },
  {
    id: 'sample-csv-report',
    name: 'desempenho-carteira-q3.csv',
    size: 412,
    type: 'text/csv',
    extension: '.csv',
    category: 'spreadsheet',
    lastModified: Date.UTC(2026, 10, 11),
    textContent:
      'Classe,Rentabilidade_12M,Liquidez_Dias,Risco\n' +
      'Renda Fixa Soberana,11.45%,D+0,Baixo\n' +
      'Crédito Privado IG,13.10%,D+30,Moderado\n' +
      'FIDC Sênior,14.80%,D+45,Moderado-Alto\n' +
      'Multimercado Macro,12.25%,D+15,Alto',
    tags: ['relatório', 'trimestral'],
    bookmarked: false,
    uploadStatus: 'idle',
  },
  {
    id: 'sample-json-regulation',
    name: 'resumo-resolucao-175.json',
    size: 518,
    type: 'application/json',
    extension: '.json',
    category: 'data',
    lastModified: Date.UTC(2026, 10, 12),
    textContent: JSON.stringify(
      {
        norma: 'Resolução CVM 175',
        escopo: 'Marco regulatório dos fundos de investimento',
        destaques: [
          'Classes e subclasses de cotas com patrimônios segregados',
          'Responsabilidade limitada do cotista prevista em regulamento',
          'Regime de insolvência civil por classe',
        ],
      },
      null,
      2
    ),
    tags: ['regulação', 'json'],
    bookmarked: false,
    uploadStatus: 'idle',
  },
];
