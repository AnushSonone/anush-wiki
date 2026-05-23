# build and request pipeline (wiki + next shell)

**Depends on:** [design-philosophy-and-constraints.md](./design-philosophy-and-constraints.md), [urls-and-canonical-paths.md](./urls-and-canonical-paths.md).

normative description of **how sources become a running site** and **how a browser request hits the wiki home** without redirect loops. keep this aligned with **`package.json`**, **`next.config.ts`**, **`middleware.ts`**, and **`scripts/sync-wiki-public.mjs`**.

---

## what is “source of truth” vs generated

| path | role |
|------|------|
| **`src/`** | committed wiki **authoring** tree: `*.html`, `styles.css`, assets, résumé pdf path used by the assistant. |
| **`public/`** | **generated** copy of **`src/`** only (no assistant bundle). created by **`npm run sync-wiki`**; **gitignored**. next serves static files here (e.g. **`public/index.html`** at URL **`/index.html`**). |
| **`app/`** | next **app router** for **`/api/*`** only (no `app/page.tsx` for the wiki). |
| **`assistant/`** | server + widget source; widget is served at **`GET /api/chat/widget`**, not copied into **`public/`**. |

---

## compile / dev commands (order)

1. **`npm install`** — runs **`postinstall`** → **`sync-wiki`** (`src/` → `public/`).
2. **`npm run dev`** — **`predev`** → **`sync-wiki`**, then **`next dev`** (default host **`127.0.0.1`** in this repo).
3. **`npm run build`** — **`prebuild`** → **`sync-wiki`**, then **`next build`** (bundles middleware, api routes, static **`public/`**).

operators must not hand-edit **`public/`**; change **`src/`** and re-run sync (automatic on dev/build) or **`npm run sync-wiki`**.

---

## wiki home request flow (avoid `ERR_TOO_MANY_REDIRECTS`)

next may **re-run middleware** after an internal **`rewrite`**. if middleware **rewrites** **`/` → `/index.html`** *and* any rule **redirects** **`/index.html` → `/`**, the stack can recurse: **`/` → rewrite → `/index.html` → redirect → `/` → …**.

**stable shape for this repo:**

1. **`next.config.ts` `rewrites().beforeFiles`:** internal rewrites to mirrored **`.html`** files (not done in middleware):
   - **`/` → `/index.html`**
   - **`/blog` → `/blog/index.html`** and **`/blog/` → `/blog/index.html`** — files under **`public/`** are **not** served as automatic directory indexes; without these, **`/blog`** is handled by the App Router and returns **404**.
2. **`middleware.ts`:** **`matcher` array** — explicit **`.html`** bookmark cleanup only (**each `308` redirect**), **never** on **`/`** or **`/blog/`** themselves:  
   - **`/index.html` → `/`**  
   - **`/about.html` → `/`** (legacy bookmark)  
   - **`/blog/index.html` → `/blog/`**  
   Because those paths are excluded from **`matcher`**, **`beforeFiles`** rewrites are **not** followed by a conflicting second middleware pass (the failure mode that caused **`index.html`↔`/`** loops when rewrite + redirect both touched the same hop).

**do not** combine **`next.config` `redirects()`** for **`/index.html` → `/`** with middleware **`rewrite`** **`/` → `/index.html`** in configurations that re-evaluate redirects on the rewritten path (dev has differed from prod); the split above avoids that class of bugs.

---

## other routes

- **`/blog/*.html`** (posts + **`blog/index.html`** hub), **`/docs/*`**, styles, favicon — served as static files from **`public/`** (mirrored from **`src/`**).
- **`/api/chat`**, **`/api/chat/widget`** — app router handlers; keys and quota stay server-side per **`feature-assistant-chat.md`**.

---

## deployment

**`vercel.json`** pins the **next** builder. production should mirror the same home pipeline; edge-only redirects for **`/index.html`** are optional extras if the platform adds them — the in-app rules above are sufficient.

---

## acceptance (operator smoke)

1. **`GET /`** → **200** html; **no** redirect chain.
2. **`GET /index.html`** → **308** **location: /**; follow-up **`GET /`** → **200**.
3. **`GET /blog`** → **200** html (same document as **`/blog/`); **no** App Router **404**.
4. **`GET /blog/`** → **200** html.
5. **`GET /blog/index.html`** → **308** **location: /blog/**; follow-up **`GET /blog/`** → **200**.
6. **`GET /about.html`** → **308** **location: /**.
7. **`npm run dev`** and **`next start`** behave the same for **(1)–(6)**.
