# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). **IA = praneel**; **visuals = MFWS** — see `specs/visual-language-motherfuckingwebsite.md`, `specs/layout-and-style.md`, `specs/page-index.md`, `specs/page-about.md`.

## Open (highest priority first)

- [ ] **Proofread:** Confirm education dates, GitHub username, and any new project copy; résumé PDF is `src/Anush_Sonone_Resume_2028_Current.pdf`.
- [ ] **Deploy:** Host `src/` and verify routes (`/blog/college-application-journey.html` or configure clean URLs); remote images on the blog post load from anush.wiki.

## Done

- [x] **About:** Experience removed from markup; single **Résumé (PDF)** link; compact ↗ project lines; skills/coursework stripped; PDF vendored in `src/` for static hosting.
- [x] **Blog:** Homepage **Blogs** section + **Links** section; full college journey article at `blog/college-application-journey.html` (scraped from anush.wiki `#/writing/college-application-journey`); images hotlinked to anush.wiki with lazy loading.
- [x] **MFWS reskin:** White canvas, serif, system `LinkText` / `VisitedText` with fallbacks, default `h2`/`h1` sizing, disc lists, `#ccc` footer hairline, praneel layout preserved.
- [x] **Structure + content:** Praneel-style two-page IA, column width, header/nav/footer slots, about/index pages, contact SVGs, index footer credit line.
- [x] **Scaffold:** Initial HTML loop (`loop.sh`, prompts, `AGENTS.md`).
- [x] **Specs:** Split praneel (**structure**) vs MFWS (**surface**); added `visual-language-motherfuckingwebsite.md`; updated constitution + page specs.
- [x] **Process:** `AGENTS.md` requires reconciling this file before every build; `PROMPT_build.md` phase 0e.

## Notes

- **`IMPLEMENTATION_PLAN.md` must be reconciled before every BUILD** (human or agent)—see `AGENTS.md` → *Implementation plan — before every build*.
- Run **plan mode** after large spec edits: `./loop.sh plan`
- Structure checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
- Visual checklist: [specs/visual-language-motherfuckingwebsite.md](specs/visual-language-motherfuckingwebsite.md)
