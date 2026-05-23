# Page: blog hub (`/blog/`)

**Topic:** authored as **`src/blog/index.html`**; visitor URL **`/blog/`** (explicit **`blog/index.html`** **`308`** → **`/blog/`** via [`urls-and-canonical-paths.md`](./urls-and-canonical-paths.md)).

**Depends on:** [layout-and-style.md](./layout-and-style.md), [urls-and-canonical-paths.md](./urls-and-canonical-paths.md), [visual-language-motherfuckingwebsite.md](./visual-language-motherfuckingwebsite.md).

## Purpose

Listing visitors open **after** the landing (`/`): intro line, **`h2`** “blogs”, post list (+ optional **`time`** rows), **`contact`** block + bottom chrome — same mfws/praneel split as elsewhere.

## Header row

- **`h1`**: site name → **`/`** (**home**, not **`/blog/`**).
- **`<nav>`**: at minimum **`home` → `/`**.

## Post list + contact

Cross-link entries with **meaningful anchors** and relative paths into **`blog/*.html`** when authoring under **`src/blog/`**. **Contact** row SHOULD match **`index`** (**mail**, icons, **resume**) for parity.
