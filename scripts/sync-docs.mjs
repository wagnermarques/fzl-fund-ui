#!/usr/bin/env node
/**
 * scripts/sync-docs.mjs
 * Reads Custom Elements Manifest (`custom-elements.json`) from all workspace packages
 * (`webcomponents-es6`, `webcomponents-lit`, `webcomponents-angular`) and synchronizes
 * the Markdown API tables inside `docs/components/*.md`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const packages = [
  { name: 'Vanilla ES6 (`@fzl/webcomponents-es6`)', dir: 'webcomponents-es6' },
  { name: 'Lit (`@fzl/webcomponents-lit`)', dir: 'webcomponents-lit' },
  { name: 'Angular Elements (`@fzl/webcomponents-angular`)', dir: 'webcomponents-angular' },
];

/**
 * Extract all Custom Element declarations from a package's custom-elements.json
 */
function loadPackageElements(pkgDir) {
  const manifestPath = path.join(rootDir, pkgDir, 'custom-elements.json');
  if (!fs.existsSync(manifestPath)) {
    return [];
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const elements = [];
  for (const mod of manifest.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      if (decl.customElement && decl.tagName) {
        elements.push({
          ...decl,
          modulePath: mod.path,
        });
      }
    }
  }
  return elements;
}

function formatTable(headers, rows) {
  if (!rows.length) return '_None_';
  const headerLine = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => ':---').join(' | ')} |`;
  const bodyLines = rows.map(
    (r) => `| ${r.map((cell) => String(cell ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`
  );
  return [headerLine, sepLine, ...bodyLines].join('\n');
}

function renderElementMarkdown(pkgName, el) {
  const lines = [];
  lines.push(`### \`<${el.tagName}>\` — ${pkgName}`);
  if (el.description) {
    lines.push('', el.description);
  }

  const attributes = el.attributes ?? [];
  if (attributes.length > 0) {
    lines.push(
      '',
      '#### Attributes & Properties',
      formatTable(
        ['Attribute', 'Property', 'Type', 'Default', 'Description'],
        attributes.map((a) => [
          `\`${a.name}\``,
          `\`${a.fieldName ?? a.name}\``,
          `\`${a.type?.text ?? 'string'}\``,
          a.default ? `\`${a.default}\`` : '-',
          a.description ?? '',
        ])
      )
    );
  }

  const events = el.events ?? [];
  if (events.length > 0) {
    lines.push(
      '',
      '#### Events',
      formatTable(
        ['Event Name', 'Detail Type', 'Description'],
        events.map((e) => [
          `\`${e.name}\``,
          `\`${e.type?.text ?? 'CustomEvent'}\``,
          e.description ?? '',
        ])
      )
    );
  }

  const slots = el.slots ?? [];
  if (slots.length > 0) {
    lines.push(
      '',
      '#### Slots',
      formatTable(
        ['Slot Name', 'Description'],
        slots.map((s) => [s.name ? `\`${s.name}\`` : '_(default)_', s.description ?? ''])
      )
    );
  }

  const cssParts = el.cssParts ?? [];
  if (cssParts.length > 0) {
    lines.push(
      '',
      '#### CSS Shadow Parts (`::part`)',
      formatTable(
        ['Part Name', 'Description'],
        cssParts.map((p) => [`\`${p.name}\``, p.description ?? ''])
      )
    );
  }

  const cssProps = el.cssProperties ?? [];
  if (cssProps.length > 0) {
    lines.push(
      '',
      '#### CSS Custom Properties',
      formatTable(
        ['CSS Property', 'Default', 'Description'],
        cssProps.map((c) => [`\`${c.name}\``, c.default ? `\`${c.default}\`` : '-', c.description ?? ''])
      )
    );
  }

  return lines.join('\n');
}

function main() {
  const allElementsBySuffix = new Map();

  for (const pkg of packages) {
    const elements = loadPackageElements(pkg.dir);
    for (const el of elements) {
      // Match tag names like fzl-es6-button, fzl-lit-button, fzl-ng-button -> "button"
      const match = el.tagName.match(/^fzl-(?:es6|lit|ng)-(.+)$/) || el.tagName.match(/^fzl-(.+)$/);
      const widgetKey = match ? match[1] : el.tagName;
      if (!allElementsBySuffix.has(widgetKey)) {
        allElementsBySuffix.set(widgetKey, []);
      }
      allElementsBySuffix.get(widgetKey).push({ pkgName: pkg.name, el });
    }
  }

  const docsComponentsDir = path.join(rootDir, 'docs', 'components');
  if (!fs.existsSync(docsComponentsDir)) {
    console.log('No docs/components directory found.');
    return;
  }

  let updatedCount = 0;
  for (const [widgetKey, entries] of allElementsBySuffix.entries()) {
    const docPath = path.join(docsComponentsDir, `${widgetKey}.md`);
    if (!fs.existsSync(docPath)) {
      continue;
    }

    const content = fs.readFileSync(docPath, 'utf-8');
    const startMarker = '<!-- CEM:START -->';
    const endMarker = '<!-- CEM:END -->';
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const renderedSections = entries.map(({ pkgName, el }) => renderElementMarkdown(pkgName, el)).join('\n\n---\n\n');
      const updated =
        content.slice(0, startIdx + startMarker.length) +
        '\n\n' +
        renderedSections +
        '\n\n' +
        content.slice(endIdx);
      fs.writeFileSync(docPath, updated, 'utf-8');
      console.log(`✔ Synchronized docs/components/${widgetKey}.md (${entries.length} implementation(s))`);
      updatedCount++;
    }
  }

  console.log(`Done. Synchronized ${updatedCount} component specification file(s).`);
}

main();
