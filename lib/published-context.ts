import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';

/** Inner implementation — avoids pdf-parse package root (`index.js`) which runs a debug file read when `!module.parent` (breaks Next bundles). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  data: Buffer,
) => Promise<{ text: string }>;

/** Safe basename for wiki HTML files under src/. */
const WIKI_HTML_RE = /^[a-z0-9][a-z0-9_-]*\.html$/;

/** Single shipped résumé PDF path relative to src/ (must stay in-repo). */
const RESUME_FILE_REL = path.join('docs', 'Anush_Sonone_Resume_2028_Current.pdf');

function clip(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}…`;
}

function isInsideDir(dir: string, candidate: string): boolean {
  const rel = path.relative(dir, candidate);
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel);
}

/** Strip tags/scripts/styles enough for model context (not a full HTML parser). */
export function htmlToPlainText(html: string): string {
  return clip(
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim(),
    500000,
  );
}

async function readWikiHtmlFiles(srcRoot: string): Promise<string[]> {
  const ordered: string[] = [];
  const rootFiles = ['index.html', 'about.html'];

  for (const name of rootFiles) {
    const fp = path.join(srcRoot, name);
    try {
      await fs.access(fp, fsConstants.R_OK);
      ordered.push(fp);
    } catch {
      /* skip missing */
    }
  }

  const blogDir = path.join(srcRoot, 'blog');
  try {
    await fs.access(blogDir, fsConstants.R_OK);
    const names = await fs.readdir(blogDir);
    const html = names.filter((n) => WIKI_HTML_RE.test(n)).sort((a, b) => a.localeCompare(b));
    for (const n of html) {
      ordered.push(path.join(blogDir, n));
    }
  } catch {
    /* no blog dir */
  }

  return ordered;
}

/** Plain-text snapshot of published wiki pages from src/ (refreshes every request — no static corpus bump). */
export async function loadWikiPlainSnapshot(maxChars: number): Promise<string> {
  const srcRoot = path.join(process.cwd(), 'src');
  try {
    await fs.access(srcRoot, fsConstants.R_OK);
  } catch {
    return '(wiki source directory unavailable.)';
  }

  const files = await readWikiHtmlFiles(srcRoot);
  let out = '';
  for (const abs of files) {
    if (!isInsideDir(srcRoot, abs)) continue;
    const rel = path.relative(srcRoot, abs);
    let raw: string;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const plain = htmlToPlainText(raw);
    if (!plain) continue;
    const chunk = `--- ${rel.replace(/\\/g, '/')} ---\n${plain}\n\n`;
    if (out.length + chunk.length >= maxChars) {
      out += clip(chunk, Math.max(0, maxChars - out.length));
      break;
    }
    out += chunk;
  }

  return clip(out.trim(), maxChars) || '(no wiki html loaded.)';
}

/** Extract résumé text from the shipped PDF under src/docs/. */
export async function loadResumePdfPlain(maxChars: number): Promise<string> {
  const srcRoot = path.join(process.cwd(), 'src');
  const abs = path.join(srcRoot, RESUME_FILE_REL);
  if (!isInsideDir(srcRoot, abs)) return '(résumé path invalid.)';

  let buf: Buffer;
  try {
    buf = await fs.readFile(abs);
  } catch {
    return '(résumé pdf missing — rely on about.html in wiki snapshot.)';
  }

  try {
    const parsed = await pdfParse(buf);
    const text = (parsed.text || '').replace(/\s+/g, ' ').trim();
    return clip(text, maxChars) || '(résumé pdf had no extractable text.)';
  } catch {
    return '(résumé pdf could not be parsed — rely on about.html.)';
  }
}
