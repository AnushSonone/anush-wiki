# Visual language: motherfuckingwebsite.com

**Topic:** Color, typography, and link presentation aligned with [motherfuckingwebsite.com](https://motherfuckingwebsite.com/) (MFWS).  
**Does not define** page structure—that lives in [reference-analysis-praneelseth.md](./reference-analysis-praneelseth.md) and [layout-and-style.md](./layout-and-style.md).

## Source of truth

MFWS ships **no author stylesheet**: content is plain HTML5 on the default browser canvas. This spec translates that into **testable rules** for our **HTML + CSS** site. Where CSS is required (layout, focus rings), it must **not** reintroduce a “designed gray scale,” custom fonts, or Tailwind-ish muted UI.

**Do not** copy MFWS’s satirical prose or analytics script; the [constitution](./design-philosophy-and-constraints.md) already bans client JS and third-party embeds.

## Palette (author intent)

| Surface | Value | Notes |
|---------|--------|--------|
| Page background | `#ffffff` | White canvas, not warm off-white. |
| Primary text | `#000000` | Body copy, headings, lists—**one** ink color. |
| Horizontal rules / hairline chrome | `#cccccc` optional | Max ornament: **single 1px** divider if needed for praneel-style footer separation. Prefer omission if still readable. |
| Links | **System link colors** | Use CSS system colors for parity with unstyled HTML: `LinkText`, `VisitedText`, `ActiveText` where supported; **do not** force grays for “quiet links.” |
| Focus outline | Visible, high contrast | Constitution requires `:focus-visible`; may use `Highlight` / explicit outline—**not** a brand accent rainbow. |

**Forbidden:** author-defined muted grays for nav, labels, intro, or dates (e.g. no `#9ca3af`, `#6b7280` for copy). **No** `prefers-color-scheme` theme swap unless you later amend this spec—MFWS is a single light canvas.

## Typography

- **Family:** **Serif** stack only, approximating default unstyled HTML: e.g. `Times, "Times New Roman", Georgia, "DejaVu Serif", serif`. **No** `system-ui` / sans stack for body or headings on shipped pages.
- **Sizes:** Do **not** set custom `font-size` on `body` except `100%` / `medium` if needed for reset. **Headings** (`h1`–`h3`) use **browser default** sizes and weights—no utility-scale shrinking of `h2` to “label” size.
- **Case:** Section titles are normal written title case (`Education`, `Experience`)—**no** `text-transform: uppercase`, **no** letter-spacing tracking for “label” aesthetics.
- **Line length:** Still cap **measure** via praneel column width (`max-width`); line-height may stay browser default (`normal`) unless legibility testing shows need for a single `line-height` on `body` only.

## Links

- Default presentation: **underlined** (or browser-default link styling). Visited state must remain distinguishable (system `VisitedText` or equivalent).
- **No** “muted link that turns black on hover” pattern from the old praneel visual clone.

## Lists

- **`<ul>`** in content: show **default bullets** (do not `list-style: none` for main prose lists) unless a specific micro-layout requires an exception and that exception is documented in HTML comments.

## Block quotes

- If used, style with **minimal** author CSS—prefer UA `blockquote` presentation or a single left margin rule; no decorative quotation glyphs required.

## What CSS is for (summary)

Structural rules from praneel IA only:

- Centered column, padding, header flex row, spacing between blocks, skip-link affordance, and focus rings.

Everything else should look as if MFWS had decided to add **half a dozen lines** of layout—not a design system.

## Acceptance

1. Turning off author colors (hypothetically) leaves readable monochrome layouts; no reliance on gray hierarchy for meaning.  
2. Serif is the dominant reading face sitewide.  
3. No warmed background, no small-caps gray section labels, no sans-first typography on main copy.
