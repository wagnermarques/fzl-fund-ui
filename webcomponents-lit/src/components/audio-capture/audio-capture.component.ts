import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  FzlAudioStorage,
  FzlAudioRecording,
  isAudioCaptureSupported,
  pickAudioMimeType,
  formatAudioDuration,
  formatAudioSize,
  audioFileExtension,
} from './audio-capture.types';
import {
  FzlAudioStore,
  FZL_AUDIO_DEFAULT_DB_NAME,
  FZL_AUDIO_DEFAULT_STORE_NAME,
  isIndexedDbSupported,
} from './audio-store';

export * from './audio-capture.types';
export * from './audio-store';

type RecorderStatus = 'idle' | 'starting' | 'recording' | 'paused' | 'saving';

function createRecordingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultRecordingName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `Gravação ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Audio Capture Web Component (`fzl-audio-capture`).
 *
 * Records audio from the microphone with MediaRecorder, shows a live input level
 * meter (Web Audio API), supports pause/resume and a maximum duration, and — by
 * default — **persists every finished recording's audio Blob in the browser's
 * IndexedDB**. Saved recordings are listed in a built-in library with playback,
 * download and delete.
 *
 * Set `storage="none"` to disable persistence and only receive the
 * `fzl-audio-captured` event.
 *
 * @customElement fzl-audio-capture
 * @tag fzl-audio-capture
 *
 * @attr {'indexeddb' | 'none'} [storage='indexeddb'] - Where finished recordings are persisted
 * @attr {string} [db-name='fzl-audio-capture'] - IndexedDB database name
 * @attr {string} [store-name='recordings'] - IndexedDB object store name
 * @attr {number} [max-duration=300] - Max recording length in seconds (0 = unlimited)
 * @attr {string} [mime-type=''] - Preferred MIME type (falls back to the first supported one)
 * @attr {number} [audio-bits-per-second=0] - Encoder bitrate (0 = browser default)
 * @attr {boolean} [show-library=true] - Shows the list of recordings saved in IndexedDB
 * @attr {boolean} [disabled=false] - Disables interactions
 *
 * @fires {CustomEvent<{ stream: MediaStream; mimeType: string }>} fzl-audio-start - Recording started
 * @fires {CustomEvent<{ recording: FzlAudioRecording }>} fzl-audio-captured - Recording finished (always fired, before persisting)
 * @fires {CustomEvent<{ recording: FzlAudioRecording }>} fzl-audio-saved - Recording saved in IndexedDB
 * @fires {CustomEvent<{ id: string }>} fzl-audio-deleted - A stored recording was deleted
 * @fires {CustomEvent<{ error: string }>} fzl-audio-error - Microphone, recorder or storage failure
 *
 * @csspart container - The outer root container
 * @csspart recorder - The recorder panel (timer, meter, buttons)
 * @csspart meter - The input level meter
 * @csspart library - The saved recordings list
 */
export class FzlAudioCapture extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: inherit;
      }

      .audio-root {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      }

      .recorder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 20px 16px;
        background: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: var(--_fzl-radius-lg, 12px);
      }

      .timer {
        font-size: 2rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.5px;
      }

      .timer-limit {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 1.25rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .status.is-recording {
        color: #dc2626;
      }

      .rec-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: currentColor;
        animation: recBlink 1s infinite;
      }

      @keyframes recBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }

      @media (prefers-reduced-motion: reduce) {
        .rec-dot { animation: none; }
      }

      .meter {
        width: 100%;
        max-width: 320px;
        height: 8px;
        border-radius: 4px;
        background: var(--_fzl-color-surface-muted, #f1f5f9);
        overflow: hidden;
      }

      .meter-fill {
        height: 100%;
        width: 0;
        background: linear-gradient(90deg, #10b981, #f59e0b 70%, #ef4444);
        transition: width 80ms linear;
      }

      .controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .btn-record {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 4px solid #ef4444;
        background: transparent;
        padding: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 150ms ease;
      }

      .btn-record:hover:not(:disabled) {
        transform: scale(1.06);
      }

      .btn-record-inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: #ef4444;
        transition: all 200ms ease;
      }

      .btn-record.is-recording .btn-record-inner {
        width: 50%;
        height: 50%;
        border-radius: 4px;
      }

      .btn-round {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: var(--_fzl-color-surface-muted, #f1f5f9);
        color: var(--_fzl-color-text, #0f172a);
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      button:focus-visible {
        outline: 2px solid var(--_fzl-color-primary, #0284c7);
        outline-offset: 2px;
      }

      .hint {
        margin: 0;
        font-size: 0.8rem;
        color: var(--_fzl-color-text-muted, #64748b);
        text-align: center;
      }

      .error-bar {
        padding: 8px 12px;
        background: #ef4444;
        color: #ffffff;
        font-size: 0.8rem;
        border-radius: 6px;
        text-align: center;
      }

      /* Library */
      .library {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .library-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.85rem;
        font-weight: 600;
      }

      .library-empty {
        font-size: 0.8rem;
        color: var(--_fzl-color-text-muted, #64748b);
        padding: 8px 0;
      }

      .recording-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 12px;
        background: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: 8px;
      }

      .recording-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }

      .recording-name {
        font-size: 0.85rem;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .recording-meta {
        font-size: 0.75rem;
        color: var(--_fzl-color-text-muted, #64748b);
        white-space: nowrap;
      }

      .recording-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .btn-small {
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: var(--_fzl-color-surface-muted, #f1f5f9);
        color: var(--_fzl-color-text, #0f172a);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 0.75rem;
        cursor: pointer;
      }

      .btn-small.danger:hover:not(:disabled) {
        background: #fee2e2;
        color: #b91c1c;
      }

      audio {
        width: 100%;
        height: 36px;
      }
    `,
  ];

  @property({ type: String }) storage: FzlAudioStorage = 'indexeddb';
  @property({ type: String, attribute: 'db-name' }) dbName: string = FZL_AUDIO_DEFAULT_DB_NAME;
  @property({ type: String, attribute: 'store-name' }) storeName: string = FZL_AUDIO_DEFAULT_STORE_NAME;
  @property({ type: Number, attribute: 'max-duration' }) maxDuration: number = 300;
  @property({ type: String, attribute: 'mime-type' }) mimeType: string = '';
  @property({ type: Number, attribute: 'audio-bits-per-second' }) audioBitsPerSecond: number = 0;
  @property({
    attribute: 'show-library',
    converter: { fromAttribute: (v: string | null) => v !== 'false' },
  })
  showLibrary: boolean = true;
  @property({ type: Boolean }) disabled: boolean = false;

  @state() private _status: RecorderStatus = 'idle';
  @state() private _elapsedSeconds = 0;
  @state() private _level = 0;
  @state() private _errorMessage = '';
  @state() private _recordings: FzlAudioRecording[] = [];

  private _store: FzlAudioStore | null = null;
  private _stream: MediaStream | null = null;
  private _recorder: MediaRecorder | null = null;
  private _chunks: Blob[] = [];
  private _accumulatedMs = 0;
  private _segmentStartedAt = 0;
  private _tickTimer: ReturnType<typeof setInterval> | null = null;
  private _audioContext: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _levelFrame = 0;
  private _objectUrls = new Map<string, string>();

  /** True while a recording is in progress (recording or paused). */
  get isRecording(): boolean {
    return this._status === 'recording' || this._status === 'paused';
  }

  /** Snapshot of the recordings currently loaded from IndexedDB, newest first. */
  get recordings(): FzlAudioRecording[] {
    return [...this._recordings];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.refreshRecordings();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // Leaving the page mid-recording discards it: we cannot await the final chunk here.
    this._teardownCapture();
    this._revokeAllObjectUrls();
    this._store?.close();
    this._store = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('dbName') || changed.has('storeName') || changed.has('storage')) {
      if (this._store && (this._store.dbName !== this.dbName || this._store.storeName !== this.storeName)) {
        this._store.close();
        this._store = null;
      }
      if (this.hasUpdated) void this.refreshRecordings();
    }
  }

  private _getStore(): FzlAudioStore | null {
    if (this.storage !== 'indexeddb' || !isIndexedDbSupported()) return null;
    if (!this._store) this._store = new FzlAudioStore(this.dbName, this.storeName);
    return this._store;
  }

  private _emit<T>(name: string, detail?: T): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  private _fail(message: string): void {
    this._errorMessage = message;
    this._emit('fzl-audio-error', { error: message });
  }

  // ---------------------------------------------------------------- recording

  /** Requests the microphone and starts recording. */
  async start(): Promise<void> {
    if (this.disabled || this._status !== 'idle') return;
    this._errorMessage = '';

    if (!isAudioCaptureSupported()) {
      this._fail('Gravação de áudio não suportada neste navegador.');
      return;
    }

    this._status = 'starting';
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err: any) {
      this._status = 'idle';
      this._fail(
        err?.name === 'NotAllowedError'
          ? 'Permissão de microfone negada pelo usuário.'
          : err?.name === 'NotFoundError'
          ? 'Nenhum microfone encontrado.'
          : `Não foi possível acessar o microfone: ${err?.message || err}`
      );
      return;
    }

    // The element may have been removed or disabled while the permission prompt was open.
    if (!this.isConnected || this.disabled) {
      this._teardownCapture();
      return;
    }

    const mimeType = pickAudioMimeType(this.mimeType || undefined);
    const options: MediaRecorderOptions = {};
    if (mimeType) options.mimeType = mimeType;
    if (this.audioBitsPerSecond > 0) options.audioBitsPerSecond = this.audioBitsPerSecond;

    try {
      this._recorder = new MediaRecorder(this._stream, options);
    } catch (err: any) {
      this._teardownCapture();
      this._fail(`Erro ao iniciar a gravação: ${err?.message || err}`);
      return;
    }

    this._chunks = [];
    this._accumulatedMs = 0;
    this._elapsedSeconds = 0;

    const recorder = this._recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    };
    recorder.onstop = () => {
      void this._finalize(recorder);
    };
    recorder.onerror = (e: any) => {
      this._fail(`Erro durante a gravação: ${e?.error?.message || 'desconhecido'}`);
    };

    recorder.start(1000);
    this._segmentStartedAt = performance.now();
    this._status = 'recording';
    this._startTicking();
    this._startLevelMeter(this._stream);

    this._emit('fzl-audio-start', { stream: this._stream, mimeType: recorder.mimeType || mimeType });
  }

  /** Stops the recording. The result is emitted and (by default) saved to IndexedDB. */
  stop(): void {
    if (!this.isRecording || !this._recorder) return;
    this._accumulateSegment();
    this._status = 'saving';
    this._stopTicking();
    if (this._recorder.state !== 'inactive') this._recorder.stop();
  }

  pause(): void {
    if (this._status !== 'recording' || !this._recorder || typeof this._recorder.pause !== 'function') return;
    this._recorder.pause();
    this._accumulateSegment();
    this._status = 'paused';
    this._level = 0;
  }

  resume(): void {
    if (this._status !== 'paused' || !this._recorder) return;
    this._recorder.resume();
    this._segmentStartedAt = performance.now();
    this._status = 'recording';
  }

  /** Starts when idle, stops when recording or paused. */
  toggle(): void {
    if (this.isRecording) this.stop();
    else void this.start();
  }

  private _accumulateSegment(): void {
    if (this._status === 'recording' && this._segmentStartedAt) {
      this._accumulatedMs += performance.now() - this._segmentStartedAt;
      this._segmentStartedAt = 0;
    }
  }

  private _currentElapsedMs(): number {
    const running = this._status === 'recording' && this._segmentStartedAt
      ? performance.now() - this._segmentStartedAt
      : 0;
    return this._accumulatedMs + running;
  }

  private _startTicking(): void {
    this._stopTicking();
    this._tickTimer = setInterval(() => {
      const ms = this._currentElapsedMs();
      this._elapsedSeconds = Math.floor(ms / 1000);
      if (this.maxDuration > 0 && ms >= this.maxDuration * 1000) this.stop();
    }, 250);
  }

  private _stopTicking(): void {
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  private _startLevelMeter(stream: MediaStream): void {
    const Ctx: typeof AudioContext | undefined =
      (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!Ctx) return;
    try {
      this._audioContext = new Ctx();
      const source = this._audioContext.createMediaStreamSource(stream);
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = 512;
      source.connect(this._analyser);
      const buffer = new Uint8Array(this._analyser.fftSize);

      const loop = () => {
        if (!this._analyser) return;
        if (this._status === 'recording') {
          this._analyser.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const v = (buffer[i] - 128) / 128;
            sum += v * v;
          }
          // RMS scaled so normal speech fills a good part of the bar.
          this._level = Math.min(1, Math.sqrt(sum / buffer.length) * 3);
        }
        this._levelFrame = requestAnimationFrame(loop);
      };
      this._levelFrame = requestAnimationFrame(loop);
    } catch {
      // The level meter is cosmetic; recording works without it.
      this._stopLevelMeter();
    }
  }

  private _stopLevelMeter(): void {
    if (this._levelFrame) cancelAnimationFrame(this._levelFrame);
    this._levelFrame = 0;
    this._analyser = null;
    this._audioContext?.close().catch(() => {});
    this._audioContext = null;
    this._level = 0;
  }

  /** Releases the microphone, timers and audio graph. */
  private _teardownCapture(): void {
    this._stopTicking();
    this._stopLevelMeter();
    if (this._recorder) {
      this._recorder.ondataavailable = null;
      this._recorder.onstop = null;
      this._recorder.onerror = null;
      if (this._recorder.state !== 'inactive') {
        try {
          this._recorder.stop();
        } catch {
          /* already stopped */
        }
      }
      this._recorder = null;
    }
    this._stream?.getTracks().forEach((t) => t.stop());
    this._stream = null;
    this._status = 'idle';
  }

  private async _finalize(recorder: MediaRecorder): Promise<void> {
    const mimeType = recorder.mimeType || this._chunks[0]?.type || 'audio/webm';
    const blob = new Blob(this._chunks, { type: mimeType });
    const durationSeconds = Math.round(this._accumulatedMs / 100) / 10;
    this._chunks = [];

    // Release the microphone before the (possibly slow) storage write.
    this._stopLevelMeter();
    this._stream?.getTracks().forEach((t) => t.stop());
    this._stream = null;
    this._recorder = null;

    if (blob.size === 0) {
      this._status = 'idle';
      this._fail('Nenhum áudio foi capturado.');
      return;
    }

    const now = new Date();
    const recording: FzlAudioRecording = {
      id: createRecordingId(),
      name: defaultRecordingName(now),
      blob,
      mimeType,
      size: blob.size,
      durationSeconds,
      createdAt: now.getTime(),
    };

    await this.saveRecording(recording);
    this._status = 'idle';
    this._elapsedSeconds = 0;
  }

  // ---------------------------------------------------------------- storage

  /**
   * Emits `fzl-audio-captured` and, when `storage="indexeddb"`, persists the
   * recording and emits `fzl-audio-saved`. Resolves to `true` when persisted.
   * Also usable by hosts to store audio obtained elsewhere.
   */
  async saveRecording(recording: FzlAudioRecording): Promise<boolean> {
    this._emit('fzl-audio-captured', { recording });

    if (this.storage !== 'indexeddb') return false;
    const store = this._getStore();
    if (!store) {
      this._fail('IndexedDB não é suportado neste navegador; a gravação não foi salva.');
      return false;
    }

    try {
      await store.save(recording);
    } catch (err: any) {
      this._fail(
        err?.name === 'QuotaExceededError'
          ? 'Espaço de armazenamento do navegador esgotado; a gravação não foi salva.'
          : `Erro ao salvar a gravação no IndexedDB: ${err?.message || err}`
      );
      return false;
    }

    this._recordings = [recording, ...this._recordings.filter((r) => r.id !== recording.id)];
    this._emit('fzl-audio-saved', { recording });
    return true;
  }

  /** Reloads the recordings list from IndexedDB. */
  async refreshRecordings(): Promise<FzlAudioRecording[]> {
    const store = this._getStore();
    if (!store) {
      this._recordings = [];
      this._revokeAllObjectUrls();
      return [];
    }
    try {
      this._recordings = await store.list();
    } catch (err: any) {
      this._fail(`Erro ao ler as gravações do IndexedDB: ${err?.message || err}`);
      this._recordings = [];
    }
    this._pruneObjectUrls();
    return this.recordings;
  }

  /** Reads a single recording (with its Blob) from IndexedDB. */
  async getRecording(id: string): Promise<FzlAudioRecording | undefined> {
    return this._getStore()?.get(id);
  }

  async deleteRecording(id: string): Promise<void> {
    const store = this._getStore();
    if (!store) return;
    try {
      await store.delete(id);
    } catch (err: any) {
      this._fail(`Erro ao excluir a gravação: ${err?.message || err}`);
      return;
    }
    this._recordings = this._recordings.filter((r) => r.id !== id);
    this._pruneObjectUrls();
    this._emit('fzl-audio-deleted', { id });
  }

  /** Deletes every recording in this component's object store. */
  async clearRecordings(): Promise<void> {
    const store = this._getStore();
    if (!store) return;
    try {
      await store.clear();
    } catch (err: any) {
      this._fail(`Erro ao limpar as gravações: ${err?.message || err}`);
      return;
    }
    const ids = this._recordings.map((r) => r.id);
    this._recordings = [];
    this._revokeAllObjectUrls();
    ids.forEach((id) => this._emit('fzl-audio-deleted', { id }));
  }

  // ---------------------------------------------------------------- object URLs

  private _urlFor(recording: FzlAudioRecording): string {
    let url = this._objectUrls.get(recording.id);
    if (!url) {
      url = URL.createObjectURL(recording.blob);
      this._objectUrls.set(recording.id, url);
    }
    return url;
  }

  private _pruneObjectUrls(): void {
    const live = new Set(this._recordings.map((r) => r.id));
    for (const [id, url] of this._objectUrls) {
      if (!live.has(id)) {
        URL.revokeObjectURL(url);
        this._objectUrls.delete(id);
      }
    }
  }

  private _revokeAllObjectUrls(): void {
    this._objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this._objectUrls.clear();
  }

  private _download(recording: FzlAudioRecording): void {
    const a = document.createElement('a');
    a.href = this._urlFor(recording);
    a.download = `${recording.name.replace(/[\\/:*?"<>|]+/g, '-')}.${audioFileExtension(recording.mimeType)}`;
    a.rel = 'noopener';
    a.click();
  }

  // ---------------------------------------------------------------- render

  private _statusLabel() {
    switch (this._status) {
      case 'starting':
        return html`<span class="status">Aguardando permissão do microfone…</span>`;
      case 'recording':
        return html`<span class="status is-recording"><span class="rec-dot"></span>Gravando</span>`;
      case 'paused':
        return html`<span class="status">Pausado</span>`;
      case 'saving':
        return html`<span class="status">${this.storage === 'indexeddb' ? 'Salvando…' : 'Finalizando…'}</span>`;
      default:
        return html`<span class="status">Pronto para gravar</span>`;
    }
  }

  private _renderLibrary() {
    if (!this.showLibrary || this.storage !== 'indexeddb') return '';
    const busy = this.disabled;
    return html`
      <section class="library" part="library" aria-label="Gravações salvas">
        <div class="library-header">
          <span>Gravações salvas (${this._recordings.length})</span>
          ${this._recordings.length > 0
            ? html`
                <button
                  type="button"
                  class="btn-small danger"
                  ?disabled=${busy}
                  @click=${() => this.clearRecordings()}
                >
                  Excluir todas
                </button>
              `
            : ''}
        </div>
        ${this._recordings.length === 0
          ? html`<div class="library-empty">Nenhuma gravação salva neste navegador.</div>`
          : repeat(
              this._recordings,
              (r) => r.id,
              (r) => html`
                <div class="recording-item" data-id=${r.id}>
                  <div class="recording-top">
                    <div style="min-width: 0;">
                      <div class="recording-name" title=${r.name}>${r.name}</div>
                      <div class="recording-meta">
                        ${formatAudioDuration(r.durationSeconds)} · ${formatAudioSize(r.size)}
                      </div>
                    </div>
                    <div class="recording-actions">
                      <button
                        type="button"
                        class="btn-small"
                        aria-label="Baixar ${r.name}"
                        @click=${() => this._download(r)}
                      >
                        Baixar
                      </button>
                      <button
                        type="button"
                        class="btn-small danger"
                        aria-label="Excluir ${r.name}"
                        ?disabled=${busy}
                        @click=${() => this.deleteRecording(r.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <audio controls preload="metadata" src=${this._urlFor(r)}></audio>
                </div>
              `
            )}
      </section>
    `;
  }

  override render() {
    const recording = this.isRecording;
    const busy = this._status === 'starting' || this._status === 'saving';
    const limit = this.maxDuration > 0 ? html`<span class="timer-limit"> / ${formatAudioDuration(this.maxDuration)}</span>` : '';

    return html`
      <div class="audio-root" part="container">
        ${this._errorMessage
          ? html`<div class="error-bar" role="alert">${this._errorMessage}</div>`
          : ''}

        <div class="recorder" part="recorder">
          <div class="timer" role="timer" aria-live="off">
            ${formatAudioDuration(this._elapsedSeconds)}${limit}
          </div>
          <div aria-live="polite">${this._statusLabel()}</div>

          <div class="meter" part="meter" aria-hidden="true">
            <div class="meter-fill" style="width: ${Math.round(this._level * 100)}%"></div>
          </div>

          <div class="controls">
            ${recording
              ? html`
                  <button
                    type="button"
                    class="btn-round"
                    title=${this._status === 'paused' ? 'Retomar' : 'Pausar'}
                    aria-label=${this._status === 'paused' ? 'Retomar gravação' : 'Pausar gravação'}
                    @click=${() => (this._status === 'paused' ? this.resume() : this.pause())}
                  >
                    ${this._status === 'paused' ? '▶' : '❚❚'}
                  </button>
                `
              : ''}
            <button
              type="button"
              class="btn-record ${recording ? 'is-recording' : ''}"
              title=${recording ? 'Parar gravação' : 'Gravar áudio'}
              aria-label=${recording ? 'Parar gravação' : 'Gravar áudio'}
              ?disabled=${this.disabled || busy}
              @click=${this.toggle}
            >
              <div class="btn-record-inner"></div>
            </button>
          </div>

          <p class="hint">
            ${this.storage === 'indexeddb'
              ? 'As gravações são salvas automaticamente neste navegador (IndexedDB).'
              : 'As gravações não são armazenadas pelo componente.'}
          </p>
        </div>

        ${this._renderLibrary()}
      </div>
    `;
  }
}

export class FzlLitAudioCapture extends FzlAudioCapture {}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-audio-capture')) {
    customElements.define('fzl-audio-capture', FzlAudioCapture);
  }
  if (!customElements.get('fzl-lit-audio-capture')) {
    customElements.define('fzl-lit-audio-capture', FzlLitAudioCapture);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-audio-capture': FzlAudioCapture;
    'fzl-lit-audio-capture': FzlAudioCapture;
  }
}
