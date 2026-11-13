export interface FzlDocxRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type FzlDocxBlock =
  | {
      type: 'heading';
      level: 1 | 2 | 3;
      text: string;
      runs: FzlDocxRun[];
    }
  | {
      type: 'paragraph';
      text: string;
      runs: FzlDocxRun[];
    }
  | {
      type: 'list-item';
      text: string;
      runs: FzlDocxRun[];
    }
  | {
      type: 'table';
      rows: string[][];
      text: string;
    };

export interface FzlDocxParseResult {
  textContent: string;
  blocks: FzlDocxBlock[];
}

interface ZipEntryMeta {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  dataOffset: number;
}

const SIG_LOCAL_HEADER = 0x04034b50;
const SIG_CENTRAL_DIR = 0x02014b50;
const SIG_EOCD = 0x06054b50;

function readUint16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32LE(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function findCentralDirectoryEntry(
  bytes: Uint8Array,
  targetPath: string
): ZipEntryMeta | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8');

  // 1. Locate End of Central Directory (scan backwards from EOF, max 64KB comment)
  const minEocdOffset = Math.max(0, bytes.length - 65557);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= minEocdOffset; i--) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset >= 0) {
    const totalEntries = readUint16LE(view, eocdOffset + 10);
    const cdOffset = readUint32LE(view, eocdOffset + 16);
    let cursor = cdOffset;

    for (let idx = 0; idx < totalEntries && cursor + 46 <= bytes.length; idx++) {
      if (readUint32LE(view, cursor) !== SIG_CENTRAL_DIR) break;
      const method = readUint16LE(view, cursor + 10);
      const compressedSize = readUint32LE(view, cursor + 20);
      const uncompressedSize = readUint32LE(view, cursor + 24);
      const nameLen = readUint16LE(view, cursor + 28);
      const extraLen = readUint16LE(view, cursor + 30);
      const commentLen = readUint16LE(view, cursor + 32);
      const localHeaderOffset = readUint32LE(view, cursor + 42);

      const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
      if (name === targetPath && localHeaderOffset + 30 <= bytes.length) {
        if (readUint32LE(view, localHeaderOffset) === SIG_LOCAL_HEADER) {
          const lfhNameLen = readUint16LE(view, localHeaderOffset + 26);
          const lfhExtraLen = readUint16LE(view, localHeaderOffset + 28);
          const dataOffset = localHeaderOffset + 30 + lfhNameLen + lfhExtraLen;
          return { name, method, compressedSize, uncompressedSize, dataOffset };
        }
      }
      cursor += 46 + nameLen + extraLen + commentLen;
    }
  }

  // 2. Fallback: sequential scan of Local File Headers
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (readUint32LE(view, offset) !== SIG_LOCAL_HEADER) break;
    const method = readUint16LE(view, offset + 8);
    const compressedSize = readUint32LE(view, offset + 18);
    const uncompressedSize = readUint32LE(view, offset + 22);
    const nameLen = readUint16LE(view, offset + 26);
    const extraLen = readUint16LE(view, offset + 28);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLen));
    const dataOffset = offset + 30 + nameLen + extraLen;
    if (name === targetPath) {
      return { name, method, compressedSize, uncompressedSize, dataOffset };
    }
    if (compressedSize === 0 && method !== 0) break;
    offset = dataOffset + compressedSize;
  }

  return null;
}

async function decompressZipEntry(
  bytes: Uint8Array,
  entry: ZipEntryMeta
): Promise<Uint8Array> {
  const slice = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);

  if (entry.method === 0) {
    return slice;
  }

  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(
        'Este navegador não suporta DecompressionStream("deflate-raw") para leitura nativa de .docx.'
      );
    }
    const ds = new DecompressionStream('deflate-raw');
    const copy = new Uint8Array(slice.byteLength);
    copy.set(slice);
    const stream = new Blob([copy]).stream().pipeThrough(ds);
    const decompressedBuffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(decompressedBuffer);
  }

  throw new Error(`Método de compressão ZIP não suportado (${entry.method}) no arquivo .docx.`);
}

function directChildrenByLocalName(parent: Element, localName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.localName === localName || child.tagName.split(':').pop() === localName) {
      result.push(child);
    }
  }
  return result;
}

function firstChildByLocalName(parent: Element, localName: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.localName === localName || child.tagName.split(':').pop() === localName) {
      return child;
    }
  }
  return null;
}

function isToggleEnabled(rPr: Element, tagLocalName: string): boolean {
  const node = firstChildByLocalName(rPr, tagLocalName);
  if (!node) return false;
  const val = node.getAttribute('w:val') ?? node.getAttribute('val');
  if (val === null || val === '') return true;
  return val !== '0' && val.toLowerCase() !== 'false' && val.toLowerCase() !== 'none';
}

