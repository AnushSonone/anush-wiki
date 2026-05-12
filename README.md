# anush.wiki (static wiki + optional first-party assistant)

personal site: bio, blog, and contact — authored as plain html + css under `src/`.

an optional defer-loaded script **`/api/chat/widget`** + `**/api/chat**` route (spec’d in `[specs/feature-assistant-chat.md](specs/feature-assistant-chat.md)`) lets readers ask grounded questions via a corpus kept in-repo under `assistant/`. model keys stay on the server only.

## preview locally — static wiki only (`src/` unchanged)

pure html preview (no assistant script success — `/api/chat/widget` is not emitted by `python http.server src`):

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

open `http://127.0.0.1:3000/`. `npm run dev` and `npm run build` run `sync-wiki`, which mirrors only **`src/*` → `public/`** (HTML/CSS assets). **`GET /api/chat/widget`** serves **`assistant/widget/chat-widget.js`** from **`app/api/chat/widget/route.ts`** — it is **not** copied into `public/`. canonical wiki markup stays under `src/`; after editing the widget source, save **`assistant/widget/chat-widget.js`** and redeploy (or restart dev).

## deploy on vercel (next.js)

content html/css lives under `src/`, but **`package.json`**, **`app/`**, **`middleware.ts`**, and **`vercel.json`** live at the **repository root**. the wiki assistant **`/api/*`** routes require a real **`next build`**.

in **project → settings → general**:

1. **root directory** — leave **empty** (repo root). if this is set to **`src`**, vercel ignores root **`vercel.json`** / **`package.json`** and deploys static html only → **`/api/chat`** and **`/api/chat/widget`** return **`NOT_FOUND`**. healthy builds show **`Installing dependencies`** and **`next build`** in logs (minutes), not **`Build Completed in /vercel/output [18ms]`**.
2. **framework preset** — **next.js**.
3. **output directory** — leave **empty**. **never** point this at **`public`** unless you know what you’re doing: **`public/` is gitignored** and only appears **after** **`npm run build`** runs **`sync-wiki`**. if the build step is skipped (wrong framework / root) but output directory is still **`public`**, vercel ships **an empty folder** → **`NOT_FOUND` on `/`**, **`/api/*`**, everything. healthy logs show **`Installing dependencies`** + **`next build`** taking **~1–3+ minutes**, not **`Build Completed in /vercel/output [~100ms]`**.
4. **build command** — **`npm run build`** (already the repo default via **`vercel.json`**).

### production suddenly 404 everywhere

1. **rollback:** **deployments** → open a recent deployment whose **preview URL** still returns **200** for **`/`** → **⋯ → promote to production** (or **instant rollback**).
2. **fix settings:** clear **output directory** (empty field), **root directory** empty, **framework** next.js, then **redeploy** and confirm build logs include **`npm install`** and **`Creating an optimized production build`** from next.

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

**Assistant bundle sanity (production parity, wipes `.next/` + `public/` then rebuilds):** run **`npm run verify:chat-widget`** — asserts **`GET /api/chat/widget`** is **200** and **`public/chat-widget.js` does not exist** after sync (bundle is served only by **`app/api/chat/widget/route.ts`**).