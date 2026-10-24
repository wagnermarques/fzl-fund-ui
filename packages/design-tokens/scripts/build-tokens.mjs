#!/usr/bin/env node
/**
 * Generates `src/tokens.css` from `src/tokens.ts` (requires Node >= 22.18 for native TS type stripping).
 * Pass `--check` to fail instead of writing when the CSS file is out of date.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fzlTokenGroups } from '../src/tokens.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(__dirname, '../src/tokens.css');

const groups = Object.entries(fzlTokenGroups).map(
  ([group, tokens]) =>
    `  /* ${group} */\n` +
    Object.entries(tokens)
      .map(([name, value]) => `  --fzl-${name}: ${value};`)
      .join('\n')
);

const css = `/**
 * @fzl/design-tokens
 * GENERATED FILE — edit src/tokens.ts and run \`npm run build:tokens\`.
 *
 * Optional for host pages: components already embed these defaults as fallbacks.
 * Link it to use the tokens in your own CSS, or override any of them on :root
 * (or on a wrapper element) to theme every <fzl-*> widget.
 */
:root {
${groups.join('\n\n')}
}
`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';
  if (current !== css) {
    console.error('✖ src/tokens.css is out of date. Run `npm run build:tokens`.');
    process.exit(1);
  }
  console.log('✔ src/tokens.css is up to date.');
} else {
  fs.writeFileSync(cssPath, css, 'utf-8');
  console.log('✔ Generated src/tokens.css');
}
