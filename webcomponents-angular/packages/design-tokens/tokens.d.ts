/**
 * Single source of truth for FZL Design Tokens.
 *
 * Keys are token names without the `--fzl-` prefix; values are the defaults.
 * `tokens.css` is generated from this file (`npm run build:tokens`) — do not edit it by hand.
 */
export declare const fzlTokenGroups: {
    readonly 'Brand & Semantic Colors': {
        readonly 'color-primary': "#1d4ed8";
        readonly 'color-primary-hover': "#1e40af";
        readonly 'color-primary-active': "#1e3a8a";
        readonly 'color-primary-contrast': "#ffffff";
        readonly 'color-secondary': "#475569";
        readonly 'color-secondary-hover': "#334155";
        readonly 'color-secondary-active': "#1e293b";
        readonly 'color-secondary-contrast': "#ffffff";
        readonly 'color-success': "#15803d";
        readonly 'color-warning': "#b45309";
        readonly 'color-danger': "#b91c1c";
        readonly 'color-danger-hover': "#991b1b";
        readonly 'color-danger-contrast': "#ffffff";
    };
    readonly 'Neutral / Surface Colors': {
        readonly 'color-surface': "#ffffff";
        readonly 'color-surface-muted': "#f8fafc";
        readonly 'color-border': "#cbd5e1";
        readonly 'color-border-hover': "#94a3b8";
        readonly 'color-text': "#0f172a";
        readonly 'color-text-muted': "#64748b";
        readonly 'color-disabled-bg': "#e2e8f0";
        readonly 'color-disabled-text': "#94a3b8";
    };
    readonly Typography: {
        readonly 'font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        readonly 'font-size-xs': "0.75rem";
        readonly 'font-size-sm': "0.875rem";
        readonly 'font-size-md': "1rem";
        readonly 'font-size-lg': "1.125rem";
        readonly 'font-weight-regular': "400";
        readonly 'font-weight-medium': "500";
        readonly 'font-weight-semibold': "600";
        readonly 'line-height': "1.5";
    };
    readonly Spacing: {
        readonly 'space-1': "0.25rem";
        readonly 'space-2': "0.5rem";
        readonly 'space-3': "0.75rem";
        readonly 'space-4': "1rem";
        readonly 'space-6': "1.5rem";
    };
    readonly 'Border Radius & Shadows': {
        readonly 'radius-sm': "0.25rem";
        readonly 'radius-md': "0.375rem";
        readonly 'radius-lg': "0.5rem";
        readonly 'focus-ring': "0 0 0 3px rgba(29, 78, 216, 0.3)";
        readonly 'transition-fast': "150ms cubic-bezier(0.4, 0, 0.2, 1)";
    };
    readonly 'Direction & Layout': {
        readonly direction: "ltr";
    };
};
/** Flat map of every token name (without `--fzl-` prefix) to its default value. */
export declare const fzlTokens: Record<string, string>;
