import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)));
const wikiSrc = path.join(root, 'src');
const publicDir = path.join(root, 'public');

await fs.promises.mkdir(publicDir, { recursive: true });
await fs.promises.cp(wikiSrc, publicDir, { recursive: true, force: true });

console.warn('sync-wiki: src/ → public/ (wiki static mirror only; assistant script is GET /api/chat/widget)');
