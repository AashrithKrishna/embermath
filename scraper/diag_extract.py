#!/usr/bin/env python3
"""Extract figure/diagram regions from Word-generated PDFs and render PNG crops.

Used by scraper/diagrams.mjs. Word PDFs encode figures either as vector
drawings (pdfplumber page.lines / page.curves / page.rects) or as embedded
raster images (page.images, e.g. graph grids / number lines); both are
separate from text chars.

Usage: diag_extract.py <spec.json> <imagesDir> <regionsOut.json>

spec.json is a list of {"slug": ..., "pdf": "/abs/path.pdf"} entries.
Writes PNG crops into <imagesDir>/nik-<slug>-p<pageLabel>-r<idx>.png and a
region list to <regionsOut.json>:
  [{"slug", "pdfPage" (0-based), "pageLabel" (1-based), "idx",
    "bbox": [x0, top, x1, bottom], "imagePath": "images/nik-...png",
    "kind": "vector" | "image", "count", "ncurves"}]
"""
import json
import sys
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium

MERGE_TOL = 12.0  # points: merge regions whose bboxes, expanded by this, intersect
MIN_PRIMS = 3     # keep vector regions with >= this many primitives...
MIN_CURVES = 1    # ...or >= this many curves
MIN_W = 8.0       # drop regions narrower than this (points)
MIN_H = 8.0       # drop regions shorter than this (points)
PAD = 8.0         # points of padding around each region crop
SCALE = 2         # render scale for PNG output
WIDE_RECT = 0.6   # drop rects wider than this fraction of page width

TABLE_MIN_RECTS = 8  # all-rect vector regions with >= this many rects are tables
FRAG_MAX_W = 30.0    # drop tiny text-fragment regions (radical signs, ...)
FRAG_MAX_H = 15.0
IMG_COVER = 0.5      # drop a vector region if >= this fraction of its area is
                     # inside a raster image bbox (the image crop includes it)


def bbox_of(prim):
    return [prim["x0"], prim["top"], prim["x1"], prim["bottom"]]


def expanded_intersect(a, b, tol):
    return (
        a[0] <= b[2] + tol
        and b[0] <= a[2] + tol
        and a[1] <= b[3] + tol
        and b[1] <= a[3] + tol
    )


def cluster_regions(prims, tol):
    """Merge primitives into regions (single sweep, sorted by bbox)."""
    prims = sorted(prims, key=lambda p: (p["top"], p["x0"]))
    regions = []  # {"bbox": [...], "count": int, "ncurves": int, "nrects": int}
    for p in prims:
        bbox = bbox_of(p)
        kind = p["kind"]
        hits = [r for r in regions if expanded_intersect(r["bbox"], bbox, tol)]
        if not hits:
            regions.append(
                {
                    "bbox": list(bbox),
                    "count": 1,
                    "ncurves": 1 if kind == "curve" else 0,
                    "nrects": 1 if kind == "rect" else 0,
                }
            )
            continue
        base = hits[0]
        base["count"] += 1
        base["ncurves"] += 1 if kind == "curve" else 0
        base["nrects"] += 1 if kind == "rect" else 0
        base["bbox"] = [
            min(base["bbox"][0], bbox[0]),
            min(base["bbox"][1], bbox[1]),
            max(base["bbox"][2], bbox[2]),
            max(base["bbox"][3], bbox[3]),
        ]
        for r in hits[1:]:
            base["count"] += r["count"]
            base["ncurves"] += r["ncurves"]
            base["nrects"] += r["nrects"]
            base["bbox"] = [
                min(base["bbox"][0], r["bbox"][0]),
                min(base["bbox"][1], r["bbox"][1]),
                max(base["bbox"][2], r["bbox"][2]),
                max(base["bbox"][3], r["bbox"][3]),
            ]
            regions.remove(r)
    return regions


def area(bbox):
    return max(0.0, bbox[2] - bbox[0]) * max(0.0, bbox[3] - bbox[1])


def overlap_area(a, b):
    w = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    h = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    return w * h


