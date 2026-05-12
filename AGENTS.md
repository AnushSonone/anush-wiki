# AGENTS — operational context for Ralph loops

Keep this file **short and operational**. Progress and narrative live in `IMPLEMENTATION_PLAN.md`.

## Project

Static personal wiki under `src/`: core reading chrome is **semantic HTML + one global stylesheet** (no shipped framework runtime). Constraints: `specs/design-philosophy-and-constraints.md`.

Optional **wiki assistant** (**first-party embed + HTTPS API**) may ship **narrow, documented** scripts + server code per `specs/feature-assistant-chat.md`; model keys stay server-side only. Anything else claiming to be analytics/chat SDKs/embeds stays forbidden unless another spec exempts it.

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

### Wiki + embedded assistant preview

Uses Next.js locally (mirrors `src/* → public/` automatically before `next dev`). from repo root after `npm install`:

```bash
npm run dev
```

Open `http://127.0.0.1:3000/`. **`cd src && python …`** previews raw html/css only; `/chat-widget.js` resolves only on the Next server **`GET` route** (`app/chat-widget.js/route.ts`), not from `src/` alone.

Optional production-parity check before shipping assistant changes: **`npm run verify:chat-widget`** (clean `.next/` + `public/`, rebuild, **`GET /chat-widget.js` → 200**).

## Validation (backpressure)

Run before any commit the user requested (or when handing off so they can commit locally):

1. **Manual smoke:** load the site in a browser; tab through links and headings; confirm focus is visible and content order makes sense.

2. **Payload sanity** (approximate, from repo root):

   ```bash
   wc -c src/index.html src/about.html src/styles.css src/blog/college-application-journey.html
   ```

   If `about.html` or blog pages do not exist yet, omit those paths. Combined size should stay within the budget in `specs/design-philosophy-and-constraints.md` unless a spec revises it.

   Track assistant JS/CSS bundle from source (`specs/feature-assistant-chat.md`); optionally:

   ```bash
   wc -c assistant/widget/chat-widget.js
   ```


3. **Semantics / a11y quick checks:**
   - One `h1` in the document (unless a spec defines a deliberate exception).
   - Landmarks: `header`, `main`, `footer` present where applicable.
   - Every `a href` has meaningful link text (no “click here” alone).
   - Images (if any later) have appropriate `alt` text per spec.
   - **Wiki assistant (when wired):** launcher + transcript surface keyboard-operable (`Tab`, `Esc` if overlaid); `:focus-visible` obvious; streamed or batched replies announced per `feature-assistant-chat.md`; exhaustion (`429`) copy remains calm and understandable.

No automated test runner is required; add optional tools in this section if you introduce them.
Before shipping assistant client bundles or edge functions, skim built artifacts / env templates for leaked model keys (`grep`/CI acceptable).

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
