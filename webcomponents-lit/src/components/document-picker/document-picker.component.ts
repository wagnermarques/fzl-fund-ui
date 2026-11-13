import { LitElement, html, css, unsafeCSS, nothing, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  FzlDocumentBookmark,
  FzlDocumentCategory,
  FzlDocumentItem,
  FzlDocumentPickerMode,
  FzlDocumentUploadPayload,
  FzlWellKnownDirectory,
  SAMPLE_DOCUMENTS,
  WELL_KNOWN_DIRECTORIES,
  createPickerStartOptions,
  detectDocumentCategory,
  estimateReadingStats,
  formatDocumentSize,
  isDirectoryPickerSupported,
  isDocxDocument,
  isFileSystemAccessSupported,
  isTextReadable,
  normalizeWellKnownDirectory,
} from './document-picker.types';
import {
  type FzlDocxBlock,
  type FzlDocxRun,
  parseDocxArrayBuffer,
  readBlobAsArrayBuffer,
} from './docx-parser';

export * from './document-picker.types';
export * from './docx-parser';

interface FileSystemHandleLike {
  kind: 'file' | 'directory';
  name: string;
  getFile?: () => Promise<File>;
  values?: () => AsyncIterable<FileSystemHandleLike>;
}

/**
 * Unified Document Picker, Reader, Bookmark & Upload Web Component (`fzl-document-picker`).
 *
 * Allows searching and picking documents from mobile or desktop filesystems
 * (`<input type="file">`, Drag & Drop, File System Access API & Directory Scanner),
 * opening documents immediately in an integrated reader, bookmarking them locally
 * with tags/notes, or uploading them to a backend service.
 *
 * @customElement fzl-document-picker
 * @tag fzl-document-picker
 *
 * @attr {'all' | 'read' | 'bookmark' | 'upload'} [mode='all'] - Controls which action workflows are prominently enabled
 * @attr {string} [accept='.txt,.md,.pdf,.csv,.json,.doc,.docx,.png,.jpg'] - Accepted file extensions or MIME types
 * @attr {boolean} [multiple=true] - Allow selecting multiple documents at once
 * @attr {number} [max-file-size=26214400] - Maximum allowed file size in bytes (default 25 MB)
 * @attr {string} [endpoint=''] - Backend URL for multipart/JSON document upload
 * @attr {string} [storage-key='fzl-document-bookmarks'] - LocalStorage key for persisting bookmarked documents
 * @attr {boolean} [allow-folder-scan=true] - Enables local directory scanning on supported browsers
 * @attr {'documents' | 'downloads' | 'desktop' | 'pictures' | 'music' | 'videos'} [start-in='documents'] - Default always-existent OS folder where file/folder pickers open
 * @attr {boolean} [enforce-start-in=true] - Always opens in `start-in` using a fresh picker ID instead of recalling broken/unmounted paths
 * @attr {boolean} [preload-samples=false] - Preloads sample documents for demo and evaluation
 * @attr {boolean} [disabled=false] - Disables user interactions
 *
 * @fires {CustomEvent<{ documents: FzlDocumentItem[] }>} fzl-document-select - Dispatched when documents are selected or dropped
 * @fires {CustomEvent<{ document: FzlDocumentItem; textContent?: string; objectUrl?: string }>} fzl-document-read - Dispatched when a document is opened in the reader
 * @fires {CustomEvent<{ document: FzlDocumentItem; verses: Array<{ num: number; text: string }> }>} fzl-document-open-study - Dispatched when user sends text paragraphs to <fzl-reader-content>
 * @fires {CustomEvent<{ document: FzlDocumentItem; bookmarks: FzlDocumentItem[] }>} fzl-document-bookmark-add - Dispatched when a document is bookmarked
 * @fires {CustomEvent<{ document: FzlDocumentItem; bookmarks: FzlDocumentItem[] }>} fzl-document-bookmark-remove - Dispatched when a bookmark is removed
 * @fires {CustomEvent<{ document: FzlDocumentItem }>} fzl-document-upload-start - Dispatched before uploading a document
 * @fires {CustomEvent<{ document: FzlDocumentItem; response: unknown }>} fzl-document-upload-success - Dispatched when document upload completes
 * @fires {CustomEvent<{ document: FzlDocumentItem; error: string }>} fzl-document-upload-error - Dispatched when document upload fails
 * @fires {CustomEvent<{ document: FzlDocumentItem }>} fzl-document-remove - Dispatched when a document is removed from the active list
 * @fires {CustomEvent<{ error: string; fileName?: string }>} fzl-document-error - Dispatched on validation or filesystem error
 *
 * @csspart container - Root wrapper
 * @csspart toolbar - Search and filter toolbar
 * @csspart dropzone - File picker and drag-and-drop area
 * @csspart list - Document cards grid/list
 * @csspart card - Individual document card
 * @csspart reader - Integrated document reader panel
 */
