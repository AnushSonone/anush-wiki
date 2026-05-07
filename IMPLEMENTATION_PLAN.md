# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). Specs now include a **praneelseth.com-style** shell; implement against `specs/layout-and-style.md`, `specs/page-index.md`, and `specs/page-about.md`.

## Open (highest priority first)

- [ ] **Layout + tokens:** Update `src/styles.css` with `--bg` `#faf8f4`, gray scale tokens, 600px column, `12vh` top padding, header row, section labels, and index footer chrome per [specs/layout-and-style.md](specs/layout-and-style.md).
- [ ] **Index page:** Restructure `src/index.html` to match [specs/page-index.md](specs/page-index.md) (lowercase name styling, intro blurb, `h2` + post `<ul>`, nav to about, bottom outbound link). Replace placeholder posts with real URLs when content is ready.
- [ ] **About page:** Add `src/about.html` per [specs/page-about.md](specs/page-about.md) (sections education → contact, inline SVG social icons with `aria-label`s, nav back to index).
- [ ] **Content:** Replace placeholder name, bio, lists, `mailto`, GitHub/LinkedIn, and footer link with author data (remove “example” HTML comments when done).
- [ ] **AGENTS.md validation:** Extend `wc -c` / smoke steps to include `about.html` once it exists.

## Done

- [x] **Scaffold:** Initial HTML5 shell and stylesheet (pre–praneel clone).
- [x] **Ralph loop:** `loop.sh`, prompts, `AGENTS.md`.
- [x] **Specs:** Reference analysis + layout + page specs for praneelseth-style clone; constitution updated for second HTML file + inline SVG.

## Notes

- Run **plan mode** after large spec edits: `./loop.sh plan`
- Fidelity checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
