# IMPLEMENTATION_PLAN

Prioritized tasks for the static site (`src/`). **IA = praneel**; **visuals = MFWS** — see `specs/visual-language-motherfuckingwebsite.md`, `specs/layout-and-style.md`, `specs/page-index.md`, `specs/page-about.md`.

Wiki assistant (**optional**, first-party embed + API): architecture, quotas, corpus, injection defenses, CSP, and acceptance checks — `specs/feature-assistant-chat.md` (narrow exception in `specs/design-philosophy-and-constraints.md`).

## Open (highest priority first)

- [ ] **Proofread:** Confirm internship dates, GitHub username, résumé PDF URL.
- [ ] **Deploy:** Host wiki + assistant (Next build from repo root per `README.md`; static-only export cannot serve `/api/chat`) and verify routes (`/blog/college-application-journey.html` or configure clean URLs); remote images on the blog post load from anush.wiki.

### Wiki assistant (remaining work)

Implementation order is **normative** in [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md) → **Rollout phases**.

#### Phase A verification / optional hardening

- [ ] **Assistant — Phase A prod smoke:** With KV linked on Vercel (or staging), confirm **51st** assistant completion in one UTC day returns **429** and provider is not called; confirm **403** path without primed cookie after blocking cookies; optional **parallel** burst near limit does not overshoot.
- [ ] **Assistant — Phase A automated tests:** Integration or script covering quota boundary + concurrency (spec checklist).

#### Phase B — after Phase A is done

- [ ] **Assistant — transcript / operator analytics (Phase B, deferred):** Optional **Supabase** (or similar) for stored messages / query insights; retention + privacy copy amendments per spec; **must not** replace KV+cookie quota counters unless spec and plan are amended.

#### Other assistant tasks

- [ ] **Assistant — backend polish:** Streaming responses (`streamText`/SSE) optional; unify client-side error taxonomy; retries/backoff knobs per provider SLO.
- [ ] **Assistant — corpus upkeep:** Expand `assistant/knowledge/*.txt`; adopt real retrieval/embeddings when pack grows (**current naive pack join is MVP**).
- [ ] **Assistant — hardening review:** Tight CSP + richer security headers (`next.config`/edge) per checklist in `feature-assistant-chat.md`; scripted abuse drills; billing caps at provider dashboard.

## Done

- [x] **Lowercase copy policy:** All visible HTML text lowercased; `AGENTS.md` documents rules + `scripts/lowercase_html_text.py` helper; `viewBox` preserved on SVG.
- [x] **Blog:** Homepage **Blogs** section; `blog/college-application-journey.html` from anush.wiki; images hotlinked with lazy loading.
- [x] **MFWS reskin:** White canvas, serif, system link colors + fallbacks, default heading sizes, disc lists, `#ccc` footer hairline.
- [x] **Structure + content:** Two-page IA, column width, footer credit, résumé/about variants as in `src/`.
- [x] **Scaffold:** Ralph loop (`loop.sh`, prompts, `AGENTS.md`).
- [x] **Specs:** Praneel structure vs MFWS surface; constitution + page specs.
- [x] **Wiki assistant specs:** Constitution exception (`design-philosophy-and-constraints.md`) + `specs/feature-assistant-chat.md` (embed boundary, quotas, corpus, defenses, CSP/a11y checklist).
- [x] **Assistant scaffold:** Next mirror (`npm run sync-wiki`): `src/` plus `assistant/widget/chat-widget.js` → `public/`, middleware `/`→`/index.html`, `/api/chat`, `assistant/{system-prompt,CORPUS_REVISION,knowledge}`. readme + `.env.example`.
- [x] **Assistant Phase A (quota):** KV / Upstash atomic daily cap (**50** completions per UTC day) + HMAC HttpOnly visitor cookie (`wiki_quota_vid`); follow-ups under Open → *Phase A verification*.
- [x] **Process:** Reconcile this file before every build (`AGENTS.md`, `PROMPT_build.md` 0e).

## Notes

- **Assistant:** Phase A (KV + signed cookie + quota) is implemented in code; complete **Phase A verification** tasks under Open before treating production as fully validated. Phase B (persisted chats / Supabase) stays deferred per [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md) → *Rollout phases*.
- **`IMPLEMENTATION_PLAN.md` must be reconciled before every BUILD** (human or agent)—see `AGENTS.md` → *Implementation plan — before every build*.
- Run **plan mode** after large spec edits: `./loop.sh plan`
- Structure checklist: [specs/reference-analysis-praneelseth.md](specs/reference-analysis-praneelseth.md)
- Visual checklist: [specs/visual-language-motherfuckingwebsite.md](specs/visual-language-motherfuckingwebsite.md)
- Assistant product + abuse model: [specs/feature-assistant-chat.md](specs/feature-assistant-chat.md)
