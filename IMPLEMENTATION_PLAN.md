# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). **IA = praneel**; **visuals = MFWS** — see `specs/visual-language-motherfuckingwebsite.md`, `specs/layout-and-style.md`, `specs/page-index.md`, `specs/page-about.md`.

## Open (highest priority first)

- [ ] **Proofread:** Confirm internship dates, GitHub username, résumé PDF URL.
- [ ] **Deploy:** Host `src/` and verify routes (`/blog/college-application-journey.html` or configure clean URLs); remote images on the blog post load from anush.wiki.

## Done

- [x] **Lowercase copy policy:** All visible HTML text lowercased; `AGENTS.md` documents rules + `scripts/lowercase_html_text.py` helper; `viewBox` preserved on SVG.
- [x] **Blog:** Homepage **Blogs** section; `blog/college-application-journey.html` from anush.wiki; images hotlinked with lazy loading.
- [x] **MFWS reskin:** White canvas, serif, system link colors + fallbacks, default heading sizes, disc lists, `#ccc` footer hairline.
- [x] **Structure + content:** Two-page IA, column width, footer credit, résumé/about variants as in `src/`.
- [x] **Scaffold:** Ralph loop (`loop.sh`, prompts, `AGENTS.md`).
- [x] **Specs:** Praneel structure vs MFWS surface; constitution + page specs.
- [x] **Process:** Reconcile this file before every build (`AGENTS.md`, `PROMPT_build.md` 0e).

## Notes

- **`IMPLEMENTATION_PLAN.md` must be reconciled before every BUILD** (human or agent)—see `AGENTS.md` → *Implementation plan — before every build*.
- Run **plan mode** after large spec edits: `./loop.sh plan`
- Structure checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
- Visual checklist: [specs/visual-language-motherfuckingwebsite.md](specs/visual-language-motherfuckingwebsite.md)
