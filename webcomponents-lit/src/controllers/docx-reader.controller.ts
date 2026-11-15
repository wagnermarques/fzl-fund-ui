/**
 * @license
 * FZL Software — DOCX & Text Reader Reactive Controller
 */
import {
  detectDocumentCategory,
  estimateReadingStats,
  isDocxDocument,
  isTextReadable,
  type FzlDocumentCategory
} from '../components/document-picker/document-picker.types';
import {
  parseDocxArrayBuffer,
  readBlobAsArrayBuffer,
  type FzlDocxBlock,
  type FzlDocxParseResult
} from '../components/document-picker/docx-parser';
import { FzlBaseController, type FzlControllerHost } from './base.controller';

export interface FzlReadableDocument {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  category?: FzlDocumentCategory;
  extension?: string;
  textContent?: string;
  blocks?: FzlDocxBlock[];
  wordCount?: number;
  readingTimeMinutes?: number;
  objectUrl?: string;
  file?: File;
  error?: string;
}

export interface FzlStudyVerse {
  id: string;
  label: string;
  text: string;
  type: FzlDocxBlock['type'];
  level?: 1 | 2 | 3;
  rows?: string[][];
}

export interface FzlDocxReaderControllerOptions {
  fontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
}

/**
 * Controller reativo e headless para leitura estruturada de `.docx` (OOXML nativo)
 * e documentos de texto, com zoom tipográfico, busca em blocos e conversão para study-verses.
 *
 * Extensível via herança (`extends FzlDocxReaderController`) pelos hooks
 * protegidos `parseDocx`, `transformBlocks` e `onDocumentOpened`.
 */
export class FzlDocxReaderController extends FzlBaseController {
  private _document: FzlReadableDocument | null = null;
  private _loading = false;
  private _error: string | null = null;
  private _searchQuery = '';
  private _fontSize: number;
  private readonly _minFontSize: number;
  private readonly _maxFontSize: number;
  private _ownedObjectUrl: string | null = null;

  constructor(host?: FzlControllerHost | null, options: FzlDocxReaderControllerOptions = {}) {
    super(host);
    this._minFontSize = options.minFontSize ?? 11;
    this._maxFontSize = options.maxFontSize ?? 28;
    this._fontSize = this.clampFontSize(options.fontSize ?? 15);
  }

  get document(): FzlReadableDocument | null {
    return this._document;
  }

  get loading(): boolean {
    return this._loading;
  }

  get error(): string | null {
    return this._error;
  }

  get searchQuery(): string {
    return this._searchQuery;
  }

  get fontSize(): number {
    return this._fontSize;
  }

  get minFontSize(): number {
    return this._minFontSize;
  }

  get maxFontSize(): number {
    return this._maxFontSize;
  }

  get blocks(): FzlDocxBlock[] {
    return this._document?.blocks ?? [];
  }

  get textContent(): string {
    return this._document?.textContent ?? '';
  }

  get hasDocument(): boolean {
    return this._document !== null;
  }

  private clampFontSize(value: number): number {
    return Math.min(this._maxFontSize, Math.max(this._minFontSize, Math.round(value)));
  }

