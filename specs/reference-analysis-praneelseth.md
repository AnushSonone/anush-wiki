# Reference analysis: praneelseth.com

**Live reference (as fetched 2026-05):** [https://www.praneelseth.com/](https://www.praneelseth.com/)

This document records what the reference site does **structurally and visually** so we can mirror it under `specs/design-philosophy-and-constraints.md` (HTML + CSS only, no frameworks).

## What the reference is built with

- Next.js (App Router), React hydration, custom **woff2** font preload, KaTeX CSS bundle, client-side “loading…” placeholders for some lists.
- **We do not replicate** the stack, JS, webfont preloads, or client-side data fetching. We replicate **layout, hierarchy, spacing, palette, and copy placement patterns** using one stylesheet and semantic HTML.

## Information architecture

| Route   | Purpose |
|---------|---------|
| `/`     | “Blog index”: name + top nav + short intro + **post list** + bottom chrome (left external link). Nav includes **About**. |
| `/about`| Résumé-style page: same chrome; nav includes **Blog** → `/`; sections **Education**, **Experience**, **Projects**, **Achievements**, **Contact**. |

Our implementation uses **two static files**: `src/index.html` and `src/about.html` (or equivalent names per build conventions), each linking `styles.css`.

## Layout (Tailwind → implementation intent)

- **Page column:** centered block, **max-width 600px**, horizontal padding **1.5rem** (Tailwind `px-6`), **padding-top ~12vh**, **padding-bottom 4rem** (`pb-16`), **min-height 100vh** so short pages breathe.
- **Top row:** flex, space-between, align center/baseline. **Left:** display name (reference uses **lowercase** “praneel seth”). **Right:** horizontal nav, links spaced **~1rem** apart (`gap-4`).
- **Intro on home:** small muted sentence (`text-xs`, gray-400 class) above the post list.
- **Section pattern (about):** label row: **uppercase**, `text-xs`, gray-400, **wide letter-spacing** (`tracking-wider`), margin below. Body lists use `text-sm` with supporting metadata in gray-500/400.
- **List rows (education etc.):** flex, space-between, baseline-aligned; secondary text (degree detail) inline with subtle gray; **date range** right-aligned, `text-xs`, gray-400, `shrink-0`.
- **Footer chrome (home):** margin-top **3rem**, padding-top **1rem**, **border-top** very light gray (`border-gray-100`). Flex space-between: **left** small external link (`text-xs`, gray-400); **right** on reference is a “○” wired to **theme toggle** (JS). **Our clone:** no toggle; see `specs/layout-and-style.md`.

## Palette (from compiled Tailwind on reference)

Documented for fidelity.

| Role | Approximate color |
|------|-------------------|
| Page background | `#faf8f4` (class `bg-base`; also `body { background: #faf8f4 }`) |
| Primary text | `#000` (`text-black`) |
| Body secondary | `rgb(55, 65, 81)` (gray-700) |
| Nav default | `rgb(75, 85, 99)` (gray-600); **hover → black** |
| Muted / labels | `rgb(156, 163, 175)` (gray-400) |
| Tertiary / icons default | `rgb(107, 114, 128)` (gray-500); **hover → black** |
| Footer top border | `rgb(243, 244, 246)` (gray-100) |

## Typography

- Reference uses **ui sans / system** stack in global CSS (no remote body font required for our clone beyond system UI fonts).
- Scale: **0.75rem** (labels, dates), **0.875rem** (name, nav, list body, contact email), intro line on home is **extra-small** muted.
- **Section labels:** uppercase + increased letter-spacing.

## Behavior we omit or replace

| Reference | Our static equivalent |
|-----------|------------------------|
| Theme toggle (○) | Rely on **user agent** only: optional `prefers-color-scheme: dark` styling in CSS (no control glyph, no script). |
| “loading…” placeholders | All lists are **fully static** in HTML (build-time or hand-authored). |
| Blog data from API | Static `<ul>` / `<article>` list with real `href`s to post URLs or external posts. |
| Inline SVG social icons | **Allowed**: small inline `<svg>` in HTML with `aria-label` on the parent link (constitution). |

## Acceptance (reference fidelity)

A reviewer comparing side-by-side at 1280px width should recognize:

1. Same column width, vertical rhythm, and warm off-white page.  
2. Same header/nav/footer pattern and typographic hierarchy.  
3. About page section order and label styling match.  
4. No flash of “loading…” and no script required for core reading experience.
