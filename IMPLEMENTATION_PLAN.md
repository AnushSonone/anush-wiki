# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). **IA = praneel** (landing **`/`** + **`/blog/`** hub); **visuals = MFWS** — see `specs/visual-language-motherfuckingwebsite.md`, `specs/layout-and-style.md`, `specs/page-index.md`, `specs/page-blog-hub.md`, and `specs/page-about.md` (legacy stub).

Wiki assistant (**optional**, first-party embed + API): architecture, quotas, corpus, injection defenses, CSP, and acceptance checks — `specs/feature-assistant-chat.md` (narrow exception in `specs/design-philosophy-and-constraints.md`).

## Open (highest priority first)

- [ ] **Dashboard steps for the assistant (manual, not code):** (1) provider spend cap in Google AI Studio — now the real cost ceiling; (2) Cloudflare rate limiting rule on `POST /api/chat`, per IP, **20 requests per 1-minute window** (free plan allows exactly one rule, 10s/1m periods only, IP-only — no daily window available, which is why the per-day cap lives in the cookie); (3) Vercel Deployment Protection → **Standard Protection** so generated `*.vercel.app` URLs stop being publicly reachable while `anush.wiki` stays open. The assistant's limits are only as good as these three.
- [ ] **Assistant — Phase A prod smoke (rewritten):** the old KV smoke no longer applies. Confirm on production: `GET /api/chat` mints a cookie, POST returns 200 and a `Set-Cookie` with count + 1, a tampered cookie gives 403, and a cookie at count 15 gives 429 with no model call.

- [ ] **Raft page rewrite (humble-builder voice):** Restructure `src/blog/raft.html` for a reader who does not already know Raft — hook, live lab, then what it is / the problem it mocks / the solution / a step-by-step build story including the two outages / what it measures today / open gaps / resources at the bottom. Voice follows `lib/assistant-system-prompt.txt` (plain verbs, numbers first, no hype, lowercase) and the no-bold rule; prose carries the explanation and lists are reserved for checklists, reference collections, and step-by-step guidance. Includes a new inline `raft-arch` system diagram (SVG, own `--ra-*` tokens, scrolls inside `.raft-arch-wrap` on narrow screens) built clean rather than reviving the 2026-07-21 version that was rejected for overlapping edges. `.raft-lab__obs-note` lost its `max-width: 40rem` so the grafana note spans the full lab width. Throughput copy corrected to the measured ~1,160 w/s + ~1,500 r/s under CPU caps; the 2026-07-21 ladder stays as dated history. Branch `raft-page-humble-rewrite`, localhost review only, no commit or push until Anush asks.
- [ ] **Proofread:** Confirm internship dates, GitHub username, résumé PDF URL.
- [ ] **Deploy:** Host wiki + assistant (Next build from repo root per `README.md`; static-only export cannot serve `/api/chat`) and verify routes on production.

### Wiki assistant (remaining work)

Implementation order is **normative** in [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md) → **Rollout phases**.

#### Phase A verification / optional hardening

- [ ] **Assistant — Phase A prod smoke:** Confirm the **16th** assistant completion in one UTC day returns **429** and provider is not called; confirm **403** path without primed cookie after blocking cookies; optional **parallel** burst near limit does not overshoot.
- [ ] **Assistant — Phase A automated tests:** Integration or script covering quota boundary + concurrency (spec checklist).

#### Phase B — after Phase A is done

- [ ] **Assistant — transcript / operator analytics (Phase B, deferred):** Optional **Supabase** (or similar) for stored messages / query insights; retention + privacy copy amendments per spec; **must not** replace KV+cookie quota counters unless spec and plan are amended.

#### Other assistant tasks

- [ ] **Assistant — backend polish:** Streaming responses (`streamText`/SSE) optional; unify client-side error taxonomy; retries/backoff knobs per provider SLO.
- [ ] **Assistant — hardening review:** Tight CSP + richer security headers (`next.config`/edge) per checklist in `feature-assistant-chat.md`; scripted abuse drills; billing caps at provider dashboard.

## Done

- [x] **Assistant — conversational routing + token cut (2026-08-26):** the assistant was reciting biography on "hey" and dumping numbers-first résumé bullets on any noun it recognised, because the prompt ordered number-first packing and every request carried the whole wiki + résumé (~22k chars, ~5.5k prompt tokens). Now `lib/published-context.ts` chunks the résumé per entry plus blog excerpts once per process, `lib/knowledge-router.ts` picks chunks by keyword from the last 3 user turns (3,000-char budget, no notes on small talk), and `lib/assistant-system-prompt.txt` is a short persona that answers only from attached notes. Still one model call per turn. History 18 → 8 turns at 600 chars, output cap 2048 → 256, per-visitor cap **50 → 15**/UTC day (free plan is bounded by requests per day). Route logs `prompt=`/`output=` token counts per turn. Spec amended (Knowledge boundary, quota).
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
- [x] **Assistant quota — dropped the external store (2026-08-01):** the Upstash free-tier DB was **deleted for inactivity**, and since the reservation call was the only unguarded await in `app/api/chat/route.ts`, every request 500'd. Counter now lives in the HMAC-signed `wiki_quota_vid` cookie (`visitor_id|yyyy-mm-dd|count`); `lib/quota-kv.ts`, `lib/quota-redis.ts`, and `@upstash/redis` are gone. **Spec amended** in `specs/feature-assistant-chat.md` → *Storage and bypass resistance*: cookie counters are not rollback-proof and not atomic, so bursts move to an edge rate-limit rule, a host allowlist in `middleware.ts` stops `*.vercel.app` origins skipping it, and the provider spend cap becomes the real ceiling. Cap stays **50/UTC day**.
- [x] **Assistant grounding — context budget bug (2026-08-01):** `loadWikiPlainSnapshot` spent one running 14k budget in file order, so `college-application-journey.html` consumed 71% of it and **`raft.html` never loaded at all** — the assistant could not answer about kill-my-cluster. Budget is now per file, and both the wiki snapshot and the parsed résumé are cached per process instead of being re-read and re-parsed on every message.
- [x] **Assistant Phase A (quota):** KV / Upstash atomic daily cap (**50** completions per UTC day) + HMAC HttpOnly visitor cookie (`wiki_quota_vid`); superseded by the cookie-counter entry above.
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
