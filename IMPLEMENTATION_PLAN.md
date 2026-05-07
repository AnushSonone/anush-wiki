# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). **IA = praneel**; **visuals = MFWS** — see `specs/visual-language-motherfuckingwebsite.md`, `specs/layout-and-style.md`, `specs/page-index.md`, `specs/page-about.md`.

## Open (highest priority first)

- [ ] **Proofread:** Confirm internship dates, GitHub username, résumé PDF URL; add real blog post links to `index.html` when you publish them.
- [ ] **Deploy:** Host `src/` and verify relative links from production URL.

## Done

- [x] **MFWS reskin:** White canvas, serif, system `LinkText` / `VisitedText` with fallbacks, default `h2`/`h1` sizing, disc lists, `#ccc` footer hairline, praneel layout preserved.
- [x] **Structure + content:** Praneel-style two-page IA, column width, header/nav/footer slots, full résumé copy, contact SVGs, index footer credit line.
- [x] **Scaffold:** Initial HTML loop (`loop.sh`, prompts, `AGENTS.md`).
- [x] **Specs:** Split praneel (**structure**) vs MFWS (**surface**); added `visual-language-motherfuckingwebsite.md`; updated constitution + page specs.

## Notes

- **`IMPLEMENTATION_PLAN.md` must be reconciled before every BUILD** (human or agent)—see `AGENTS.md` → *Implementation plan — before every build*.
- Run **plan mode** after large spec edits: `./loop.sh plan`
- Structure checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
- Visual checklist: [specs/visual-language-motherfuckingwebsite.md](specs/visual-language-motherfuckingwebsite.md)
