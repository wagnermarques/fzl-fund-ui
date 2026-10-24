/**
 * Single source of truth for FZL Design Tokens.
 *
 * Keys are token names without the `--fzl-` prefix; values are the defaults.
 * `tokens.css` is generated from this file (`npm run build:tokens`) — do not edit it by hand.
 */
export const fzlTokenGroups = {
  'Brand & Semantic Colors': {
    'color-primary': '#1d4ed8',
    'color-primary-hover': '#1e40af',
    'color-primary-active': '#1e3a8a',
    'color-primary-contrast': '#ffffff',

    'color-secondary': '#475569',
    'color-secondary-hover': '#334155',
    'color-secondary-active': '#1e293b',
    'color-secondary-contrast': '#ffffff',

    'color-success': '#15803d',
    'color-warning': '#b45309',
    'color-danger': '#b91c1c',
    'color-danger-hover': '#991b1b',
    'color-danger-contrast': '#ffffff',
  },
  'Neutral / Surface Colors': {
    'color-surface': '#ffffff',
    'color-surface-muted': '#f8fafc',
    'color-border': '#cbd5e1',
    'color-border-hover': '#94a3b8',
    'color-text': '#0f172a',
    'color-text-muted': '#64748b',
    'color-disabled-bg': '#e2e8f0',
    'color-disabled-text': '#94a3b8',
  },
  Typography: {
    'font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    'font-size-xs': '0.75rem',
    'font-size-sm': '0.875rem',
    'font-size-md': '1rem',
    'font-size-lg': '1.125rem',
    'font-weight-regular': '400',
    'font-weight-medium': '500',
    'font-weight-semibold': '600',
    'line-height': '1.5',
  },
  Spacing: {
    'space-1': '0.25rem',
    'space-2': '0.5rem',
    'space-3': '0.75rem',
    'space-4': '1rem',
    'space-6': '1.5rem',
  },
  'Border Radius & Shadows': {
    'radius-sm': '0.25rem',
    'radius-md': '0.375rem',
    'radius-lg': '0.5rem',
    'focus-ring': '0 0 0 3px rgba(29, 78, 216, 0.3)',
    'transition-fast': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const satisfies Record<string, Record<string, string>>;

/** Flat map of every token name (without `--fzl-` prefix) to its default value. */
export const fzlTokens: Record<string, string> = Object.assign({}, ...Object.values(fzlTokenGroups));
