# AGENTS — operational context for Ralph loops

Keep this file **short and operational**. Progress and narrative live in `IMPLEMENTATION_PLAN.md`.

## Project

Static personal landing page under `src/`: **HTML + CSS only** (no JavaScript in shipped files). Goals and constraints: `specs/design-philosophy-and-constraints.md`.

## Git: no commits or pushes without explicit approval

- **Do not** run `git commit` or `git push` unless the user **explicitly** asks you to (e.g. “commit”, “push”, “ship it”, “save to git”).
- You may still use read-only git commands (`status`, `diff`, `log`) anytime.
- When work is done and the user has **not** asked to commit, stop with a short summary and what they could commit; leave the working tree **uncommitted** until they say so.

## Copy: all lowercase

- **All user-visible copy** in `src/**/*.html` is authored in **lowercase**: titles, headings, paragraphs, link text, list labels, `title` / `meta description` / `alt` / `aria-label` / other human-facing attributes.
- **Do not lowercase** URLs in `href` or `src`, machine `datetime` values, filenames where the server is case-sensitive, or **`viewBox`** on inline SVG (must stay camelCase).

## Implementation plan — before every build

**Do not start a BUILD pass or edit `src/*` until `IMPLEMENTATION_PLAN.md` is current.**

1. **Reconcile first:** Compare `IMPLEMENTATION_PLAN.md` to `specs/*` and the actual state of `src/*`. Fix the plan if **Open** / **Done** is wrong, tasks are missing, or priorities are stale (add, edit, reorder, or close items).
2. **Then implement:** Pick the top **Open** task and execute it.
3. **After the increment:** Update the plan again—mark work complete, note follow-ups or blockers—**when the user asks you to commit**, include that update in the same commit if it changed (same as Ralph BUILD steps, but commit only on request).

Plan-only refreshes belong in **plan mode** (`./loop.sh plan` or `PROMPT_plan.md`); still **read** the plan before building even when you are not running the shell loop.

## Preview locally

From repository root:

```bash
cd src && python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/` (serves `index.html` by default).

## Validation (backpressure)

Run before any commit the user requested (or when handing off so they can commit locally):

1. **Manual smoke:** load the site in a browser; tab through links and headings; confirm focus is visible and content order makes sense.

2. **Payload sanity** (approximate, from repo root):

   ```bash
   wc -c src/index.html src/about.html src/styles.css src/blog/college-application-journey.html
   ```

   If `about.html` or blog pages do not exist yet, omit those paths. Combined size should stay within the budget in `specs/design-philosophy-and-constraints.md` unless a spec revises it.

3. **Semantics / a11y quick checks:**
   - One `h1` in the document (unless a spec defines a deliberate exception).
   - Landmarks: `header`, `main`, `footer` present where applicable.
   - Every `a href` has meaningful link text (no “click here” alone).
   - Images (if any later) have appropriate `alt` text per spec.

No automated test runner is required; add optional tools in this section if you introduce them.

## Git conventions

- One logical task per Ralph iteration; **commit only after the user explicitly asks** and validation passes.
- Commit messages: imperative mood, state what changed and why it matters.
- Do **not** enable `RALPH_AUTO_PUSH` in `loop.sh` until a remote is configured; even then, project default is **no push** unless the user wants automated pushes.

## Ralph loop

1. Set `RALPH_FEED_CMD` to your headless agent command (must read the prompt from stdin). See comments in `loop.sh`.
2. **Plan:** `./loop.sh plan` — updates `IMPLEMENTATION_PLAN.md` only (per `PROMPT_plan.md`).
3. **Build:** `./loop.sh` — implements one task per invocation (per `PROMPT_build.md`).

If you run loops inside Cursor without a CLI pipe, manually paste `PROMPT_plan.md` or `PROMPT_build.md` and follow the same phases. **Commits:** headless loop prompts may still describe a commit step; in Cursor chat, follow **Git: no commits or pushes without explicit approval** above unless the human asks to commit.

## Codebase patterns

- `src/index.html` — home.
- `src/about.html` — résumé-style about page (per `specs/page-about.md`).
- `src/blog/*.html` — long-form posts (e.g. `college-application-journey.html`).
- `src/styles.css` — single global stylesheet linked from every HTML page (blog pages use `../styles.css`).