export class FzlDocumentPicker extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family, system-ui, sans-serif);
        color: var(--_fzl-color-text, #0f172a);
        box-sizing: border-box;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      .container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
      }

      .toolbar {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px 14px;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: var(--_fzl-radius-md, 10px);
        background: var(--_fzl-color-surface, #ffffff);
      }

      .toolbar-top {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }

      .view-tabs {
        display: inline-flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #334155);
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
      }

      .tab-btn[aria-selected='true'] {
        background: var(--_fzl-color-primary, #0284c7);
        color: #ffffff;
        border-color: var(--_fzl-color-primary, #0284c7);
      }

      .doc-search-wrap {
        flex: 1 1 220px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 8px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
      }

      .doc-search-input {
        width: 100%;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 0.85rem;
        outline: none;
      }

      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .filter-chip {
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: transparent;
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: 0.76rem;
        cursor: pointer;
        font-family: inherit;
      }

      .filter-chip.active {
        background: var(--_fzl-color-surface-hover, #e0f2fe);
        color: var(--_fzl-color-primary, #0369a1);
        border-color: var(--_fzl-color-primary, #0284c7);
        font-weight: 600;
      }

      .dropzone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 20px 16px;
        border: 2px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 12px);
        background: var(--_fzl-color-surface-hover, #f8fafc);
        text-align: center;
        transition: border-color 0.15s ease, background-color 0.15s ease;
      }

      .dropzone.dragging {
        border-color: var(--_fzl-color-primary, #0284c7);
        background: rgba(2, 132, 199, 0.08);
      }

      .dropzone-title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .dropzone-hint {
        margin: 0;
        font-size: 0.8rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .dropzone-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }

      .start-dir-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 2px;
      }

      .start-dir-label {
        font-size: 0.74rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .start-dir-chip {
        padding: 3px 9px;
        border-radius: 999px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text-muted, #475569);
        font-size: 0.73rem;
        cursor: pointer;
        font-family: inherit;
      }

      .start-dir-chip.active {
        background: var(--_fzl-color-surface-hover, #e0f2fe);
        color: var(--_fzl-color-primary, #0369a1);
        border-color: var(--_fzl-color-primary, #0284c7);
        font-weight: 600;
      }

      .fs-api-hint {
        margin: 2px 0 0;
        font-size: 0.72rem;
        line-height: 1.4;
        color: var(--_fzl-color-text-muted, #64748b);
        max-width: 540px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #0f172a);
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--_fzl-color-primary, #0284c7);
        border-color: var(--_fzl-color-primary, #0284c7);
        color: #ffffff;
      }

      .btn-sm {
        padding: 5px 10px;
        font-size: 0.78rem;
      }

      .btn-active {
        background: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      .error-banner {
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid #fecaca;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 0.82rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .doc-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
        gap: 12px;
      }

      .doc-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: 10px;
        background: var(--_fzl-color-surface, #ffffff);
      }

      .doc-card.selected {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: 0 0 0 1px var(--_fzl-color-primary, #0284c7);
      }

      .doc-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .doc-name {
        margin: 0;
        font-size: 0.92rem;
        font-weight: 600;
        word-break: break-word;
      }

      .doc-meta {
        font-size: 0.76rem;
        color: var(--_fzl-color-text-muted, #64748b);
        margin-top: 2px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        background: var(--_fzl-color-surface-hover, #f1f5f9);
        color: #475569;
        flex-shrink: 0;
      }

      .badge.uploaded {
        background: #dcfce7;
        color: #166534;
      }

      .badge.uploading {
        background: #e0f2fe;
        color: #075985;
      }

      .badge.error {
        background: #fee2e2;
        color: #991b1b;
      }

      .tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
      }

      .tag-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--_fzl-color-surface-hover, #f1f5f9);
        font-size: 0.72rem;
        color: #334155;
      }

      .tag-remove {
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        padding: 0;
        font-size: 0.78rem;
        line-height: 1;
      }

      .tag-input-inline {
        width: 92px;
        border: 1px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 0.72rem;
        font-family: inherit;
        background: transparent;
        color: inherit;
      }

      .doc-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .reader-panel {
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 12px;
        background: var(--_fzl-color-surface, #ffffff);
        overflow: hidden;
      }

      .reader-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: var(--_fzl-color-surface-hover, #f8fafc);
      }

      .reader-title {
        margin: 0;
        font-size: 0.98rem;
        font-weight: 600;
      }

      .reader-stats {
        font-size: 0.76rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .reader-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }

      .reader-search-input {
        padding: 5px 8px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 6px;
        font-size: 0.8rem;
        font-family: inherit;
        background: #ffffff;
        color: #0f172a;
      }

      .reader-body {
        padding: 16px;
        max-height: 420px;
        overflow-y: auto;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .reader-body mark {
        background: #fef08a;
        color: inherit;
        padding: 0 2px;
        border-radius: 3px;
      }

      .docx-view {
        white-space: normal;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .docx-heading {
        margin: 8px 0 2px;
        line-height: 1.3;
        color: var(--_fzl-color-text, #0f172a);
      }

      .docx-h1 {
        font-size: 1.35em;
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
        padding-bottom: 4px;
      }

      .docx-h2 {
        font-size: 1.18em;
      }

      .docx-h3 {
        font-size: 1.05em;
      }

      .docx-p {
        margin: 0;
      }

      .docx-list-item {
        margin: 0 0 0 18px;
        list-style: disc;
        display: list-item;
      }

      .docx-table-wrap {
        overflow-x: auto;
      }

      .docx-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9em;
      }

      .docx-table td {
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        padding: 6px 10px;
        vertical-align: top;
      }

      .docx-table tr:first-child td {
        background: var(--_fzl-color-surface-hover, #f8fafc);
        font-weight: 600;
      }

      .reader-frame {
        width: 100%;
        height: 420px;
        border: none;
        display: block;
      }

      .reader-img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
        border-radius: 8px;
      }

      .empty-state {
        padding: 24px 16px;
        text-align: center;
        border: 1px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: 10px;
        font-size: 0.86rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }
    `,
  ];

  @property({ type: String }) mode: FzlDocumentPickerMode = 'all';
  @property({ type: String }) accept = '.txt,.md,.pdf,.csv,.json,.doc,.docx,.png,.jpg';
  @property({ type: Boolean }) multiple = true;
  @property({ type: Number, attribute: 'max-file-size' }) maxFileSize = 26214400;
  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'storage-key' }) storageKey = 'fzl-document-bookmarks';
  @property({ type: Boolean, attribute: 'allow-folder-scan' }) allowFolderScan = true;
  @property({ type: String, attribute: 'start-in' }) startIn: FzlWellKnownDirectory = 'documents';
  @property({ type: Boolean, attribute: 'enforce-start-in' }) enforceStartIn = true;
  @property({ type: Boolean, attribute: 'preload-samples' }) preloadSamples = false;
  @property({ type: Boolean }) disabled = false;

  @property({ attribute: false })
  uploadHandler?: (payload: FzlDocumentUploadPayload) => Promise<unknown>;

  @state() private _documents: FzlDocumentItem[] = [];
  @state() private _activeDocId: string | null = null;
  @state() private _viewTab: 'all' | 'bookmarks' = 'all';
  @state() private _categoryFilter: 'all' | FzlDocumentCategory = 'all';
  @state() private _searchQuery = '';
  @state() private _readerSearchQuery = '';
  @state() private _readerFontSize = 15;
  @state() private _isDragging = false;
  @state() private _errorMessage = '';

  @query('input[type="file"]') private _fileInput?: HTMLInputElement;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadBookmarksFromStorage();
    if (this.preloadSamples && this._documents.length === 0) {
      this.loadSampleDocuments();
    }
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('preloadSamples') && this.preloadSamples && this._documents.length === 0) {
      this.loadSampleDocuments();
    }
  }

  /** Loads built-in sample documents into the list if missing. */
  loadSampleDocuments(): void {
    const existingIds = new Set(this._documents.map((d) => d.id));
    const additions = SAMPLE_DOCUMENTS.filter((d) => !existingIds.has(d.id)).map((doc) => ({
      ...doc,
      tags: [...doc.tags],
    }));
    if (additions.length === 0) return;
    this._documents = [...this._documents, ...additions];
    this._persistBookmarksToStorage();
  }

  override disconnectedCallback(): void {
    for (const doc of this._documents) {
      if (doc.objectUrl) {
        try {
          URL.revokeObjectURL(doc.objectUrl);
        } catch {
          // Ignore revoke failure in environments without Blob URLs
        }
      }
    }
    super.disconnectedCallback();
  }

  /** Returns a shallow copy of loaded documents. */
  getDocuments(): FzlDocumentItem[] {
    return this._documents.map((d) => ({ ...d, tags: [...d.tags] }));
  }

  /** Returns all currently bookmarked documents. */
  getBookmarks(): FzlDocumentItem[] {
    return this._documents.filter((d) => d.bookmarked).map((d) => ({ ...d, tags: [...d.tags] }));
  }

  /** Returns the document currently opened in the integrated reader, if any. */
  getActiveDocument(): FzlDocumentItem | null {
    if (!this._activeDocId) return null;
    const found = this._documents.find((d) => d.id === this._activeDocId);
    return found ? { ...found, tags: [...found.tags] } : null;
  }

  /** Adds File instances from file input, drag-and-drop, or programmatic calls. */
  async addFiles(files: File[] | FileList): Promise<FzlDocumentItem[]> {
    const fileArray = Array.from(files ?? []);
    if (fileArray.length === 0) return [];

    const accepted: FzlDocumentItem[] = [];
    for (const file of fileArray) {
      if (this.maxFileSize > 0 && file.size > this.maxFileSize) {
        const msg = `O arquivo "${file.name}" excede o tamanho máximo permitido (${formatDocumentSize(this.maxFileSize)}).`;
        this._errorMessage = msg;
        this.emit('fzl-document-error', { error: msg, fileName: file.name });
        continue;
      }

      const { extension, category } = detectDocumentCategory(file.name, file.type);
      let textContent: string | undefined;
      let docxBlocks: FzlDocxBlock[] | undefined;

      if (isDocxDocument(file.name, file.type)) {
        try {
          const buffer = await readBlobAsArrayBuffer(file);
          const parsedDocx = await parseDocxArrayBuffer(buffer);
          textContent = parsedDocx.textContent;
          docxBlocks = parsedDocx.blocks;
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : `Não foi possível ler o arquivo .docx "${file.name}".`;
          this._errorMessage = msg;
          this.emit('fzl-document-error', { error: msg, fileName: file.name });
        }
      } else if (isTextReadable(category, extension)) {
        try {
          textContent = await file.text();
        } catch {
          textContent = undefined;
        }
      }

      let objectUrl: string | undefined;
      if ((category === 'pdf' || category === 'image') && typeof URL.createObjectURL === 'function') {
        try {
          objectUrl = URL.createObjectURL(file);
        } catch {
          objectUrl = undefined;
        }
      }

      const existingIdx = this._documents.findIndex(
        (d) => d.name === file.name && d.size === file.size && d.lastModified === file.lastModified
      );

      const item: FzlDocumentItem = {
        id:
          existingIdx >= 0
            ? this._documents[existingIdx].id
            : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        extension,
        category,
        lastModified: file.lastModified || Date.now(),
        textContent,
        docxBlocks,
        objectUrl,
        file,
        tags: existingIdx >= 0 ? [...this._documents[existingIdx].tags] : [],
        notes: existingIdx >= 0 ? this._documents[existingIdx].notes : undefined,
        bookmarked: existingIdx >= 0 ? this._documents[existingIdx].bookmarked : false,
        bookmarkedAt: existingIdx >= 0 ? this._documents[existingIdx].bookmarkedAt : undefined,
        uploadStatus: 'idle',
      };

      if (existingIdx >= 0) {
        const next = [...this._documents];
        next[existingIdx] = item;
        this._documents = next;
      } else {
        this._documents = this.multiple ? [item, ...this._documents] : [item];
      }

      accepted.push(item);
    }

    if (accepted.length > 0) {
      this._errorMessage = '';
      this.emit('fzl-document-select', { documents: accepted });
      if (this.mode === 'read' && accepted.length === 1) {
        this.openReader(accepted[0].id);
      } else if (this.mode === 'bookmark') {
        for (const doc of accepted) {
          if (!doc.bookmarked) this.toggleBookmark(doc.id);
        }
      }
    }

    return accepted;
  }

  /** Opens the built-in reader panel for the specified document. */
  openReader(docId: string): void {
    const doc = this._documents.find((d) => d.id === docId);
    if (!doc) return;
    this._activeDocId = doc.id;
    this._readerSearchQuery = '';
    this.emit('fzl-document-read', {
      document: doc,
      textContent: doc.textContent,
      objectUrl: doc.objectUrl,
    });
  }

  /** Closes the built-in reader panel. */
  closeReader(): void {
    this._activeDocId = null;
  }

  /** Adds or removes a document from bookmarks, optionally merging tags and notes. */
  toggleBookmark(docId: string, tags?: string[], notes?: string): boolean {
    const index = this._documents.findIndex((d) => d.id === docId);
    if (index < 0) return false;

    const current = this._documents[index];
    const nextBookmarked = !current.bookmarked;
    const mergedTags = tags
      ? Array.from(new Set([...current.tags, ...tags.map((t) => t.trim()).filter(Boolean)]))
      : current.tags;

    const updated: FzlDocumentItem = {
      ...current,
      bookmarked: nextBookmarked,
      bookmarkedAt: nextBookmarked ? Date.now() : undefined,
      tags: mergedTags,
      notes: notes !== undefined ? notes : current.notes,
    };

    const next = [...this._documents];
    next[index] = updated;
    this._documents = next;
    this._persistBookmarksToStorage();

    const bookmarks = this.getBookmarks();
    this.emit(nextBookmarked ? 'fzl-document-bookmark-add' : 'fzl-document-bookmark-remove', {
      document: updated,
      bookmarks,
    });
    return nextBookmarked;
  }

  /** Adds a tag to a document and updates bookmark storage when applicable. */
  addTag(docId: string, tag: string): void {
    const clean = tag.trim();
    if (!clean) return;
    const index = this._documents.findIndex((d) => d.id === docId);
    if (index < 0) return;

    const current = this._documents[index];
    if (current.tags.includes(clean)) return;

    const updated: FzlDocumentItem = {
      ...current,
      tags: [...current.tags, clean],
    };
    const next = [...this._documents];
    next[index] = updated;
    this._documents = next;
    if (updated.bookmarked) {
      this._persistBookmarksToStorage();
    }
  }

  /** Removes a tag from a document. */
  removeTag(docId: string, tag: string): void {
    const index = this._documents.findIndex((d) => d.id === docId);
    if (index < 0) return;

    const current = this._documents[index];
    const updated: FzlDocumentItem = {
      ...current,
      tags: current.tags.filter((t) => t !== tag),
    };
    const next = [...this._documents];
    next[index] = updated;
    this._documents = next;
    if (updated.bookmarked) {
      this._persistBookmarksToStorage();
    }
  }

  /** Removes a document from the active list and bookmark storage. */
  removeDocument(docId: string): void {
    const target = this._documents.find((d) => d.id === docId);
    if (!target) return;

    if (target.objectUrl) {
      try {
        URL.revokeObjectURL(target.objectUrl);
      } catch {
        // Ignore
      }
    }

    this._documents = this._documents.filter((d) => d.id !== docId);
    if (this._activeDocId === docId) {
      this._activeDocId = null;
    }
    this._persistBookmarksToStorage();
    this.emit('fzl-document-remove', { document: target });
  }

  /** Uploads a document using `uploadHandler` or `fetch(endpoint)`. */
  async uploadDocument(docId: string): Promise<boolean> {
    const index = this._documents.findIndex((d) => d.id === docId);
    if (index < 0) return false;

    const target = this._documents[index];
    if (!this.uploadHandler && !this.endpoint) {
      const msg = 'Nenhum endpoint ou uploadHandler configurado para envio ao servidor.';
      this._updateDocument(docId, { uploadStatus: 'error', uploadError: msg });
      this._errorMessage = msg;
      this.emit('fzl-document-upload-error', { document: target, error: msg });
      return false;
    }

    this._updateDocument(docId, { uploadStatus: 'uploading', uploadError: undefined });
    this.emit('fzl-document-upload-start', { document: target });

    const payload: FzlDocumentUploadPayload = {
      document: target,
      file: target.file,
      textContent: target.textContent,
      tags: [...target.tags],
      notes: target.notes,
      timestamp: new Date().toISOString(),
    };

    try {
      let response: unknown;
      if (this.uploadHandler) {
        response = await this.uploadHandler(payload);
      } else {
        const formData = new FormData();
        if (target.file) {
          formData.append('file', target.file, target.name);
        } else if (target.textContent !== undefined) {
          formData.append('textContent', target.textContent);
        }
        formData.append('metadata', JSON.stringify({ name: target.name, tags: target.tags }));

        const res = await fetch(this.endpoint, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        const contentType = res.headers.get('content-type') || '';
        response = contentType.includes('application/json') ? await res.json() : await res.text();
      }

      const updated = this._updateDocument(docId, {
        uploadStatus: 'uploaded',
        uploadError: undefined,
      });
      this.emit('fzl-document-upload-success', {
        document: updated || target,
        response,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const updated = this._updateDocument(docId, {
        uploadStatus: 'error',
        uploadError: message,
      });
      this._errorMessage = message;
      this.emit('fzl-document-upload-error', {
        document: updated || target,
        error: message,
      });
      return false;
    }
  }

  /** Opens File System Access picker when available, otherwise falls back to `<input type="file">`. */
  async openNativeFilePicker(): Promise<void> {
    if (this.disabled) return;
    if (isFileSystemAccessSupported()) {
      const startOpts = createPickerStartOptions(this.startIn, this.enforceStartIn);
      const win = window as unknown as {
        showOpenFilePicker: (opts: {
          multiple?: boolean;
          startIn?: FzlWellKnownDirectory;
          id?: string;
        }) => Promise<FileSystemHandleLike[]>;
      };
      try {
        let handles: FileSystemHandleLike[];
        try {
          handles = await win.showOpenFilePicker({
            multiple: this.multiple,
            startIn: startOpts.startIn,
            id: startOpts.id,
          });
        } catch (innerErr) {
          if ((innerErr as { name?: string })?.name === 'AbortError') return;
          // Retry without startIn/id only if browser rejects options
          handles = await win.showOpenFilePicker({ multiple: this.multiple });
        }
        const files: File[] = [];
        for (const handle of handles) {
          if (handle.getFile) {
            files.push(await handle.getFile());
          }
        }
        await this.addFiles(files);
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      }
    }
    this._fileInput?.click();
  }

  /** Scans a local directory for matching documents on desktop Chromium browsers. */
  async openDirectoryScanner(): Promise<void> {
    if (this.disabled || !isDirectoryPickerSupported()) return;
    const startOpts = createPickerStartOptions(this.startIn, this.enforceStartIn);
    try {
      const win = window as unknown as {
        showDirectoryPicker: (opts?: {
          mode?: 'read' | 'readwrite';
          startIn?: FzlWellKnownDirectory;
          id?: string;
        }) => Promise<FileSystemHandleLike>;
      };
      let dirHandle: FileSystemHandleLike;
      try {
        dirHandle = await win.showDirectoryPicker({
          mode: 'read',
          startIn: startOpts.startIn,
          id: startOpts.id,
        });
      } catch (innerErr) {
        if ((innerErr as { name?: string })?.name === 'AbortError') return;
        dirHandle = await win.showDirectoryPicker({ mode: 'read' });
      }
      if (!dirHandle.values) return;
      const files: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.getFile) {
          const file = await entry.getFile();
          if (this._matchesAccept(file.name)) {
            files.push(file);
          }
        }
        if (files.length >= 40) break;
      }
      await this.addFiles(files);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      this._errorMessage = msg;
      this.emit('fzl-document-error', { error: msg });
    }
  }

  private _updateDocument(
    docId: string,
    patch: Partial<FzlDocumentItem>
  ): FzlDocumentItem | undefined {
    const idx = this._documents.findIndex((d) => d.id === docId);
    if (idx < 0) return undefined;
    const updated: FzlDocumentItem = { ...this._documents[idx], ...patch };
    const next = [...this._documents];
    next[idx] = updated;
    this._documents = next;
    return updated;
  }

  private _matchesAccept(fileName: string): boolean {
    if (!this.accept || this.accept.trim() === '*') return true;
    const lower = fileName.toLowerCase();
    const tokens = this.accept
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return tokens.some((tok) => (tok.startsWith('.') ? lower.endsWith(tok) : true));
  }

  private _loadBookmarksFromStorage(): void {
    if (typeof localStorage === 'undefined' || !this.storageKey) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FzlDocumentBookmark[];
      if (!Array.isArray(parsed)) return;
      this._documents = parsed.map((bm) => ({
        ...bm,
        tags: Array.isArray(bm.tags) ? bm.tags : [],
        bookmarked: true,
        uploadStatus: 'idle',
      }));
    } catch {
      // Ignore corrupt storage
    }
  }

  private _persistBookmarksToStorage(): void {
    if (typeof localStorage === 'undefined' || !this.storageKey) return;
    try {
      const bookmarks: FzlDocumentBookmark[] = this._documents
        .filter((d) => d.bookmarked)
        .map((d) => ({
          id: d.id,
          name: d.name,
          size: d.size,
          type: d.type,
          extension: d.extension,
          category: d.category,
          lastModified: d.lastModified,
          textContent:
            d.textContent && d.textContent.length <= 250_000 ? d.textContent : undefined,
          docxBlocks:
            d.docxBlocks && (!d.textContent || d.textContent.length <= 250_000)
              ? d.docxBlocks
              : undefined,
          tags: [...d.tags],
          notes: d.notes,
          bookmarkedAt: d.bookmarkedAt || Date.now(),
        }));
      localStorage.setItem(this.storageKey, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage quota errors
    }
  }

  private _getVisibleDocuments(): FzlDocumentItem[] {
    const query = this._searchQuery.trim().toLowerCase();
    return this._documents.filter((doc) => {
      if (this._viewTab === 'bookmarks' && !doc.bookmarked) return false;
      if (this._categoryFilter !== 'all' && doc.category !== this._categoryFilter) return false;
      if (!query) return true;
      if (doc.name.toLowerCase().includes(query)) return true;
      if (doc.tags.some((t) => t.toLowerCase().includes(query))) return true;
      if (doc.textContent && doc.textContent.toLowerCase().includes(query)) return true;
      return false;
    });
  }

  private _handleFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void this.addFiles(input.files);
      input.value = '';
    }
  }

  private _handleDrop(e: DragEvent): void {
    e.preventDefault();
    this._isDragging = false;
    if (this.disabled || !e.dataTransfer?.files?.length) return;
    void this.addFiles(e.dataTransfer.files);
  }

  private _handleTagInputKeydown(docId: string, e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const input = e.target as HTMLInputElement;
    if (input.value.trim()) {
      this.addTag(docId, input.value);
      input.value = '';
    }
  }

  private _sendToStudyReader(doc: FzlDocumentItem): void {
    if (!doc.textContent) return;
    const paragraphs = doc.textContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    const verses = paragraphs.map((text, idx) => ({ num: idx + 1, text }));
    this.emit('fzl-document-open-study', { document: doc, verses });
  }

  private _renderHighlightedText(text: string, query: string) {
    const clean = query.trim();
    if (!clean) return text;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? html`<mark>${part}</mark>` : part
    );
  }

  private _renderDocxRuns(runs: FzlDocxRun[], query: string) {
    return runs.map((run) => {
      let content: unknown = this._renderHighlightedText(run.text, query);
      if (run.underline) content = html`<u>${content}</u>`;
      if (run.italic) content = html`<em>${content}</em>`;
      if (run.bold) content = html`<strong>${content}</strong>`;
      return content;
    });
  }

  private _renderDocxBlocks(blocks: FzlDocxBlock[], query: string) {
    return html`
      <div class="docx-view">
        ${blocks.map((block) => {
          if (block.type === 'heading') {
            if (block.level === 1) {
              return html`<h2 class="docx-heading docx-h1">${this._renderDocxRuns(block.runs, query)}</h2>`;
            }
            if (block.level === 2) {
              return html`<h3 class="docx-heading docx-h2">${this._renderDocxRuns(block.runs, query)}</h3>`;
            }
            return html`<h4 class="docx-heading docx-h3">${this._renderDocxRuns(block.runs, query)}</h4>`;
          }
          if (block.type === 'list-item') {
            return html`<div class="docx-list-item">${this._renderDocxRuns(block.runs, query)}</div>`;
          }
          if (block.type === 'table') {
            return html`
              <div class="docx-table-wrap">
                <table class="docx-table">
                  <tbody>
                    ${block.rows.map(
                      (row) => html`
                        <tr>
                          ${row.map(
                            (cell) => html`<td>${this._renderHighlightedText(cell, query)}</td>`
                          )}
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              </div>
            `;
          }
          return html`<p class="docx-p">${this._renderDocxRuns(block.runs, query)}</p>`;
        })}
      </div>
    `;
  }

  private _renderReader(doc: FzlDocumentItem) {
    const stats = estimateReadingStats(doc.textContent);
    const isText = doc.textContent !== undefined;

    return html`
      <section class="reader-panel" part="reader" aria-label="Leitor de documento">
        <header class="reader-header">
          <div>
            <h3 class="reader-title">${doc.name}</h3>
            <div class="reader-stats">
              ${formatDocumentSize(doc.size)}
              ${isText ? ` · ${stats.words} palavras · ~${stats.minutes} min de leitura` : ''}
            </div>
          </div>

          <div class="reader-controls">
            ${isText
              ? html`
                  <input
                    type="search"
                    class="reader-search-input"
                    aria-label="Buscar dentro do documento"
                    placeholder="Buscar no texto..."
                    .value=${this._readerSearchQuery}
                    @input=${(e: Event) => {
                      this._readerSearchQuery = (e.target as HTMLInputElement).value;
                    }}
                  />
                  <button
                    type="button"
                    class="btn btn-sm"
                    aria-label="Diminuir fonte"
                    @click=${() => {
                      this._readerFontSize = Math.max(12, this._readerFontSize - 2);
                    }}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm"
                    aria-label="Aumentar fonte"
                    @click=${() => {
                      this._readerFontSize = Math.min(24, this._readerFontSize + 2);
                    }}
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-study"
                    @click=${() => this._sendToStudyReader(doc)}
                  >
                    Leitor de Estudo
                  </button>
                `
              : nothing}
            <button
              type="button"
              class="btn btn-sm btn-close-reader"
              @click=${() => this.closeReader()}
            >
              Fechar Leitura
            </button>
          </div>
        </header>

        <div class="reader-body" style="font-size: ${this._readerFontSize}px">
          ${doc.docxBlocks && doc.docxBlocks.length > 0
            ? this._renderDocxBlocks(doc.docxBlocks, this._readerSearchQuery)
            : isText
              ? this._renderHighlightedText(doc.textContent || '', this._readerSearchQuery)
              : doc.category === 'pdf' && doc.objectUrl
                ? html`<iframe class="reader-frame" src=${doc.objectUrl} title=${doc.name}></iframe>`
                : doc.category === 'image' && doc.objectUrl
                  ? html`<img class="reader-img" src=${doc.objectUrl} alt=${doc.name} />`
                  : html`<p>Pré-visualização textual indisponível para o formato <code>${doc.extension || doc.type}</code>. Você pode salvá-lo nos bookmarks ou enviá-lo ao servidor.</p>`}
        </div>
      </section>
    `;
  }

  override render() {
    const visibleDocs = this._getVisibleDocuments();
    const bookmarkCount = this._documents.filter((d) => d.bookmarked).length;
    const activeDoc = this._documents.find((d) => d.id === this._activeDocId) || null;
    const fsAccessSupported = isFileSystemAccessSupported();
    const folderSupported = this.allowFolderScan && isDirectoryPickerSupported();

    return html`
      <div class="container" part="container">
        <div class="toolbar" part="toolbar">
          <div class="toolbar-top">
            <div class="view-tabs" role="tablist" aria-label="Visão de documentos">
              <button
                type="button"
                role="tab"
                class="tab-btn tab-all"
                aria-selected=${this._viewTab === 'all' ? 'true' : 'false'}
                @click=${() => (this._viewTab = 'all')}
              >
                Todos (${this._documents.length})
              </button>
              <button
                type="button"
                role="tab"
                class="tab-btn tab-bookmarks"
                aria-selected=${this._viewTab === 'bookmarks' ? 'true' : 'false'}
                @click=${() => (this._viewTab = 'bookmarks')}
              >
                Bookmarks (${bookmarkCount})
              </button>
            </div>

            <div class="doc-search-wrap">
              <input
                type="search"
                class="doc-search-input"
                aria-label="Pesquisar documentos por nome, tag ou conteúdo"
                placeholder="Pesquisar por nome, tag ou trecho..."
                .value=${this._searchQuery}
                @input=${(e: Event) => {
                  this._searchQuery = (e.target as HTMLInputElement).value;
                }}
              />
            </div>
          </div>

          <div class="filter-chips" role="group" aria-label="Filtrar por formato">
            ${(
              [
                ['all', 'Todos os formatos'],
                ['text', 'Texto / MD / DOCX'],
                ['pdf', 'PDF'],
                ['spreadsheet', 'Planilhas / CSV'],
                ['data', 'JSON / Dados'],
              ] as const
            ).map(
              ([id, label]) => html`
                <button
                  type="button"
                  class="filter-chip ${this._categoryFilter === id ? 'active' : ''}"
                  @click=${() => (this._categoryFilter = id)}
                >
                  ${label}
                </button>
              `
            )}
          </div>
        </div>

        <div
          class="dropzone ${this._isDragging ? 'dragging' : ''}"
          part="dropzone"
          @dragover=${(e: DragEvent) => {
            e.preventDefault();
            if (!this.disabled) this._isDragging = true;
          }}
          @dragleave=${() => {
            this._isDragging = false;
          }}
          @drop=${this._handleDrop}
        >
          <p class="dropzone-title">Buscar e abrir documentos do dispositivo</p>
          <p class="dropzone-hint">
            Selecione no celular ou computador, leia localmente, salve nos Bookmarks ou faça upload.
          </p>
          <div class="dropzone-actions">
            <button
              type="button"
              class="btn btn-primary btn-pick-files"
              ?disabled=${this.disabled}
              @click=${() => this.openNativeFilePicker()}
            >
              Selecionar Documento
            </button>
            ${folderSupported
              ? html`
                  <button
                    type="button"
                    class="btn btn-scan-folder"
                    ?disabled=${this.disabled}
                    @click=${() => this.openDirectoryScanner()}
                  >
                    Explorar Pasta Local
                  </button>
                `
              : nothing}
            <button
              type="button"
              class="btn btn-load-samples"
              ?disabled=${this.disabled}
              @click=${() => this.loadSampleDocuments()}
            >
              Carregar Exemplos
            </button>
          </div>
          <div class="start-dir-row" role="group" aria-label="Pasta inicial padrão">
            <span class="start-dir-label">
              ${fsAccessSupported ? 'Pasta inicial (File System API):' : 'Pasta inicial padrão:'}
            </span>
            ${WELL_KNOWN_DIRECTORIES.map(
              (dir) => html`
                <button
                  type="button"
                  class="start-dir-chip ${normalizeWellKnownDirectory(this.startIn) === dir.id ? 'active' : ''}"
                  aria-pressed=${normalizeWellKnownDirectory(this.startIn) === dir.id ? 'true' : 'false'}
                  ?disabled=${this.disabled}
                  @click=${() => {
                    this.startIn = dir.id;
                  }}
                >
                  ${dir.label}
                </button>
              `
            )}
          </div>
          ${!fsAccessSupported
            ? html`
                <p class="fs-api-hint">
                  Este navegador está usando <code>&lt;input type="file"&gt;</code> padrão (sem <code>showOpenFilePicker</code>): o SO abre na última pasta salva pelo navegador; escolha um arquivo em <strong>Pasta pessoal / Documentos</strong> para atualizar o histórico do navegador.
                </p>
              `
            : nothing}
          <input
            type="file"
            hidden
            accept=${this.accept}
            ?multiple=${this.multiple}
            ?disabled=${this.disabled}
            @change=${this._handleFileInputChange}
          />
        </div>

        ${this._errorMessage
          ? html`
              <div class="error-banner" role="alert">
                <span>${this._errorMessage}</span>
                <button
                  type="button"
                  class="btn btn-sm"
                  @click=${() => (this._errorMessage = '')}
                >
                  Dispensar
                </button>
              </div>
            `
          : nothing}

        ${visibleDocs.length === 0
          ? html`
              <div class="empty-state">
                Nenhum documento encontrado. Selecione arquivos do dispositivo ou ajuste os filtros.
              </div>
            `
          : html`
              <div class="doc-list" part="list">
                ${visibleDocs.map(
                  (doc) => html`
                    <article
                      class="doc-card ${this._activeDocId === doc.id ? 'selected' : ''}"
                      part="card"
                    >
                      <div>
                        <div class="doc-header">
                          <div>
                            <h4 class="doc-name">${doc.name}</h4>
                            <div class="doc-meta">
                              ${formatDocumentSize(doc.size)} · ${doc.extension || doc.category}
                            </div>
                          </div>
                          <span class="badge ${doc.uploadStatus}">
                            ${doc.uploadStatus === 'idle' ? doc.category : doc.uploadStatus}
                          </span>
                        </div>
                      </div>

                      <div class="tag-row">
                        ${doc.tags.map(
                          (tag) => html`
                            <span class="tag-chip">
                              #${tag}
                              <button
                                type="button"
                                class="tag-remove"
                                aria-label="Remover tag ${tag}"
                                @click=${() => this.removeTag(doc.id, tag)}
                              >
                                ×
                              </button>
                            </span>
                          `
                        )}
                        <input
                          type="text"
                          class="tag-input-inline"
                          aria-label="Adicionar tag para ${doc.name}"
                          placeholder="+ tag (Enter)"
                          @keydown=${(e: KeyboardEvent) => this._handleTagInputKeydown(doc.id, e)}
                        />
                      </div>

                      <div class="doc-actions">
                        <button
                          type="button"
                          class="btn btn-sm btn-read"
                          @click=${() => this.openReader(doc.id)}
                        >
                          Ler
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-bookmark ${doc.bookmarked ? 'btn-active' : ''}"
                          aria-pressed=${doc.bookmarked ? 'true' : 'false'}
                          @click=${() => this.toggleBookmark(doc.id)}
                        >
                          ${doc.bookmarked ? 'Nos Bookmarks' : 'Favoritar'}
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-upload"
                          ?disabled=${doc.uploadStatus === 'uploading'}
                          @click=${() => this.uploadDocument(doc.id)}
                        >
                          ${doc.uploadStatus === 'uploading' ? 'Enviando...' : 'Upload'}
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-remove"
                          aria-label="Remover ${doc.name}"
                          @click=${() => this.removeDocument(doc.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </article>
                  `
                )}
              </div>
            `}

        ${activeDoc ? this._renderReader(activeDoc) : nothing}
      </div>
    `;
  }
}

export class FzlLitDocumentPicker extends FzlDocumentPicker {}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-document-picker')) {
    customElements.define('fzl-document-picker', FzlDocumentPicker);
  }
  if (!customElements.get('fzl-lit-document-picker')) {
    customElements.define('fzl-lit-document-picker', FzlLitDocumentPicker);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-document-picker': FzlDocumentPicker;
    'fzl-lit-document-picker': FzlLitDocumentPicker;
  }
}
