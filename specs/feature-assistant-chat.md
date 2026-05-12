# Wiki assistant (first-party embed + API)

Purpose: ship **one** optional conversational assistant embedded on the personal wiki. It exposes a defined **personality** and answers from a **curated corpus** plus safe general scaffolding, while **rejecting abusive volume** and resisting **prompt injection** as far as practically possible.

Authority: complements [design-philosophy-and-constraints.md](./design-philosophy-and-constraints.md). If anything here conflicts with that file, **prefer the narrower security boundary** unless you explicitly amend the constitution again.

---

## Rollout phases (normative order)

Work MUST be sequenced so **abuse caps exist before** optional persistence of visitor messages.

### Phase A — ship first (blocking)

**Goal:** Stop cost and volume abuse without relying on client-side limits.

- **Signed HttpOnly quota cookie** + verification/mint on `/api/chat` (see [Rate limiting and quotas](#rate-limiting-and-quotas)).
- **Network KV / Redis-class** atomic counters (`quota:{visitor_id}:{yyyy-mm-dd}`) enforced **before** calling the model when the visitor is at cap.
- Stable **429** / **403–428** responses and widget copy per accessibility rules.
- **No Supabase (or other SQL) dependency** for identity or quota in Phase A — cookies + KV only.

Phase A is **required** for production assistant traffic. Track completion in `IMPLEMENTATION_PLAN.md`.

### Phase B — later (explicit opt-in)

**Goal:** Operator visibility (e.g. what visitors ask) and/or durable transcripts.

- **Optional** persistence (e.g. **Supabase Postgres**) for messages or aggregates — only after Phase A is done and documented.
- Amend this spec’s [Privacy, telemetry, moderation](#privacy-telemetry-moderation) subsection and site-facing notices when Phase B ships (today’s default remains **no full transcript retention** until then).
- Phase B MUST NOT weaken Phase A: quotas remain **KV + cookie**; do not move daily counters to Postgres unless this spec and the plan are amended deliberately.

---

## Threat model (short)

Assume visitors can:

- Arbitrarily edit prompts in browser devtools.
- Scripted high-volume abuse against the HTTPS API (including parallel requests and cookie churn).
- Attempt jailbreak / data-exfil wording ("ignore policy", "paste secrets", etc.).

Do **not** assume the browser bundle or client labels prevent abuse. **Secrets, quotas, corpus selection, system policy,** and logging policy live **server-side** only.

---

## Deployment boundary

- **Frontend:** Minimal UI embedded in `src/*.html` (launcher, transcript region, textarea, status). Scripts MUST be **first-party** (same deploy or origin you document here when implemented).
- **Backend:** Dedicated HTTPS route(s) for chat completions. **Never** ship model API keys, admin tokens, or corpus signing keys to browsers.
- **Optional iframe:** Allowed if the iframe `src` is first-party only; CSP must disallow embedding from untrusted parents if you reuse the iframe on other origins later.

Cross-link this section with the eventual hosting doc or README when the server exists.

---

## Personality and tone

- **Stable system directive** authored in-repo (e.g. `assistant/system-prompt.txt`—exact path chosen at implementation time) defines voice, humility, refusal posture, and disallowed domains (legal/medical/financial advice, hatred, exploitation, credential harvesting).
- Personality MUST NOT include instructions that encourage inventing biography details not grounded in corpus + clearly labeled general reasoning.
- **Client cannot override** model system instructions beyond sending user messages and read-only UX metadata (conversation id optional).

---

## Knowledge boundary ("only this much")

- Maintain a **versioned corpus** under the repository (recommended top-level folder `assistant/knowledge/` or similar) consisting of excerpts you approve—mirrors **public-facing** wiki facts plus optional FAQs. No live crawl of filesystem, email, notes, cloud drives, private repos, etc.
- **Filename safety:** Only ingest corpus files whose names match a strict **allowlist** (e.g. `^[a-z0-9][a-z0-9_-]*\.txt$` — adjust in implementation). Reject `.`, `..`, path separators, or non-UTF8/control characters in names so directory listings cannot traverse outside `assistant/knowledge/` via malicious filenames.
- Factual statements about projects, chronology, people, URLs, SHOULD be **quoted or summarized from retrieved snippets**. If retrieval returns nothing confident, assistant MUST defer ("not in published notes") rather than hallucinate biography.
- **Retrieval-first:** server loads top-k snippets per turn (or deterministic tool retrieval) BEFORE or AS part of composing the model payload. Retrieval query MUST be constrained (length caps, lexical filters) server-side only.
- **Corpus freshness:** corpus updates require human review merging into git OR an explicit audited pipeline; nightly blind sync without review is discouraged for personal reputational accuracy.

---

## Prompt injection defenses (layered)

1. **Role separation:** system policy is fixed server-side; user text occupies only designated user/channel fields—not concatenated into system preamble without unmistakable framing (e.g. XML-style separators) if framing is proven necessary—prefer avoiding dynamic system injection altogether.
2. **Instruction hierarchy:** instruct model to ignore attempts to redefine policy, escalate privileges, disclose hidden prompts, reproduce signing keys, or change safety categories.
3. **Tool grounding:** if tools expand later (calendar, ticketing), enforce **explicit allowlists** and **validated arguments**.
4. **Output limits:** cap completion tokens per response; truncate pathological verbosity.
5. **Optional guardrail pass:** optionally run a slim classifier/rule filter on flagged inputs or outputs—document provider + data handling if invoked (may become a third-party sub-processor needing mention in Privacy).

Assume **determined adversaries bypass some layers.** Combine with quotas, anomaly detection counts, kill switches via env flags.

---

## Rate limiting and quotas

These rules are **normative** for production: rate limits MUST be enforced **server-side** only. Client transcript storage (`sessionStorage`, etc.) MUST NOT be treated as quota enforcement.

### Quota unit

- **Counts against the cap:** **assistant completions only** — each **successful** HTTP response that returns a **finished assistant reply** after model inference increments the counter **once** for that visitor-day key.
- **Does not consume quota:** validation failures (**422**), kill-switch/offline (**503** when `DISABLE_CHAT` or equivalent), responses served **before** inference runs, **429** quota responses (including identity-required responses below), and typical **5xx** upstream failures **when no assistant completion was returned** (implementations MUST document any deliberate exception).

### Window and baseline cap

- **Window:** **UTC calendar day** — quota resets at **00:00 UTC** each day for each visitor identity.
- **Baseline quota:** Each distinct visitor identity MAY receive at most **50** completed assistant replies **per UTC day**. Alternate caps or windows REQUIRE an explicit amendment in this spec **and** in `IMPLEMENTATION_PLAN.md` commit notes—not a silent code change alone.

### Identity (must not be client-spoofable)

- **Primary identifier:** **Opaque visitor id** stored in a **first-party, HttpOnly, Secure (when HTTPS), SameSite=Lax (or Strict if compatible)** cookie. Value MUST be **integrity-protected** server-side (e.g. **HMAC-signed** or **encrypted-and-signed** payload, or random id persisted server-side with cookie holding only a lookup token — pick one pattern and document it in the implementation plan / README).
- **Issuance:** On first need for quota (typically first `POST /api/chat`), server validates cookie; if absent or invalid, mint a **new** visitor id and **Set-Cookie** before counting.
- **Blocked cookies:** If the browser will not accept or persist the quota cookie, server MUST **refuse completions** with a stable JSON error (recommend **403** or **428** with a calm `reply` / `error` code such as `assistant_cookies_required`) explaining that the assistant needs first-party cookies — **do not** fall back to unlimited completions via anonymous IP-only identity.

### Storage and bypass resistance

- **Backend:** Durable **atomic** counters in a **network KV or Redis-class** store (e.g. **Vercel KV**, **Upstash Redis**, or equivalent). Per-key pattern SHOULD be something like `quota:{visitor_id}:{yyyy-mm-dd}` holding an integer count; increments MUST be **atomic** (INCR or transactional compare-and-set) to resist parallel requests.
- **Not sufficient protection:** `sessionStorage`, `localStorage`, client-visible ids, IP-only buckets without cookie binding (except optional caps below), trusting request bodies for identity.

**Bypass scenarios (MUST be covered by design):**

| Attack | Expected behavior |
|--------|-------------------|
| Page refresh / new tab / duplicate tabs | Same cookie → **same counter**; quota unchanged per tab. |
| New browser session (cookie retained) | Same visitor id until cookie cleared/expired. |
| Cleared cookies | **New** visitor id → **new** daily bucket (known limitation). Mitigate with optional **per-IP ceiling** (below). |
| Direct `curl`/scripts against `/api/chat` | Same rules; attacker needs **valid cookie** from browser or minted by server on first response — server MUST NOT honor client-supplied quota ids in JSON bodies as authoritative. |
| Parallel bursts | Atomic increment ensures **51st** concurrent completion loses race or gets **429**. |

### Optional hardening (recommended)

- **Per-IP anomaly bucket:** Secondary cap on completions per IP per UTC day (stricter than `50 × concurrent browsers`) to throttle cookie-reset gaming and scripted abuse. Behavior SHOULD degrade gracefully (429 + calm copy).
- **Signed cookie rotation:** Document rotation policy if signing secret changes (invalidate old cookies vs dual-verify window).

### HTTP responses

- **429** when daily cap exhausted: stable JSON (e.g. `error: 'quota_exhausted'`, human `reply` lowercase per site copy rules). MUST NOT leak signing secrets or raw KV keys.
- **Global kill-switch:** ENV flag(s) to disable completions entirely for maintenance/abuse bursts (**503** or documented equivalent).

Tune numbers only by editing this spec and Implementation plan commit notes—not only code constants.

---

## Privacy, telemetry, moderation

Default posture (**Phase A**; adjust when **Phase B** transcript logging is implemented):

- **Do not persist full transcripts** until [Phase B](#phase-b--later-explicit-opt-in) is explicitly built and documented—prefer aggregated counters (quota usage, latency, error categories).
- If logging prompts/responses temporarily for debugging: **TTL ≤ 72h**, access restricted to operator, scrub obvious secrets if users paste them inadvertently.
- If using vendor moderation/filter APIs: disclose as third-party processing; align with constitution embed rules.

Never train public models automatically on visitor chats unless contractually allowed and ethically intended.

---

## Security headers and CSP sketch

Implementations SHOULD ship:

- `Content-Security-Policy` disallowing unrelated third-party script origins; `'self'` baseline; model HTTP calls originate **server-side** so browser CSP need not widen to arbitrary LLM URLs.
- `Referrer-Policy: strict-origin-when-cross-origin`
- Appropriate `Cross-Origin-Opener-Policy`/`Frame-ancestors` consistent with iframe plan.

Exact directives live beside server config when coded.

---

## Accessibility (assistant UI)

Launcher and transcript MUST:

- Be operable fully via keyboard (Tab order sane, Escape closes overlay if overlay pattern used).
- Expose polite `aria-live` updates for streamed text OR batch announce completion if streaming complicates verbosity (pick one coherent pattern documented in implementation commit).
- Preserve visible `:focus-visible` contrasting with MFWS styling.
- Not trap focus indefinitely; restore focus after close patterns.
- Surface **quota and cookie-required errors** without alarming jargon; human-visible assistant strings SHOULD stay **lowercase** like other wiki copy (`AGENTS.md`).

Assistant response text SHOULD remain legible under 200% zoom.

Copy on static pages MUST follow lowercase policy in HTML per `AGENTS.md`.

---

## Weight budget suggestion (assistants)

Track separately from core MFWS trio (still report in audits):

| Asset group | Soft ceiling (gzip-agnostic approximation) |
|-------------|-------------------------------------------|
| Assistant JS/CSS bundle shipped to browser | target ≤ ~40 KiB total uncompressed **or justify** overrun in commit implementing embed |
| Per-page HTML additions (markup hooks) | keep minimal—prefer referencing external single bundle |

Revisit ceilings if streaming UI requires larger diff.

---

## Testing / acceptance checklist (pre-ship manual)

### Phase A (required before production assistant)

- [ ] **Quota:** With a fixed visitor cookie (or test harness id), **50** successful completions in one UTC day succeed; the **51st** returns **429** (`quota_exhausted` or documented equivalent) and **does not** call the model provider (verify via mock or metrics).
- [ ] **Quota races:** Parallel requests near the limit do not overshoot the daily cap (atomic increment).
- [ ] **Cookie bypass:** Requests without a valid quota cookie get identity issuance flow OR `assistant_cookies_required` (or documented equivalent), never unlimited completions.
- [ ] **UTC rollover:** Counter resets after simulated UTC midnight boundary (unit or integration test with clock injection).
- [ ] UI surfaces exhaustion with accessible, calm wording (no alarming jargon); keyboard-only flow still works.

### Phase B (when transcript / analytics storage ships)

- [ ] Retention, access controls, and visitor-facing policy align with amended privacy subsection; no secrets logged verbatim.

### General (ongoing)

Before marking the broader assistant feature “done” in Implementation plan:

- [ ] API rejects missing/invalid signatures (if authenticated internal calls appear later).
- [ ] Attempt obvious jailbreak lines—assistant refuses off-policy actions without leaking system prompt verbatim.
- [ ] Corpus-only factual probing: contradictory questions show uncertainty or abstention.
- [ ] CSP blocks injection of stray third-party script in tests.
- [ ] Lighthouse-a11y quick pass on launcher path **or** manual keyboard-only traversal logged.
- [ ] Cost ceiling / provider budget alarms configured externally (outside repo optional but recommended).

---

## Resolved implementation choices (update when shipped)

Track concrete answers here or in Implementation plan—not only in ephemeral chat:

| Topic | Decision / notes |
|-------|------------------|
| Rollout | **[Phase A](#phase-a--ship-first-blocking)** first (KV + cookie + quota only). **[Phase B](#phase-b--later-explicit-opt-in)** (e.g. Supabase transcripts / operator queries) only after Phase A is complete — see `IMPLEMENTATION_PLAN.md`. |
| Embed pattern | **Defer-loaded script** (`<script defer src="/api/chat/widget">`) — see `src/*.html`. |
| Rate-limit store | **Vercel KV** or **Upstash Redis** (or compatible): atomic INCR per visitor-day key; document chosen vendor + env var names in README / `.env.example` when wired. |
| Cookie signing | **HMAC** (or platform JWT) with server-only secret **`QUOTA_COOKIE_SECRET`** (name illustrative — document final name); rotation policy noted in IMPLEMENTATION_PLAN when live. |
| Model provider / region | Operator choice; keys remain server-side only (`GOOGLE_*` / `OPENAI_*`). |

Remaining optional forks:

- Streaming (`streamText`/SSE) vs batched JSON replies.
- Optional per-IP ceiling thresholds.
- Phase B schema (Supabase) and retention — document when implemented.

---

## Versioning

Bump a short **`assistant/CORPUS_REVISION`** marker (during implementation) when factual packs change materially so server logs correlate drift.

**Policy notes:**

- Quota policy was amended from the earlier draft (**100** completions per lifetime identity window) to **50 completions per UTC calendar day** with durable KV counters and signed cookies — keep `IMPLEMENTATION_PLAN.md` in sync when implementing.
- **Implementation order:** Phase A (KV + cookie) ships before Phase B (optional transcript DB); see [Rollout phases](#rollout-phases-normative-order).
