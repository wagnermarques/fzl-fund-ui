import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  FzlCameraMode,
  FzlCameraFacing,
  FzlCaptureOverlay,
  FzlCapturedPhoto,
  FzlCapturedVideo,
  isMediaDevicesSupported,
  formatCameraDuration,
} from './camera-capture.types';

export * from './camera-capture.types';

/**
 * Mobile-first Camera, Photo and Video Capture Web Component (`fzl-camera-capture`).
 *
 * Provides a native-like mobile camera viewfinder with live streaming, camera flipping
 * (front/rear), torch/flashlight support, document/face framing guidelines,
 * high-resolution photo snapshots via HTML5 Canvas, and video recording with MediaRecorder,
 * complete with fallback to HTML5 Media Capture.
 *
 * @customElement fzl-camera-capture
 * @tag fzl-camera-capture
 *
 * @attr {'both' | 'photo' | 'video'} [mode='both'] - Capture mode
 * @attr {'user' | 'environment'} [facing-mode='environment'] - Initial camera direction
 * @attr {'none' | 'document' | 'face'} [overlay='none'] - Framing overlay guide
 * @attr {number} [max-video-duration=60] - Max recording duration in seconds
 * @attr {number} [image-quality=0.92] - JPEG/WebP compression quality (0.1 to 1.0)
 * @attr {'image/jpeg' | 'image/webp' | 'image/png'} [image-format='image/jpeg'] - Photo MIME type
 * @attr {boolean} [allow-torch=true] - Whether to allow flashlight/torch control
 * @attr {boolean} [allow-flip=true] - Whether to allow switching cameras
 * @attr {number} [countdown=0] - Photo countdown timer in seconds (0 = instant)
 * @attr {boolean} [disabled=false] - Disables interactions
 *
 * @fires {CustomEvent<{ photo: FzlCapturedPhoto }>} fzl-capture-photo - Dispatched when a photo is confirmed
 * @fires {CustomEvent<{ video: FzlCapturedVideo }>} fzl-capture-video - Dispatched when a video recording is confirmed
 * @fires {CustomEvent<{ stream: MediaStream; facingMode: string }>} fzl-camera-ready - Dispatched when camera stream begins
 * @fires {CustomEvent<{ error: string }>} fzl-camera-error - Dispatched when camera access fails
 * @fires {CustomEvent<void>} fzl-camera-stop - Dispatched when camera stream is closed
 *
 * @csspart container - The outer root container
 * @csspart viewfinder - The camera video stream container
 * @csspart controls - The bottom shutter and control buttons bar
 * @csspart review - The review screen container
 */
export class FzlCameraCapture extends FzlWidgetMixin(LitElement) {
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

      .camera-root {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #000000;
        border-radius: var(--_fzl-radius-lg, 12px);
        overflow: hidden;
        position: relative;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        user-select: none;
      }

      /* Viewfinder Area */
      .viewfinder-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 3;
        background: #090d16;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      video.viewfinder {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Mirror user camera for natural selfie experience */
      video.viewfinder.is-user {
        transform: scaleX(-1);
      }

      /* Framing Overlays */
      .overlay-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .overlay-document {
        width: 82%;
        height: 72%;
        border: 2px dashed rgba(255, 255, 255, 0.85);
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
        position: relative;
      }

      .overlay-document-label {
        position: absolute;
        bottom: -28px;
        left: 0;
        right: 0;
        text-align: center;
        color: #ffffff;
        font-size: 0.775rem;
        font-weight: 500;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      }

      .overlay-face {
        width: 58%;
        height: 78%;
        border: 2px dashed rgba(56, 189, 248, 0.9);
        border-radius: 50% / 60%;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
        position: relative;
      }

      .overlay-face-label {
        position: absolute;
        bottom: -28px;
        left: 0;
        right: 0;
        text-align: center;
        color: #ffffff;
        font-size: 0.775rem;
        font-weight: 500;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      }

