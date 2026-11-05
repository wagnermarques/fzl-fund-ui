import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

export interface FzlAvatarChangeEventDetail {
  /** Base64 Data URL of the cropped image */
  dataUrl: string;
  /** Binary Blob of the cropped image for multipart/form-data upload */
  blob: Blob | null;
  /** The original File selected by the user */
  file: File | null;
  /** User name associated with the avatar */
  name: string;
}

export interface FzlAvatarErrorEventDetail {
  error: 'file-too-large' | 'invalid-type' | 'read-error';
  message: string;
  file?: File;
}

/**
 * Reactive Lit-based Avatar Upload & Circular Crop Web Component.
 *
 * Provides a round avatar preview with drag-and-drop, file picker,
 * and an interactive circular crop modal (pan, zoom, rotation) that
 * generates both Data URL and Blob outputs for backend integration.
 *
 * @customElement fzl-lit-avatar-upload
 * @tag fzl-lit-avatar-upload
 *
 * @fires {CustomEvent<FzlAvatarChangeEventDetail>} fzl-avatar-change - Dispatched when the user crops and applies a new avatar
 * @fires {CustomEvent<void>} fzl-avatar-remove - Dispatched when the user removes their avatar
 * @fires {CustomEvent<FzlAvatarErrorEventDetail>} fzl-avatar-error - Dispatched when validation fails (size, type)
 * @fires {CustomEvent<{ widgetId: string; originalEvent: FocusEvent }>} fzl-focus - Dispatched when the widget gains focus
 * @fires {CustomEvent<{ widgetId: string; originalEvent: FocusEvent }>} fzl-blur - Dispatched when the widget loses focus
 *
 * @csspart container - The root container
 * @csspart avatar - The circular avatar trigger element
 * @csspart image - The cropped avatar image element
 * @csspart badge - The camera badge icon overlay
 * @csspart modal - The crop modal overlay
 * @csspart dialog - The modal dialog box
 * @csspart actions - The action buttons below the avatar
 */
