# anush.wiki (static site)

personal site: bio, blog, and contact — shipped as plain **html + css** under `src/`.

## why [motherfuckingwebsite.com](https://motherfuckingwebsite.com/)–style design?

the original site is a rant; this project only borrows its **technical idea**, not its voice.

**motivation:**

- **content first** — typography and layout exist so words are easy to read, not so the page can "feel designed."
- **almost nothing to download** — no javascript runtime, no framework bundle, no font cdns. the page loads and renders with minimal moving parts.
- **semantics over chrome** — real headings, landmarks, and links; default system colors where it helps; no fake ui hierarchy built from divs and gray microcopy.
- **no accidental complexity** — if a dependency doesn't buy a clear win for readers, it doesn't ship.

that lines up with *motherfuckingwebsite* as a critique of bloated, script-heavy personal pages — tightened here into a small set of rules in `specs/design-philosophy-and-constraints.md`.

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
