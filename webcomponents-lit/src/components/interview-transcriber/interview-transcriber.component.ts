import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  FzlRecordingState,
  FzlSavingState,
  FzlInterviewSaveEventDetail,
  FzlTranscriptionUpdateEventDetail,
  formatDuration,
  generateInterviewId,
} from './interview-transcriber.types';

export * from './interview-transcriber.types';

/**
 * Qualitative Interview Voice Transcriber Web Component.
 *
 * Records voice audio from microphone (MediaRecorder & Web Audio API),
 * produces real-time speech-to-text transcriptions (Web Speech API),
 * provides rich qualitative interview tools (speaker tags, timestamps,
 * field notes, audio review player) and sends the package (audio + transcript +
 * research metadata) to the backend.
 *
 * @customElement fzl-lit-interview-transcriber
 * @tag fzl-lit-interview-transcriber
 *
 * @fires {CustomEvent<FzlInterviewSaveEventDetail>} fzl-interview-save - Dispatched when saving the interview
 * @fires {CustomEvent<{ interviewId: string }>} fzl-interview-saved - Dispatched after successful backend save
 * @fires {CustomEvent<{ message: string; error?: any }>} fzl-interview-error - Dispatched on recording or save error
 * @fires {CustomEvent<{ state: FzlRecordingState }>} fzl-recording-state-change - Dispatched when recording state changes
 * @fires {CustomEvent<FzlTranscriptionUpdateEventDetail>} fzl-transcription-update - Dispatched when transcript changes
 */
