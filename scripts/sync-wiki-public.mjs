import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)));
const wikiSrc = path.join(root, 'src');
const widgetSrc = path.join(root, 'assistant', 'widget', 'chat-widget.js');
const publicDir = path.join(root, 'public');

await fs.promises.mkdir(publicDir, { recursive: true });
await fs.promises.cp(wikiSrc, publicDir, { recursive: true, force: true });

await fs.promises.copyFile(widgetSrc, path.join(publicDir, 'chat-widget.js'));
console.warn('sync-wiki: src/ → public/ + assistant/widget/chat-widget.js → public/chat-widget.js');
