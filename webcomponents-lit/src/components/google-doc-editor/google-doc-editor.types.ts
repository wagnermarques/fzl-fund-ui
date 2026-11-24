/**
 * Google Doc Editor types & utility functions.
 */

export interface GoogleDocUrlOptions {
  tab?: string;
  embedded?: boolean;
  preview?: boolean;
}

export interface FzlDocOpenDetail {
  docId: string;
  docUrl: string;
  target?: string;
  originalEvent?: MouseEvent;
}

export interface FzlDocChangeDetail {
  docId: string;
  docUrl: string;
  previousDocId?: string;
}

export interface FzlDocAppendDetail {
  docId: string;
  docUrl: string;
  text: string;
  title?: string;
}

export interface FzlDocCopyDetail {
  docUrl: string;
  docId: string;
}

/**
 * Extracts a Google Docs ID from a full or partial URL, or validates a bare ID.
 * Supports document, spreadsheets, and presentation URLs, prioritizing documents.
 * Example URL: https://docs.google.com/document/d/1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94/edit?tab=t.0
 */
export function extractGoogleDocId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const raw = urlOrId.trim();
  if (!raw) return null;

  // Pattern for /document/d/<id>
  const docMatch = raw.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    return docMatch[1];
  }

  // Generic drive / file / spreadsheets pattern
  const genericMatch = raw.match(/docs\.google\.com\/(?:spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i) ||
    raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }

  // Bare alphanumeric ID of at least 20 chars
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) {
    return raw;
  }

  return null;
}

/**
 * Checks whether the given string is a valid Google Docs URL or ID.
 */
export function isValidGoogleDoc(urlOrId: string | null | undefined): boolean {
  return extractGoogleDocId(urlOrId) !== null;
}

/**
 * Builds a standardized Google Docs URL from a document ID.
 */
export function buildGoogleDocUrl(docId: string, options: GoogleDocUrlOptions = {}): string {
  const cleanId = extractGoogleDocId(docId) || docId.trim();
  if (!cleanId) return '';

  const { tab, embedded, preview } = options;
  if (preview) {
    return `https://docs.google.com/document/d/${encodeURIComponent(cleanId)}/preview`;
  }

  const queryParams: string[] = [];
  if (embedded) queryParams.push('embedded=true');
  if (tab) queryParams.push(`tab=${encodeURIComponent(tab)}`);

  const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  return `https://docs.google.com/document/d/${encodeURIComponent(cleanId)}/edit${qs}`;
}