export class FzlLitInterviewTranscriber extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text);
        box-sizing: border-box;
      }

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      .fzl-transcriber-container {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3);
        background-color: var(--_fzl-color-surface);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        padding: var(--_fzl-space-4);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      }

      /* Header & Metadata */
      .fzl-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2);
        border-bottom: 1px solid var(--_fzl-color-border);
        padding-bottom: var(--_fzl-space-2);
      }

      .fzl-title-group {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2);
      }

      .fzl-icon {
        font-size: 24px;
        line-height: 1;
      }

      .fzl-title {
        font-size: var(--_fzl-font-size-lg);
        font-weight: var(--_fzl-font-weight-semibold);
        margin: 0;
      }

      .fzl-badge-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--_fzl-radius-full);
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .fzl-badge-status.idle {
        background-color: var(--_fzl-color-surface-muted);
        color: var(--_fzl-color-text-muted);
      }

      .fzl-badge-status.recording {
        background-color: #fee2e2;
        color: var(--_fzl-color-danger);
        animation: pulse 1.5s infinite ease-in-out;
      }

      .fzl-badge-status.paused {
        background-color: #fef3c7;
        color: var(--_fzl-color-warning);
      }

      .fzl-badge-status.stopped {
        background-color: #dcfce7;
        color: var(--_fzl-color-success);
      }

      .fzl-rec-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: currentColor;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      /* Research Metadata Form */
      .fzl-metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--_fzl-space-3);
        background-color: var(--_fzl-color-surface-muted);
        padding: var(--_fzl-space-3);
        border-radius: var(--_fzl-radius-sm);
        border: 1px solid var(--_fzl-color-border);
      }

      .fzl-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .fzl-field label {
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        color: var(--_fzl-color-text-muted);
      }

      .fzl-field input,
      .fzl-field select {
        padding: 6px 10px;
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-sm);
        background-color: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm);
        outline: none;
        transition: border-color var(--_fzl-transition-fast);
      }

      .fzl-field input:focus,
      .fzl-field select:focus {
        border-color: var(--_fzl-color-primary);
        box-shadow: var(--_fzl-focus-ring);
      }

      /* Recording Console */
      .fzl-recording-console {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3);
        padding: var(--_fzl-space-3);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-sm);
        background-color: var(--_fzl-color-surface);
      }

      .fzl-console-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2);
      }

      .fzl-timer-display {
        font-family: monospace;
        font-size: var(--_fzl-font-size-xl, 24px);
        font-weight: bold;
        letter-spacing: 1px;
        color: var(--_fzl-color-text);
      }

      .fzl-timer-display.recording {
        color: var(--_fzl-color-danger);
      }

      /* VU Meter Level Bar */
      .fzl-vu-meter-container {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2);
        width: 100%;
      }

      .fzl-vu-meter-label {
        font-size: var(--_fzl-font-size-xs);
        color: var(--_fzl-color-text-muted);
        white-space: nowrap;
        min-width: 65px;
      }

      .fzl-vu-meter-track {
        flex-grow: 1;
        height: 8px;
        background-color: var(--_fzl-color-surface-muted);
        border-radius: var(--_fzl-radius-full);
        overflow: hidden;
        border: 1px solid var(--_fzl-color-border);
      }

      .fzl-vu-meter-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #22c55e 0%, #eab308 70%, #ef4444 100%);
        transition: width 0.08s ease-out;
      }

      /* Control Buttons */
      .fzl-controls-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2);
      }

      .fzl-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: var(--_fzl-radius-sm);
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm);
        font-weight: var(--_fzl-font-weight-medium);
        cursor: pointer;
        border: 1px solid transparent;
        transition: background-color var(--_fzl-transition-fast), border-color var(--_fzl-transition-fast), transform 0.05s;
        user-select: none;
      }

      .fzl-btn:active {
        transform: translateY(1px);
      }

      .fzl-btn:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
      }

      .fzl-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .fzl-btn-primary {
        background-color: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
      }
      .fzl-btn-primary:hover:not(:disabled) {
        background-color: var(--_fzl-color-primary-hover);
      }

      .fzl-btn-danger {
        background-color: var(--_fzl-color-danger);
        color: #ffffff;
      }
      .fzl-btn-danger:hover:not(:disabled) {
        background-color: #b91c1c;
      }

      .fzl-btn-warning {
        background-color: var(--_fzl-color-warning);
        color: #1f2937;
      }
      .fzl-btn-warning:hover:not(:disabled) {
        background-color: #d97706;
      }

      .fzl-btn-secondary {
        background-color: var(--_fzl-color-surface-muted);
        color: var(--_fzl-color-text);
        border-color: var(--_fzl-color-border);
      }
      .fzl-btn-secondary:hover:not(:disabled) {
        background-color: var(--_fzl-color-border);
      }

      .fzl-btn-outline {
        background-color: transparent;
        color: var(--_fzl-color-text);
        border-color: var(--_fzl-color-border);
      }
      .fzl-btn-outline:hover:not(:disabled) {
        background-color: var(--_fzl-color-surface-muted);
      }

      /* Audio Review Player */
      .fzl-audio-preview {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-2);
        padding: var(--_fzl-space-2);
        background-color: var(--_fzl-color-surface-muted);
        border-radius: var(--_fzl-radius-sm);
        border: 1px solid var(--_fzl-color-border);
      }

      .fzl-audio-preview audio {
        width: 100%;
        height: 38px;
        outline: none;
      }

      /* Transcript Workspace */
      .fzl-transcript-section {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-2);
      }

      .fzl-transcript-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2);
      }

      .fzl-qualitative-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      .fzl-tool-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: var(--_fzl-radius-sm);
        background-color: var(--_fzl-color-surface-muted);
        border: 1px solid var(--_fzl-color-border);
        color: var(--_fzl-color-text);
        font-size: var(--_fzl-font-size-xs);
        font-family: inherit;
        cursor: pointer;
        transition: all var(--_fzl-transition-fast);
      }

      .fzl-tool-chip:hover {
        background-color: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
        border-color: var(--_fzl-color-primary);
      }

      .fzl-textarea-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .fzl-transcript-textarea {
        width: 100%;
        min-height: 180px;
        padding: var(--_fzl-space-3);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-sm);
        background-color: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm);
        line-height: 1.6;
        resize: vertical;
        outline: none;
        transition: border-color var(--_fzl-transition-fast);
      }

      .fzl-transcript-textarea:focus {
        border-color: var(--_fzl-color-primary);
        box-shadow: var(--_fzl-focus-ring);
      }

      .fzl-interim-box {
        margin-top: 4px;
        padding: 6px 10px;
        background-color: #eff6ff;
        border: 1px dashed #60a5fa;
        border-radius: var(--_fzl-radius-sm);
        font-size: var(--_fzl-font-size-xs);
        color: #1e40af;
        font-style: italic;
      }

      .fzl-counts-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 2px;
        font-size: var(--_fzl-font-size-xs);
        color: var(--_fzl-color-text-muted);
      }

      /* Alert / Notifications */
      .fzl-alert {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2);
        padding: var(--_fzl-space-2) var(--_fzl-space-3);
        border-radius: var(--_fzl-radius-sm);
        font-size: var(--_fzl-font-size-xs);
      }

      .fzl-alert-warning {
        background-color: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
      }

      .fzl-alert-success {
        background-color: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }

      .fzl-alert-error {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      /* Save & Actions Bar */
      .fzl-save-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2);
        border-top: 1px solid var(--_fzl-color-border);
        padding-top: var(--_fzl-space-3);
      }

      .fzl-consent-box {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--_fzl-font-size-xs);
        color: var(--_fzl-color-text-muted);
      }

      .fzl-consent-box input[type="checkbox"] {
        cursor: pointer;
      }

      .fzl-actions-group {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2);
      }
    `,
  ];

  /** Unique qualitative interview identifier */
  @property({ type: String, attribute: 'interview-id' })
  interviewId: string = generateInterviewId();

  /** Participant / Informant Code or Pseudonym */
  @property({ type: String, attribute: 'participant-id' })
  participantId: string = 'P-01';

  /** Researcher / Interviewer identifier */
  @property({ type: String })
  interviewer: string = 'Pesquisador';

  /** Research Topic / Question / Guide Section */
  @property({ type: String })
  topic: string = 'Entrevista Qualitativa';

  /** Speech recognition language code */
  @property({ type: String })
  language: string = 'pt-BR';

  /** Automatically transcribe voice live while recording */
  @property({ type: Boolean, attribute: 'auto-transcribe' })
  autoTranscribe: boolean = true;

  /** Backend endpoint URL to POST results */
  @property({ type: String, attribute: 'save-url' })
  saveUrl: string = '';

  /** AppShell backend name (e.g. 'api') */
  @property({ type: String })
  backend: string = '';

  /** Qualitative ethics & consent confirmation flag */
  @property({ type: Boolean, attribute: 'consent-confirmed' })
  consentConfirmed: boolean = true;

  /** Allows raw audio and text download buttons */
  @property({ type: Boolean, attribute: 'allow-download' })
  allowDownload: boolean = true;

  /** Disables interactive recording and editing */
  @property({ type: Boolean, attribute: 'read-only' })
  readOnly: boolean = false;

  @state()
  recordingState: FzlRecordingState = 'idle';

  @state()
  savingState: FzlSavingState = 'idle';

  @state()
  elapsedSeconds: number = 0;

  @state()
  transcript: string = '';

  @state()
  interimTranscript: string = '';

  @state()
  audioLevel: number = 0;

  @state()
  audioBlob: Blob | null = null;

  @state()
  audioUrl: string | null = null;

  @state()
  statusMessage: string = '';

  @state()
  errorMessage: string = '';

  @state()
  isSpeechRecognitionSupported: boolean = false;

  @state()
  tags: string[] = ['pesquisa-qualitativa'];

  // Media & Web Audio internals
  private _mediaStream: MediaStream | null = null;
  private _mediaRecorder: MediaRecorder | null = null;
  private _audioChunks: Blob[] = [];
  private _audioContext: AudioContext | null = null;
  private _analyserNode: AnalyserNode | null = null;
  private _animFrameId: number | null = null;
  private _timerInterval: any = null;

  // Speech Recognition internals
  private _recognition: any = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._checkSpeechRecognitionSupport();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cleanupRecording();
    this._cleanupAudioUrl();
  }

  private _checkSpeechRecognitionSupport(): void {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.isSpeechRecognitionSupported = Boolean(SpeechRec);
  }

  /**
   * Starts recording voice and speech transcription.
   */
  async startRecording(): Promise<void> {
    if (this.readOnly || this.recordingState === 'recording') return;

    this.errorMessage = '';
    this.statusMessage = '';
    this._audioChunks = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sem suporte a gravação de áudio (getUserMedia).');
      }

      this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup Web Audio Analyser for VU Meter
      this._setupAudioAnalyser(this._mediaStream);

      // Setup MediaRecorder
      const mimeType = this._getSupportedMimeType();
      this._mediaRecorder = new MediaRecorder(this._mediaStream, mimeType ? { mimeType } : undefined);

      this._mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this._audioChunks.push(event.data);
        }
      };

      this._mediaRecorder.onstop = () => {
        const type = this._mediaRecorder?.mimeType || 'audio/webm';
        this.audioBlob = new Blob(this._audioChunks, { type });
        this._cleanupAudioUrl();
        this.audioUrl = URL.createObjectURL(this.audioBlob);
      };

      this._mediaRecorder.start(250); // Slice chunks every 250ms

      // Setup Speech Recognition
      if (this.autoTranscribe && this.isSpeechRecognitionSupported) {
        this._startSpeechRecognition();
      }

      // Start elapsed timer
      this.elapsedSeconds = 0;
      this._startTimer();

      this.recordingState = 'recording';
      this._dispatchStateChange();
    } catch (err: any) {
      console.error('[FzlInterviewTranscriber] Erro ao iniciar gravação:', err);
      this.errorMessage = err.message || 'Falha ao acessar o microfone.';
      this.recordingState = 'idle';
      this.dispatchEvent(
        new CustomEvent('fzl-interview-error', {
          bubbles: true,
          composed: true,
          detail: { message: this.errorMessage, error: err },
        })
      );
    }
  }

  /**
   * Pauses the active recording and speech transcription.
   */
  pauseRecording(): void {
    if (this.recordingState !== 'recording') return;

    if (this._mediaRecorder && this._mediaRecorder.state === 'recording') {
      this._mediaRecorder.pause();
    }

    if (this._recognition) {
      try {
        this._recognition.stop();
      } catch {}
    }

    this._stopTimer();
    this.audioLevel = 0;
    this.recordingState = 'paused';
    this._dispatchStateChange();
  }

  /**
   * Resumes a paused recording and speech transcription.
   */
  resumeRecording(): void {
    if (this.recordingState !== 'paused') return;

    if (this._mediaRecorder && this._mediaRecorder.state === 'paused') {
      this._mediaRecorder.resume();
    }

    if (this.autoTranscribe && this.isSpeechRecognitionSupported) {
      this._startSpeechRecognition();
    }

    this._startTimer();
    this.recordingState = 'recording';
    this._dispatchStateChange();
  }

  /**
   * Stops the recording, finalizes audio blob and stops mic streams.
   */
  stopRecording(): void {
    if (this.recordingState === 'idle' || this.recordingState === 'stopped') return;

    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }

    if (this._recognition) {
      try {
        this._recognition.stop();
      } catch {}
      this._recognition = null;
    }

    this._stopTimer();
    this._cleanupRecording();

    this.audioLevel = 0;
    this.recordingState = 'stopped';
    this._dispatchStateChange();
  }

  /**
   * Discards the recorded audio and resets state.
   */
  discardRecording(): void {
    this.stopRecording();
    this._cleanupAudioUrl();
    this.audioBlob = null;
    this.audioUrl = null;
    this.elapsedSeconds = 0;
    this.interimTranscript = '';
    this.recordingState = 'idle';
    this.savingState = 'idle';
    this.errorMessage = '';
    this.statusMessage = '';
    this._dispatchStateChange();
  }

  /**
   * Saves the interview (audio, transcript and metadata) to backend.
   */
  async saveToBackend(): Promise<void> {
    if (this.readOnly || this.savingState === 'saving') return;

    this.savingState = 'saving';
    this.errorMessage = '';
    this.statusMessage = 'Salvando entrevista no backend...';

    const payload: FzlInterviewSaveEventDetail = {
      interviewId: this.interviewId,
      participantId: this.participantId,
      interviewer: this.interviewer,
      topic: this.topic,
      language: this.language,
      durationSeconds: this.elapsedSeconds,
      transcript: this.transcript,
      tags: [...this.tags],
      recordedAt: new Date().toISOString(),
      consentConfirmed: this.consentConfirmed,
      audioBlob: this.audioBlob,
      audioUrl: this.audioUrl || undefined,
      audioMimeType: this.audioBlob?.type || 'audio/webm',
    };

    // Dispatches user-facing save event
    this.dispatchEvent(
      new CustomEvent<FzlInterviewSaveEventDetail>('fzl-interview-save', {
        bubbles: true,
        composed: true,
        detail: payload,
      })
    );

    try {
      // 1. Direct HTTP saveUrl if provided
      if (this.saveUrl) {
        const formData = new FormData();
        formData.append('interviewId', payload.interviewId);
        formData.append('participantId', payload.participantId);
        formData.append('interviewer', payload.interviewer);
        formData.append('topic', payload.topic);
        formData.append('language', payload.language);
        formData.append('durationSeconds', String(payload.durationSeconds));
        formData.append('transcript', payload.transcript);
        formData.append('tags', JSON.stringify(payload.tags));
        formData.append('recordedAt', payload.recordedAt);
        formData.append('consentConfirmed', String(payload.consentConfirmed));

        if (this.audioBlob) {
          const ext = this.audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
          formData.append('audio', this.audioBlob, `${payload.interviewId}.${ext}`);
        }

        const response = await fetch(this.saveUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Falha na resposta do servidor (${response.status}: ${response.statusText})`);
        }
      }

      // 2. AppShell backend service integration if window.fzlBackend is available
      if (this.backend && typeof (window as any).fzlBackend === 'function') {
        const backendClient = (window as any).fzlBackend(this.backend);
        if (backendClient && typeof backendClient.post === 'function') {
          await backendClient.post('/interviews', {
            ...payload,
            audioBlob: undefined, // Send transcript & metadata via JSON
          });
        }
      }

      this.savingState = 'saved';
      this.statusMessage = 'Entrevista salva com sucesso no backend!';

      this.dispatchEvent(
        new CustomEvent('fzl-interview-saved', {
          bubbles: true,
          composed: true,
          detail: { interviewId: this.interviewId },
        })
      );
    } catch (err: any) {
      console.error('[FzlInterviewTranscriber] Erro ao salvar:', err);
      this.savingState = 'error';
      this.errorMessage = err.message || 'Erro ao comunicar com o backend.';

      this.dispatchEvent(
        new CustomEvent('fzl-interview-error', {
          bubbles: true,
          composed: true,
          detail: { message: this.errorMessage, error: err },
        })
      );
    }
  }

  /**
   * Inserts qualitative annotation snippet at current cursor or appends to transcript.
   */
  insertQuickTag(snippet: string): void {
    const textarea = this.shadowRoot?.querySelector('textarea');
    if (!textarea) {
      this.transcript = this.transcript ? `${this.transcript}\n${snippet}` : snippet;
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = this.transcript || '';

    const updated = current.substring(0, start) + snippet + current.substring(end);
    this.transcript = updated;

    this.updateComplete.then(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    });

    this._dispatchTranscriptionUpdate(true);
  }

  /**
   * Downloads recorded audio file.
   */
  downloadAudio(): void {
    if (!this.audioBlob) return;
    const url = URL.createObjectURL(this.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = this.audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${this.interviewId}-${this.participantId}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Downloads transcript as text or JSON.
   */
  downloadTranscript(): void {
    const data = {
      interviewId: this.interviewId,
      participantId: this.participantId,
      interviewer: this.interviewer,
      topic: this.topic,
      duration: formatDuration(this.elapsedSeconds),
      recordedAt: new Date().toISOString(),
      tags: this.tags,
      transcript: this.transcript,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.interviewId}-${this.participantId}-transcricao.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private _startTimer(): void {
    this._stopTimer();
    this._timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
    }, 1000);
  }

  private _stopTimer(): void {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  private _setupAudioAnalyser(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this._audioContext = new AudioCtx();
      const source = this._audioContext.createMediaStreamSource(stream);
      this._analyserNode = this._audioContext.createAnalyser();
      this._analyserNode.fftSize = 256;
      source.connect(this._analyserNode);

      const bufferLength = this._analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (this.recordingState === 'recording' && this._analyserNode) {
          this._analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          // Normaliza para 0 a 100 com curva de sensibilidade
          this.audioLevel = Math.min(100, Math.round((average / 128) * 100));
          this._animFrameId = requestAnimationFrame(updateMeter);
        }
      };

      this._animFrameId = requestAnimationFrame(updateMeter);
    } catch (err) {
      console.warn('[FzlInterviewTranscriber] Analisador Web Audio indisponível:', err);
    }
  }

  private _startSpeechRecognition(): void {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this._recognition = new SpeechRec();
      this._recognition.continuous = true;
      this._recognition.interimResults = true;
      this._recognition.lang = this.language;

      this._recognition.onresult = (event: any) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalized += (finalized ? ' ' : '') + text.trim();
          } else {
            interim += text;
          }
        }

        if (finalized) {
          const prefix = this.transcript ? (this.transcript.endsWith('\n') ? '' : ' ') : '';
          this.transcript = `${this.transcript}${prefix}${finalized}`;
          this._dispatchTranscriptionUpdate(true);
        }

        this.interimTranscript = interim;
        this._dispatchTranscriptionUpdate(false);
      };

      this._recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('[FzlInterviewTranscriber] Erro SpeechRecognition:', event.error);
        }
      };

      this._recognition.onend = () => {
        // Reconnect if user is still recording
        if (this.recordingState === 'recording') {
          try {
            this._recognition?.start();
          } catch {}
        }
      };

      this._recognition.start();
    } catch (err) {
      console.warn('[FzlInterviewTranscriber] Falha ao iniciar reconhecimento:', err);
    }
  }

  private _cleanupRecording(): void {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }

    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach((track) => track.stop());
      this._mediaStream = null;
    }

    if (this._audioContext) {
      try {
        this._audioContext.close();
      } catch {}
      this._audioContext = null;
    }

    this._analyserNode = null;
  }

  private _cleanupAudioUrl(): void {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }

  private _getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  private _dispatchStateChange(): void {
    this.dispatchEvent(
      new CustomEvent('fzl-recording-state-change', {
        bubbles: true,
        composed: true,
        detail: { state: this.recordingState },
      })
    );
  }

  private _dispatchTranscriptionUpdate(isFinal: boolean): void {
    this.dispatchEvent(
      new CustomEvent<FzlTranscriptionUpdateEventDetail>('fzl-transcription-update', {
        bubbles: true,
        composed: true,
        detail: {
          transcript: this.transcript,
          interimTranscript: this.interimTranscript,
          isFinal,
        },
      })
    );
  }

  private _handleTranscriptInput(e: Event): void {
    this.transcript = (e.target as HTMLTextAreaElement).value;
    this._dispatchTranscriptionUpdate(true);
  }

  private _countWords(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }

  override render() {
    const wordCount = this._countWords(this.transcript);
    const charCount = this.transcript.length;
    const currentTimestamp = `[${formatDuration(this.elapsedSeconds)}]`;

    return html`
      <div class="fzl-transcriber-container" role="region" aria-label="Gravador e Transcritor de Entrevista Qualitativa">
        <!-- Header & Status -->
        <div class="fzl-section-header">
          <div class="fzl-title-group">
            <span class="fzl-icon" aria-hidden="true">🎙️</span>
            <div>
              <h3 class="fzl-title">Pesquisa Qualitativa: Gravador & Transcrição</h3>
              <small style="color: var(--_fzl-color-text-muted); font-size: var(--_fzl-font-size-xs);">
                Sessão: <strong>${this.interviewId}</strong>
              </small>
            </div>
          </div>

          <div class="fzl-badge-status ${this.recordingState}" role="status">
            <span class="fzl-rec-dot" aria-hidden="true"></span>
            <span>
              ${this.recordingState === 'idle'
                ? 'Pronto'
                : this.recordingState === 'recording'
                ? 'Gravando'
                : this.recordingState === 'paused'
                ? 'Pausado'
                : 'Concluído'}
            </span>
          </div>
        </div>

        <!-- Research Metadata Grid -->
        <div class="fzl-metadata-grid">
          <div class="fzl-field">
            <label for="fzl-participant">Participante / Informante:</label>
            <input
              id="fzl-participant"
              type="text"
              .value="${this.participantId}"
              ?disabled="${this.readOnly || this.recordingState === 'recording'}"
              @input="${(e: Event) => (this.participantId = (e.target as HTMLInputElement).value)}"
              placeholder="Ex: P-01 ou Pseudônimo"
            />
          </div>

          <div class="fzl-field">
            <label for="fzl-interviewer">Entrevistador / Pesquisador:</label>
            <input
              id="fzl-interviewer"
              type="text"
              .value="${this.interviewer}"
              ?disabled="${this.readOnly || this.recordingState === 'recording'}"
              @input="${(e: Event) => (this.interviewer = (e.target as HTMLInputElement).value)}"
              placeholder="Nome do pesquisador"
            />
          </div>

          <div class="fzl-field">
            <label for="fzl-topic">Tópico / Guia da Entrevista:</label>
            <input
              id="fzl-topic"
              type="text"
              .value="${this.topic}"
              ?disabled="${this.readOnly || this.recordingState === 'recording'}"
              @input="${(e: Event) => (this.topic = (e.target as HTMLInputElement).value)}"
              placeholder="Ex: Bloco 2: Percepção de Risco"
            />
          </div>

          <div class="fzl-field">
            <label for="fzl-language">Idioma da Transcrição:</label>
            <select
              id="fzl-language"
              .value="${this.language}"
              ?disabled="${this.readOnly || this.recordingState === 'recording'}"
              @change="${(e: Event) => (this.language = (e.target as HTMLSelectElement).value)}"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
              <option value="fr-FR">Français</option>
            </select>
          </div>
        </div>

        <!-- Recording Console & VU Meter -->
        <div class="fzl-recording-console">
          <div class="fzl-console-top">
            <div
              class="fzl-timer-display ${this.recordingState === 'recording' ? 'recording' : ''}"
              role="timer"
              aria-label="Tempo de gravação"
            >
              ⏱️ ${formatDuration(this.elapsedSeconds)}
            </div>

            <!-- Controls Bar -->
            <div class="fzl-controls-bar">
              ${this.recordingState === 'idle'
                ? html`
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-danger"
                      @click="${this.startRecording}"
                      ?disabled="${this.readOnly}"
                      aria-label="Iniciar Gravação"
                    >
                      <span aria-hidden="true">⏺</span> Iniciar Gravação
                    </button>
                  `
                : ''}
              ${this.recordingState === 'recording'
                ? html`
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-warning"
                      @click="${this.pauseRecording}"
                      aria-label="Pausar Gravação"
                    >
                      <span aria-hidden="true">⏸</span> Pausar
                    </button>
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-danger"
                      @click="${this.stopRecording}"
                      aria-label="Parar Gravação"
                    >
                      <span aria-hidden="true">⏹</span> Concluir
                    </button>
                  `
                : ''}
              ${this.recordingState === 'paused'
                ? html`
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-primary"
                      @click="${this.resumeRecording}"
                      aria-label="Retomar Gravação"
                    >
                      <span aria-hidden="true">▶</span> Retomar
                    </button>
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-danger"
                      @click="${this.stopRecording}"
                      aria-label="Parar Gravação"
                    >
                      <span aria-hidden="true">⏹</span> Concluir
                    </button>
                  `
                : ''}
              ${this.recordingState === 'stopped'
                ? html`
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-outline"
                      @click="${this.discardRecording}"
                      aria-label="Nova Gravação"
                    >
                      <span aria-hidden="true">🔄</span> Nova Sessão
                    </button>
                  `
                : ''}
            </div>
          </div>

          <!-- VU Meter (Volume indicator) -->
          <div class="fzl-vu-meter-container" aria-label="Indicador de nível de áudio">
            <span class="fzl-vu-meter-label">Nível de Voz:</span>
            <div class="fzl-vu-meter-track">
              <div
                class="fzl-vu-meter-fill"
                style="width: ${this.recordingState === 'recording' ? this.audioLevel : 0}%"
              ></div>
            </div>
          </div>

          <!-- Audio Preview Player (when stopped or audioBlob available) -->
          ${this.audioUrl
            ? html`
                <div class="fzl-audio-preview">
                  <small style="font-weight: 500;">Ouvir Gravação da Entrevista:</small>
                  <audio controls src="${this.audioUrl}"></audio>
                </div>
              `
            : ''}
        </div>

        <!-- Speech recognition fallback notification -->
        ${!this.isSpeechRecognitionSupported
          ? html`
              <div class="fzl-alert fzl-alert-warning" role="alert">
                <span>⚠️</span>
                <span>
                  Reconhecimento de fala no navegador não disponível neste ambiente. Você pode gravar o áudio e
                  enviá-lo ao backend para transcrição com Whisper/IA ou digitar suas notas manualmente abaixo.
                </span>
              </div>
            `
          : ''}

        <!-- Status & Error Alerts -->
        ${this.errorMessage
          ? html`
              <div class="fzl-alert fzl-alert-error" role="alert">
                <span>❌</span>
                <span>${this.errorMessage}</span>
              </div>
            `
          : ''}
        ${this.statusMessage && this.savingState === 'saved'
          ? html`
              <div class="fzl-alert fzl-alert-success" role="alert">
                <span>✅</span>
                <span>${this.statusMessage}</span>
              </div>
            `
          : ''}

        <!-- Transcript Workspace -->
        <div class="fzl-transcript-section">
          <div class="fzl-transcript-header">
            <label for="fzl-transcript-area" style="font-weight: 600; font-size: var(--_fzl-font-size-sm);">
              Transcrição & Notas Qualitativas:
            </label>

            <!-- Qualitative Annotation Toolbar -->
            <div class="fzl-qualitative-toolbar" role="toolbar" aria-label="Anotações Qualitativas Rápidas">
              <button
                type="button"
                class="fzl-tool-chip"
                @click="${() => this.insertQuickTag(`\n${currentTimestamp} `)}"
                title="Inserir Carimbo de Tempo"
              >
                ⏱️ Timestamp
              </button>
              <button
                type="button"
                class="fzl-tool-chip"
                @click="${() => this.insertQuickTag('\n[Entrevistador]: ')}"
                title="Identificar fala do entrevistador"
              >
                👤 [Entrevistador]
              </button>
              <button
                type="button"
                class="fzl-tool-chip"
                @click="${() => this.insertQuickTag(`\n[${this.participantId}]: `)}"
                title="Identificar fala do participante"
              >
                🗣️ [${this.participantId}]
              </button>
              <button
                type="button"
                class="fzl-tool-chip"
                @click="${() => this.insertQuickTag('\n[Nota do Pesquisador: ]')}"
                title="Inserir Nota de Campo Qualitativa"
              >
                📝 [Nota]
              </button>
            </div>
          </div>

          <div class="fzl-textarea-wrapper">
            <textarea
              id="fzl-transcript-area"
              class="fzl-transcript-textarea"
              .value="${this.transcript}"
              ?disabled="${this.readOnly}"
              @input="${this._handleTranscriptInput}"
              placeholder="A transcrição em tempo real aparecerá aqui conforme a entrevista for realizada, ou você pode redigir/ajustar o texto qualitativo livremente..."
            ></textarea>

            <!-- Live interim speech recognition preview -->
            ${this.interimTranscript
              ? html`
                  <div class="fzl-interim-box" aria-live="polite">
                    <strong>Captando fala:</strong> ${this.interimTranscript}...
                  </div>
                `
              : ''}
          </div>

          <div class="fzl-counts-bar">
            <span>
              Palavras: <strong>${wordCount}</strong> | Caracteres: <strong>${charCount}</strong>
            </span>
            <div style="display: flex; gap: 8px;">
              ${this.allowDownload && this.audioBlob
                ? html`
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-outline"
                      style="padding: 4px 8px; font-size: 11px;"
                      @click="${this.downloadAudio}"
                    >
                      💾 Baixar Áudio (.webm)
                    </button>
                  `
                : ''}
              ${this.allowDownload && (this.transcript || this.audioBlob)
                ? html`
                    <button
                      type="button"
                      class="fzl-btn fzl-btn-outline"
                      style="padding: 4px 8px; font-size: 11px;"
                      @click="${this.downloadTranscript}"
                    >
                      📄 Exportar JSON/Notas
                    </button>
                  `
                : ''}
            </div>
          </div>
        </div>

        <!-- Footer / Save Bar -->
        <div class="fzl-save-bar">
          <label class="fzl-consent-box">
            <input
              type="checkbox"
              .checked="${this.consentConfirmed}"
              ?disabled="${this.readOnly}"
              @change="${(e: Event) => (this.consentConfirmed = (e.target as HTMLInputElement).checked)}"
            />
            <span>Termo de Consentimento Livre e Esclarecido (TCLE) confirmado</span>
          </label>

          <div class="fzl-actions-group">
            <button
              type="button"
              class="fzl-btn fzl-btn-primary"
              @click="${this.saveToBackend}"
              ?disabled="${this.readOnly || this.savingState === 'saving' || !this.consentConfirmed}"
              aria-label="Salvar Entrevista no Backend"
            >
              ${this.savingState === 'saving'
                ? html`<span>⏳ Salvando...</span>`
                : html`<span>💾 Salvar no Backend</span>`}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Register custom elements (primary and alias)
if (!customElements.get('fzl-lit-interview-transcriber')) {
  customElements.define('fzl-lit-interview-transcriber', FzlLitInterviewTranscriber);
}
if (!customElements.get('fzl-lit-voice-transcriber')) {
  customElements.define('fzl-lit-voice-transcriber', class extends FzlLitInterviewTranscriber {});
}
