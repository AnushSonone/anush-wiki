# anush.wiki (static site)

Personal site: bio, blog, and contact — shipped as plain **HTML + CSS** under `src/`.

## Why [motherfuckingwebsite.com](https://motherfuckingwebsite.com/)–style design?

The original site is a rant; this project only borrows its **technical idea**, not its voice.

**Motivation:**

- **Content first** — Typography and layout exist so words are easy to read, not so the page can “feel designed.”
- **Almost nothing to download** — No JavaScript runtime, no framework bundle, no font CDNs. The page loads and renders with minimal moving parts.
- **Semantics over chrome** — Real headings, landmarks, and links; default system colors where it helps; no fake UI hierarchy built from divs and gray microcopy.
- **No accidental complexity** — If a dependency doesn’t buy a clear win for readers, it doesn’t ship.

That lines up with *motherfuckingwebsite* as a critique of bloated, script-heavy personal pages — tightened here into a small set of rules in `specs/design-philosophy-and-constraints.md`.

## Layout

- `src/index.html` — Blog list and entry to the site.
- `src/about.html` — About / résumé-style page.
- `src/blog/` — Individual posts.
- `src/styles.css` — Shared styles.

## Preview locally

From the repo root:

```bash
cd src && python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/` in a browser.