def page_regions(page):
    """Gather, filter and cluster vector + raster figure regions on one page."""
    prims = []
    for obj in page.lines:
        prims.append(
            {"x0": obj["x0"], "top": obj["top"], "x1": obj["x1"], "bottom": obj["bottom"], "kind": "line"}
        )
    for obj in page.curves:
        prims.append(
            {"x0": obj["x0"], "top": obj["top"], "x1": obj["x1"], "bottom": obj["bottom"], "kind": "curve"}
        )
    for obj in page.rects:
        if obj["x1"] - obj["x0"] > WIDE_RECT * page.width:
            continue  # table / frame border
        prims.append(
            {"x0": obj["x0"], "top": obj["top"], "x1": obj["x1"], "bottom": obj["bottom"], "kind": "rect"}
        )
    vector = []
    for r in cluster_regions(prims, MERGE_TOL):
        x0, top, x1, bottom = r["bbox"]
        w, h = x1 - x0, bottom - top
        if r["count"] < MIN_PRIMS and r["ncurves"] < MIN_CURVES:
            continue
        if w < MIN_W or h < MIN_H:
            continue
        # Tables: pure grid of many rects, no lines/curves (data tables, not figures)
        if r["nrects"] == r["count"] and r["nrects"] >= TABLE_MIN_RECTS:
            continue
        # Tiny text fragments: radical signs / minus strokes inside math lines
        if w < FRAG_MAX_W and h < FRAG_MAX_H:
            continue
        vector.append({"bbox": r["bbox"], "kind": "vector", "count": r["count"], "ncurves": r["ncurves"]})

    images = []
    for im in page.images:
        bbox = [im["x0"], im["top"], im["x1"], im["bottom"]]
        if bbox[2] - bbox[0] < MIN_W or bbox[3] - bbox[1] < MIN_H:
            continue
        images.append({"bbox": bbox, "kind": "image", "count": 0, "ncurves": 0})

    # A vector region largely inside a raster image is part of that image crop.
    out = []
    for v in vector:
        if any(overlap_area(v["bbox"], im["bbox"]) >= IMG_COVER * area(v["bbox"]) for im in images):
            continue
        out.append(v)
    out.extend(images)
    out.sort(key=lambda r: (r["bbox"][1], r["bbox"][0]))
    return out


def main():
    if len(sys.argv) != 4:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    spec_path, images_dir, out_path = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    with open(spec_path, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    images_dir.mkdir(parents=True, exist_ok=True)

    all_regions = []
    for entry in spec:
        slug, pdf_path = entry["slug"], entry["pdf"]
        pdfium_pdf = pdfium.PdfDocument(pdf_path)
        with pdfplumber.open(pdf_path) as pdf:
            for pnum, page in enumerate(pdf.pages):
                regions = page_regions(page)
                if not regions:
                    continue
                bitmap = pdfium_pdf[pnum].render(scale=SCALE)
                pil = bitmap.to_pil()
                pw, ph = page.width, page.height
                iw, ih = pil.size
                for idx, r in enumerate(regions):
                    x0, top, x1, bottom = r["bbox"]
                    crop = (
                        max(0.0, x0 - PAD),
                        max(0.0, top - PAD),
                        min(pw, x1 + PAD),
                        min(ph, bottom + PAD),
                    )
                    px = tuple(int(round(v * SCALE)) for v in crop)
                    box = (
                        max(0, px[0]),
                        max(0, px[1]),
                        min(iw, px[2]),
                        min(ih, px[3]),
                    )
                    name = f"nik-{slug}-p{pnum + 1}-r{idx}.png"
                    pil.crop(box).save(images_dir / name)
                    all_regions.append(
                        {
                            "slug": slug,
                            "pdfPage": pnum,
                            "pageLabel": pnum + 1,
                            "idx": idx,
                            "bbox": [x0, top, x1, bottom],
                            "imagePath": f"images/{name}",
                            "kind": r["kind"],
                            "count": r["count"],
                            "ncurves": r["ncurves"],
                        }
                    )
        pdfium_pdf.close()
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(all_regions, fh, indent=2)
    print(f"wrote {len(all_regions)} regions -> {out_path}")


if __name__ == "__main__":
    main()
