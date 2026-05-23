# Page: about

**Topic:** `/about` equivalent — `src/about.html`.  
**Depends on:** [layout-and-style.md](./layout-and-style.md), [urls-and-canonical-paths.md](./urls-and-canonical-paths.md), [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

## Purpose

Single-page résumé / bio: **praneel section order**; **MFWS** typography and palette.

## Document title and meta

- `<title>`: may match index.
- `<meta name="description">`: short summary.

## Semantics

- **One `h1`** per page—typically the **name** in the header row (consistent with index), or a single top-level heading early in `<main>`.
- Section headings are **`h2`** elements: `Education`, `Experience`, `Projects`, `Achievements` (if used), `Skills` (if used), `Contact` — **title case**, **no** uppercase tracking “label” styling.
- **Intro** is one or more **`<p>`** blocks: **black serif**, default sizes.

## Header row

- Same **layout** as index. **`<nav>`** includes **`blog` → `/`** (canonical home — see [urls-and-canonical-paths.md](./urls-and-canonical-paths.md)).

## Section: Education

- **`h2`** + content. List degree row(s); praneel’s **two-part line + dates** layout is allowed structurally **without** gray color tokens—use inheritance / black text.

## Section: Experience

- **`h2`** + **`<article>`** or grouped blocks per role. Bulleted responsibilities use **visible** list markers when possible.

## Section: Projects

- **`h2`** + compact entries (paragraphs and/or lists). Tech stack lines are **plain text**, not muted gray by default.

## Section: Achievements

- **`h2`** + list or paragraphs if present.

## Section: Skills (optional content)

- If included, **`h2` + Skills** as grouped lines (`Languages: …`) per résumé—still **black** body text.

## Section: Contact

- **`h2`** + row of **`mailto:`**, optional plain links (e.g. website), and **inline SVG** icons per constitution.
- Icon links use **`currentColor`** so glyphs match **link** color (system `LinkText`), not a custom gray.

## Footer chrome

- **Optional**—same rule as before: omit duplicate home chrome unless product owner wants parity across pages; if present, follow MFWS + layout spec (no warm palette).
