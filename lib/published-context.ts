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
  const rootFiles = ['index.html'];

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
    let html = names.filter((n) => WIKI_HTML_RE.test(n)).sort((a, b) => a.localeCompare(b));
    /** Blog hub snapshot first when present (ordering only). */
    if (html.includes('index.html')) {
      html = ['index.html', ...html.filter((n) => n !== 'index.html')];
    }
    for (const n of html) {
      ordered.push(path.join(blogDir, n));
    }
  } catch {
    /* no blog dir */
  }

  return ordered;
}

/**
 * Per-process caches. A new deployment is a new process, so a redeploy still picks
 * up content changes — but warm invocations stop re-reading every page and re-running
 * the PDF parser on every single message.
 */
let wikiSnapshotCache: { maxChars: number; value: string } | null = null;
let resumeCache: { maxChars: number; value: string } | null = null;

/**
 * Plain-text snapshot of published wiki pages from src/.
 *
 * Budget is per file, not one running total. A single running budget meant the
 * longest early page consumed almost all of it and later pages were truncated or
 * dropped entirely — the raft project page never loaded at all.
 */
export async function loadWikiPlainSnapshot(maxChars: number): Promise<string> {
  if (wikiSnapshotCache?.maxChars === maxChars) return wikiSnapshotCache.value;

  const srcRoot = path.join(process.cwd(), 'src');
  try {
    await fs.access(srcRoot, fsConstants.R_OK);
  } catch {
    return '(wiki source directory unavailable.)';
  }

  const files = (await readWikiHtmlFiles(srcRoot)).filter((abs) => isInsideDir(srcRoot, abs));
  if (files.length === 0) return '(no wiki html loaded.)';

  /** Even split, with a floor so a long file list cannot starve every page. */
  const perFile = Math.max(1200, Math.floor(maxChars / files.length));

  const chunks: string[] = [];
  for (const abs of files) {
    const rel = path.relative(srcRoot, abs);
    let raw: string;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const plain = clip(htmlToPlainText(raw), perFile);
    if (!plain) continue;
    chunks.push(`--- ${rel.replace(/\\/g, '/')} ---\n${plain}\n`);
  }

  const value = clip(chunks.join('\n').trim(), maxChars) || '(no wiki html loaded.)';
  wikiSnapshotCache = { maxChars, value };
  return value;
}

/** Extract résumé text from the shipped PDF under src/docs/. */
export async function loadResumePdfPlain(maxChars: number): Promise<string> {
  if (resumeCache?.maxChars === maxChars) return resumeCache.value;

  const srcRoot = path.join(process.cwd(), 'src');
  const abs = path.join(srcRoot, RESUME_FILE_REL);
  if (!isInsideDir(srcRoot, abs)) return '(résumé path invalid.)';

  let buf: Buffer;
  try {
    buf = await fs.readFile(abs);
  } catch {
    return '(résumé pdf missing — rely on home page in wiki snapshot.)';
  }

  let value: string;
  try {
    const parsed = await pdfParse(buf);
    const text = (parsed.text || '').replace(/\s+/g, ' ').trim();
    value = clip(text, maxChars) || '(résumé pdf had no extractable text.)';
  } catch {
    return '(résumé pdf could not be parsed — rely on home snapshot.)';
  }

  resumeCache = { maxChars, value };
  return value;
}
