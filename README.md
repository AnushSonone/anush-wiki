# anush.wiki

this repo follows the plain, content-first idea behind [motherfuckingwebsite.com](https://motherfuckingwebsite.com/): the site you actually read is **semantic html**, **one global stylesheet** (`src/styles.css`), and no client framework for the pages themselves. layout and palette follow the mfws-style rules in `specs/` (not warmed “product ui” chrome).

sorry about the **next.js** and **typescript** at the root. they are only here to host a **small first-party assistant**: **https** routes under `app/api/` let the wiki defer-load `chat-widget.js`, call a model **server-side** (keys never shipped to the browser), enforce **phase a** quota (signed cookie + kv/redis), and assemble **grounded context** from the same `src/` files readers see. the reading experience stays static html + css; next is the deployment shell so those routes ship on **vercel** next to the mirrored static files.

### how the pieces fit

| area | role |
|------|------|
| **`src/`** | source of truth: `index.html`, `about.html`, `blog/*.html`, `styles.css`, assets, and the résumé pdf the server may ingest for context. |
| **`public/`** | **generated** mirror of `src/` for next’s static file serving. created by `scripts/sync-wiki-public.mjs` during install/build dev flows; **gitignored**. the chat widget is **not** dropped here—it is served at **`GET /api/chat/widget`**. |
| **`app/`** | next **app router**: `layout.tsx`; `app/api/chat/route.ts` (completions, quota, corpus assembly); `app/api/chat/widget/route.ts` (serves `assistant/widget/chat-widget.js`). |
| **`lib/`** | server-only helpers: quota cookie signing, kv/redis usage, wiki/html stripping, pdf text for prompts. |
| **`assistant/`** | `system-prompt.txt`, optional `knowledge/*.txt`, `CORPUS_REVISION`, and **`widget/chat-widget.js`** (vanilla js injected by the html—no react bundle on wiki pages). |
| **`middleware.ts`** | request edge behavior aligned with how static paths should resolve. |
| **`scripts/`** | `sync-wiki-public.mjs` mirrors `src/` → `public/`; `verify-chat-widget-route.mjs` is wired as `npm run verify:chat-widget` in `package.json` for deployment checks. |
| **`specs/`** | normative design + assistant requirements (`design-philosophy-and-constraints.md`, `feature-assistant-chat.md`, page specs, etc.). |
| **`vercel.json`** | forces the **next** builder so `/` and **`/api/*`** come from one **next build** (see file comments; mis-set dashboard “root” or “output” can break this). |

server env names (model providers, quota cookie secret, kv/upstash, kill-switch) are listed in **`.env.example`** for operators wiring production or preview.

for process and validation expectations, see **`AGENTS.md`**.
