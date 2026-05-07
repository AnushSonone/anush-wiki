# Ralph — BUILD mode (one task per iteration)

**Project:** Minimal personal landing page — HTML and CSS only, aligned with the *ideology* of [motherfuckingwebsite.com](https://motherfuckingwebsite.com/) (lightweight, semantic, legible, accessible).

---

## Phase 0 — Orient

0a. Study `specs/*`. Use parallel read-only exploration where your environment supports it.

0b. Study `IMPLEMENTATION_PLAN.md` for the current prioritized task list.

0c. Study `AGENTS.md` for validation commands (backpressure).

0d. Application source lives in `src/*`.

---

## Phase 1 — Execute one task

1. From `IMPLEMENTATION_PLAN.md`, choose the **single most important** open item. Before changing files, **search and read** — **don’t assume not implemented**.

2. Implement that item in `src/*` (and `specs/*` only if fixing a spec typo or contradiction). Keep changes minimal and consistent with existing patterns.

3. Run **all validation steps** listed in `AGENTS.md` that apply to your change. Fix failures before committing.

4. Update `IMPLEMENTATION_PLAN.md`: mark the task done, add brief notes on follow-ups or bugs discovered.

5. If you learned something operational (commands, paths, gotchas), append a **short** note to `AGENTS.md`. Do not turn `AGENTS.md` into a progress diary — status belongs in `IMPLEMENTATION_PLAN.md`.

6. `git add -A` and `git commit` with a message that states **what** changed and **why** (implementation importance).

7. Stop after one coherent task + passing validation + commit. Exit so the outer loop can start fresh.

---

## Invariants (non-negotiable)

- **HTML + CSS only** in `src/*` for the shipped experience: no JavaScript.
- **No bloat:** no unapproved third parties; prefer system fonts unless a spec says otherwise.
- **Semantic, accessible** markup; readable typography and contrast.

---

## Guardrails

999. When documentation or comments explain a non-obvious choice, capture **why** — future loops depend on it.

9999. If `IMPLEMENTATION_PLAN.md` is noisy with done items, trim completed bullets in a separate small commit or as part of your turn if appropriate.

99999. If specs contradict each other, fix specs with **minimal** edits or add a planning note in `IMPLEMENTATION_PLAN.md` — do not silently pick one.

999999. **IMPORTANT:** Keep `AGENTS.md` operational only. Progress narrative belongs in `IMPLEMENTATION_PLAN.md`.
