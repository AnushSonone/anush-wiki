# IMPLEMENTATION_PLAN

Prioritized tasks for the static landing page (`src/`). Last updated: bootstrap seed — reconcile with `specs/*` after you add portfolio topic specs.

## Open (highest priority first)

- [ ] **Content pass:** Replace placeholder copy in `src/index.html` with real name, one-line positioning, and links that match forthcoming `specs/*` (blocked until portfolio specs exist).
- [ ] **Portfolio sections:** Add semantic sections (`section`, headings, lists) per topic specs once `specs/` defines bio, projects, contact, etc.

## Done

- [x] **Scaffold:** Valid HTML5 shell with `header` / `main` / `footer`, one `h1`, linked `styles.css`, and placeholder text.
- [x] **Base styles:** System font stack, readable max line length, comfortable vertical rhythm, visible `:focus-visible` for interactive elements.
- [x] **Ralph loop:** `loop.sh`, `PROMPT_plan.md`, `PROMPT_build.md`, and `AGENTS.md` describe planning vs building and validation.

## Notes

- Re-run **plan mode** (`./loop.sh plan`) after adding or changing specs so this file stays aligned with requirements.
