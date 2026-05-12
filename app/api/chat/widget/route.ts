import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

/** Serves the wiki assistant bundle for `<script src="/api/chat/widget">` (avoids fragile `/chat-widget.js` App Router segments on some hosts). */
export async function GET() {
  const fp = path.join(process.cwd(), 'assistant', 'widget', 'chat-widget.js');
  const body = await readFile(fp, 'utf8');
  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control':
        process.env.NODE_ENV === 'production'
          ? 'public, max-age=0, must-revalidate'
          : 'no-store',
    },
  });
}
