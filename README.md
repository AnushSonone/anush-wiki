# anush.wiki (static site)

personal site: bio, blog, and contact — shipped as plain html and css under `src/`.

## design

the site is hand-written html and css with a content-first bias: readable serif type, semantic structure, and a minimal network footprint—no client-side js, no frameworks, no font or analytics cdns. the approach matches the constraints in `specs/design-philosophy-and-constraints.md` and aligns with the same minimal stack as [motherfuckingwebsite.com](https://motherfuckingwebsite.com/).

### principles

- **content first** — authored markup, not a framework runtime; a single narrow reading column; landmarks (`main`, `nav`, `section`, etc.) and heading hierarchy define structure; link text stays descriptive instead of bare urls.
- **almost nothing to download** — visitors get html + one linked stylesheet only; no javascript or webassembly in shipped files; no third-party embeds; core routes aim for a modest uncompressed size budget on html+css (see spec) with only `styles.css` as a blocking resource.
- **semantics over chrome** — one `h1` per page; no skipped levels for visual tricks; system link colors (`LinkText` / `VisitedText`) with fallbacks; `:focus-visible` on interactive elements; small inline svg allowed for icons when the enclosing control has an accessible name.
- **no accidental complexity** — the site is static files you can open from `src/` with a simple static server; no bundler or build step is required to consume what ships to readers.

## layout

- `src/index.html` — blog list and entry to the site.
- `src/about.html` — about / resume-style page.
- `src/blog/` — individual posts.
- `src/styles.css` — shared styles.

## preview locally

from the repo root:

```bash
cd src && python3 -m http.server 8080
```

open `http://127.0.0.1:8080/` in a browser.
