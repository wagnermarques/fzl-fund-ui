/**
 * Types and helper functions for Social Login (Google & Microsoft) in FZL Web Components.
 */

export type FzlSocialAuthProvider = 'google' | 'microsoft';

export interface FzlSocialUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  provider: FzlSocialAuthProvider;
  raw?: Record<string, unknown>;
}

export interface FzlSocialLoginResult {
  provider: FzlSocialAuthProvider;
  user: FzlSocialUser;
  credential?: string;
  accessToken?: string;
}

/**
 * Safely parses the JSON payload of an OpenID Connect / JWT token on the client-side.
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const raw = atob(base64);
    try {
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
      }
      const decoded = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(decoded);
    } catch {
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
}

/**
 * Dynamically loads the official Google Identity Services (GIS) client script if not already present.
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    const win = window as unknown as {
      google?: { accounts?: { id?: unknown; oauth2?: unknown } };
    };
    if (win.google?.accounts?.id || win.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Identity Services.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services.'));
    document.head.appendChild(script);
  });
}
