/**
 * Audio Capture Types & Helpers for FZL Web Components
 */

/**
 * Where finished recordings are persisted.
 * - `indexeddb` (default): the audio Blob is saved in the browser's IndexedDB.
 * - `none`: nothing is persisted; the host only receives the `fzl-audio-captured` event.
 */
export type FzlAudioStorage = 'indexeddb' | 'none';

/** A finished audio recording, as captured and as stored in IndexedDB. */
export interface FzlAudioRecording {
  /** Unique id (IndexedDB key). */
  id: string;
  /** Human readable name, e.g. "Gravação 2026-11-17 14:03:22". */
  name: string;
  /** The binary audio data. */
  blob: Blob;
  /** MIME type reported by MediaRecorder, e.g. `audio/webm;codecs=opus`. */
  mimeType: string;
  /** Size of the blob in bytes. */
  size: number;
  /** Recorded duration in seconds (excluding paused time). */
  durationSeconds: number;
  /** Epoch milliseconds when the recording finished. */
  createdAt: number;
}

/** Preferred recording formats, in order. The first one the browser supports wins. */
export const FZL_AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/aac',
];

export function isAudioCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

/**
 * Picks the recording MIME type: the `preferred` one when supported, otherwise the
 * first supported candidate. Returns `''` to let the browser choose its default.
 */
export function pickAudioMimeType(preferred?: string): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = preferred ? [preferred, ...FZL_AUDIO_MIME_CANDIDATES] : FZL_AUDIO_MIME_CANDIDATES;
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

/** Format elapsed seconds into mm:ss (or h:mm:ss for an hour or more). */
export function formatAudioDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** Format a byte count as a short human readable string (B, KB, MB, GB). */
export function formatAudioSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/** File extension for a recording MIME type, used for downloads. */
export function audioFileExtension(mimeType: string): string {
  const base = (mimeType || '').split(';')[0].trim();
  switch (base) {
    case 'audio/webm':
      return 'webm';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/mp4':
      return 'm4a';
    case 'audio/aac':
      return 'aac';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav':
    case 'audio/wave':
      return 'wav';
    default:
      return 'audio';
  }
}
