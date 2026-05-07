# Layout and visual style (praneelseth-style clone)

**Topic:** Page shell, spacing, responsive rules, and design tokens for both pages.  
**Depends on:** [design-philosophy-and-constraints.md](./design-philosophy-and-constraints.md), [reference-analysis-praneelseth.md](./reference-analysis-praneelseth.md).

## Page shell (both pages)

- Apply the shell to a single **`<main class="site-main">`** (or equivalent) wrapper that contains all visible primary content except optional skip-link.
- **Width:** `max-width: 37.5rem` (600px); horizontal margin `auto`.
- **Padding:** left/right **`1.5rem`**; top **`12vh`**; bottom **`4rem`**.
- **Min height:** `min-height: 100vh` on `<main>` (or `body` if simpler without breaking skip-link layout).
- **Background:** page background **`#faf8f4`** on `body` (reference warm base). Text default near-black **`#000`** or `#111` if needed for contrast on very thin fonts—prefer **`#000`** for fidelity.

## CSS custom properties (recommended)

Define in `:root` (single stylesheet):

| Token | Value | Usage |
|-------|--------|--------|
| `--bg` | `#faf8f4` | Body background |
| `--text` | `#000000` | Primary text |
| `--text-secondary` | `#374151` | Body paragraphs (gray-700) |
| `--text-nav` | `#4b5563` | Nav links default (gray-600) |
| `--text-muted` | `#9ca3af` | Labels, intro line (gray-400) |
| `--text-soft` | `#6b7280` | Icon/default secondary links (gray-500) |
| `--border-subtle` | `#f3f4f6` | Footer top border (gray-100) |

**Dark mode (optional, no toggle):** If `@media (prefers-color-scheme: dark)` is implemented, remap tokens to approximate inverted neutrals while keeping the same **layout math**; do not add a clickable theme control.

## Site header (top row)

- Container: flex, `justify-content: space-between`, `align-items: center`, **`margin-bottom: 1.5rem`**.
- **Site name:** `font-size: 0.875rem` (14px), font-weight normal or medium per reference (reference is not bold headline); **visual lowercase** via `text-transform: lowercase` on the name element (content in HTML may remain proper case if preferred for a11y copy/paste—**prefer storing lowercase in markup** to match reference literally).
- **Nav:** `font-size: 0.875rem`, flex row with **`gap: 1rem`**. Links use `--text-nav`; on `:hover` and `:focus-visible` move toward `--text` (black). No underline by default; underline on hover is optional if contrast stays clear.

## Intro blurb (index only)

- `font-size: 0.75rem`, color `--text-muted`, `line-height` ~1.625, **`margin-bottom: 1rem`**.

## Section labels (about page)

- `font-size: 0.75rem`, `text-transform: uppercase`, `letter-spacing: 0.05em`, color `--text-muted`, **`margin-bottom: 0.5rem`**.

## Section spacing

- Between major sections: **`margin-bottom: 1.5rem`** (`mb-6` equivalent). Space below list blocks: ~**`2rem`** (`mb-8`).

## Site footer (index only)

- **`margin-top: 3rem`**, **`padding-top: 1rem`**, **`border-top: 1px solid var(--border-subtle)`**.
- Flex `justify-content: space-between`, `align-items: baseline` (or center).
- **Left:** one quiet outbound link: `font-size: 0.75rem`, color `--text-muted`, hover to black.
- **Right:** Reference used a **theme glyph**; **omit** or replace with non-interactive empty space for pixel symmetry. **Do not** add a fake button that suggests interaction without JS behavior.

## Focus and links

- `:focus-visible` outline must remain visible (constitution). Links must not rely on color alone (underline on focus at minimum).

## Responsive rules

- From ~320px to large desktops: **no horizontal scroll** at default zoom; padding may use `clamp` if needed, but **preserve 1.5rem** side padding at common widths.
- Nav wraps gracefully if many links are added (allow `flex-wrap` on small widths if tested).

## Assets

- **Favicon:** optional local `favicon.ico` or `icon.png` in `src/`; no requirement to copy reference icon.