  private revokeOwnedObjectUrl(): void {
    if (this._ownedObjectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(this._ownedObjectUrl);
      } catch {
        // Ignora erro ao revogar em ambientes headless
      }
    }
    this._ownedObjectUrl = null;
  }

  private blocksFromText(text: string): FzlDocxBlock[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const chunks = trimmed.split(/\r?\n\s*\r?\n/).map((c) => c.trim()).filter(Boolean);
    return chunks.map((chunk) => ({
      type: 'paragraph',
      text: chunk,
      runs: [{ text: chunk }]
    }));
  }

  private joinBlocksText(blocks: FzlDocxBlock[]): string {
    return blocks
      .map((b) => (b.type === 'list-item' ? `• ${b.text}` : b.text))
      .join('\n\n');
  }

  /**
   * Abre e interpreta um `File` local (`.docx`, `.txt`, `.md`, `.csv`, `.json`, PDF/imagem etc.).
   */
  async openFile(file: File, idOverride?: string): Promise<FzlReadableDocument> {
    this._loading = true;
    this._error = null;
    this.notifyChange();

    this.revokeOwnedObjectUrl();

    const { extension, category } = detectDocumentCategory(file.name, file.type);
    const doc: FzlReadableDocument = {
      id: idOverride || `${file.name}-${file.size}-${file.lastModified || Date.now()}`,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      category,
      extension,
      file
    };

    try {
      if (isDocxDocument(file.name, file.type)) {
        const buffer = await readBlobAsArrayBuffer(file);
        const parsed = await this.parseDocx(buffer);
        const transformed = this.transformBlocks(parsed.blocks, doc);
        const finalText =
          transformed === parsed.blocks ? parsed.textContent : this.joinBlocksText(transformed);
        const stats = estimateReadingStats(finalText);
        doc.blocks = transformed;
        doc.textContent = finalText;
        doc.wordCount = stats.words;
        doc.readingTimeMinutes = stats.minutes;
      } else if (isTextReadable(category, extension)) {
        const rawText =
          typeof file.text === 'function' ? await file.text() : await new Response(file).text();
        const initialBlocks = this.blocksFromText(rawText);
        const transformed = this.transformBlocks(initialBlocks, doc);
        const finalText =
          transformed === initialBlocks ? rawText : this.joinBlocksText(transformed);
        const stats = estimateReadingStats(finalText);
        doc.blocks = transformed;
        doc.textContent = finalText;
        doc.wordCount = stats.words;
        doc.readingTimeMinutes = stats.minutes;
      } else if (
        (category === 'pdf' || category === 'image') &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function'
      ) {
        const objUrl = URL.createObjectURL(file);
        this._ownedObjectUrl = objUrl;
        doc.objectUrl = objUrl;
      }

      this._document = doc;
      this._loading = false;
      await this.onDocumentOpened(doc);
      this.emitHostEvent('fzl-reader-open', { document: doc });
      this.notifyChange();
      return doc;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._error = message;
      this._loading = false;
      doc.error = message;
      this._document = doc;
      this.emitHostEvent('fzl-reader-error', { document: doc, error: message });
      this.notifyChange();
      return doc;
    }
  }

  /**
   * Abre um objeto de documento já carregado em memória ou contendo referência a `File`.
   */
  async openDocument(docInput: FzlReadableDocument): Promise<FzlReadableDocument> {
    if (
      docInput.file &&
      !docInput.textContent &&
      !docInput.objectUrl &&
      (!docInput.blocks || docInput.blocks.length === 0)
    ) {
      return this.openFile(docInput.file, docInput.id);
    }

    this.revokeOwnedObjectUrl();
    this._loading = false;
    this._error = docInput.error ?? null;

    const detected =
      docInput.category && docInput.extension
        ? { category: docInput.category, extension: docInput.extension }
        : detectDocumentCategory(docInput.name, docInput.mimeType);

    const doc: FzlReadableDocument = {
      ...docInput,
      category: detected.category,
      extension: detected.extension
    };

    const baseBlocks =
      doc.blocks && doc.blocks.length > 0
        ? doc.blocks
        : doc.textContent
          ? this.blocksFromText(doc.textContent)
          : [];

    const transformed = this.transformBlocks(baseBlocks, doc);
    doc.blocks = transformed;

    if (!doc.textContent || transformed !== baseBlocks) {
      doc.textContent = this.joinBlocksText(transformed);
    }

    if (doc.wordCount === undefined || doc.readingTimeMinutes === undefined) {
      const stats = estimateReadingStats(doc.textContent);
      doc.wordCount = stats.words;
      doc.readingTimeMinutes = stats.minutes;
    }

    this._document = doc;
    await this.onDocumentOpened(doc);
    this.emitHostEvent('fzl-reader-open', { document: doc });
    this.notifyChange();
    return doc;
  }

  /**
   * Fecha o documento ativo e libera eventuais URLs de objeto criadas pelo controller.
   */
  close(): void {
    const previous = this._document;
    this.revokeOwnedObjectUrl();
    this._document = null;
    this._searchQuery = '';
    this._error = null;
    this._loading = false;
    if (previous) {
      this.emitHostEvent('fzl-reader-close', { document: previous });
    }
    this.notifyChange();
  }

  /**
   * Define o termo de filtro/busca dentro dos blocos do documento aberto.
   */
  setSearchQuery(query: string): void {
    if (this._searchQuery === query) return;
    this._searchQuery = query;
    this.notifyChange();
  }

  /**
   * Ajusta diretamente o tamanho tipográfico do leitor respeitando os limites configurados.
   */
  setFontSize(size: number): void {
    const clamped = this.clampFontSize(size);
    if (clamped === this._fontSize) return;
    this._fontSize = clamped;
    this.notifyChange();
  }

  zoomIn(step = 2): void {
    this.setFontSize(this._fontSize + step);
  }

  zoomOut(step = 2): void {
    this.setFontSize(this._fontSize - step);
  }

  resetZoom(): void {
    this.setFontSize(15);
  }

  /**
   * Retorna os blocos estruturados filtrados pela query de busca ativa.
   */
  getFilteredBlocks(query = this._searchQuery): FzlDocxBlock[] {
    const blocks = this.blocks;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return blocks;
    return blocks.filter((block) => block.text.toLowerCase().includes(normalized));
  }

  /**
   * Converte blocos estruturados no formato de parágrafos/versos de leitura (`study-verses`),
   * compatível com `<fzl-reader-content>` e leitores focais.
   */
  toStudyVerses(blocks = this.getFilteredBlocks()): FzlStudyVerse[] {
    return blocks
      .filter((b) => b.text.trim().length > 0)
      .map((block, index) => ({
        id: `verse-${index + 1}`,
        label: block.type === 'heading' ? `Seção ${index + 1}` : `Parágrafo ${index + 1}`,
        text: block.text,
        type: block.type,
        level: block.type === 'heading' ? block.level : undefined,
        rows: block.type === 'table' ? block.rows : undefined
      }));
  }

  override hostDisconnected(): void {
    this.revokeOwnedObjectUrl();
    super.hostDisconnected();
  }

  /**
   * Hook protegido responsável por interpretar bytes `.docx`.
   */
  protected async parseDocx(buffer: ArrayBuffer): Promise<FzlDocxParseResult> {
    return parseDocxArrayBuffer(buffer);
  }

  /**
   * Hook protegido que permite a subclasses filtrar, anotar ou transformar os blocos lidos.
   */
  protected transformBlocks(
    blocks: FzlDocxBlock[],
    _doc: FzlReadableDocument
  ): FzlDocxBlock[] {
    return blocks;
  }

  /**
   * Hook protegido invocado logo após um documento ser carregado com sucesso.
   */
  protected async onDocumentOpened(_doc: FzlReadableDocument): Promise<void> {
    // Extensível em subclasses
  }
}
