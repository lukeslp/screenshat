#!/usr/bin/env python3
"""
Watch for completed 8K gallery captures and sync them to gallery thumbnails.

Maps: screenshots/generated/datavis/gallery/<viz-path>/8k.png
  → gallery/vizs/thumbnails/<slug>.png         (1280×720)
  → gallery/vizs/thumbnails/2k/<slug>.png      (2560×1440)

Uses the catalog.json path field as the key to find the right slug.
Polls every 30s until the source capture process exits or --once is given.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("PIL not found. Install: pip install Pillow", file=sys.stderr)
    sys.exit(1)

GALLERY_ROOT = Path("/home/coolhand/html/datavis/gallery")
CAPTURES_GALLERY = Path("/home/coolhand/html/datavis/screenshots/generated/datavis/gallery")
THUMBNAILS = GALLERY_ROOT / "vizs" / "thumbnails"
THUMBNAILS_2K = THUMBNAILS / "2k"
CATALOG = GALLERY_ROOT / "catalog.json"

THUMB_SIZE = (1280, 720)
SIZE_2K = (2560, 1440)


def load_catalog_map() -> dict[str, str]:
    """Return {viz_path: thumbnail_relative_path} from catalog.json."""
    with open(CATALOG) as f:
        data = json.load(f)
    result = {}
    for viz in data.get("visualizations", []):
        path = viz.get("path", "").strip("/")
        thumb = viz.get("thumbnail", "")
        if path and thumb:
            result[path] = thumb
    return result


def slug_from_thumbnail(thumbnail_path: str) -> str:
    """e.g. 'vizs/thumbnails/strange-attractor.png' → 'strange-attractor'"""
    return Path(thumbnail_path).stem


def resize_and_save(src: Path, dest: Path, size: tuple[int, int]) -> None:
    img = Image.open(src)
    img = img.convert("RGB")
    resized = img.resize(size, Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    resized.save(dest, "PNG", optimize=True)


def scan_and_sync(catalog_map: dict[str, str], processed: set[str]) -> list[str]:
    """Scan for new 8k.png files and sync them. Returns list of newly processed slugs."""
    newly_done = []

    if not CAPTURES_GALLERY.exists():
        return newly_done

    for capture_png in sorted(CAPTURES_GALLERY.rglob("8k.png")):
        capture_key = str(capture_png)
        if capture_key in processed:
            continue

        # Derive viz_path relative to CAPTURES_GALLERY parent dir
        # e.g. .../gallery/vizs/set2/01_strange_attractor.html/8k.png
        # → vizs/set2/01_strange_attractor.html
        try:
            rel = capture_png.parent.relative_to(CAPTURES_GALLERY)
        except ValueError:
            continue

        viz_path = str(rel).rstrip("/")  # e.g. vizs/set2/01_strange_attractor.html

        thumbnail_rel = catalog_map.get(viz_path)
        if not thumbnail_rel:
            # Not in catalog (index pages, captures/, templates/, etc.) — skip silently
            processed.add(capture_key)
            continue

        slug = slug_from_thumbnail(thumbnail_rel)
        thumb_dest = THUMBNAILS / f"{slug}.png"
        dest_2k = THUMBNAILS_2K / f"{slug}.png"

        try:
            resize_and_save(capture_png, thumb_dest, THUMB_SIZE)
            resize_and_save(capture_png, dest_2k, SIZE_2K)
            processed.add(capture_key)
            newly_done.append(slug)
        except Exception as e:
            print(f"  [error] {slug}: {e}")

    return newly_done


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync 8K captures to gallery thumbnails")
    parser.add_argument("--once", action="store_true", help="Run once then exit")
    parser.add_argument("--interval", type=int, default=30, help="Poll interval in seconds (default: 30)")
    args = parser.parse_args()

    catalog_map = load_catalog_map()
    print(f"Catalog: {len(catalog_map)} viz paths loaded")

    processed: set[str] = set()
    round_num = 0

    while True:
        round_num += 1
        newly = scan_and_sync(catalog_map, processed)
        if newly:
            print(f"[round {round_num}] synced {len(newly)} thumbnails: {', '.join(newly[:5])}{'...' if len(newly) > 5 else ''}")
        else:
            print(f"[round {round_num}] no new captures (total synced: {len(processed)})")

        if args.once:
            break

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
