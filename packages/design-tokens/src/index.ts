import { fzlTokens } from './tokens';

export { fzlTokens, fzlTokenGroups } from './tokens';
export {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  type LocaleMetadata,
  type SupportedLocaleCode,
} from './locales';

/**
 * Shadow DOM stylesheet shared by Vanilla ES6, Lit, and Angular components.
 *
 * Components never read public `--fzl-*` tokens directly. Instead, each token is mapped
 * to a private `--_fzl-*` variable on `:host`, falling back to the default value:
 *
 *   --_fzl-color-primary: var(--fzl-color-primary, #1d4ed8);
 *
 * Declaring the public `--fzl-*` names on `:host` would shadow values inherited from
 * `:root` or a wrapper element, breaking host theming. Component CSS must therefore
 * use `var(--_fzl-*)`.
 */
export const fzlDesignTokensCss = `
:host {
${Object.entries(fzlTokens)
  .map(([name, value]) => `  --_fzl-${name}: var(--fzl-${name}, ${value});`)
  .join('\n')}
}

:host([data-fzl-hc]) {
  --_fzl-color-primary: var(--fzl-hc-color-primary, #ffff00);
  --_fzl-color-primary-hover: var(--fzl-hc-color-primary-hover, #fde047);
  --_fzl-color-primary-active: var(--fzl-hc-color-primary-active, #facc15);
  --_fzl-color-primary-contrast: var(--fzl-hc-color-primary-contrast, #000000);
  --_fzl-color-secondary: var(--fzl-hc-color-secondary, #ffffff);
  --_fzl-color-secondary-hover: var(--fzl-hc-color-secondary-hover, #e2e8f0);
  --_fzl-color-secondary-active: var(--fzl-hc-color-secondary-active, #cbd5e1);
  --_fzl-color-secondary-contrast: var(--fzl-hc-color-secondary-contrast, #000000);
  --_fzl-color-surface: var(--fzl-hc-color-surface, #000000);
  --_fzl-color-surface-muted: var(--fzl-hc-color-surface-muted, #111111);
  --_fzl-color-border: var(--fzl-hc-color-border, #ffffff);
  --_fzl-color-border-hover: var(--fzl-hc-color-border-hover, #ffff00);
  --_fzl-color-text: var(--fzl-hc-color-text, #ffffff);
  --_fzl-color-text-muted: var(--fzl-hc-color-text-muted, #fef08a);
  --_fzl-focus-ring: 0 0 0 3px #000000, 0 0 0 6px #ffff00;
}

:host([data-fzl-reduced-motion]) {
  --_fzl-transition-fast: 0ms;
}
`;
