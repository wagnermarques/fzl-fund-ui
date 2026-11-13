import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import { formatDocumentSize } from '../document-picker/document-picker.types';
import type { FzlDocxBlock, FzlDocxRun } from '../document-picker/docx-parser';
import {
  type FzlFileManagerViewMode,
  type FzlFileSourceStatus,
  type FzlManagedFile,
  SAMPLE_MANAGED_FILES,
} from './file-manager.types';

export * from './file-manager.types';

/**
 * Enterprise File Manager Web Component (`fzl-file-manager`).
 *
 * Provides a filesystem-like file explorer indicating whether files are
 * local favorites (`bookmarked-only`), remote on server (`uploaded-only`),
 * synchronized (`synced`), or pending upload (`pending-upload`).
 *
 * Allows users to organize files in virtual directories, search by name or tag,
 * filter by status, and seamlessly resume reading with support for native DOCX,
 * Markdown, TXT, PDF, JSON, and CSV.
 *
 * @customElement fzl-file-manager
 * @tag fzl-file-manager
 */
export class FzlFileManager extends FzlWidgetMixin(LitElement) {
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

      .fm-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
      }

      /* Toolbar & Breadcrumbs */
      .fm-toolbar {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: var(--_fzl-radius-md, 10px);
        background: var(--_fzl-color-surface, #ffffff);
      }

      .fm-toolbar-top {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .fm-search-wrap {
        flex: 1 1 240px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 8px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
      }

      .fm-search-input {
        width: 100%;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 0.85rem;
        outline: none;
      }

      .fm-view-switcher {
        display: inline-flex;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 8px;
        overflow: hidden;
      }

      .fm-view-btn {
        padding: 6px 12px;
        border: none;
        background: #ffffff;
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: 0.78rem;
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
      }

      .fm-view-btn.active {
        background: var(--_fzl-color-primary, #0284c7);
        color: #ffffff;
      }

      /* Breadcrumbs bar */
      .fm-breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .fm-crumb-link {
        color: var(--_fzl-color-primary, #0284c7);
        text-decoration: none;
        cursor: pointer;
        font-weight: 500;
        background: transparent;
        border: none;
        padding: 0;
        font: inherit;
      }

      .fm-crumb-link:hover {
        text-decoration: underline;
      }

      /* Filter pills */
      .fm-status-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .fm-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: transparent;
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: 0.76rem;
        cursor: pointer;
        font-family: inherit;
      }

      .fm-chip.active {
        background: var(--_fzl-color-surface-hover, #e0f2fe);
        color: var(--_fzl-color-primary, #0369a1);
        border-color: var(--_fzl-color-primary, #0284c7);
        font-weight: 600;
      }

      /* Status Badges */
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 600;
        white-space: nowrap;
      }

      .status-badge.synced {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }

      .status-badge.uploaded-only {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }

      .status-badge.bookmarked-only {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }

      .status-badge.pending-upload {
        background: #f1f5f9;
        color: #475569;
        border: 1px dashed #cbd5e1;
      }

      /* Progress bar */
      .progress-bar-wrap {
        width: 100%;
        max-width: 110px;
        height: 6px;
        background: #e2e8f0;
        border-radius: 999px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: var(--_fzl-color-primary, #0284c7);
        border-radius: 999px;
      }

      /* Action buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #0f172a);
        font-size: 0.76rem;
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
      }

      .btn-primary {
        background: var(--_fzl-color-primary, #0284c7);
        border-color: var(--_fzl-color-primary, #0284c7);
        color: #ffffff;
      }

      .btn-active {
        background: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      /* Table View */
      .fm-table-wrap {
        width: 100%;
        overflow-x: auto;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: 10px;
        background: var(--_fzl-color-surface, #ffffff);
      }

      .fm-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
        text-align: left;
      }

      .fm-table th {
        padding: 10px 14px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
        font-weight: 600;
        color: #475569;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .fm-table td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--_fzl-color-border, #f1f5f9);
        vertical-align: middle;
      }

      .fm-table tr:hover td {
        background: var(--_fzl-color-surface-hover, #f8fafc);
      }

      .file-name-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .file-title {
        font-weight: 600;
        color: var(--_fzl-color-text, #0f172a);
        cursor: pointer;
      }

      .file-title:hover {
        color: var(--_fzl-color-primary, #0284c7);
        text-decoration: underline;
      }

      .file-subpath {
        font-size: 0.72rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      /* Grid View */
      .fm-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;
      }

      .fm-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: 10px;
        background: var(--_fzl-color-surface, #ffffff);
      }

      .fm-card.selected {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: 0 0 0 1px var(--_fzl-color-primary, #0284c7);
      }

      .fm-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .tag-chip {
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 4px;
        background: #f1f5f9;
        color: #475569;
      }

      .fm-actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      /* Reader Panel */
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
        font-size: 1rem;
        font-weight: 600;
      }

      .reader-stats {
        font-size: 0.76rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .reader-body {
        padding: 18px;
        max-height: 480px;
        overflow-y: auto;
        line-height: 1.7;
        word-break: break-word;
      }

      .reader-frame {
        width: 100%;
        height: 450px;
        border: none;
        display: block;
      }

      /* DOCX Styling */
      .docx-view {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .docx-heading {
        margin: 10px 0 4px;
        line-height: 1.3;
      }

      .docx-h1 {
        font-size: 1.35em;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 4px;
      }

      .docx-h2 {
        font-size: 1.18em;
      }

      .docx-h3 {
        font-size: 1.05em;
      }

      .docx-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9em;
        margin: 6px 0;
      }

      .docx-table td {
        border: 1px solid #cbd5e1;
        padding: 6px 10px;
      }

      .docx-table tr:first-child td {
        background: #f8fafc;
        font-weight: 600;
      }

      .empty-box {
        padding: 28px 16px;
        text-align: center;
        border: 1px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: 10px;
        font-size: 0.86rem;
        color: var(--_fzl-color-text-muted, #64748b);
      }
    `,
  ];

  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'storage-key' }) storageKey = 'fzl-document-bookmarks';
  @property({ type: Boolean, attribute: 'include-local-bookmarks' }) includeLocalBookmarks = true;
  @property({ type: String, attribute: 'view-mode' }) viewMode: FzlFileManagerViewMode = 'table';
  @property({ type: String, attribute: 'current-folder' }) currentFolder = '/';
  @property({ type: Boolean, attribute: 'preload-samples' }) preloadSamples = false;
  @property({ type: Boolean }) disabled = false;

  @property({ attribute: false })
  fetchHandler?: (query: { folder?: string; search?: string }) => Promise<FzlManagedFile[]>;

  @property({ attribute: false })
  uploadHandler?: (file: FzlManagedFile) => Promise<unknown>;

  @state() private _files: FzlManagedFile[] = [];
  @state() private _activeFileId: string | null = null;
  @state() private _statusFilter: 'all' | FzlFileSourceStatus = 'all';
  @state() private _searchQuery = '';
  @state() private _readerFontSize = 15;
  @state() private _readerSearchQuery = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  /**
   * Refreshes the file list by fetching from remote handler/endpoint
   * and merging local bookmarks.
   */
  async refresh(): Promise<void> {
    let files: FzlManagedFile[] = [];

    if (this.fetchHandler) {
      try {
        files = await this.fetchHandler({ folder: this.currentFolder, search: this._searchQuery });
      } catch {
        files = [];
      }
    } else if (this.endpoint) {
      try {
        const res = await fetch(`${this.endpoint}?folder=${encodeURIComponent(this.currentFolder)}`);
        if (res.ok) {
          files = (await res.json()) as FzlManagedFile[];
        }
      } catch {
        files = [];
      }
    } else if (this.preloadSamples && this._files.length === 0) {
      files = SAMPLE_MANAGED_FILES.map((f) => ({ ...f, tags: [...f.tags] }));
    }

    if (this.includeLocalBookmarks) {
      files = this._mergeLocalBookmarks(files);
    }

    this._files = files;
  }

  getFiles(): FzlManagedFile[] {
    return this._files.map((f) => ({ ...f, tags: [...f.tags] }));
  }

  getActiveFile(): FzlManagedFile | null {
    if (!this._activeFileId) return null;
    const found = this._files.find((f) => f.id === this._activeFileId);
    return found ? { ...found, tags: [...found.tags] } : null;
  }

  openReader(fileId: string): void {
    const file = this._files.find((f) => f.id === fileId);
    if (!file) return;

    this._activeFileId = file.id;
    this._readerSearchQuery = '';

    // Update last read timestamp and progress
    const updated = this._updateFile(fileId, {
      lastReadAt: Date.now(),
      readProgress: file.readProgress !== undefined ? file.readProgress : 10,
    });

    this.emit('fzl-file-read', {
      file: updated || file,
      textContent: file.textContent,
      objectUrl: file.objectUrl,
    });
  }

  closeReader(): void {
    this._activeFileId = null;
  }

  toggleBookmark(fileId: string): boolean {
    const file = this._files.find((f) => f.id === fileId);
    if (!file) return false;

    const isBookmarked = file.status === 'bookmarked-only' || file.status === 'synced';
    const nextStatus: FzlFileSourceStatus = isBookmarked
      ? file.status === 'synced'
        ? 'uploaded-only'
        : 'pending-upload'
      : file.status === 'uploaded-only'
        ? 'synced'
        : 'bookmarked-only';

    const updated = this._updateFile(fileId, {
      status: nextStatus,
      bookmarkedAt: !isBookmarked ? Date.now() : undefined,
    });

    this._syncLocalBookmarkStorage();
    this.emit('fzl-file-bookmark-toggle', { file: updated || file, bookmarked: !isBookmarked });
    return !isBookmarked;
  }

  async uploadFile(fileId: string): Promise<boolean> {
    const file = this._files.find((f) => f.id === fileId);
    if (!file) return false;

    if (this.uploadHandler) {
      try {
        await this.uploadHandler(file);
        const nextStatus: FzlFileSourceStatus =
          file.status === 'bookmarked-only' || file.bookmarkedAt ? 'synced' : 'uploaded-only';
        this._updateFile(fileId, { status: nextStatus, uploadedAt: Date.now() });
        this.emit('fzl-file-upload-success', { file });
        return true;
      } catch (err) {
        this.emit('fzl-file-upload-error', { file, error: String(err) });
        return false;
      }
    }

    // Default optimistic toggle if no custom handler
    const nextStatus: FzlFileSourceStatus =
      file.status === 'bookmarked-only' || file.bookmarkedAt ? 'synced' : 'uploaded-only';
    this._updateFile(fileId, { status: nextStatus, uploadedAt: Date.now() });
    return true;
  }

  deleteFile(fileId: string): void {
    const target = this._files.find((f) => f.id === fileId);
    if (!target) return;

    this._files = this._files.filter((f) => f.id !== fileId);
    if (this._activeFileId === fileId) {
      this._activeFileId = null;
    }
    this._syncLocalBookmarkStorage();
    this.emit('fzl-file-delete', { file: target });
  }

  navigateToFolder(folderPath: string): void {
    this.currentFolder = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    this.emit('fzl-folder-change', { folder: this.currentFolder });
  }

  private _updateFile(fileId: string, patch: Partial<FzlManagedFile>): FzlManagedFile | undefined {
    const idx = this._files.findIndex((f) => f.id === fileId);
    if (idx < 0) return undefined;
    const updated: FzlManagedFile = { ...this._files[idx], ...patch };
    const next = [...this._files];
    next[idx] = updated;
    this._files = next;
    return updated;
  }

  private _mergeLocalBookmarks(remoteFiles: FzlManagedFile[]): FzlManagedFile[] {
    if (typeof localStorage === 'undefined' || !this.storageKey) return remoteFiles;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return remoteFiles;
      const localBookmarks = JSON.parse(raw);
      if (!Array.isArray(localBookmarks)) return remoteFiles;

      const merged = [...remoteFiles];
      for (const bm of localBookmarks) {
        const existingIdx = merged.findIndex((f) => f.name === bm.name || f.id === bm.id);
        if (existingIdx >= 0) {
          merged[existingIdx] = {
            ...merged[existingIdx],
            status: 'synced',
            bookmarkedAt: bm.bookmarkedAt || Date.now(),
            tags: Array.from(new Set([...merged[existingIdx].tags, ...(bm.tags || [])])),
            textContent: bm.textContent || merged[existingIdx].textContent,
            docxBlocks: bm.docxBlocks || merged[existingIdx].docxBlocks,
          };
        } else {
          merged.push({
            id: bm.id || `bm-${Date.now()}`,
            name: bm.name,
            folder: bm.folder || '/',
            size: bm.size || 0,
            extension: bm.extension || '',
            category: bm.category || 'text',
            status: 'bookmarked-only',
            bookmarkedAt: bm.bookmarkedAt || Date.now(),
            tags: bm.tags || [],
            notes: bm.notes,
            textContent: bm.textContent,
            docxBlocks: bm.docxBlocks,
          });
        }
      }
      return merged;
    } catch {
      return remoteFiles;
    }
  }

  private _syncLocalBookmarkStorage(): void {
    if (typeof localStorage === 'undefined' || !this.storageKey) return;
    try {
      const bookmarked = this._files.filter(
        (f) => f.status === 'bookmarked-only' || f.status === 'synced'
      );
      localStorage.setItem(this.storageKey, JSON.stringify(bookmarked));
    } catch {
      // Ignore quota errors
    }
  }

  private _getVisibleFiles(): FzlManagedFile[] {
    const query = this._searchQuery.trim().toLowerCase();
    return this._files.filter((file) => {
      // Status filter
      if (this._statusFilter === 'bookmarked-only') {
        if (file.status !== 'bookmarked-only' && file.status !== 'synced') return false;
      } else if (this._statusFilter === 'uploaded-only') {
        if (file.status !== 'uploaded-only' && file.status !== 'synced') return false;
      } else if (this._statusFilter === 'synced' && file.status !== 'synced') {
        return false;
      } else if (this._statusFilter === 'pending-upload' && file.status !== 'pending-upload') {
        return false;
      }

      // Folder filter (only when search query is empty)
      if (!query && this.currentFolder !== '/') {
        if (!file.folder.startsWith(this.currentFolder)) return false;
      }

      // Search filter
      if (query) {
        if (file.name.toLowerCase().includes(query)) return true;
        if (file.tags.some((t) => t.toLowerCase().includes(query))) return true;
        if (file.textContent && file.textContent.toLowerCase().includes(query)) return true;
        return false;
      }

      return true;
    });
  }

  private _sendToStudyReader(file: FzlManagedFile): void {
    if (!file.textContent) return;
    const paragraphs = file.textContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    const verses = paragraphs.map((text, idx) => ({ num: idx + 1, text }));
    this.emit('fzl-file-open-study', { file, verses });
  }

  private _renderHighlightedText(text: string, query: string) {
    const clean = query.trim();
    if (!clean) return text;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? html`<mark style="background:#fef08a;padding:0 2px;border-radius:3px">${part}</mark>` : part
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
            return html`<div style="margin-left:18px;display:list-item;">${this._renderDocxRuns(block.runs, query)}</div>`;
          }
          if (block.type === 'table') {
            return html`
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
            `;
          }
          return html`<p style="margin:4px 0">${this._renderDocxRuns(block.runs, query)}</p>`;
        })}
      </div>
    `;
  }

  private _renderStatusBadge(status: FzlFileSourceStatus) {
    switch (status) {
      case 'synced':
        return html`<span class="status-badge synced">🔄 Sincronizado</span>`;
      case 'uploaded-only':
        return html`<span class="status-badge uploaded-only">☁️ No Servidor</span>`;
      case 'bookmarked-only':
        return html`<span class="status-badge bookmarked-only">🔖 Favorito Local</span>`;
      case 'pending-upload':
        return html`<span class="status-badge pending-upload">⏳ Pendente Upload</span>`;
    }
  }

  private _renderBreadcrumbs() {
    const parts = this.currentFolder.split('/').filter(Boolean);
    let accum = '';
    return html`
      <nav class="fm-breadcrumbs" aria-label="Navegação de pastas">
        <button
          type="button"
          class="fm-crumb-link"
          @click=${() => this.navigateToFolder('/')}
        >
          📁 Raiz (/)
        </button>
        ${parts.map((p) => {
          accum += `/${p}`;
          const target = accum;
          return html`
            <span>/</span>
            <button
              type="button"
              class="fm-crumb-link"
              @click=${() => this.navigateToFolder(target)}
            >
              ${p}
            </button>
          `;
        })}
      </nav>
    `;
  }

  private _renderReader(file: FzlManagedFile) {
    const isDocx = Boolean(file.docxBlocks && file.docxBlocks.length > 0);
    const isText = Boolean(file.textContent);

    return html`
      <section class="reader-panel" aria-label="Leitor de arquivo">
        <header class="reader-header">
          <div>
            <h3 class="reader-title">${file.name}</h3>
            <div class="reader-stats">
              ${formatDocumentSize(file.size)} · ${file.folder} · ${this._renderStatusBadge(file.status)}
              ${file.readProgress ? ` · ${file.readProgress}% lido` : ''}
            </div>
          </div>

          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${isText
              ? html`
                  <input
                    type="search"
                    style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;"
                    placeholder="Buscar no texto..."
                    .value=${this._readerSearchQuery}
                    @input=${(e: Event) => {
                      this._readerSearchQuery = (e.target as HTMLInputElement).value;
                    }}
                  />
                  <button
                    type="button"
                    class="btn"
                    @click=${() => {
                      this._readerFontSize = Math.max(12, this._readerFontSize - 2);
                    }}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    class="btn"
                    @click=${() => {
                      this._readerFontSize = Math.min(24, this._readerFontSize + 2);
                    }}
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    class="btn btn-study"
                    @click=${() => this._sendToStudyReader(file)}
                  >
                    Leitor de Estudo
                  </button>
                `
              : nothing}
            <button
              type="button"
              class="btn btn-close-reader"
              @click=${() => this.closeReader()}
            >
              Fechar Leitura
            </button>
          </div>
        </header>

        <div class="reader-body" style="font-size:${this._readerFontSize}px">
          ${isDocx
            ? this._renderDocxBlocks(file.docxBlocks || [], this._readerSearchQuery)
            : isText
              ? html`<div style="white-space:pre-wrap">${this._renderHighlightedText(file.textContent || '', this._readerSearchQuery)}</div>`
              : file.category === 'pdf' && file.objectUrl
                ? html`<iframe class="reader-frame" src=${file.objectUrl} title=${file.name}></iframe>`
                : html`<p>Pré-visualização direta indisponível para este arquivo.</p>`}
        </div>
      </section>
    `;
  }

  override render() {
    const visibleFiles = this._getVisibleFiles();
    const activeFile = this._files.find((f) => f.id === this._activeFileId) || null;

    const bookmarkedCount = this._files.filter(
      (f) => f.status === 'bookmarked-only' || f.status === 'synced'
    ).length;
    const uploadedCount = this._files.filter(
      (f) => f.status === 'uploaded-only' || f.status === 'synced'
    ).length;

    return html`
      <div class="fm-container">
        <!-- Toolbar -->
        <div class="fm-toolbar">
          <div class="fm-toolbar-top">
            ${this._renderBreadcrumbs()}

            <div class="fm-search-wrap">
              <input
                type="search"
                class="fm-search-input"
                aria-label="Buscar arquivos por nome ou tag"
                placeholder="Pesquisar nos arquivos do usuário..."
                .value=${this._searchQuery}
                @input=${(e: Event) => {
                  this._searchQuery = (e.target as HTMLInputElement).value;
                }}
              />
            </div>

            <div class="fm-view-switcher" role="group" aria-label="Modo de visualização">
              <button
                type="button"
                class="fm-view-btn ${this.viewMode === 'table' ? 'active' : ''}"
                @click=${() => (this.viewMode = 'table')}
              >
                Tabela
              </button>
              <button
                type="button"
                class="fm-view-btn ${this.viewMode === 'grid' ? 'active' : ''}"
                @click=${() => (this.viewMode = 'grid')}
              >
                Grade
              </button>
            </div>
          </div>

          <!-- Status Filters -->
          <div class="fm-status-filters" role="group" aria-label="Filtrar por status">
            <button
              type="button"
              class="fm-chip ${this._statusFilter === 'all' ? 'active' : ''}"
              @click=${() => (this._statusFilter = 'all')}
            >
              Todos (${this._files.length})
            </button>
            <button
              type="button"
              class="fm-chip ${this._statusFilter === 'bookmarked-only' ? 'active' : ''}"
              @click=${() => (this._statusFilter = 'bookmarked-only')}
            >
              🔖 Favoritos (${bookmarkedCount})
            </button>
            <button
              type="button"
              class="fm-chip ${this._statusFilter === 'uploaded-only' ? 'active' : ''}"
              @click=${() => (this._statusFilter = 'uploaded-only')}
            >
              ☁️ No Servidor (${uploadedCount})
            </button>
            <button
              type="button"
              class="fm-chip ${this._statusFilter === 'synced' ? 'active' : ''}"
              @click=${() => (this._statusFilter = 'synced')}
            >
              🔄 Sincronizados
            </button>
            <button
              type="button"
              class="fm-chip ${this._statusFilter === 'pending-upload' ? 'active' : ''}"
              @click=${() => (this._statusFilter = 'pending-upload')}
            >
              ⏳ Pendentes
            </button>
          </div>
        </div>

        <!-- Files Display -->
        ${visibleFiles.length === 0
          ? html`<div class="empty-box">Nenhum arquivo encontrado para o filtro aplicado.</div>`
          : this.viewMode === 'table'
            ? html`
                <div class="fm-table-wrap">
                  <table class="fm-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Status</th>
                        <th>Tamanho</th>
                        <th>Progresso</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${visibleFiles.map((file) => {
                        const isFav = file.status === 'bookmarked-only' || file.status === 'synced';
                        return html`
                          <tr>
                            <td>
                              <div class="file-name-cell">
                                <span
                                  class="file-title"
                                  role="button"
                                  tabindex="0"
                                  @click=${() => this.openReader(file.id)}
                                >
                                  ${file.name}
                                </span>
                                <span class="file-subpath">${file.folder}</span>
                                <div class="tag-row">
                                  ${file.tags.map((t) => html`<span class="tag-chip">#${t}</span>`)}
                                </div>
                              </div>
                            </td>
                            <td>${this._renderStatusBadge(file.status)}</td>
                            <td>${formatDocumentSize(file.size)}</td>
                            <td>
                              <div style="display:flex;align-items:center;gap:6px">
                                <div class="progress-bar-wrap">
                                  <div
                                    class="progress-bar-fill"
                                    style="width: ${file.readProgress || 0}%"
                                  ></div>
                                </div>
                                <span style="font-size:0.7rem;color:#64748b">${file.readProgress || 0}%</span>
                              </div>
                            </td>
                            <td>
                              <div class="fm-actions-row">
                                <button
                                  type="button"
                                  class="btn btn-primary"
                                  @click=${() => this.openReader(file.id)}
                                >
                                  Continuar Leitura
                                </button>
                                <button
                                  type="button"
                                  class="btn ${isFav ? 'btn-active' : ''}"
                                  @click=${() => this.toggleBookmark(file.id)}
                                >
                                  ${isFav ? '★ Favorito' : '☆ Favoritar'}
                                </button>
                                ${file.status === 'bookmarked-only' || file.status === 'pending-upload'
                                  ? html`
                                      <button
                                        type="button"
                                        class="btn"
                                        @click=${() => this.uploadFile(file.id)}
                                      >
                                        Upload
                                      </button>
                                    `
                                  : nothing}
                                <button
                                  type="button"
                                  class="btn"
                                  @click=${() => this.deleteFile(file.id)}
                                >
                                  Remover
                                </button>
                              </div>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>
              `
            : html`
                <div class="fm-grid">
                  ${visibleFiles.map((file) => {
                    const isFav = file.status === 'bookmarked-only' || file.status === 'synced';
                    return html`
                      <article
                        class="fm-card ${this._activeFileId === file.id ? 'selected' : ''}"
                      >
                        <div>
                          <div class="fm-card-header">
                            <div>
                              <div
                                class="file-title"
                                role="button"
                                tabindex="0"
                                @click=${() => this.openReader(file.id)}
                              >
                                ${file.name}
                              </div>
                              <div class="file-subpath">
                                ${file.folder} · ${formatDocumentSize(file.size)}
                              </div>
                            </div>
                            ${this._renderStatusBadge(file.status)}
                          </div>

                          <div class="tag-row" style="margin-top:8px">
                            ${file.tags.map((t) => html`<span class="tag-chip">#${t}</span>`)}
                          </div>

                          <div style="margin-top:10px">
                            <span style="font-size:0.72rem;color:#64748b">Leitura: ${file.readProgress || 0}%</span>
                            <div class="progress-bar-wrap" style="max-width:100%;margin-top:3px">
                              <div
                                class="progress-bar-fill"
                                style="width: ${file.readProgress || 0}%"
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div class="fm-actions-row">
                          <button
                            type="button"
                            class="btn btn-primary"
                            @click=${() => this.openReader(file.id)}
                          >
                            Continuar Leitura
                          </button>
                          <button
                            type="button"
                            class="btn ${isFav ? 'btn-active' : ''}"
                            @click=${() => this.toggleBookmark(file.id)}
                          >
                            ${isFav ? '★' : '☆'}
                          </button>
                          ${file.status === 'bookmarked-only' || file.status === 'pending-upload'
                            ? html`
                                <button
                                  type="button"
                                  class="btn"
                                  @click=${() => this.uploadFile(file.id)}
                                >
                                  Upload
                                </button>
                              `
                            : nothing}
                          <button
                            type="button"
                            class="btn"
                            @click=${() => this.deleteFile(file.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </article>
                    `;
                  })}
                </div>
              `}

        <!-- Built-in Reader -->
        ${activeFile ? this._renderReader(activeFile) : nothing}
      </div>
    `;
  }
}

export class FzlLitFileManager extends FzlFileManager {}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-file-manager')) {
    customElements.define('fzl-file-manager', FzlFileManager);
  }
  if (!customElements.get('fzl-lit-file-manager')) {
    customElements.define('fzl-lit-file-manager', FzlLitFileManager);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-file-manager': FzlFileManager;
    'fzl-lit-file-manager': FzlLitFileManager;
  }
}
