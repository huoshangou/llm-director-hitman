from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "sprites"
SOURCE = SPRITES / "map" / "gallery_event_map.png"
TARGET = SPRITES / "map" / "gallery_event_map_v2.png"
MANIFEST = SPRITES / "manifest.json"


def feather_mask(size: tuple[int, int], inset: int = 4, radius: int = 10) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (inset, inset, size[0] - inset, size[1] - inset),
        radius=radius,
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(radius=3))


def paste_blended(base: Image.Image, patch: Image.Image, box: tuple[int, int], mask: Image.Image) -> None:
    base.paste(patch, box, mask)


def remove_tuxedo(base: Image.Image) -> None:
    # Keep the cabinet/alcove, remove only the hanging suit silhouette.
    x, y, w, h = 118, 492, 88, 145
    patch = Image.new("RGB", (w, h), (22, 24, 25))
    draw = ImageDraw.Draw(patch)
    for yy in range(h):
        shade = 20 + int(yy / h * 11)
        draw.line((0, yy, w, yy), fill=(shade, shade + 2, shade + 3))
    draw.rectangle((5, 5, w - 6, h - 10), outline=(36, 37, 37), width=2)
    draw.line((16, 18, w - 16, 18), fill=(88, 70, 44), width=3)
    draw.ellipse((36, 18, 50, 29), outline=(78, 66, 50), width=1)
    paste_blended(base, patch, (x, y), feather_mask((w, h), inset=5, radius=8))


def remove_bar_glass(base: Image.Image) -> None:
    # Clone nearby marble counter over the single wine glass.
    target = (565, 334, 620, 393)
    source = base.crop((508, 330, 563, 389))
    patch = source.filter(ImageFilter.GaussianBlur(radius=0.25))
    mask = Image.new("L", (target[2] - target[0], target[3] - target[1]), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((3, 2, mask.width - 3, mask.height - 2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=4))
    paste_blended(base, patch, (target[0], target[1]), mask)


def remove_gallery_camera(base: Image.Image) -> None:
    # Rebuild the burgundy wall and top trim where the camera was mounted.
    x, y, w, h = 1318, 92, 103, 82
    patch = Image.new("RGB", (w, h), (70, 31, 31))
    draw = ImageDraw.Draw(patch)
    for yy in range(h):
        r = 58 + int(yy / h * 24)
        draw.line((0, yy, w, yy), fill=(r, 29, 30))
    draw.rectangle((0, 0, w, 10), fill=(13, 14, 17))
    draw.line((0, 12, w, 12), fill=(83, 58, 37), width=2)
    draw.line((w - 13, 8, w - 13, h), fill=(42, 34, 34), width=2)
    paste_blended(base, patch, (x, y), feather_mask((w, h), inset=3, radius=7))


def reinforce_doorway(base: Image.Image) -> None:
    draw = ImageDraw.Draw(base, "RGBA")
    # Dark open passage between kitchen/service and bar. Coordinates are kept
    # tight so only the existing narrow wall seam is touched.
    doorway = [(389, 463), (425, 463), (418, 616), (382, 616)]
    draw.polygon(doorway, fill=(9, 8, 8, 215))
    draw.line((390, 462, 383, 617), fill=(170, 126, 58, 210), width=4)
    draw.line((424, 462, 417, 617), fill=(77, 56, 31, 220), width=4)
    draw.line((384, 613, 418, 613), fill=(205, 147, 67, 160), width=3)
    draw.polygon([(385, 610), (419, 610), (407, 628), (372, 628)], fill=(180, 118, 48, 42))
    draw.line((393, 470, 422, 470), fill=(210, 151, 74, 165), width=2)


def update_manifest() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["map"]["background"] = "/sprites/map/gallery_event_map_v2.png"
    manifest["map"]["editedFrom"] = "/sprites/map/gallery_event_map.png"
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    base = Image.open(SOURCE).convert("RGB")
    remove_tuxedo(base)
    remove_bar_glass(base)
    remove_gallery_camera(base)
    reinforce_doorway(base)
    base.save(TARGET)
    update_manifest()
    print(f"Wrote {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
