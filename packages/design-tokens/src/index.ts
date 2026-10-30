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
`;