function detectHeadingLevel(pPr: Element | null): 1 | 2 | 3 | null {
  if (!pPr) return null;
  const pStyle = firstChildByLocalName(pPr, 'pStyle');
  if (!pStyle) return null;
  const val = (pStyle.getAttribute('w:val') ?? pStyle.getAttribute('val') ?? '').toLowerCase();
  if (!val) return null;
  if (val === 'title' || val === 'titulo' || val === 'heading1' || val === 'título1') return 1;
  if (val === 'subtitle' || val === 'heading2' || val === 'título2') return 2;
  if (val.startsWith('heading') || val.startsWith('título') || val.startsWith('titulo')) {
    if (val.includes('1')) return 1;
    if (val.includes('2')) return 2;
    return 3;
  }
  return null;
}

function extractRunsFromParagraph(pElement: Element): FzlDocxRun[] {
  const runs: FzlDocxRun[] = [];

  for (let i = 0; i < pElement.children.length; i++) {
    const child = pElement.children[i];
    const local = child.localName || child.tagName.split(':').pop();

    if (local === 'hyperlink') {
      runs.push(...extractRunsFromParagraph(child));
      continue;
    }
    if (local !== 'r') continue;

    const rPr = firstChildByLocalName(child, 'rPr');
    const bold = rPr ? isToggleEnabled(rPr, 'b') : false;
    const italic = rPr ? isToggleEnabled(rPr, 'i') : false;
    const underline = rPr ? isToggleEnabled(rPr, 'u') : false;

    let chunk = '';
    for (let j = 0; j < child.children.length; j++) {
      const part = child.children[j];
      const partName = part.localName || part.tagName.split(':').pop();
      if (partName === 't' || partName === 'delText') {
        chunk += part.textContent ?? '';
      } else if (partName === 'tab') {
        chunk += '  ';
      } else if (partName === 'br' || partName === 'cr') {
        chunk += '\n';
      }
    }

    if (chunk.length > 0) {
      const last = runs[runs.length - 1];
      if (
        last &&
        Boolean(last.bold) === bold &&
        Boolean(last.italic) === italic &&
        Boolean(last.underline) === underline
      ) {
        last.text += chunk;
      } else {
        runs.push({
          text: chunk,
          ...(bold ? { bold: true } : {}),
          ...(italic ? { italic: true } : {}),
          ...(underline ? { underline: true } : {}),
        });
      }
    }
  }

  return runs;
}

function parseParagraphElement(pElement: Element): FzlDocxBlock | null {
  const runs = extractRunsFromParagraph(pElement);
  const text = runs.map((r) => r.text).join('').trim();
  if (!text) return null;

  const pPr = firstChildByLocalName(pElement, 'pPr');
  const headingLevel = detectHeadingLevel(pPr);
  if (headingLevel) {
    return { type: 'heading', level: headingLevel, text, runs };
  }

  if (pPr && firstChildByLocalName(pPr, 'numPr')) {
    return { type: 'list-item', text, runs };
  }

  return { type: 'paragraph', text, runs };
}

function parseTableElement(tblElement: Element): FzlDocxBlock | null {
  const trElements = directChildrenByLocalName(tblElement, 'tr');
  const rows: string[][] = [];

  for (const tr of trElements) {
    const tcElements = directChildrenByLocalName(tr, 'tc');
    const rowCells: string[] = [];
    for (const tc of tcElements) {
      const pElements = directChildrenByLocalName(tc, 'p');
      const cellText = pElements
        .map((p) => extractRunsFromParagraph(p).map((r) => r.text).join('').trim())
        .filter(Boolean)
        .join(' ');
      rowCells.push(cellText);
    }
    if (rowCells.some((c) => c.length > 0)) {
      rows.push(rowCells);
    }
  }

  if (rows.length === 0) return null;
  const text = rows.map((r) => r.join(' | ')).join('\n');
  return { type: 'table', rows, text };
}

/**
 * Parses `word/document.xml` string into structured OOXML blocks and normalized plain text.
 */
export function parseDocxXml(xmlString: string): FzlDocxParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.localName === 'parsererror' || root.querySelector('parsererror')) {
    throw new Error('XML inválido em word/document.xml.');
  }

  const body = firstChildByLocalName(root, 'body') ?? root;
  const blocks: FzlDocxBlock[] = [];

  for (let i = 0; i < body.children.length; i++) {
    const child = body.children[i];
    const local = child.localName || child.tagName.split(':').pop();
    if (local === 'p') {
      const block = parseParagraphElement(child);
      if (block) blocks.push(block);
    } else if (local === 'tbl') {
      const block = parseTableElement(child);
      if (block) blocks.push(block);
    }
  }

  const textContent = blocks
    .map((b) => (b.type === 'list-item' ? `• ${b.text}` : b.text))
    .join('\n\n');

  return { textContent, blocks };
}

