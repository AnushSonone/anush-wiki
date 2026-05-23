# urls and canonical paths

**Depends on:** [design-philosophy-and-constraints.md](./design-philosophy-and-constraints.md), [build-and-request-pipeline.md](./build-and-request-pipeline.md).

normative presentation rules so address bars stay predictable (especially **no `/index.html` on home** or **`/blog/index.html` on the blog hub**) while files on disk remain plain `.html` for static authoring and previews.

## information architecture (routes)

| visitor path | on-disk source (under `src/` → `public/`) | intent |
|--------------|---------------------------------------------|--------|
| **`/`** | **`index.html`** | résumé-style **landing** |
| **`/blog/`** | **`blog/index.html`** | **blog hub** listing (posts + tiny intro) |
| **`/blog/college-application-journey.html`** (and future `blog/*.html`) | same path | long posts |
| **`/docs/...`**, **`/favicon.svg`**, etc. | mirrored static | assets + résumé pdf |

**`/about.html`** is **not** authored anymore; **`308` → `/`** for old bookmarks (see **middleware** below).

## implementation notes (next.js)

- **`next.config.ts` `rewrites().beforeFiles`:** internal rewrites (**not** **`middleware`** — see **`build-and-request-pipeline.md`**): **`/` → `/index.html`**; **`/blog` → `/blog/index.html`**; **`/blog/` → `/blog/index.html`**. Omitting blog rewrites yields **App Router 404** for **`/blog`** because **`public/`** has **no** automatic directory **`index.html`** mapping.
- **`middleware.ts` matchers** (**`308` redirects** — never combine with looping **`rewrite` + `redirects()`** pairs on the rewritten path):  
  - **`/index.html` → `/`**  
  - **`/about.html` → `/`** (legacy)  
  - **`/blog/index.html` → `/blog/`** (directory-style canonical)

## filenames on disk vs public paths

| concern | rule |
|---------|------|
| **authoring** | landing stays **`src/index.html`**; blog hub is **`src/blog/index.html`**; post files stay **`src/blog/<slug>.html`**. |
| **mirrored build** | **`scripts/sync-wiki-public.mjs`** copies **`src/`** → **`public/`** (`public/` gitignored). |
| **visitor links** | use **`/`** + **`/blog/`** (+ post paths); avoid exposing raw **`*.html`** in internal **`href`** for home and hub. |

---

## internal links (`src/**/*.html`)

- **`/` (landing):** every `<a>` to the landing MUST use **`href="/"`** (not **`index.html`**, not **`/index.html`**).
- **blog hub:** use **`href="/blog/"`** from any page including **`/`**.
- **`/blog/` page:** **`home` → `/`**; post links authored as **`college-application-journey.html`** (same directory) or root-absolute **`/blog/...`** when clearer.
- **skip links, fragment-only `href` values,** and machine URLs stay unchanged.

rationale: root-absolute links work from **`/`**, **`/blog/`**, and **`/blog/post.html`** without `../` mistakes.

---

## acceptance

1. **`GET /`** shows landing; location bar does not need **`index.html`**.
2. **`GET /index.html`** → **`308`** → **`/`**; follow-up **`GET /`** → **200**.
3. **`GET /blog/`** (or platform equivalent) shows blog hub; **`GET /blog/index.html`** → **`308`** → **`/blog/`**.
4. **`GET /about.html`** → **`308`** → **`/`**.
5. no committed wiki page links **`index.html`** for home or **`blog/index.html`** for the hub.

---

## operator notes

- **static-only hosting** (no next): many hosts map `/` → `index.html` and `/blog/` → `blog/index.html` without ugly URLs; align host redirects with this spec.
- **assistant corpus** still ingests **`src/index.html`** and **`src/blog/*.html`** by path — visitor-facing URLs are independent.
