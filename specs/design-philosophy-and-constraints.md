# Design philosophy and constraints (“motherfucking”-style)

This spec is the **constitution** for the personal landing page. It translates the *technical ideology* behind [motherfuckingwebsite.com](https://motherfuckingwebsite.com/) into actionable requirements: **content and semantics first**, minimal material, no accidental complexity. (Tone of the original site is irrelevant here.)

## Technology constraints

- **HTML + CSS only** for what visitors download. No JavaScript, no WebAssembly, no framework runtime.
- **No third-party embeds** (analytics, chat widgets, tag managers, ad scripts, social SDKs) unless a future spec explicitly names an exception and justifies payload impact.
- **No web font CDN** and no bundled `@font-face` unless a future spec explicitly allows it. Default: **system font stack** for zero blocking bytes and native readability.

## Performance and weight

- **Combined** byte size of `src/index.html` + `src/styles.css` (excluding optional local images not yet defined) SHOULD stay **under ~35 KiB** uncompressed as a soft budget. If content grows beyond, update this spec with a new ceiling and reason.
- **No render-blocking** resources other than the single stylesheet linked from HTML.
- Prefer a **single CSS file** unless a later spec splits concerns for maintenance.

## Structure and semantics

- Use **HTML5 semantic elements** (`header`, `main`, `footer`, `section`, `nav`, `article`, `ul`/`ol` as appropriate).
- Exactly **one `h1`** per page unless a spec documents multi-page structure.
- Do not skip heading levels for styling convenience; use CSS to adjust visual weight.
- **Meaningful link text**; avoid bare URLs as link labels when readability suffers.

## Accessibility

- Text MUST remain **legible** at default zoom and at ~200% zoom in a typical browser.
- Interactive elements MUST show a clear **keyboard focus** style (`:focus-visible`).
- Color MUST NOT be the only cue for meaning (underline links or other non-color cue).
- Any future **images** MUST have `alt` text aligned with their role (decorative vs informative), defined in content specs.

## Visual design

- **Minimal chrome:** no decorative animation required; no hover gimmicks that add weight or obscure content.
- **Responsive** layout MUST work from small phone to desktop-width viewports using simple CSS (fluid type, max-width on main column, respectful spacing). No dependency on heavyweight grid frameworks.

## Content scope

- Portfolio-specific facts (bio, projects, contact, social links) belong in **separate topic specs** under `specs/*.md`. This document does not define that content.

## Acceptance

The site **satisfies** this spec when:

1. View source shows HTML + CSS only; no scripts in markup.
2. Validator-smoke (manual or tool): no knowingly broken semantics that break AT (landmarks present, sensible heading order).
3. `wc -c` on HTML + CSS is within the budget above or the spec has been amended.
