# Layout and structure (praneel IA + MFWS surface)

**Topic:** **Where** things sit on the page (praneelseth.com information architecture), plus **how little** CSS is allowed beyond [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

**Depends on:** [design-philosophy-and-constraints.md](./design-philosophy-and-constraints.md), [urls-and-canonical-paths.md](./urls-and-canonical-paths.md) (canonical **`/`** for home and nav `<a>` targets), [reference-analysis-praneelseth.md](./reference-analysis-praneelseth.md), [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

## Division of concerns

| Layer | Source |
|--------|--------|
| Routes, nav labels, section order, column width, vertical spacing blocks | **Praneel** ([reference analysis](./reference-analysis-praneelseth.md)) |
| Colors, fonts, link styling, heading treatment, list bullets | **MFWS** ([visual language](./visual-language-motherfuckingwebsite.md)) |

## Page shell (both pages)

- **`<main class="site-main">`** (or equivalent) wraps primary content (after skip-link).
- **Width:** `max-width: 37.5rem` (600px); horizontal margin `auto`.
- **Padding:** left/right **`1.5rem`**; top **`12vh`**; bottom **`4rem`**.
- **Min height:** `min-height: 100vh` on `<main>` if desired for short pages.
- **Do not** set `background` on `body` / `main` to anything other than **`#ffffff`** per MFWS visual spec (unless constitution is amended).

## Site header (top row) — structural only

- Flex: `justify-content: space-between`, `align-items: center`, `margin-bottom` ~`1.5rem`.
- **Site name** (left): remains in praneel **position**; typography follows MFWS (serif, default sizes—see visual spec). Optional: lowercase display matches praneel **copy** habit; implement via text in HTML, not a gray small-type system.
- **Nav** (right): flex row, `gap: ~1rem`. **No** author-gray link colors.

## Intro blurb (index only)

- Single **`<p>`** after the header row. **Black** text, **serif**, **default** font size—**not** extra-small muted gray.

## Section titles (about page)

- Each section begins with a semantic **`<h2>`** (e.g. `Education`, `Experience`) in **title case**. Styling = **browser default heading**—not uppercase micro-labels.

## Section spacing

- Between major sections: ~`1.5rem`–`2rem` margin (author may use one consistent value). **No** color-based separation beyond optional MFWS hairline.

## Lists and résumé rows (about)

- **Education / experience:** praneel’s **two-column intent** (primary line + date) may be kept using **minimal** flex/grid **without** introducing gray token colors—dates are **black** like body text, or inherit `color: inherit`.
- **Bullets** for achievement or detail lists: prefer **visible** default list markers unless a tight layout absolutely requires suppression (document in comments).

## Site footer (index only)

- **Structural:** margin-top, optional **1px** `#ccc` top border per visual spec; flex `space-between` for **two slots** (e.g. outbound link + attribution line).
- **No** “quiet gray” typographic treatment—footer text follows same ink rules as body unless a link uses system link colors.

## Focus and accessibility

- **`:focus-visible`** outlines remain mandatory (constitution). They are **not** part of MFWS’s shipped site but are required for our build.

## Responsive rules

- No horizontal scroll at common mobile widths; preserve **1.5rem** side padding where possible; `flex-wrap` on nav if needed.

## Deprecated (do not implement)

- Warm **`#faf8f4`** background, Tailwind gray ramps, uppercase tracking labels, sans-first UI typography, “muted intro” small caps aesthetic.