      /* Top Bar */
      .top-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.75), transparent);
        z-index: 10;
      }

      .top-tools {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .icon-btn {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
        border: none;
        color: #ffffff;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background 150ms ease, transform 150ms ease;
      }

      .icon-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.35);
        transform: scale(1.05);
      }

      .icon-btn.is-active {
        background: #f59e0b;
        color: #000000;
      }

      .icon-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .recording-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(239, 68, 68, 0.85);
        color: #ffffff;
        padding: 4px 10px;
        border-radius: 14px;
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .rec-dot {
        width: 10px;
        height: 10px;
        background: #ffffff;
        border-radius: 50%;
        animation: recBlink 1s infinite;
      }

      @keyframes recBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }

      .countdown-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 6rem;
        font-weight: 700;
        color: #ffffff;
        text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
        z-index: 15;
      }

      /* Bottom Bar */
      .bottom-bar {
        padding: 16px;
        background: #000000;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        z-index: 10;
      }

      .mode-switcher {
        display: flex;
        background: rgba(255, 255, 255, 0.15);
        padding: 2px;
        border-radius: 20px;
      }

      .mode-tab {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.75);
        padding: 4px 14px;
        border-radius: 16px;
        font-size: 0.775rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms;
      }

      .mode-tab.active {
        background: #ffffff;
        color: #0f172a;
      }

      .shutter-controls {
        display: flex;
        align-items: center;
        justify-content: space-around;
        width: 100%;
      }

      /* Shutter Buttons */
      .shutter-btn-photo {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 4px solid #ffffff;
        background: transparent;
        padding: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 150ms ease;
      }

      .shutter-btn-photo:hover:not(:disabled) {
        transform: scale(1.06);
      }

      .shutter-btn-photo-inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: #ffffff;
        transition: transform 100ms;
      }

      .shutter-btn-photo:active .shutter-btn-photo-inner {
        transform: scale(0.9);
      }

      .shutter-btn-video {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 4px solid #ffffff;
        background: transparent;
        padding: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 150ms ease;
      }

      .shutter-btn-video:hover:not(:disabled) {
        transform: scale(1.06);
      }

      .shutter-btn-video-inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: #ef4444;
        transition: all 200ms ease;
      }

      .shutter-btn-video.is-recording .shutter-btn-video-inner {
        width: 50%;
        height: 50%;
        border-radius: 4px;
      }

      /* Fallback View */
      .fallback-card {
        padding: 32px 20px;
        background: #1e293b;
        color: #ffffff;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }

      .fallback-icon {
        font-size: 3rem;
      }

      .fallback-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
      }

      .fallback-desc {
        font-size: 0.85rem;
        color: #94a3b8;
        max-width: 380px;
        line-height: 1.4;
      }

      .btn-upload {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        background: #0284c7;
        color: #ffffff;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        border: none;
        transition: background 150ms;
      }

      .btn-upload:hover {
        background: #0369a1;
      }

      /* Review Screen */
      .review-screen {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 3;
        background: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .review-media {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .review-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: #0f172a;
        gap: 12px;
      }

      .btn-review {
        flex: 1;
        padding: 10px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: none;
        transition: all 150ms;
      }

      .btn-review-discard {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }

      .btn-review-discard:hover {
        background: rgba(239, 68, 68, 0.35);
        color: #fca5a5;
      }

      .btn-review-confirm {
        background: #10b981;
        color: #ffffff;
      }

      .btn-review-confirm:hover {
        background: #059669;
      }

      .error-bar {
        padding: 8px 12px;
        background: #ef4444;
        color: #ffffff;
        font-size: 0.775rem;
        text-align: center;
      }
    `,
  ];

  @property({ type: String }) mode: FzlCameraMode = 'both';
  @property({ type: String, attribute: 'facing-mode' }) facingMode: FzlCameraFacing = 'environment';
  @property({ type: String }) overlay: FzlCaptureOverlay = 'none';
  @property({ type: Number, attribute: 'max-video-duration' }) maxVideoDuration: number = 60;
  @property({ type: Number, attribute: 'image-quality' }) imageQuality: number = 0.92;
  @property({ type: String, attribute: 'image-format' }) imageFormat: 'image/jpeg' | 'image/webp' | 'image/png' = 'image/jpeg';
  @property({ type: Boolean, attribute: 'allow-torch' }) allowTorch: boolean = true;
  @property({ type: Boolean, attribute: 'allow-flip' }) allowFlip: boolean = true;
  @property({ type: Number }) countdown: number = 0;
  @property({ type: Boolean }) disabled: boolean = false;

  @state() private _isStreaming = false;
  @state() private _currentFacing: FzlCameraFacing = 'environment';
  @state() private _activeMode: 'photo' | 'video' = 'photo';
  @state() private _hasTorch = false;
  @state() private _isTorchOn = false;
  @state() private _isRecording = false;
  @state() private _recordingSeconds = 0;
  @state() private _countdownActive: number | null = null;
  @state() private _previewPhoto: FzlCapturedPhoto | null = null;
  @state() private _previewVideo: FzlCapturedVideo | null = null;
  @state() private _errorMessage = '';

  @query('video.viewfinder') private _videoEl?: HTMLVideoElement;

  private _stream: MediaStream | null = null;
  private _mediaRecorder: MediaRecorder | null = null;
  private _recordedChunks: Blob[] = [];
  private _recordTimer: any = null;
  private _countdownTimer: any = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._currentFacing = this.facingMode;
    this._activeMode = this.mode === 'video' ? 'video' : 'photo';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopStream();
    this._clearTimers();
  }

  private _clearTimers(): void {
    if (this._recordTimer) {
      clearInterval(this._recordTimer);
      this._recordTimer = null;
    }
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  /**
   * Starts the camera stream.
   */
  async startCamera(): Promise<void> {
    if (this.disabled) return;
    this._errorMessage = '';

    if (!isMediaDevicesSupported()) {
      this._errorMessage = 'Acesso à câmera não suportado neste navegador.';
      return;
    }

    this._stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: this._currentFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: this.mode === 'video' || this.mode === 'both',
      };

      this._stream = await navigator.mediaDevices.getUserMedia(constraints);
      this._isStreaming = true;

      // Check for torch capability
      const videoTrack = this._stream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any).getCapabilities === 'function') {
        const caps = (videoTrack as any).getCapabilities();
        this._hasTorch = Boolean(caps?.torch);
      } else {
        this._hasTorch = false;
      }

      await this.updateComplete;

      if (this._videoEl) {
        this._videoEl.srcObject = this._stream;
        await this._videoEl.play().catch(() => {});
      }

      this.dispatchEvent(
        new CustomEvent('fzl-camera-ready', {
          bubbles: true,
          composed: true,
          detail: { stream: this._stream, facingMode: this._currentFacing },
        })
      );
    } catch (err: any) {
      this._errorMessage =
        err?.name === 'NotAllowedError'
          ? 'Permissão de câmera negada pelo usuário.'
          : `Não foi possível iniciar a câmera: ${err?.message || err}`;
      this._isStreaming = false;

      this.dispatchEvent(
        new CustomEvent('fzl-camera-error', {
          bubbles: true,
          composed: true,
          detail: { error: this._errorMessage },
        })
      );
    }
  }

  private _stopStream(): void {
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
    }
    this._isStreaming = false;
    this._isTorchOn = false;
    this._clearTimers();

    this.dispatchEvent(
      new CustomEvent('fzl-camera-stop', {
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Flips between front and rear cameras.
   */
  async flipCamera(): Promise<void> {
    if (!this.allowFlip || this._isRecording) return;
    this._currentFacing = this._currentFacing === 'user' ? 'environment' : 'user';
    if (this._isStreaming) {
      await this.startCamera();
    }
  }

  /**
   * Toggles flashlight / torch if supported.
   */
  async toggleTorch(): Promise<void> {
    if (!this._stream || !this._hasTorch) return;
    const track = this._stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !this._isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      this._isTorchOn = nextTorch;
    } catch (err) {
      console.warn('[FzlCameraCapture] Torch applyConstraints error:', err);
    }
  }

  /**
   * Triggers a photo capture with optional countdown.
   */
  takePhoto(): void {
    if (!this._isStreaming || this._isRecording) return;

    if (this.countdown > 0) {
      this._countdownActive = this.countdown;
      this._countdownTimer = setInterval(() => {
        if (this._countdownActive && this._countdownActive > 1) {
          this._countdownActive--;
        } else {
          clearInterval(this._countdownTimer);
          this._countdownTimer = null;
          this._countdownActive = null;
          this._captureSnapshot();
        }
      }, 1000);
    } else {
      this._captureSnapshot();
    }
  }

  private _captureSnapshot(): void {
    if (!this._videoEl) return;
    const video = this._videoEl;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle selfie mirror flip
    if (this._currentFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL(this.imageFormat, this.imageQuality);
        this._previewPhoto = {
          blob,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          facingMode: this._currentFacing,
          timestamp: Date.now(),
        };
      },
      this.imageFormat,
      this.imageQuality
    );
  }

  /**
   * Starts or stops video recording via MediaRecorder.
   */
  toggleRecordVideo(): void {
    if (this._isRecording) {
      this._stopRecording();
    } else {
      this._startRecording();
    }
  }

  private _startRecording(): void {
    if (!this._stream) return;
    this._recordedChunks = [];
    this._recordingSeconds = 0;

    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    try {
      this._mediaRecorder = new MediaRecorder(this._stream, selectedMime ? { mimeType: selectedMime } : undefined);

      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this._recordedChunks.push(e.data);
        }
      };

      this._mediaRecorder.onstop = () => {
        const mimeType = this._mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this._recordedChunks, { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);

        this._previewVideo = {
          blob,
          objectUrl,
          durationSeconds: this._recordingSeconds,
          mimeType,
          timestamp: Date.now(),
        };
        this._isRecording = false;
        this._clearTimers();
      };

      this._mediaRecorder.start(1000);
      this._isRecording = true;

      this._recordTimer = setInterval(() => {
        this._recordingSeconds++;
        if (this._recordingSeconds >= this.maxVideoDuration) {
          this._stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      this._errorMessage = `Erro ao iniciar gravação de vídeo: ${err?.message || err}`;
    }
  }

  private _stopRecording(): void {
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }
    this._isRecording = false;
  }

  private _discardReview(): void {
    if (this._previewVideo?.objectUrl) {
      URL.revokeObjectURL(this._previewVideo.objectUrl);
    }
    this._previewPhoto = null;
    this._previewVideo = null;
  }

  private _confirmPhoto(): void {
    if (!this._previewPhoto) return;
    this.dispatchEvent(
      new CustomEvent('fzl-capture-photo', {
        bubbles: true,
        composed: true,
        detail: { photo: this._previewPhoto },
      })
    );
    this._discardReview();
  }

  private _confirmVideo(): void {
    if (!this._previewVideo) return;
    this.dispatchEvent(
      new CustomEvent('fzl-capture-video', {
        bubbles: true,
        composed: true,
        detail: { video: this._previewVideo },
      })
    );
    this._discardReview();
  }

  private async _handleFallbackFile(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.type.startsWith('image/')) {
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });

      this._previewPhoto = {
        blob: file,
        dataUrl,
        width: 0,
        height: 0,
        facingMode: this._currentFacing,
        timestamp: Date.now(),
      };
    } else if (file.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(file);
      this._previewVideo = {
        blob: file,
        objectUrl,
        durationSeconds: 0,
        mimeType: file.type,
        timestamp: Date.now(),
      };
    }
  }

  override render() {
    return html`
      <div class="camera-root" part="container">
        ${this._errorMessage ? html`<div class="error-bar">${this._errorMessage}</div>` : ''}

        <!-- 1. Review Screen -->
        ${this._previewPhoto || this._previewVideo
          ? html`
              <div class="review-screen" part="review">
                ${this._previewPhoto
                  ? html`
                      <img
                        class="review-media"
                        src="${this._previewPhoto.dataUrl}"
                        alt="Foto capturada"
                      />
                    `
                  : ''}
                ${this._previewVideo
                  ? html`
                      <video
                        class="review-media"
                        src="${this._previewVideo.objectUrl}"
                        controls
                        playsinline
                      ></video>
                    `
                  : ''}
              </div>

              <div class="review-actions">
                <button
                  type="button"
                  class="btn-review btn-review-discard"
                  @click=${this._discardReview}
                >
                  🗑️ Descartar / Repetir
                </button>
                <button
                  type="button"
                  class="btn-review btn-review-confirm"
                  @click=${this._previewPhoto ? this._confirmPhoto : this._confirmVideo}
                >
                  ✓ Confirmar Captura
                </button>
              </div>
            `
          : this._isStreaming
          ? html`
              <!-- 2. Live Viewfinder -->
              <div class="viewfinder-wrapper" part="viewfinder">
                <video
                  class="viewfinder ${this._currentFacing === 'user' ? 'is-user' : ''}"
                  autoplay
                  playsinline
                  muted
                ></video>

                <!-- Framing Overlay -->
                ${this.overlay === 'document'
                  ? html`
                      <div class="overlay-layer">
                        <div class="overlay-document">
                          <span class="overlay-document-label">Enquadre o documento aqui</span>
                        </div>
                      </div>
                    `
                  : ''}
                ${this.overlay === 'face'
                  ? html`
                      <div class="overlay-layer">
                        <div class="overlay-face">
                          <span class="overlay-face-label">Posicione seu rosto aqui</span>
                        </div>
                      </div>
                    `
                  : ''}

                <!-- Top Control Bar -->
                <div class="top-bar">
                  <div class="top-tools">
                    ${this.allowFlip
                      ? html`
                          <button
                            type="button"
                            class="icon-btn"
                            title="Alternar Câmera (Frontal / Traseira)"
                            aria-label="Alternar Câmera"
                            ?disabled=${this._isRecording}
                            @click=${this.flipCamera}
                          >
                            🔄
                          </button>
                        `
                      : ''}
                    ${this._hasTorch && this.allowTorch
                      ? html`
                          <button
                            type="button"
                            class="icon-btn ${this._isTorchOn ? 'is-active' : ''}"
                            title="Ligar/Desligar Lanterna"
                            aria-label="Ligar/Desligar Lanterna"
                            @click=${this.toggleTorch}
                          >
                            🔦
                          </button>
                        `
                      : ''}
                  </div>

                  ${this._isRecording
                    ? html`
                        <div class="recording-badge">
                          <span class="rec-dot"></span>
                          REC ${formatCameraDuration(this._recordingSeconds)} / ${formatCameraDuration(this.maxVideoDuration)}
                        </div>
                      `
                    : ''}

                  <button
                    type="button"
                    class="icon-btn"
                    title="Fechar Câmera"
                    aria-label="Fechar Câmera"
                    @click=${this._stopStream}
                  >
                    ✕
                  </button>
                </div>

                <!-- Countdown Overlay -->
                ${this._countdownActive !== null
                  ? html`<div class="countdown-overlay">${this._countdownActive}</div>`
                  : ''}
              </div>

              <!-- Bottom Bar & Shutter -->
              <div class="bottom-bar" part="controls">
                ${this.mode === 'both'
                  ? html`
                      <div class="mode-switcher">
                        <button
                          type="button"
                          class="mode-tab ${this._activeMode === 'photo' ? 'active' : ''}"
                          ?disabled=${this._isRecording}
                          @click=${() => {
                            this._activeMode = 'photo';
                          }}
                        >
                          📷 Foto
                        </button>
                        <button
                          type="button"
                          class="mode-tab ${this._activeMode === 'video' ? 'active' : ''}"
                          ?disabled=${this._isRecording}
                          @click=${() => {
                            this._activeMode = 'video';
                          }}
                        >
                          🎥 Vídeo
                        </button>
                      </div>
                    `
                  : ''}

                <div class="shutter-controls">
                  ${this._activeMode === 'photo'
                    ? html`
                        <button
                          type="button"
                          class="shutter-btn-photo"
                          aria-label="Tirar Foto"
                          title="Tirar Foto"
                          @click=${this.takePhoto}
                        >
                          <div class="shutter-btn-photo-inner"></div>
                        </button>
                      `
                    : html`
                        <button
                          type="button"
                          class="shutter-btn-video ${this._isRecording ? 'is-recording' : ''}"
                          aria-label="${this._isRecording ? 'Parar Gravação' : 'Gravar Vídeo'}"
                          title="${this._isRecording ? 'Parar Gravação' : 'Gravar Vídeo'}"
                          @click=${this.toggleRecordVideo}
                        >
                          <div class="shutter-btn-video-inner"></div>
                        </button>
                      `}
                </div>
              </div>
            `
          : html`
              <!-- 3. Idle / Start / Fallback Card -->
              <div class="fallback-card">
                <span class="fallback-icon">📷</span>
                <h3 class="fallback-title">Câmera e Captura de Mídia</h3>
                <p class="fallback-desc">
                  Capture fotos em alta resolução ou grave vídeos diretamente com a câmera do seu celular ou computador.
                </p>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                  <button
                    type="button"
                    class="btn-upload"
                    @click=${this.startCamera}
                    ?disabled=${this.disabled}
                  >
                    <span>▶</span> Iniciar Câmera
                  </button>

                  <button
                    type="button"
                    class="btn-upload"
                    style="background: #334155;"
                    @click=${() => {
                      this.shadowRoot?.getElementById('fileFallbackInput')?.click();
                    }}
                    ?disabled=${this.disabled}
                  >
                    <span>📁</span> Selecionar Arquivo
                  </button>
                </div>

                <input
                  type="file"
                  id="fileFallbackInput"
                  accept="${this.mode === 'photo'
                    ? 'image/*'
                    : this.mode === 'video'
                    ? 'video/*'
                    : 'image/*,video/*'}"
                  capture="${this.facingMode === 'user' ? 'user' : 'environment'}"
                  style="display: none;"
                  @change=${(e: Event) => {
                    this._handleFallbackFile((e.target as HTMLInputElement).files);
                  }}
                />
              </div>
            `}
      </div>
    `;
  }
}

export class FzlLitCameraCapture extends FzlCameraCapture {}

// Register both custom elements
if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-camera-capture')) {
    customElements.define('fzl-camera-capture', FzlCameraCapture);
  }
  if (!customElements.get('fzl-lit-camera-capture')) {
    customElements.define('fzl-lit-camera-capture', FzlLitCameraCapture);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-camera-capture': FzlCameraCapture;
    'fzl-lit-camera-capture': FzlCameraCapture;
  }
}
