# Ralph — BUILD mode (one task per iteration)

**Project:** Minimal personal wiki under `src/`: semantic HTML + a shared stylesheet define the browsing experience; optionally one **first-party wiki assistant** per `specs/feature-assistant-chat.md` / constitution exception adds scripts + HTTPS API code. Matches the *spirit* of [motherfuckingwebsite.com](https://motherfuckingwebsite.com/) — lightweight defaults, intentional constraints.

---

## Phase 0 — Orient

0a. Study `specs/*`. Use parallel read-only exploration where your environment supports it.

0b. Study `IMPLEMENTATION_PLAN.md` for the current prioritized task list.

0c. Study `AGENTS.md` for validation commands (backpressure).

0e. **Reconcile `IMPLEMENTATION_PLAN.md`** against `specs/*` and `src/*` **before writing code** (per `AGENTS.md` → Implementation plan). Add, reorder, split, or close tasks so **Open** reflects what you are about to build; do not implement against a stale or empty plan unless you just updated it in this step.

---

## Phase 1 — Execute one task

1. From `IMPLEMENTATION_PLAN.md`, choose the **single most important** open item. Before changing files, **search and read** — **don’t assume not implemented**.

2. Implement that item primarily in `src/*` plus any server paths described in specs / `IMPLEMENTATION_PLAN.md` (`specs/feature-assistant-chat.md` allowances only). Avoid introducing dependencies or vendor scripts forbidden there; keep deltas minimal versus existing conventions.

3. Run **all validation steps** listed in `AGENTS.md` that apply to your change. Fix failures before you or the user commits.

4. Update `IMPLEMENTATION_PLAN.md`: mark the task done, add brief notes on follow-ups or bugs discovered.

5. If you learned something operational (commands, paths, gotchas), append a **short** note to `AGENTS.md`. Do not turn `AGENTS.md` into a progress diary — status belongs in `IMPLEMENTATION_PLAN.md`.

6. **Do not** run `git commit` or `git push` unless the user explicitly asks (see `AGENTS.md` → **Git: no commits or pushes without explicit approval**). If they have not asked, end with a summary and a suggested commit message; leave changes unstaged or staged only if they requested staging.

7. Stop after one coherent task + passing validation (and a commit **only** if the user asked for one). Exit so the outer loop can start fresh.

---

## Invariants (non-negotiable)

- **Core reading chrome** in `src/*` stays semantic + stylesheet-driven without accidental framework payloads.
- **Scripts / WASM:** only permitted through the narrowly scoped wiki assistant allowances in `specs/feature-assistant-chat.md`; never ship analytics pixels, rogue CDNs, or third-party widgets without a constitution amendment.
- **No bloat:** keep third parties out unless exempted assistant sub-processors are documented under that spec’s privacy section.
- **Semantic, accessible** markup and assistant UI cues once present; typography + contrast per MFWS guidance.

---

## Guardrails

999. When documentation or comments explain a non-obvious choice, capture **why** — future loops depend on it.

9999. If `IMPLEMENTATION_PLAN.md` is noisy with done items, trim completed bullets **in a commit only when the user asks to commit**, or leave a note for them to do it locally.

99999. If specs contradict each other, fix specs with **minimal** edits or add a planning note in `IMPLEMENTATION_PLAN.md` — do not silently pick one.

999999. **IMPORTANT:** Keep `AGENTS.md` operational only. Progress narrative belongs in `IMPLEMENTATION_PLAN.md`.
