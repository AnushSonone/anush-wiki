# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). **IA = praneel** (landing **`/`** + **`/blog/`** hub); **visuals = MFWS** — see `specs/visual-language-motherfuckingwebsite.md`, `specs/layout-and-style.md`, `specs/page-index.md`, `specs/page-blog-hub.md`, and `specs/page-about.md` (legacy stub).

Wiki assistant (**optional**, first-party embed + API): architecture, quotas, corpus, injection defenses, CSP, and acceptance checks — `specs/feature-assistant-chat.md` (narrow exception in `specs/design-philosophy-and-constraints.md`).

## Open (highest priority first)

- [ ] **Raft page rewrite (humble-builder voice):** Restructure `src/blog/raft.html` for a reader who does not already know Raft — hook, live lab, then what it is / the problem it mocks / the solution / a step-by-step build story including the two outages / what it measures today / open gaps / resources at the bottom. Voice follows `lib/assistant-system-prompt.txt` (plain verbs, numbers first, no hype, lowercase) and the no-bold rule; prose carries the explanation and lists are reserved for checklists, reference collections, and step-by-step guidance. Includes a new inline `raft-arch` system diagram (SVG, own `--ra-*` tokens, scrolls inside `.raft-arch-wrap` on narrow screens) built clean rather than reviving the 2026-07-21 version that was rejected for overlapping edges. `.raft-lab__obs-note` lost its `max-width: 40rem` so the grafana note spans the full lab width. Throughput copy corrected to the measured ~1,160 w/s + ~1,500 r/s under CPU caps; the 2026-07-21 ladder stays as dated history. Branch `raft-page-humble-rewrite`, localhost review only, no commit or push until Anush asks.
- [ ] **Proofread:** Confirm internship dates, GitHub username, résumé PDF URL.
- [ ] **Deploy:** Host wiki + assistant (Next build from repo root per `README.md`; static-only export cannot serve `/api/chat`) and verify routes on production.

### Wiki assistant (remaining work)

Implementation order is **normative** in [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md) → **Rollout phases**.

#### Phase A verification / optional hardening

- [ ] **Assistant — Phase A prod smoke:** With KV linked on Vercel (or staging), confirm **51st** assistant completion in one UTC day returns **429** and provider is not called; confirm **403** path without primed cookie after blocking cookies; optional **parallel** burst near limit does not overshoot.
- [ ] **Assistant — Phase A automated tests:** Integration or script covering quota boundary + concurrency (spec checklist).

#### Phase B — after Phase A is done

- [ ] **Assistant — transcript / operator analytics (Phase B, deferred):** Optional **Supabase** (or similar) for stored messages / query insights; retention + privacy copy amendments per spec; **must not** replace KV+cookie quota counters unless spec and plan are amended.

#### Other assistant tasks

- [ ] **Assistant — backend polish:** Streaming responses (`streamText`/SSE) optional; unify client-side error taxonomy; retries/backoff knobs per provider SLO.
- [ ] **Assistant — hardening review:** Tight CSP + richer security headers (`next.config`/edge) per checklist in `feature-assistant-chat.md`; scripted abuse drills; billing caps at provider dashboard.

## Done

- [x] **Lowercase copy policy:** All visible HTML text lowercased; `AGENTS.md` documents rules + `scripts/lowercase_html_text.py` helper; `viewBox` preserved on SVG.
- [x] **Blog images:** **`src/about/`** assets; post **`img`** uses **`/about/...`**; legacy **`/public/about/*`** **`308`** → **`/about/*`**.
- [x] **Blog clean URLs:** canonical **`/blog/<slug>`**; **`next.config.ts`** redirects legacy **`/<slug>.html`**, **`/blog/<slug>.html`**, **`/<slug>`**, **`/writing/<slug>`**; internal links use clean paths; slugs in **`lib/blog-post-slugs.ts`**.
- [x] **Blog:** **`/blog/`** hub (`blog/index.html`); `blog/college-application-journey.html` from anush.wiki; images hotlinked with lazy loading.
- [x] **MFWS reskin:** White canvas, serif, system link colors + fallbacks, default heading sizes, disc lists, `#ccc` footer hairline.
- [x] **Structure + content:** Landing column + **`/blog/`** hub (`src/blog/index.html`), post pages, footer credit + résumé pdf path wired for assistant ingestion.
- [x] **Scaffold:** Ralph loop (`loop.sh`, prompts, `AGENTS.md`).
- [x] **Specs:** Praneel structure vs MFWS surface; constitution + page specs; **`urls-and-canonical-paths.md`**, **`build-and-request-pipeline.md`** (sync-wiki → next; home **`/`** without redirect loops).
- [x] **Wiki assistant specs:** Constitution exception (`design-philosophy-and-constraints.md`) + `specs/feature-assistant-chat.md` (embed boundary, quotas, corpus, defenses, CSP/a11y checklist).
- [x] **Routing IA (may 2026):** Résumé-style landing at **`/`** (`src/index.html`); posts listing at **`/blog/`** (`src/blog/index.html`); legacy **`GET /about.html`** → **`308`** **`/`**; **`GET /blog/index.html`** → **`308`** **`/blog/`**. docs: `urls-and-canonical-paths.md`, `build-and-request-pipeline.md`, **`middleware.ts`** matcher trio.
- [x] **Assistant scaffold:** Next mirror (`npm run sync-wiki`): **`src/` only → `public/`** (wiki static mirror); **`GET /api/chat/widget`** serves **`assistant/chat-widget.js`**; **`/api/chat`** reads wiki + résumé + **`lib/assistant-system-prompt.txt`**; readme + `.env.example`.
- [x] **Assistant Phase A (quota):** KV / Upstash atomic daily cap (**50** completions per UTC day) + HMAC HttpOnly visitor cookie (`wiki_quota_vid`); follow-ups under Open → *Phase A verification*.
- [x] **Assistant UX — mobile takeover:** Narrow viewports `(max-width: 36rem)` — full-viewport backdrop (`100dvh` / `-webkit-fill-available`), centered dialog, footer launcher anchor unchanged (`src/styles.css`, `assistant/chat-widget.js`).
- [x] **Assistant voice:** Humble-builder system prompt in **`lib/assistant-system-prompt.txt`** + server-side visitor `reply` lowercase normalization (`app/api/chat/route.ts`).
- [x] **Assistant trim:** **`assistant/`** holds widget only; dropped **`knowledge/`**, **`CORPUS_REVISION`**, and duplicate corpus excerpts (wiki html + résumé pdf are authoritative).
- [x] **Process:** Reconcile this file before every build (`AGENTS.md`, `PROMPT_build.md` 0e).

## Notes

- **Assistant:** Phase A (KV + signed cookie + quota) is implemented in code; complete **Phase A verification** tasks under Open before treating production as fully validated. Phase B (persisted chats / Supabase) stays deferred per [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md) → *Rollout phases*.
- **`IMPLEMENTATION_PLAN.md` must be reconciled before every BUILD** (human or agent)—see `AGENTS.md` → *Implementation plan — before every build*.
- Run **plan mode** after large spec edits: `./loop.sh plan`
- Structure checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
- Visual checklist: [specs/visual-language-motherfuckingwebsite.md](specs/visual-language-motherfuckingwebsite.md)
- Assistant product + abuse model: [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md)
