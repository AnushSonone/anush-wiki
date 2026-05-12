# Ralph — PLANNING mode (gap analysis only)

**Project:** Minimal personal wiki under `src/`: semantic HTML + a single stylesheet for core reading chrome; optionally one **first-party wiki assistant** (scripts + HTTPS API only as defined in `specs/feature-assistant-chat.md` / constitution exception). Aligned ideologically with [motherfuckingwebsite.com](https://motherfuckingwebsite.com/) — satirical tone on the *original site* is not a content requirement here.

---

## Phase 0 — Orient

0a. Study `specs/*` (requirements). Use parallel read-only exploration where your environment supports it.

0b. Study `IMPLEMENTATION_PLAN.md` if present; it may be wrong or stale.

0c. Study `src/*` (current site files).

0d. Study `AGENTS.md` for how this repo validates work (backpressure).

0e. Application source for the static site lives in `src/*`. There is no `src/lib` unless you introduce shared fragments; prefer a single `index.html` and one stylesheet unless specs say otherwise.

---

## Phase 1 — Plan only (no code changes)

1. Compare `specs/*` against `src/*`. **Do not assume functionality is missing** — confirm with search/read first. Identify gaps, inconsistencies, or incomplete acceptance criteria.

2. Produce or update `IMPLEMENTATION_PLAN.md` as a **prioritized bullet list** of work *not yet* done. Mark items complete/obsolete if the codebase already satisfies them. Ultrathink on tradeoffs that affect weight, semantics, and accessibility.

3. When you discover missing requirements, **do not implement** — if needed, add or amend a focused spec under `specs/<topic>.md` (one topic per file; avoid “and” scope creep) and reflect new work in `IMPLEMENTATION_PLAN.md`.

---

## Invariants (non-negotiable)

- Core `src/**/*.html` + `styles.css` remain semantic + lightweight (**no accidental framework bundles**).
- Scripts/WASM/embeds (**including** the wiki assistant path) MAY exist **only** when they match `specs/feature-assistant-chat.md`: first-party control, CSP/SRI stance in that spec, no stray vendor widgets.
- **Small and fast:** no third-party trackers, ads, or font CDNs unless a spec explicitly allows an exception aside from narrowly documented assistant sub-processors defined there.
- **Semantic HTML5** with clear hierarchy; **accessible** defaults (landmarks, headings, link text, focus visibility) plus assistant UI rules once present.
- **Responsive** layout with minimal CSS — no heavyweight layout frameworks.

---

## IMPORTANT

**Plan only.** Do **not** edit `src/*`, do **not** run implementation tasks, do **not** commit code. You may update `IMPLEMENTATION_PLAN.md` and `specs/*` if you are resolving spec contradictions.

**ULTIMATE GOAL:** A merge-ready personal wiki that matches `specs/*`, respects `specs/design-philosophy-and-constraints.md`, and—if pursued—implements the optional assistant strictly per `specs/feature-assistant-chat.md`.
