// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlCameraCapture,
  formatCameraDuration,
  isMediaDevicesSupported,
} from '@fzl/webcomponents-lit/camera-capture';

describe('Camera Capture Helpers', () => {
  it('formata segundos em minutos e segundos mm:ss', () => {
    expect(formatCameraDuration(0)).toBe('00:00');
    expect(formatCameraDuration(5)).toBe('00:05');
    expect(formatCameraDuration(65)).toBe('01:05');
    expect(formatCameraDuration(360)).toBe('06:00');
  });

  it('avalia suporte a mediaDevices com segurança', () => {
    expect(typeof isMediaDevicesSupported()).toBe('boolean');
  });
});

describe('FzlCameraCapture Component', () => {
  let camera;

  beforeEach(async () => {
    camera = new FzlCameraCapture();
    document.body.appendChild(camera);
    await camera.updateComplete;
  });

  afterEach(() => {
    if (camera && camera.parentNode) {
      camera.parentNode.removeChild(camera);
    }
  });

  it('renderiza o componente em estado inicial (card de apresentação/início)', () => {
    expect(camera).toBeInstanceOf(FzlCameraCapture);
    const card = camera.shadowRoot.querySelector('.fallback-card');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Câmera e Captura de Mídia');
    expect(card.textContent).toContain('Iniciar Câmera');
  });

  it('configura o input de arquivo oculto com atributo capture', () => {
    const input = camera.shadowRoot.querySelector('#fileFallbackInput');
    expect(input).toBeTruthy();
    expect(input.getAttribute('capture')).toBe('environment');
    expect(input.getAttribute('accept')).toContain('image/*');
  });

  it('emite evento fzl-capture-photo ao confirmar uma foto capturada', async () => {
    let capturedPhotoDetail = null;
    camera.addEventListener('fzl-capture-photo', (e) => {
      capturedPhotoDetail = e.detail;
    });

    const mockPhoto = {
      blob: new Blob(['fake-img'], { type: 'image/jpeg' }),
      dataUrl: 'data:image/jpeg;base64,fake',
      width: 640,
      height: 480,
      facingMode: 'environment',
      timestamp: Date.now(),
    };

    camera._previewPhoto = mockPhoto;
    await camera.updateComplete;

    const reviewScreen = camera.shadowRoot.querySelector('.review-screen');
    expect(reviewScreen).toBeTruthy();

    const confirmBtn = camera.shadowRoot.querySelector('.btn-review-confirm');
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();
    await camera.updateComplete;

    expect(capturedPhotoDetail).toBeTruthy();
    expect(capturedPhotoDetail.photo.dataUrl).toBe(mockPhoto.dataUrl);
    expect(camera._previewPhoto).toBeNull();
  });

  it('emite evento fzl-capture-video ao confirmar um vídeo gravado', async () => {
    let capturedVideoDetail = null;
    camera.addEventListener('fzl-capture-video', (e) => {
      capturedVideoDetail = e.detail;
    });

    const mockVideo = {
      blob: new Blob(['fake-video'], { type: 'video/webm' }),
      objectUrl: 'blob:http://localhost/fake-video',
      durationSeconds: 12,
      mimeType: 'video/webm',
      timestamp: Date.now(),
    };

    camera._previewVideo = mockVideo;
    await camera.updateComplete;

    const confirmBtn = camera.shadowRoot.querySelector('.btn-review-confirm');
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();
    await camera.updateComplete;

    expect(capturedVideoDetail).toBeTruthy();
    expect(capturedVideoDetail.video.durationSeconds).toBe(12);
    expect(camera._previewVideo).toBeNull();
  });

  it('permite alternar modo e direção da câmera', async () => {
    camera.facingMode = 'user';
    camera.mode = 'photo';
    await camera.updateComplete;

    expect(camera.facingMode).toBe('user');
    expect(camera.mode).toBe('photo');
  });
});
