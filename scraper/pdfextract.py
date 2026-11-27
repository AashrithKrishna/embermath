#!/usr/bin/env python3
"""Extract per-character geometry from a PDF into JSON for scraper/pdfmath.mjs.

Usage: pdfextract.py <input.pdf> <output.json>

Uses pdfplumber from an isolated venv (see scraper/pdfq.mjs for the venv
resolution). Emits every text character with its position, baseline, size and
font so the Node side can reconstruct lines, math runs and super/subscripts.
"""
import json
import sys

import pdfplumber

FIELDS = ("x0", "x1", "top", "bottom", "size", "fontname", "text")


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    src, dst = sys.argv[1], sys.argv[2]
    pages = []
    with pdfplumber.open(src) as pdf:
        for index, page in enumerate(pdf.pages):
            chars = []
            for c in page.chars:
                text = c.get("text") or ""
                if not text.strip() and text != " ":
                    continue
                chars.append({k: c.get(k) for k in FIELDS})
            pages.append({"index": index, "chars": chars})
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump({"pages": pages}, fh)
    print(f"extracted {len(pages)} pages from {src}")


if __name__ == "__main__":
    main()
