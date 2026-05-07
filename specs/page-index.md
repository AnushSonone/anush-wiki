# Page: index (blog / home)

**Topic:** `/` equivalent — `src/index.html`.  
**Depends on:** [layout-and-style.md](./layout-and-style.md).

## Purpose

Personal landing that foregrounds **writing**: name, navigation, short intro, **reverse-chronological or priority-ordered list of posts**, and bottom chrome.

## Document title and meta

- `<title>`: `{Display name}` (match visible site name).
- `<meta name="description">`: one short line (reference: “My blog and projects”).

## Semantics

- One **`<h1 class="visuallyhidden">` or equivalent** is **not** the reference pattern (reference has no prominent h1 on home). For accessibility, include **exactly one logical `h1`**—recommended: **`h1` = site name** or **`h1` = “Writing” / “Blog”** with name in header. Pick one pattern and keep heading order sane; **document the choice in markup comments**.  
- **Recommended:** `h1` contains the **same text as the visible site name** in the header row (screen reader parity).

## Header row

- Left: site name linking to `/` (or `index.html`).
- Right **`<nav aria-label="Primary">`** with at minimum:
  - **`About` → `about.html`** (relative link).

## Intro

Single paragraph (reference tone: points visitors to posts). Content is **author-specific**; placeholder OK until content spec is filled.

Example structure:

```html
<p class="intro">…</p>
```

## Post list

- Wrapped in **`<section aria-labelledby="posts-heading">`** with **`h2 id="posts-heading"`** visually styled like normal list title or slightly subtle—**must not** skip heading levels after `h1`.
- List: **`<ul>`** of posts. Each **`<li>`** contains a **link**:
  - Post title as link text (meaningful).
  - Optional **`<time datetime="…">`** for machine-readable date; optional muted date snippet.
- Order: newest first unless author specifies otherwise.
- No “loading” placeholder text in shipped HTML.

## Site footer chrome

- As per [layout-and-style.md](./layout-and-style.md): outbound **left** link (reference: `utexas.network`). Replace with author’s affiliate/project link **or** remove if not applicable—in which case keep layout with a single muted line or second link; **do not** leave `href="#"` placeholders.

## Content source

- Post titles, URLs, and dates must come from the author. Until provided, use **two harmless example entries** clearly marked in HTML comments as placeholders.
