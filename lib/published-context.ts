import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';

/** Inner implementation — avoids pdf-parse package root (`index.js`) which runs a debug file read when `!module.parent` (breaks Next bundles). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  data: Buffer,
) => Promise<{ text: string }>;

/**
 * Knowledge base for the assistant: the résumé PDF and the published wiki pages,
 * cut into small named chunks once per process. `lib/knowledge-router.ts` picks
 * which chunks a given turn gets; nothing here is sent to the model unasked.
 */
export type Chunk = { id: string; title: string; text: string };
export type KnowledgeBase = { chunks: Chunk[]; index: string };

/** Single shipped résumé PDF path relative to src/ (must stay in-repo). */
const RESUME_FILE_REL = path.join('docs', 'Anush_Sonone_Resume_2028_Current.pdf');

const BLOG_EXCERPT_CHARS = 1200;
const COLLEGE_EXCERPT_CHARS = 1500;
const RESUME_FALLBACK_CHARS = 4000;

/** Blog posts folded into a résumé entry's chunk, keyed by entry id. */
const BLOG_FOR_ENTRY: Record<string, string> = {
  killmycluster: 'raft.html',
  faultline: 'faultline.html',
  'profluento-ai': 'profluento.html',
};

/** Human labels for the one-line index the model always sees. Order is display order. */
const INDEX_LABELS: Array<[string, string]> = [
  ['overview', 'school'],
  ['pwc', 'pwc'],
  ['visa', 'visa'],
  ['afterquery', 'afterquery'],
  ['profluento-ai', 'profluento'],
  ['cdk-global', 'cdk global'],
  ['killmycluster', 'killmycluster'],
  ['faultline', 'faultline'],
  ['lapsynk', 'lapsynk'],
  ['skills', 'skills'],
  ['college-journey', 'college application essay'],
];

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

/* ---------- résumé parsing ---------- */

const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';
/** An entry header line in Experience / Projects ends with a month-year. */
const ENDS_WITH_MONTH_YEAR = new RegExp(`${MONTH}\\.?\\s+\\d{4}\\s*$`);
/** pdf-parse glues the company name to the date ("VisaMay 2026"); split them. */
const GLUED_MONTH = new RegExp(`([^\\s|])(${MONTH}\\.?\\s+\\d{4})`, 'g');
/** Everything from the first month-year onward is the date range, not the name. */
const FROM_MONTH_YEAR = new RegExp(`\\s*${MONTH}\\.?\\s+\\d{4}[\\s\\S]*$`);
/** "InternAustin, TX" / "CTOSan Francisco, CA" → space before the city. */
const GLUED_CITY = /(\S)([A-Z][a-z]+(?: [A-Z][a-z]+)*, [A-Z]{2})$/;

const SECTION_HEADERS = ['Education', 'Experience', 'Projects', 'Technical Skills'];

type Entry = { id: string; title: string; header: string; role: string; bullets: string[] };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function tidySpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function tidyHeader(line: string): string {
  return tidySpaces(line.replace(GLUED_MONTH, '$1 $2').replace(/\s*\|\s*/g, ' | '));
}

function tidyRole(line: string): string {
  return tidySpaces(line.replace(GLUED_CITY, '$1 $2'));
}

/** "AfterQuery (YC W25) Oct. 2025 – May 2026" → "AfterQuery"; "KillMyCluster: A ... | Go" → "KillMyCluster". */
function entryName(header: string): string {
  const beforePipe = header.split('|')[0] ?? header;
  const noDates = beforePipe.replace(FROM_MONTH_YEAR, '');
  const cut = noDates.split(/[(:]/)[0] ?? noDates;
  return tidySpaces(cut);
}

/** Split the raw pdf text into named sections; blank lines and lone bullets dropped. */
function splitSections(raw: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current = 'header';
  sections.set(current, []);
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === '•') continue;
    if (SECTION_HEADERS.includes(line)) {
      current = line;
      sections.set(current, []);
      continue;
    }
    sections.get(current)?.push(line);
  }
  return sections;
}

/**
 * Entries start at a line ending in a month-year. A project title can wrap onto
 * its own line ahead of a "| stack … Jul. 2026" line; in that case the title was
 * read as the previous entry's last bullet and is pulled back out.
 */
function parseEntries(lines: string[], hasRoleLine: boolean): Entry[] {
  const entries: Entry[] = [];
  let current: Entry | null = null;
  let expectRole = false;

  for (const line of lines) {
    if (ENDS_WITH_MONTH_YEAR.test(line)) {
      let header = line;
      if (line.startsWith('|') && current) {
        const wrappedTitle = current.bullets.pop() ?? '';
        header = `${wrappedTitle} ${line}`;
      }
      if (current) entries.push(current);
      const tidy = tidyHeader(header);
      const name = entryName(tidy) || `entry-${entries.length + 1}`;
      current = { id: slugify(name), title: name, header: tidy, role: '', bullets: [] };
      expectRole = hasRoleLine;
      continue;
    }
    if (!current) continue;
    if (expectRole) {
      current.role = tidyRole(line);
      expectRole = false;
      continue;
    }
    current.bullets.push(tidySpaces(line));
  }
  if (current) entries.push(current);
  return entries;
}

function entryText(e: Entry): string {
  const parts = [e.header];
  if (e.role) parts.push(e.role);
  if (e.bullets.length) parts.push(e.bullets.join('; '));
  return parts.join('. ') + '.';
}

/* ---------- loading ---------- */

