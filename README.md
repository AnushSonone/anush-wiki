# anush.wiki (static site)

personal site: bio, blog, and contact — shipped as plain **html + css** under `src/`.

## design

the site is **html + css** with a **content-first** bias: readable type, semantic structure, and almost nothing to download—no js, no frameworks, no font cdns. that approach draws on the same school of thought as [motherfuckingwebsite.com](https://motherfuckingwebsite.com/), applied here as a small rule set in `specs/design-philosophy-and-constraints.md`.

**principles:**

- **content first** — typography and layout serve the text, not decoration.
- **almost nothing to download** — pages load and render without a javascript runtime or third-party bundles.
- **semantics over chrome** — real headings, landmarks, and links; system colors where useful; no fake hierarchy from gray microcopy.
- **no accidental complexity** — dependencies only ship when they clearly help readers.

## layout

- `src/index.html` — blog list and entry to the site.
- `src/about.html` — about / résumé-style page.
- `src/blog/` — individual posts.
- `src/styles.css` — shared styles.

## preview locally

from the repo root:

```bash
cd src && python3 -m http.server 8080
```

open `http://127.0.0.1:8080/` in a browser.
