# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). Specs now include a **praneelseth.com-style** shell; implement against `specs/layout-and-style.md`, `specs/page-index.md`, and `specs/page-about.md`.

## Open (highest priority first)

- [ ] **Proofread:** Confirm internship dates, GitHub username (`anushsonone` vs `anushse`), and résumé PDF URL stay current; add real blog post links to `index.html` when you publish them.
- [ ] **Deploy:** Host `src/` (GitHub Pages, etc.) and verify relative links from production URL.

## Done

- [x] **Layout + tokens:** `styles.css` uses praneel-style column, `#faf8f4`, section labels, chrome, about layout patterns.
- [x] **Index:** Intro, links list, nav, UT footer link, resume + anush.wiki cross-links.
- [x] **About:** Full résumé content (education through skills), contact row with SVG icons.
- [x] **AGENTS.md:** Validation documents `about.html` in `wc -c`.
- [x] **Scaffold:** Initial HTML5 shell and stylesheet (pre–praneel clone).
- [x] **Ralph loop:** `loop.sh`, prompts, `AGENTS.md`.
- [x] **Specs:** Reference analysis + layout + page specs for praneelseth-style clone; constitution updated for second HTML file + inline SVG.

## Notes

- Run **plan mode** after large spec edits: `./loop.sh plan`
- Fidelity checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