export class FzlLitAvatarUpload extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: inline-block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text);
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .fzl-avatar-upload-root {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--_fzl-space-3);
      }

      /* Avatar Trigger */
      .avatar-trigger {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        cursor: pointer;
        outline: none;
        user-select: none;
        background-color: var(--_fzl-color-surface-muted);
        border: 2px dashed var(--_fzl-color-border);
        transition: border-color var(--_fzl-transition-fast), transform var(--_fzl-transition-fast), box-shadow var(--_fzl-transition-fast);
        overflow: visible;
      }

      .avatar-trigger:hover:not(.is-disabled):not(.is-readonly) {
        border-color: var(--_fzl-color-primary);
        transform: scale(1.02);
      }

      .avatar-trigger:focus-visible {
        box-shadow: var(--_fzl-focus-ring);
        border-color: var(--_fzl-color-primary);
      }

      .avatar-trigger.is-dragover {
        border-color: var(--_fzl-color-primary);
        border-style: solid;
        background-color: rgba(29, 78, 216, 0.08);
      }

      .avatar-trigger.is-disabled {
        cursor: not-allowed;
        opacity: 0.6;
        border-style: solid;
      }

      .avatar-trigger.is-readonly {
        cursor: default;
        border-style: solid;
      }

      /* Avatar Inner Viewport */
      .avatar-frame {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--_fzl-color-surface-muted), #e2e8f0);
      }

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .avatar-initials {
        font-weight: var(--_fzl-font-weight-semibold);
        color: var(--_fzl-color-primary);
        letter-spacing: 0.05em;
        line-height: 1;
      }

      .avatar-placeholder-icon {
        width: 45%;
        height: 45%;
        fill: var(--_fzl-color-text-muted);
      }

      /* Hover Overlay */
      .avatar-overlay {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background-color: rgba(15, 23, 42, 0.55);
        color: #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--_fzl-space-1);
        opacity: 0;
        transition: opacity var(--_fzl-transition-fast);
        pointer-events: none;
      }

      .avatar-trigger:hover:not(.is-disabled):not(.is-readonly) .avatar-overlay,
      .avatar-trigger:focus-visible:not(.is-disabled):not(.is-readonly) .avatar-overlay {
        opacity: 1;
      }

      .avatar-overlay-text {
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        text-align: center;
        padding: 0 var(--_fzl-space-2);
      }

      /* Camera Badge */
      .camera-badge {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        border: 2px solid var(--_fzl-color-surface);
        pointer-events: none;
        transition: background-color var(--_fzl-transition-fast), transform var(--_fzl-transition-fast);
      }

      .avatar-trigger:hover:not(.is-disabled):not(.is-readonly) .camera-badge {
        background-color: var(--_fzl-color-primary-hover);
        transform: scale(1.1);
      }

      /* Action buttons below */
      .button-actions {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2);
        flex-wrap: wrap;
        justify-content: center;
      }

      .action-btn {
        font-family: inherit;
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        padding: var(--_fzl-space-1) var(--_fzl-space-3);
        border-radius: var(--_fzl-radius-md);
        border: 1px solid var(--_fzl-color-border);
        background: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: var(--_fzl-space-1);
        transition: background-color var(--_fzl-transition-fast), border-color var(--_fzl-transition-fast);
      }

      .action-btn:hover:not(:disabled) {
        background-color: var(--_fzl-color-surface-muted);
        border-color: var(--_fzl-color-border-hover);
      }

      .action-btn:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
      }

      .action-btn.btn-remove {
        color: var(--_fzl-color-danger);
        border-color: rgba(185, 28, 28, 0.3);
      }

      .action-btn.btn-remove:hover:not(:disabled) {
        background-color: rgba(185, 28, 28, 0.08);
        border-color: var(--_fzl-color-danger);
      }

      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Hidden file input */
      .hidden-file-input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      /* Crop Modal Dialog */
      .crop-modal-scrim {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(2px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--_fzl-space-4);
        animation: fadeIn 180ms ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .crop-dialog {
        background-color: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        border-radius: var(--_fzl-radius-lg);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        max-width: 440px;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--_fzl-color-border);
        animation: slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideUp {
        from { transform: translateY(16px) scale(0.97); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      .crop-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--_fzl-space-3) var(--_fzl-space-4);
        border-bottom: 1px solid var(--_fzl-color-border);
      }

      .crop-title {
        margin: 0;
        font-size: var(--_fzl-font-size-md);
        font-weight: var(--_fzl-font-weight-semibold);
      }

      .crop-close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: var(--_fzl-space-1);
        border-radius: var(--_fzl-radius-sm);
        color: var(--_fzl-color-text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .crop-close-btn:hover {
        background-color: var(--_fzl-color-surface-muted);
        color: var(--_fzl-color-text);
      }

      .crop-body {
        padding: var(--_fzl-space-4);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--_fzl-space-3);
      }

      .crop-hint {
        margin: 0;
        font-size: var(--_fzl-font-size-xs);
        color: var(--_fzl-color-text-muted);
        text-align: center;
      }

      .crop-canvas-wrapper {
        position: relative;
        width: 280px;
        height: 280px;
        background-color: #0f172a;
        border-radius: var(--_fzl-radius-md);
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
        cursor: grab;
        touch-action: none;
      }

      .crop-canvas-wrapper.is-panning {
        cursor: grabbing;
      }

      .crop-canvas {
        display: block;
        width: 100%;
        height: 100%;
      }

      /* Zoom & Rotate Controls */
      .crop-controls {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-3);
        padding: 0 var(--_fzl-space-2);
      }

      .control-icon-btn {
        background: transparent;
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-sm);
        padding: var(--_fzl-space-1);
        cursor: pointer;
        color: var(--_fzl-color-text);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color var(--_fzl-transition-fast);
      }

      .control-icon-btn:hover {
        background-color: var(--_fzl-color-surface-muted);
      }

      .zoom-slider {
        flex: 1;
        accent-color: var(--_fzl-color-primary);
        cursor: pointer;
      }

      .crop-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--_fzl-space-2);
        padding: var(--_fzl-space-3) var(--_fzl-space-4);
        border-top: 1px solid var(--_fzl-color-border);
        background-color: var(--_fzl-color-surface-muted);
      }

      .modal-btn {
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm);
        font-weight: var(--_fzl-font-weight-medium);
        padding: var(--_fzl-space-2) var(--_fzl-space-4);
        border-radius: var(--_fzl-radius-md);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background-color var(--_fzl-transition-fast);
      }

      .modal-btn-cancel {
        border: 1px solid var(--_fzl-color-border);
        background: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
      }

      .modal-btn-cancel:hover {
        background: var(--_fzl-color-surface-muted);
      }

      .modal-btn-apply {
        border: 1px solid transparent;
        background: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
      }

      .modal-btn-apply:hover {
        background: var(--_fzl-color-primary-hover);
      }

      /* High Contrast */
      :host([data-fzl-hc]) .avatar-trigger {
        border-color: CanvasText !important;
      }
      :host([data-fzl-hc]) .crop-dialog {
        border: 2px solid CanvasText;
      }
      :host([data-fzl-hc]) .modal-btn-apply {
        border: 2px solid HighlightText;
      }
    `,
  ];

  /** Current avatar image source (URL or Data URL) */
  @property({ type: String, reflect: true })
  src = '';

  /** User name (used for alt text and fallback initials) */
  @property({ type: String })
  name = '';

  /** Diameter of the avatar in pixels */
  @property({ type: Number })
  size = 120;

  /** Width and height of the exported square image in pixels */
  @property({ type: Number })
  outputSize = 360;

  /** Format of the exported image */
  @property({ type: String })
  outputFormat: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png';

  /** Compression quality (0 to 1) for JPEG/WebP */
  @property({ type: Number })
  outputQuality = 0.92;

  /** Accepted MIME types for the file picker */
  @property({ type: String })
  accept = 'image/png, image/jpeg, image/webp, image/gif';

  /** Maximum allowed file size in bytes (default: 5MB) */
  @property({ type: Number })
  maxFileSize = 5 * 1024 * 1024;

  /** Whether the component is disabled */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Whether the avatar is read-only (displays avatar without edit actions) */
  @property({ type: Boolean, reflect: true })
  readonly = false;

  /** Label for the edit button */
  @property({ type: String })
  buttonLabel = 'Alterar foto';

  /** Modal title */
  @property({ type: String })
  cropTitle = 'Recortar foto de perfil';

  // --- Internal State ---
  @state() private _isDragOver = false;
  @state() private _isCropModalOpen = false;
  @state() private _zoom = 1;
  @state() private _minZoom = 1;
  @state() private _maxZoom = 4;
  @state() private _panX = 0;
  @state() private _panY = 0;
  @state() private _rotation = 0; // in degrees: 0, 90, 180, 270
  @state() private _isPanning = false;

  private _rawLoadedImage: HTMLImageElement | null = null;
  private _selectedFile: File | null = null;
  private _pointerStartX = 0;
  private _pointerStartY = 0;
  private _panStartX = 0;
  private _panStartY = 0;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cleanupCropState();
  }

  private _cleanupCropState() {
    this._rawLoadedImage = null;
    this._selectedFile = null;
    this._isCropModalOpen = false;
  }

  /** Compute initials from the user name */
  private _computeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return ((parts[0][0] ?? '') + (parts.at(-1)![0] ?? '')).toUpperCase();
  }

  /** Open file picker */
  private _triggerFileInput() {
    if (this.disabled || this.readonly) return;
    const fileInput = this.shadowRoot?.querySelector<HTMLInputElement>('.hidden-file-input');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  /** Handle file input selection */
  private _handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this._processSelectedFile(file);
    }
  }

  /** Validate and prepare the selected image file */
  private _processSelectedFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this._emitError('invalid-type', 'O arquivo selecionado não é uma imagem válida.', file);
      return;
    }

    if (file.size > this.maxFileSize) {
      const maxMb = (this.maxFileSize / (1024 * 1024)).toFixed(1);
      this._emitError(
        'file-too-large',
        `A imagem selecionada excede o tamanho máximo permitido de ${maxMb}MB.`,
        file
      );
      return;
    }

    this._selectedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const img = new Image();
        img.onload = () => {
          this._rawLoadedImage = img;
          this._initCropState(img);
          this._isCropModalOpen = true;
          this.updateComplete.then(() => this._drawCropCanvas());
        };
        img.onerror = () => {
          this._emitError('read-error', 'Erro ao carregar o arquivo de imagem.', file);
        };
        img.src = result;
      }
    };
    reader.onerror = () => {
      this._emitError('read-error', 'Erro ao ler o arquivo selecionado.', file);
    };
    reader.readAsDataURL(file);
  }

  private _emitError(error: FzlAvatarErrorEventDetail['error'], message: string, file?: File) {
    this.dispatchEvent(
      new CustomEvent<FzlAvatarErrorEventDetail>('fzl-avatar-error', {
        bubbles: true,
        composed: true,
        detail: { error, message, file },
      })
    );
  }

  /** Calculate initial zoom and bounds */
  private _initCropState(img: HTMLImageElement) {
    const cropCircleRadius = 110; // 220px diameter circle
    const cropCircleDiameter = cropCircleRadius * 2;

    // Minimum zoom so image fully covers the circle
    const scaleToCover = Math.max(cropCircleDiameter / img.width, cropCircleDiameter / img.height);
    this._minZoom = scaleToCover;
    this._maxZoom = scaleToCover * 4;
    this._zoom = scaleToCover;
    this._panX = 0;
    this._panY = 0;
    this._rotation = 0;
  }

  /** Draw image and circular crop guide on the modal canvas */
  private _drawCropCanvas() {
    const canvas = this.shadowRoot?.querySelector<HTMLCanvasElement>('.crop-canvas');
    if (!canvas || !this._rawLoadedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const cropRadius = 110;

    ctx.clearRect(0, 0, width, height);

    // Save context for transformed image drawing
    ctx.save();
    ctx.translate(centerX + this._panX, centerY + this._panY);
    ctx.rotate((this._rotation * Math.PI) / 180);
    ctx.scale(this._zoom, this._zoom);

    // Draw image centered at 0,0
    ctx.drawImage(
      this._rawLoadedImage,
      -this._rawLoadedImage.width / 2,
      -this._rawLoadedImage.height / 2
    );
    ctx.restore();

    // Draw donut scrim (outside of circle is darkened)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    // Draw counter-clockwise circle cutout
    ctx.arc(centerX, centerY, cropRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fill();

    // Draw circular guideline border
    ctx.beginPath();
    ctx.arc(centerX, centerY, cropRadius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw subtle inner grid (rule of thirds)
    ctx.beginPath();
    const third = (cropRadius * 2) / 3;
    const leftX = centerX - cropRadius;
    const topY = centerY - cropRadius;

    // Clip to circle for subtle grid lines
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, cropRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    // vertical lines
    ctx.moveTo(leftX + third, topY);
    ctx.lineTo(leftX + third, topY + cropRadius * 2);
    ctx.moveTo(leftX + third * 2, topY);
    ctx.lineTo(leftX + third * 2, topY + cropRadius * 2);
    // horizontal lines
    ctx.moveTo(leftX, topY + third);
    ctx.lineTo(leftX + cropRadius * 2, topY + third);
    ctx.moveTo(leftX, topY + third * 2);
    ctx.lineTo(leftX + cropRadius * 2, topY + third * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // --- Pan / Drag Interaction ---
  private _handlePointerDown(e: PointerEvent) {
    this._isPanning = true;
    this._pointerStartX = e.clientX;
    this._pointerStartY = e.clientY;
    this._panStartX = this._panX;
    this._panStartY = this._panY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  private _handlePointerMove(e: PointerEvent) {
    if (!this._isPanning) return;
    const dx = e.clientX - this._pointerStartX;
    const dy = e.clientY - this._pointerStartY;
    this._panX = this._panStartX + dx;
    this._panY = this._panStartY + dy;
    this._drawCropCanvas();
  }

  private _handlePointerUp(e: PointerEvent) {
    if (!this._isPanning) return;
    this._isPanning = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  private _handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const nextZoom = Math.min(Math.max(this._zoom * zoomFactor, this._minZoom), this._maxZoom);
    this._zoom = nextZoom;
    this._drawCropCanvas();
  }

  private _handleZoomSliderChange(e: Event) {
    const slider = e.target as HTMLInputElement;
    this._zoom = parseFloat(slider.value);
    this._drawCropCanvas();
  }

  private _rotateClockwise() {
    this._rotation = (this._rotation + 90) % 360;
    this._drawCropCanvas();
  }

  private _zoomIn() {
    this._zoom = Math.min(this._zoom * 1.15, this._maxZoom);
    this._drawCropCanvas();
  }

  private _zoomOut() {
    this._zoom = Math.max(this._zoom / 1.15, this._minZoom);
    this._drawCropCanvas();
  }

  private _closeCropModal() {
    this._isCropModalOpen = false;
    this._cleanupCropState();
  }

  /** Apply crop, export Data URL and Blob, and dispatch change event */
  private async _applyCrop() {
    if (!this._rawLoadedImage) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.outputSize;
    exportCanvas.height = this.outputSize;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const previewRadius = 110;
    const previewScaleRatio = this.outputSize / (previewRadius * 2);

    // Position and transform corresponding to the preview crop circle
    const centerX = this.outputSize / 2;
    const centerY = this.outputSize / 2;

    ctx.save();
    ctx.translate(centerX + this._panX * previewScaleRatio, centerY + this._panY * previewScaleRatio);
    ctx.rotate((this._rotation * Math.PI) / 180);
    ctx.scale(this._zoom * previewScaleRatio, this._zoom * previewScaleRatio);
    ctx.drawImage(
      this._rawLoadedImage,
      -this._rawLoadedImage.width / 2,
      -this._rawLoadedImage.height / 2
    );
    ctx.restore();

    // Export formats
    const dataUrl = exportCanvas.toDataURL(this.outputFormat, this.outputQuality);
    const blob = await new Promise<Blob | null>((resolve) => {
      exportCanvas.toBlob(resolve, this.outputFormat, this.outputQuality);
    });

    this.src = dataUrl;

    const detail: FzlAvatarChangeEventDetail = {
      dataUrl,
      blob,
      file: this._selectedFile,
      name: this.name,
    };

    this.dispatchEvent(
      new CustomEvent<FzlAvatarChangeEventDetail>('fzl-avatar-change', {
        bubbles: true,
        composed: true,
        detail,
      })
    );

    this._closeCropModal();
  }

  /** Remove avatar */
  private _handleRemoveAvatar(e: Event) {
    e.stopPropagation();
    if (this.disabled || this.readonly) return;
    this.src = '';
    this.dispatchEvent(
      new CustomEvent<void>('fzl-avatar-remove', {
        bubbles: true,
        composed: true,
      })
    );
  }

  // --- Drag and Drop on Avatar ---
  private _handleDragOver(e: DragEvent) {
    if (this.disabled || this.readonly) return;
    e.preventDefault();
    e.stopPropagation();
    this._isDragOver = true;
  }

  private _handleDragLeave(e: DragEvent) {
    if (this.disabled || this.readonly) return;
    e.preventDefault();
    e.stopPropagation();
    this._isDragOver = false;
  }

  private _handleDrop(e: DragEvent) {
    if (this.disabled || this.readonly) return;
    e.preventDefault();
    e.stopPropagation();
    this._isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      this._processSelectedFile(file);
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (this.disabled || this.readonly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._triggerFileInput();
    }
  }

  override render() {
    const initials = this._computeInitials(this.name);
    const hasImage = Boolean(this.src && this.src.trim());
    const initialsFontSize = `${Math.round(this.size * 0.36)}px`;

    return html`
      <div part="container" class="fzl-avatar-upload-root">
        <!-- Avatar Button Trigger -->
        <div
          part="avatar"
          class="avatar-trigger ${this._isDragOver ? 'is-dragover' : ''} ${this.disabled
            ? 'is-disabled'
            : ''} ${this.readonly ? 'is-readonly' : ''}"
          role="button"
          tabindex=${this.disabled ? -1 : 0}
          aria-label=${this.name
            ? `Foto de perfil de ${this.name}. Clique ou arraste para alterar.`
            : 'Foto de perfil. Clique ou arraste para alterar.'}
          style="width: ${this.size}px; height: ${this.size}px;"
          @click=${this._triggerFileInput}
          @keydown=${this._handleKeyDown}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}
        >
          <div class="avatar-frame">
            ${hasImage
              ? html`<img part="image" class="avatar-image" src=${this.src} alt="Foto de perfil" />`
              : initials
                ? html`<span class="avatar-initials" style="font-size: ${initialsFontSize};"
                    >${initials}</span
                  >`
                : html`
                    <svg class="avatar-placeholder-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                      />
                    </svg>
                  `}
          </div>

          <!-- Camera Badge Icon -->
          ${!this.readonly && !this.disabled
            ? html`
                <div part="badge" class="camera-badge" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                    />
                  </svg>
                </div>
                <div class="avatar-overlay">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                    />
                  </svg>
                  <span class="avatar-overlay-text">Alterar</span>
                </div>
              `
            : ''}
        </div>

        <!-- Action buttons below -->
        ${!this.readonly && !this.disabled
          ? html`
              <div part="actions" class="button-actions">
                <button
                  type="button"
                  class="action-btn"
                  @click=${this._triggerFileInput}
                  ?disabled=${this.disabled}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                    />
                  </svg>
                  ${this.buttonLabel}
                </button>
                ${hasImage
                  ? html`
                      <button
                        type="button"
                        class="action-btn btn-remove"
                        @click=${this._handleRemoveAvatar}
                        ?disabled=${this.disabled}
                        aria-label="Remover foto de perfil"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                          />
                        </svg>
                        Remover
                      </button>
                    `
                  : ''}
              </div>
            `
          : ''}

        <!-- Hidden input for file picking -->
        <input
          type="file"
          class="hidden-file-input"
          accept=${this.accept}
          tabindex="-1"
          aria-hidden="true"
          @change=${this._handleFileSelected}
        />

        <!-- Circular Crop Modal Dialog -->
        ${this._isCropModalOpen
          ? html`
              <div
                part="modal"
                class="crop-modal-scrim"
                role="dialog"
                aria-modal="true"
                aria-labelledby="crop-dialog-title"
                @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && this._closeCropModal()}
              >
                <div part="dialog" class="crop-dialog">
                  <div class="crop-header">
                    <h2 id="crop-dialog-title" class="crop-title">${this.cropTitle}</h2>
                    <button
                      type="button"
                      class="crop-close-btn"
                      aria-label="Fechar"
                      @click=${this._closeCropModal}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        />
                      </svg>
                    </button>
                  </div>

                  <div class="crop-body">
                    <p class="crop-hint">
                      Arraste a imagem para enquadrar no círculo e use o controle para ampliar.
                    </p>

                    <div
                      class="crop-canvas-wrapper ${this._isPanning ? 'is-panning' : ''}"
                      @pointerdown=${this._handlePointerDown}
                      @pointermove=${this._handlePointerMove}
                      @pointerup=${this._handlePointerUp}
                      @pointercancel=${this._handlePointerUp}
                      @wheel=${this._handleWheel}
                    >
                      <canvas class="crop-canvas" width="280" height="280"></canvas>
                    </div>

                    <!-- Controls -->
                    <div class="crop-controls">
                      <button
                        type="button"
                        class="control-icon-btn"
                        title="Diminuir zoom"
                        aria-label="Diminuir zoom"
                        @click=${this._zoomOut}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13H5v-2h14v2z" />
                        </svg>
                      </button>

                      <input
                        type="range"
                        class="zoom-slider"
                        min=${this._minZoom}
                        max=${this._maxZoom}
                        step="0.005"
                        .value=${String(this._zoom)}
                        @input=${this._handleZoomSliderChange}
                        aria-label="Zoom da foto"
                      />

                      <button
                        type="button"
                        class="control-icon-btn"
                        title="Aumentar zoom"
                        aria-label="Aumentar zoom"
                        @click=${this._zoomIn}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        class="control-icon-btn"
                        title="Girar 90 graus"
                        aria-label="Girar 90 graus"
                        @click=${this._rotateClockwise}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.65-1.54-3.68l-1.44 1.44c.55.72.93 1.58 1.05 2.52h1.93zm-1.93 4.28l1.44 1.44c.82-1.03 1.37-2.29 1.54-3.68h-1.93c-.12.94-.5 1.8-1.05 2.52l.05.02z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="crop-footer">
                    <button
                      type="button"
                      class="modal-btn modal-btn-cancel"
                      @click=${this._closeCropModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      class="modal-btn modal-btn-apply"
                      @click=${this._applyCrop}
                    >
                      Aplicar corte
                    </button>
                  </div>
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-lit-avatar-upload')) {
  customElements.define('fzl-lit-avatar-upload', FzlLitAvatarUpload);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-lit-avatar-upload': FzlLitAvatarUpload;
  }
}
