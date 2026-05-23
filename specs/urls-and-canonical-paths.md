# urls and canonical paths

**Depends on:** [design-philosophy-and-constraints.md](./design-philosophy-and-constraints.md), [build-and-request-pipeline.md](./build-and-request-pipeline.md).

normative presentation rules so the address bar stays simple (especially **no `/index.html` on home**) while files on disk remain plain `.html` for static authoring and previews.

## implementation notes (next.js)

- **`next.config.ts` `rewrites().beforeFiles`:** internal **`/` → `/index.html`** (serves **`public/index.html`**). **do not** replace this with middleware **`rewrite`** **`/`** unless you re-validate the whole stack — middleware re-entrancy **`/`↔`/index.html`** caused **`ERR_TOO_MANY_REDIRECTS`**.
- **`middleware.ts`:** **`matcher: ['/index.html']` only** + **`308`** redirect to **`/`**. middleware **does not run** on **`/`**, so **`beforeFiles`** is not fighting a second middleware pass.
- **do not** use **`next.config` `redirects()`** **`/index.html`→`/`** together with middleware **`rewrite`** **`/`→`/index.html`** in this repo; **dev** can re-apply redirects after internal rewrites and loop.

---

## filenames on disk vs public paths

| concern | rule |
|---------|------|
| **authoring** | home remains **`src/index.html`** on disk — same basename every static server understands for `npm run sync-wiki`, `python3 -m http.server`, and local file workflows. |
| **mirrored build** | `scripts/sync-wiki-public.mjs` copies the same filenames into **`public/`** (gitignored). filenames are implementation detail readers need not see. |
| **server / edge** | **`next.config.ts` `beforeFiles`** rewrites **`GET /`** → **`/index.html`** internally; **`middleware.ts`** redirects explicit **`GET /index.html`** → **`/`** (`308`). **must not** pair **`/`** middleware rewrite with **`/index.html`→`/`** `redirects()` or a second middleware pass on **`/index.html`** without the **`matcher`** split above — that pattern produced **`ERR_TOO_MANY_REDIRECTS`**. |

other pages (**`about.html`**, **`blog/*.html`**) MAY keep `.html` in the path until clean-url rewrites ship; **this spec mandates** canonical home **`/` only**, not naked extensions for those routes.

---

## internal links (`src/**/*.html`)

- **home (`/`):** every `<a>` that targets home MUST use **`href="/"`** (root-absolute), not `index.html`, not `../index.html`, and not `/index.html` (avoid the redirect hop).
- **site title / name (when linked):** same — **`href="/"`**.
- **skip links, fragment-only `href` values,** and machine URLs stay unchanged.

rationale: root-absolute links work from **`/`**, **`/about.html`**, and **`/blog/...`** without path mistakes and keep the visible URL at **`/`** after navigation.

---

## acceptance

1. opening **`https://<host>/`** shows home; the location bar does not need to show `index.html`.
2. navigating to **`https://<host>/index.html`** ends as **`/`** (redirect).
3. no committed wiki page links to **`index.html`** for home.

---

## operator notes

- **static-only hosting** (no next): many hosts already map `/` → `index.html` without exposing it; if a host lists both `/` and `/index.html` as separate URLs, configure a host-level redirect to `/` to match this spec.
- **assistant corpus** still ingests **`src/index.html`** by filename — that is unrelated to visitor-facing URLs.