/**
 * Parses a `.docx` binary `ArrayBuffer` using zero external dependencies
 * (native ZIP reader + `DecompressionStream('deflate-raw')` + `DOMParser`).
 */
export async function parseDocxArrayBuffer(
  buffer: ArrayBuffer
): Promise<FzlDocxParseResult> {
  const bytes = new Uint8Array(buffer);
  const entry = findCentralDirectoryEntry(bytes, 'word/document.xml');
  if (!entry) {
    throw new Error('Arquivo .docx inválido: word/document.xml não encontrado.');
  }

  const xmlBytes = await decompressZipEntry(bytes, entry);
  const xmlString = new TextDecoder('utf-8').decode(xmlBytes);
  return parseDocxXml(xmlString);
}

/**
 * Reads an arbitrary File/Blob into an ArrayBuffer safely across browser & DOM test runtimes.
 */
export async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Response(blob).arrayBuffer();
}

function escapeXmlText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds a valid minimal `.docx` Stored ZIP archive in memory containing `word/document.xml`.
 * Useful for unit tests and local sample documents with zero external dependencies.
 */
export function createMinimalDocxBytes(xmlOrParagraphs: string | string[]): Uint8Array {
  const xmlContent =
    typeof xmlOrParagraphs === 'string' && xmlOrParagraphs.trim().startsWith('<')
      ? xmlOrParagraphs
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${(Array.isArray(xmlOrParagraphs) ? xmlOrParagraphs : [xmlOrParagraphs])
      .map((p) => `<w:p><w:r><w:t>${escapeXmlText(p)}</w:t></w:r></w:p>`)
      .join('\n    ')}
  </w:body>
</w:document>`;

  const encoder = new TextEncoder();
  const nameBytes = encoder.encode('word/document.xml');
  const dataBytes = encoder.encode(xmlContent);

  const lfhSize = 30 + nameBytes.length;
  const cdSize = 46 + nameBytes.length;
  const eocdSize = 22;
  const totalSize = lfhSize + dataBytes.length + cdSize + eocdSize;

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  // Local File Header
  view.setUint32(0, SIG_LOCAL_HEADER, true);
  view.setUint16(4, 20, true); // version needed
  view.setUint16(6, 0, true); // flags
  view.setUint16(8, 0, true); // method 0 = stored
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, 0, true); // crc32 (not checked by parser)
  view.setUint32(18, dataBytes.length, true);
  view.setUint32(22, dataBytes.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  out.set(nameBytes, 30);
  out.set(dataBytes, lfhSize);

  // Central Directory File Header
  const cdOffset = lfhSize + dataBytes.length;
  view.setUint32(cdOffset, SIG_CENTRAL_DIR, true);
  view.setUint16(cdOffset + 4, 20, true);
  view.setUint16(cdOffset + 6, 20, true);
  view.setUint16(cdOffset + 8, 0, true);
  view.setUint16(cdOffset + 10, 0, true); // method 0 = stored
  view.setUint16(cdOffset + 12, 0, true);
  view.setUint16(cdOffset + 14, 0, true);
  view.setUint32(cdOffset + 16, 0, true);
  view.setUint32(cdOffset + 20, dataBytes.length, true);
  view.setUint32(cdOffset + 24, dataBytes.length, true);
  view.setUint16(cdOffset + 28, nameBytes.length, true);
  view.setUint16(cdOffset + 30, 0, true);
  view.setUint16(cdOffset + 32, 0, true);
  view.setUint16(cdOffset + 34, 0, true);
  view.setUint16(cdOffset + 36, 0, true);
  view.setUint32(cdOffset + 38, 0, true);
  view.setUint32(cdOffset + 42, 0, true); // local header offset = 0
  out.set(nameBytes, cdOffset + 46);

  // End of Central Directory
  const eocdOffset = cdOffset + cdSize;
  view.setUint32(eocdOffset, SIG_EOCD, true);
  view.setUint16(eocdOffset + 4, 0, true);
  view.setUint16(eocdOffset + 6, 0, true);
  view.setUint16(eocdOffset + 8, 1, true);
  view.setUint16(eocdOffset + 10, 1, true);
  view.setUint32(eocdOffset + 12, cdSize, true);
  view.setUint32(eocdOffset + 16, cdOffset, true);
  view.setUint16(eocdOffset + 20, 0, true);

  return out;
}
