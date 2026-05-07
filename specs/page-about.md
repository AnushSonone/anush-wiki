# Page: about

**Topic:** `/about` equivalent — `src/about.html`.  
**Depends on:** [layout-and-style.md](./layout-and-style.md).

## Purpose

Single-page résumé / bio with labeled sections matching the reference order and look.

## Document title and meta

- `<title>`: `{Display name}` (may match index).
- `<meta name="description">`: short summary of role/interests.

## Semantics

- **`<main>`** wraps content. **One `h1`**: author display name **or** “About” — pick one; if “About” is `h1`, name should appear prominently as styled text in header row (same as index) for visual parity with reference (reference shows name in top-left without a giant headline).  
- **Recommended for fidelity:** mirror index: **no large headline**; use header row with name + nav; first content block is intro paragraph; use **`h2`** for each section title (`Education`, `Experience`, etc.) styled per “section label” visual spec (uppercase small caps look).

## Header row

- Same layout as index.  
- **`<nav>`** contains **`Blog` → `index.html`**.

## Intro

- **`<p>`** with `font-size: 0.875rem`, color `--text-secondary` (gray-700 feel). One short paragraph: role, school/org, interests (reference pattern).

## Section: Education

- Label: “education” (visual: uppercase small label per layout spec).
- **`<ul class="…">`** of one or more **`<li>`**:
  - Layout: flex, space-between, baseline; primary line: institution name **black**; optional **em dash** detail in softer gray (`--text-soft`); **right-aligned** date range `text-xs` muted.

## Section: Experience

- Label: “experience”.
- List of roles (employer, title, dates, optional link). Same row pattern as education where applicable. **Static** entries only—no loading state.

## Section: Projects

- Label: “projects”.
- Projects with name (link optional), one-line description optional, tech stack optional—keep **compact** to match reference density.

## Section: Achievements

- Label: “achievements”.
- Bulleted or row list; concise items.

## Section: Contact

- Label: “contact”.
- Flex row **`gap: 1rem`**, align center:
  - **`mailto:`** link, `text-sm`, secondary gray default, hover/focus to black.
  - **LinkedIn** and **GitHub**: inline **SVG** icons inside `<a>`, **`aria-label`** on each link, SVG `aria-hidden="true"` or decorative role; stroke/fill **`currentColor`**; size ~16px square; color `--text-soft`, hover black.

## Footer chrome

- Reference about page does **not** repeat the bottom utexas link in the fetched fragment. **Optional:** omit footer on about page for fidelity, **or** repeat same chrome as index—**choose one** for consistency; state preference in implementation plan. Default recommendation: **omit** extra chrome on about to match observed reference structure unless index footer is required site-wide.
