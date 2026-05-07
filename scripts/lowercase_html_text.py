#!/usr/bin/env python3
"""Lowercase human-visible text and selected attributes in static HTML files."""

from __future__ import annotations

from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString

ROOT = Path(__file__).resolve().parents[1] / "src"
SKIP_PARENT = {"script", "style", "pre", "code"}
LOWER_ATTRS = frozenset({"title", "alt", "aria-label", "content", "placeholder"})


def process_file(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(raw, "html.parser")

    for node in soup.find_all(string=True):
        if isinstance(node, Comment):
            if node.string and node.string.strip():
                node.replace_with(Comment(node.string.lower()))
            continue
        if not isinstance(node, NavigableString):
            continue
        parent = getattr(node, "parent", None)
        if parent and parent.name in SKIP_PARENT:
            continue
        text = str(node)
        if not text.strip():
            continue
        lowered = text.lower()
        if lowered != text:
            node.replace_with(lowered)

    for tag in soup.find_all(True):
        if not getattr(tag, "attrs", None):
            continue
        for key in list(tag.attrs.keys()):
            if key not in LOWER_ATTRS:
                continue
            val = tag.attrs[key]
            if isinstance(val, str):
                tag.attrs[key] = val.lower()
            elif isinstance(val, list):
                tag.attrs[key] = [
                    v.lower() if isinstance(v, str) else v for v in val
                ]

    out = str(soup)
    # html5lib/html.parser lowercases attribute names; SVG viewBox must be camelCase
    out = out.replace('viewbox="', 'viewBox="')
    path.write_text(out, encoding="utf-8")


def main() -> None:
    for path in sorted(ROOT.rglob("*.html")):
        process_file(path)
        print(path.relative_to(ROOT.parent))


if __name__ == "__main__":
    main()