async function readIfPresent(abs: string): Promise<string> {
  try {
    await fs.access(abs, fsConstants.R_OK);
    return await fs.readFile(abs, 'utf8');
  } catch {
    return '';
  }
}

async function loadResumeRaw(srcRoot: string): Promise<string> {
  const abs = path.join(srcRoot, RESUME_FILE_REL);
  if (!isInsideDir(srcRoot, abs)) return '';
  try {
    const parsed = await pdfParse(await fs.readFile(abs));
    return parsed.text || '';
  } catch (e) {
    console.warn('[published-context] résumé pdf unavailable', e instanceof Error ? e.message : e);
    return '';
  }
}

/** Plain text of one blog post's <main>, so the shared nav chrome stays out of the notes. */
async function blogExcerpt(srcRoot: string, file: string, max: number): Promise<string> {
  const abs = path.join(srcRoot, 'blog', file);
  if (!isInsideDir(srcRoot, abs)) return '';
  const html = await readIfPresent(abs);
  if (!html) return '';
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? html;
  /** The nav's decorative hieroglyph glyphs are noise for the model. */
  const plain = htmlToPlainText(main).replace(/[\u{13000}-\u{1342F}]/gu, '').replace(/\s+/g, ' ').trim();
  return clip(plain, max);
}

function buildIndex(chunks: Chunk[]): string {
  const present = new Set(chunks.map((c) => c.id));
  const labels = INDEX_LABELS.filter(([id]) => present.has(id)).map(([, label]) => label);
  for (const c of chunks) {
    if (!INDEX_LABELS.some(([id]) => id === c.id) && !['experience-all', 'projects-all', 'resume'].includes(c.id)) {
      labels.push(c.id);
    }
  }
  return `notes on file: ${labels.join(', ')}.`;
}

async function buildKnowledgeBase(): Promise<KnowledgeBase> {
  const srcRoot = path.join(process.cwd(), 'src');
  const chunks: Chunk[] = [];

  const resumeRaw = await loadResumeRaw(srcRoot);
  const sections = splitSections(resumeRaw);
  const experience = parseEntries(sections.get('Experience') ?? [], true);
  const projects = parseEntries(sections.get('Projects') ?? [], false);

  /** At-a-glance bio: contact, education, one line per job, project titles. No bullets. */
  const education = (sections.get('Education') ?? []).map((l) => tidyRole(tidyHeader(l))).join('. ');
  const contact = (sections.get('header') ?? []).join(' ');
  const overview = [
    contact,
    education ? `Education: ${education}.` : '',
    experience.length ? `Experience: ${experience.map((e) => `${e.title} (${e.role || 'intern'})`).join(', ')}.` : '',
    projects.length ? `Projects: ${projects.map((p) => p.header.split('|')[0]?.trim() ?? p.title).join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
  if (overview) chunks.push({ id: 'overview', title: 'overview', text: overview });

  if (experience.length >= 2) {
    for (const e of experience) {
      let text = entryText(e);
      const blog = BLOG_FOR_ENTRY[e.id];
      if (blog) {
        const excerpt = await blogExcerpt(srcRoot, blog, BLOG_EXCERPT_CHARS);
        if (excerpt) text += `\nfrom the blog post: ${excerpt}`;
      }
      chunks.push({ id: e.id, title: e.title, text });
    }
    chunks.push({
      id: 'experience-all',
      title: 'all experience',
      text: experience.map((e) => `${e.header}${e.role ? `: ${e.role}` : ''}`).join('\n'),
    });
  } else {
    console.warn('[published-context] résumé layout not recognised; falling back to one chunk');
    const whole = tidySpaces(resumeRaw);
    if (whole) chunks.push({ id: 'resume', title: 'résumé', text: clip(whole, RESUME_FALLBACK_CHARS) });
  }

  if (projects.length > 0) {
    for (const p of projects) {
      let text = entryText(p);
      const blog = BLOG_FOR_ENTRY[p.id];
      if (blog) {
        const excerpt = await blogExcerpt(srcRoot, blog, BLOG_EXCERPT_CHARS);
        if (excerpt) text += `\nfrom the blog post: ${excerpt}`;
      }
      chunks.push({ id: p.id, title: p.title, text });
    }
    chunks.push({
      id: 'projects-all',
      title: 'all projects',
      text: projects.map((p) => `${p.header}${p.bullets[0] ? `: ${p.bullets[0]}` : ''}`).join('\n'),
    });
  }

  const skills = (sections.get('Technical Skills') ?? []).join('\n');
  if (skills) chunks.push({ id: 'skills', title: 'technical skills', text: skills });

  const college = await blogExcerpt(srcRoot, 'college-application-journey.html', COLLEGE_EXCERPT_CHARS);
  if (college) chunks.push({ id: 'college-journey', title: 'college application journey (blog)', text: college });

  return { chunks, index: buildIndex(chunks) };
}

/**
 * Per-process cache. A new deployment is a new process, so a redeploy still picks
 * up content changes, and warm invocations never re-parse the PDF.
 */
let knowledgeBasePromise: Promise<KnowledgeBase> | undefined;

export function loadKnowledgeBase(): Promise<KnowledgeBase> {
  knowledgeBasePromise ??= buildKnowledgeBase().catch((e) => {
    console.error('[published-context] knowledge base failed to load', e instanceof Error ? e.message : e);
    knowledgeBasePromise = undefined;
    return { chunks: [], index: 'notes on file: (none loaded).' };
  });
  return knowledgeBasePromise;
}
