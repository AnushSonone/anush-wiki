# Design philosophy and constraints (“motherfucking”-style)

This spec is the **constitution** for the personal landing page. It translates the *technical ideology* behind [motherfuckingwebsite.com](https://motherfuckingwebsite.com/) into actionable requirements: **content and semantics first**, minimal material, no accidental complexity. (Tone of the original site is irrelevant here.)

## Technology constraints

- **HTML + CSS only** for the **core** pages (`index`, `about`, blog posts, shared stylesheet): no framework runtime shipped for ordinary reading chrome.
- **Optional first-party assistant:** A single wiki assistant **may** add **first-party JavaScript** and a companion API **only** as defined in [feature-assistant-chat.md](./feature-assistant-chat.md). That spec defines **rollout phases** (**Phase A:** KV + signed-cookie quotas before optional transcript storage), **server-enforced daily caps**, **non-spoofable visitor identity**, **corpus containment**, and **no reliance on client-only rate limits**. No other scripts, WebAssembly bundles, or client-side assistants are permitted without amending this document again.
- **No third-party embeds** (analytics, vendor chat widgets, tag managers, ad scripts, social SDKs) unless a spec explicitly names an exception and justifies payload impact. The wiki assistant MUST be hosted and controlled by you (same project or explicitly listed first-party origin); loading model-provider SDKs from a CDN MUST follow the CSP and SRI rules in `feature-assistant-chat.md`.
- **No web font CDN** and no bundled `@font-face` unless a future spec explicitly allows it. Default: **serif** stack only (see visual language spec)—not sans/system-ui for primary copy.
- **Inline SVG** is allowed inside HTML for small monochrome icons (e.g. social links) when given accessible names via the enclosing `<a>`; no SVG sprite CDNs.
- **Serif-first reading** and **white canvas** per [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md)—no warmed boutique backgrounds or gray “UI typography” for body/nav.

## IA vs visual (merged project)

- **Praneelseth.com** supplies **structure only**: two-page IA, 600px column, header/nav placement, section order ([reference-analysis-praneelseth.md](./reference-analysis-praneelseth.md), [layout-and-style.md](./layout-and-style.md)).
- **[motherfuckingwebsite.com](https://motherfuckingwebsite.com/)** supplies **look**: black on white, serif, system link colors, default heading hierarchy ([visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md)).

## Performance and weight

- **Combined** byte size of `src/index.html` + `src/about.html` + `src/styles.css` (excluding optional local images not yet defined) SHOULD stay **under ~35 KiB** uncompressed as a soft budget. If content grows beyond, update this spec with a new ceiling and reason.
- Assistant JavaScript/CSS (if present) SHOULD have its **own documented soft ceiling** in [feature-assistant-chat.md](./feature-assistant-chat.md); it MUST NOT inflate the core trio above unless that spec merges bundles into the same files and adjusts the ceiling here accordingly.
- **No render-blocking** resources other than the single stylesheet linked from core HTML pages. Assistant bundles MUST load with `defer`, `async`, or dynamic import patterns that do not block first paint of the article column (exact pattern in assistant spec).
- Prefer a **single CSS file** unless a later spec splits concerns for maintenance.

## Visitor-facing URLs (home)

Deploy + internal links SHOULD keep the homepage visible as **`/`** in the address bar (not **`/index.html`**). Rules + **next pipeline** (**`middleware` matcher**, **`beforeFiles`** rewrite — no redirect loops): **`specs/urls-and-canonical-paths.md`**, **`specs/build-and-request-pipeline.md`**.

## Structure and semantics

- Use **HTML5 semantic elements** (`header`, `main`, `footer`, `section`, `nav`, `article`, `ul`/`ol` as appropriate).
- Exactly **one `h1`** per page unless a spec documents multi-page structure.
- Do not skip heading levels for styling convenience; **heading levels carry meaning**—avoid shrinking `h2` into “label” territory with CSS; prefer MFWS default heading sizes per [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).
- **Meaningful link text**; avoid bare URLs as link labels when readability suffers.

## Accessibility

- Text MUST remain **legible** at default zoom and at ~200% zoom in a typical browser.
- Interactive elements MUST show a clear **keyboard focus** style (`:focus-visible`).
- Color MUST NOT be the only cue for meaning (underline links or other non-color cue).
- Any future **images** MUST have `alt` text aligned with their role (decorative vs informative), defined in content specs.

## Visual design

- **Minimal chrome:** no decorative animation required; no hover gimmicks that add weight or obscure content.
- **Responsive** layout MUST work from small phone to desktop-width viewports using simple CSS (max-width column, padding only—**no** custom fluid type scale unless amended). No dependency on heavyweight grid frameworks.

## Content scope

- Portfolio-specific facts (bio, projects, contact, social links) belong in **separate topic specs** under `specs/*.md`. This document does not define that content.

## Acceptance

The site **satisfies** this spec when:

1. Core pages’ shipped markup uses **semantic HTML + the global CSS** without extra frameworks. If the wiki assistant is enabled, `<script>`/`<iframe>` hooks MUST match [feature-assistant-chat.md](./feature-assistant-chat.md) (single feature, first-party boundary, no undocumented third-party widgets).
2. Validator-smoke (manual or tool): no knowingly broken semantics that break AT (landmarks present, sensible heading order). Assistant surfaces MUST meet the accessibility requirements in `feature-assistant-chat.md`.
3. `wc -c` on core HTML + `styles.css` is within the budget above or this spec documents a revised ceiling; assistant payloads are justified per `feature-assistant-chat.md`.
4. Homepage URL presentation follows **`specs/urls-and-canonical-paths.md`** + **`specs/build-and-request-pipeline.md`** (canonical **`/`**; no **`/index.html`** in internal links; no infinite redirect regressions).
