# Reference analysis: praneelseth.com (structure only)

**Live reference:** [https://www.praneelseth.com/](https://www.praneelseth.com/)

This document captures **information architecture** and **spatial patterns** we keep. **Visual design** (palette, fonts, gray hierarchy) is **not** taken from praneel—see [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

## Stack (out of scope to copy)

- Next.js, React, webfonts, KaTeX, client “loading…” states. We use static HTML + one lean stylesheet.

## Information architecture

| Route | Purpose |
|-------|---------|
| `/` (index) | Name + top nav + short intro + **content/links list** + bottom chrome row. Nav → About. |
| `/about` | Same header pattern; nav → home/blog; **Education → Contact** section stack. |

Implementation: `src/index.html` (landing **`/`**), `src/blog/index.html` (**`/blog/`** hub), posts under `src/blog/*.html`, shared `styles.css`.

## Spatial layout (keep these)

- Centered column **max-width 600px**, horizontal padding **1.5rem**, generous **top padding (~12vh)**, **bottom padding ~4rem**, **min-height** optional for short pages.
- **Header row:** flex, space-between — name/brand left, **nav** right, nav items spaced ~**1rem** apart.
- **Home:** intro paragraph immediately under header row; then a **list** of entries (posts or links).
- **About:** intro paragraph; then repeating **section blocks** in order: Education, Experience, Projects, Achievements (if any), Skills (if any—content-driven), Contact.
- **Home footer chrome:** separate row below main list with **two horizontal slots** (e.g. external link + credit); praneel used a theme control on the right—we replace with static content per site owner.

## Deprecated sections of this document (historical)

Earlier revisions recorded praneel’s **Tailwind palette** and **small-gray typography**. Those are **superseded** by the MFWS visual spec—**do not** implement `#faf8f4`, gray-400 labels, or uppercase tracked section titles.

## Acceptance (structure)

At desktop width, a reviewer should recognize **praneel’s IA**: same column, same header/nav split, same about section order, static lists—but **motherfucking** aesthetics (white page, serif, default link colors).
