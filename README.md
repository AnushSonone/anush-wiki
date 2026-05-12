# anush.wiki (static wiki + optional first-party assistant)

personal site: bio, blog, and contact — authored as plain html + css under `src/`.

an optional defer-loaded `**/chat-widget.js**` + `**/api/chat**` route (spec’d in `[specs/feature-assistant-chat.md](specs/feature-assistant-chat.md)`) lets readers ask grounded questions via a corpus kept in-repo under `assistant/`. model keys stay on the server only.

## preview locally — static wiki only (`src/` unchanged)

pure html preview (no assistant script success — `/chat-widget.js` is not emitted by `python http.server src`):

```bash
cd src && python3 -m http.server 8080
```

open `http://127.0.0.1:8080/`.

## preview locally — wiki + assistant (next dev)

```bash
cp .env.example .env.local   # model keys + quota vars (see “secrets & kill-switch”); never commit `.env*`
npm install
npm run dev
```

open `http://127.0.0.1:3000/`. `npm run dev` and `npm run build` run `sync-wiki`, which mirrors `src/*` → `public/` and copies `**assistant/widget/chat-widget.js**` → `**public/chat-widget.js**`. **`public/chat-widget.js` is tracked in git** (rest of `public/` stays ignored) so production always serves `/chat-widget.js`. canonical wiki markup stays under `src/`; after editing the widget source, run **`npm run sync-wiki`** and commit **`assistant/widget/chat-widget.js`** + **`public/chat-widget.js`** together.

## secrets & kill-switch

configure keys through environment variables consumed by `app/api/chat/route.ts` — see `.env.example`:

- **`GOOGLE_*` / `OPENAI_*`** — model providers.
- **`DISABLE_CHAT`** — kill-switch for the endpoint.
- **Phase A quota:** **`QUOTA_COOKIE_SECRET`** (HMAC signing), plus **`KV_REST_API_URL`** / **`KV_REST_API_TOKEN`** (Vercel KV) **or** **`UPSTASH_REDIS_REST_*`** (Upstash). local dev without Redis: set **`QUOTA_DISABLED_LOCAL=1`** with **`NODE_ENV=development`** only (never in production).

## principles

constraints live in `**specs/design-philosophy-and-constraints.md**`. brief recap:

- **content first** — semantic html, single global `**src/styles.css`**, landmarks + heading order, descriptive link labels.
- **small core payload** — the mfws-style budget still applies to the trio `index/about/styles`.
- **no silent third-party widgets** beyond the narrowly documented assistant flow.

see also `[AGENTS.md](AGENTS.md)` for validation steps before committing.