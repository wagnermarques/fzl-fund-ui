/**
 * Supported Locales & BCP 47 Constants for FZL Monorepo.
 */

export interface LocaleMetadata {
  readonly code: string;
  readonly label: string;
  readonly dir: 'ltr' | 'rtl';
}

export const DEFAULT_LOCALE = 'pt-BR';
export const FALLBACK_LOCALE = 'pt-BR';

export const SUPPORTED_LOCALES: readonly LocaleMetadata[] = [
  { code: 'pt-BR', label: 'Português (Brasil)', dir: 'ltr' },
  { code: 'en-US', label: 'English (US)', dir: 'ltr' },
  { code: 'es-ES', label: 'Español', dir: 'ltr' },
] as const;

export type SupportedLocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];
