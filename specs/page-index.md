# Page: index — landing (home `/`)

**Topic:** **`/`** (canonical) — authored as **`src/index.html`** on disk.  
**Depends on:** [layout-and-style.md](./layout-and-style.md), [urls-and-canonical-paths.md](./urls-and-canonical-paths.md), [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

## Purpose

Résumé-style **first screen** readers hit at **`/`**: short intro + linked résumé PDF, structured sections (education, projects, achievements, contact), MFWS typography. **Writing / posts** live at the **blog hub** (`/blog/` — [`page-blog-hub.md`](./page-blog-hub.md)).

## Document title and meta

- `<title>`: author's display preference (may be lowercase to match habits).
- `<meta name="description">`: one short line reflecting landing content.

## Semantics

- **Exactly one `h1`** per page: **site name** in the header row.
- Sections use **`h2`** headings (education, projects, achievements, contact) — **lowercase copy** matches project policy (`AGENTS.md`).
- Résumé **`pdf`** hook near the hero (explicit link; same file referenced in **`contact`** as needed).

## Header row

- Left: site name linking **`href="/"`** (canonical — [urls-and-canonical-paths.md](./urls-and-canonical-paths.md)).
- Right **`<nav aria-label="primary">`** MUST include **`blog` → `/blog/`** (blog hub listing). Styling follows MFWS (serif, system links).

## Section order

Follow praneel **structure** MFWS **surface**: intro + résumé link, education, projects, achievements, contact, then shared bottom chrome (`layout-and-style.md`).

## Intro

One or more **`<p class="lead">`** (layout hook acceptable): black serif body, default sizes.

## Contact

Mirrors **`contact`** semantics across the wiki: **`mailto:`**, SVG icon links (**`currentColor`**), **`resume`** **`<a>`** (`docs/Anush_Sonone_Resume_2028_Current.pdf` relative to site root authoring, or **`/docs/...`** URL form per [`urls-and-canonical-paths.md`](./urls-and-canonical-paths.md)).

## Footer chrome

Structural two-slot chrome row (`layout-and-style.md`). Assistant mount id **`wiki-agent-mount`** when embed ships.
