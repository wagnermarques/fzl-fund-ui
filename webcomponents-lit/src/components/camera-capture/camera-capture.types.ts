/**
 * Camera Capture Types & Helpers for FZL Web Components
 */

export type FzlCameraMode = 'both' | 'photo' | 'video';
export type FzlCameraFacing = 'user' | 'environment';
export type FzlCaptureOverlay = 'none' | 'document' | 'face';

export interface FzlCapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  facingMode: FzlCameraFacing;
  timestamp: number;
}

export interface FzlCapturedVideo {
  blob: Blob;
  objectUrl: string;
  durationSeconds: number;
  mimeType: string;
  timestamp: number;
}

export function isMediaDevicesSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Format elapsed seconds into mm:ss string
 */
export function formatCameraDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
