import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

/** Serves the wiki assistant bundle at `/chat-widget.js` so it always ships with the serverless bundle (avoids missing `public/` files on some hosts). */
export async function GET() {
  const fp = path.join(process.cwd(), 'assistant', 'widget', 'chat-widget.js');
  const body = await readFile(fp, 'utf8');
  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
