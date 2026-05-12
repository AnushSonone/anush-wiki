import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)));
const wikiSrc = path.join(root, 'src');
const publicDir = path.join(root, 'public');

await fs.promises.mkdir(publicDir, { recursive: true });
await fs.promises.cp(wikiSrc, publicDir, { recursive: true, force: true });

/** `/chat-widget.js` is served only by `app/chat-widget.js/route.ts` (never copied here) so Next does not prefer a static file that may be missing on the CDN. */
console.warn('sync-wiki: src/ → public/ (wiki static mirror only; assistant script is GET /chat-widget.js route)');
