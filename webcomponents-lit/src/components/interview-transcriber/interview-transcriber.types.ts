/**
 * Types and interfaces for the Qualitative Interview Voice Transcriber component.
 */

export type FzlRecordingState = 'idle' | 'recording' | 'paused' | 'stopped';
export type FzlSavingState = 'idle' | 'saving' | 'saved' | 'error';

export interface FzlInterviewMetadata {
  interviewId: string;
  participantId: string;
  interviewer: string;
  topic: string;
  language: string;
  durationSeconds: number;
  consentConfirmed: boolean;
  tags: string[];
  recordedAt: string;
}

export interface FzlInterviewSaveEventDetail {
  interviewId: string;
  participantId: string;
  interviewer: string;
  topic: string;
  language: string;
  durationSeconds: number;
  transcript: string;
  tags: string[];
  recordedAt: string;
  consentConfirmed: boolean;
  audioBlob: Blob | null;
  audioUrl?: string;
  audioMimeType?: string;
}

export interface FzlTranscriptionUpdateEventDetail {
  transcript: string;
  interimTranscript: string;
  isFinal: boolean;
}

/**
 * Format elapsed seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = safeSec % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Generate a unique qualitative interview ID
 */
export function generateInterviewId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INT-${timestamp}-${random}`;
}
