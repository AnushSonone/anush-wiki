# Page: index (blog / home)

**Topic:** `/` equivalent — `src/index.html`.  
**Depends on:** [layout-and-style.md](./layout-and-style.md), [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

## Purpose

Personal landing that foregrounds **writing / links**: name, navigation, short intro, ordered list of entries, and bottom chrome—**structurally** like praneel; **visually** like MFWS.

## Document title and meta

- `<title>`: author’s display preference (may be lowercase to match praneel habit).
- `<meta name="description">`: one short line.

## Semantics

- **Exactly one `h1`** per page. **Recommended:** `h1` is the **site name** in the header row (matches MFWS habit of a clear top-level heading). The “posts” block uses **`h2`** next.
- Alternatively, if the name is not an `h1`, include **one** `h1` elsewhere early in `<main>` and document in a comment—do not orphan heading levels.

## Header row

- Left: site name linking to `index.html`.
- Right **`<nav aria-label="Primary">`** with at minimum **`about` → `about.html`** (relative). Styling = **MFWS** (serif, system links)—see visual spec.

## Intro

- Single **`<p>`** (optional class for layout-only hooks). **No** forced small gray type: body text is **black serif** at default size per MFWS.

## Post / links list

- **`<section aria-labelledby="posts-heading">`** with **`h2 id="posts-heading"`** — heading text such as “Links & writing” or “Posts” in **normal title / sentence case**, **not** uppercase label styling.
- **`<ul>`** of entries; **prefer visible bullets** per MFWS unless a narrow exception is documented.
- Each **`<li>`** includes a **meaningful link**; optional **`<time datetime>`** and human date—**dates use the same ink as body text**, not muted gray.

## Site footer chrome

- Structural two-slot row per [layout-and-style.md](./layout-and-style.md). Links use **system link colors**; attribution text is **body copy** (black), not gray “legalese” tone via color.

## Content source

- URLs and titles come from the author. Placeholders must be clearly marked in HTML comments until replaced.
