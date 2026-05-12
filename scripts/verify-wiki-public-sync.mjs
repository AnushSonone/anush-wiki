import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)));
const wikiSrc = path.join(root, 'src');
const publicDir = path.join(root, 'public');

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walkFiles(fp)));
    } else if (ent.isFile()) {
      out.push(fp);
    }
  }
  return out;
}

async function sha256File(fp) {
  const buf = await fs.readFile(fp);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  let srcFiles;
  try {
    srcFiles = await walkFiles(wikiSrc);
  } catch (e) {
    console.error('[verify-wiki-public] missing src/: edit wiki under src/ first.');
    process.exitCode = 1;
    return;
  }

  const mismatches = [];

  for (const absSrc of srcFiles) {
    const rel = path.relative(wikiSrc, absSrc);
    const absPub = path.join(publicDir, rel);
    try {
      const [hSrc, hPub] = await Promise.all([
        sha256File(absSrc),
        sha256File(absPub),
      ]);
      if (hSrc !== hPub) {
        mismatches.push(rel);
      }
    } catch {
      mismatches.push(`${rel} (missing under public/)`);
    }
  }

  if (mismatches.length) {
    console.error(
      '[verify-wiki-public] FAIL: public/ does not mirror src/ for:',
      mismatches.join(', '),
    );
    console.error('[verify-wiki-public] Fix: npm run sync-wiki');
    process.exitCode = 1;
    return;
  }

  console.warn('[verify-wiki-public] OK: public/ matches src/ for all wiki files');
}

await main();
