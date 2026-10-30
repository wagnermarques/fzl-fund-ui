/**
 * Supported Locales & BCP 47 Constants for FZL Monorepo.
 */
export interface LocaleMetadata {
    readonly code: string;
    readonly label: string;
    readonly dir: 'ltr' | 'rtl';
}
export declare const DEFAULT_LOCALE = "pt-BR";
export declare const FALLBACK_LOCALE = "pt-BR";
export declare const SUPPORTED_LOCALES: readonly LocaleMetadata[];
export type SupportedLocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];
