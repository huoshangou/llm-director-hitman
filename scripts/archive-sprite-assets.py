from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "sprites"
SHEETS = SPRITES / "sheets"


@dataclass(frozen=True)
class CropSpec:
    source: str
    output: str
    asset_id: str
    name: str
    asset_type: str
    state: str
    rect: tuple[int, int, int, int]
    tags: tuple[str, ...]
    anchor: tuple[float, float]
    chroma: bool = True


def character(asset_id: str, state: str, rect: tuple[int, int, int, int], tags: tuple[str, ...] = ()) -> CropSpec:
    return CropSpec(
        source="sheet-b-core-characters.png",
        output=f"characters/{asset_id}_{state}.png",
        asset_id=f"{asset_id}_{state}",
        name=asset_id,
        asset_type="character",
        state=state,
        rect=rect,
        tags=tags or (asset_id,),
        anchor=(0.5, 1.0),
    )


def support_character(asset_id: str, state: str, rect: tuple[int, int, int, int], tags: tuple[str, ...] = ()) -> CropSpec:
    return CropSpec(
        source="sheet-c-support-objects.png",
        output=f"characters/{asset_id}_{state}.png",
        asset_id=f"{asset_id}_{state}",
        name=asset_id,
        asset_type="character",
        state=state,
        rect=rect,
        tags=tags or (asset_id,),
        anchor=(0.5, 1.0),
    )


def obj(asset_id: str, state: str, rect: tuple[int, int, int, int], tags: tuple[str, ...] = ()) -> CropSpec:
    return CropSpec(
        source="sheet-c-support-objects.png",
        output=f"objects/{asset_id}_{state}.png",
        asset_id=f"{asset_id}_{state}",
        name=asset_id,
        asset_type="object",
        state=state,
        rect=rect,
        tags=tags or (asset_id,),
        anchor=(0.5, 1.0),
    )


def overlay(asset_id: str, state: str, rect: tuple[int, int, int, int], tags: tuple[str, ...] = ()) -> CropSpec:
    return CropSpec(
        source="sheet-d-overlays-icons.png",
        output=f"overlays/{asset_id}.png",
        asset_id=asset_id,
        name=asset_id,
        asset_type="overlay",
        state=state,
        rect=rect,
        tags=tags or (asset_id,),
        anchor=(0.5, 0.5),
    )


CROPS: list[CropSpec] = [
    character("face", "idle", (90, 5, 232, 334), ("face", "core")),
    character("face", "talking", (49, 307, 231, 639), ("face", "social")),
    character("face", "confident", (85, 609, 221, 941), ("face", "social")),
    character("face", "exposed", (52, 907, 248, 1241), ("face", "risk")),
    character("runner", "idle", (367, 7, 514, 323), ("runner", "core")),
    character("runner", "moving", (319, 310, 542, 591), ("runner", "movement")),
    character("runner", "disguised_waiter", (330, 591, 485, 922), ("runner", "disguise", "waiter")),
    character("runner", "interacting", (325, 910, 541, 1219), ("runner", "tool")),
    character("target", "idle", (693, 8, 830, 335), ("target", "core")),
    character("target", "checking_phone", (674, 311, 829, 639), ("target", "phone")),
    character("target", "holding_drink", (668, 608, 819, 929), ("target", "drink")),
    character("target", "moving_to_balcony", (625, 906, 866, 1211), ("target", "movement", "balcony")),
    character("guard", "watching", (992, 0, 1145, 334), ("guard", "sight")),
    character("guard", "distracted", (981, 307, 1142, 642), ("guard", "attention")),
    character("guard", "investigating", (963, 623, 1161, 928), ("guard", "search")),
    character("guard", "alarmed", (966, 904, 1162, 1244), ("guard", "alert")),
    support_character("waiter", "idle", (35, 19, 186, 309), ("waiter", "staff")),
    support_character("waiter", "moving", (192, 21, 349, 310), ("waiter", "staff", "movement")),
    support_character("waiter", "confused", (353, 20, 483, 317), ("waiter", "staff", "confused")),
    support_character("cleaner", "idle", (502, 38, 640, 316), ("cleaner", "staff")),
    support_character("cleaner", "cleaning", (653, 39, 856, 312), ("cleaner", "staff", "cleaning")),
    support_character("cleaner", "pushing_cart", (834, 36, 1000, 326), ("cleaner", "staff", "cart")),
    support_character("guest_cluster", "idle", (980, 48, 1143, 321), ("guest", "crowd")),
    support_character("guest_cluster", "watching", (1120, 48, 1294, 321), ("guest", "crowd", "watching")),
    support_character("guest_cluster", "startled", (1290, 50, 1517, 322), ("guest", "crowd", "alert")),
    obj("guest_list_terminal", "normal", (31, 313, 219, 568), ("terminal", "info")),
    obj("guest_list_terminal", "modified", (235, 313, 422, 568), ("terminal", "hacked")),
    obj("guest_list_terminal", "error", (438, 313, 626, 568), ("terminal", "error")),
    obj("wine_glass", "clean", (672, 340, 781, 557), ("wine", "glass")),
    obj("wine_glass", "served", (842, 339, 954, 557), ("wine", "glass", "served")),
    obj("wine_glass", "spilled", (1005, 427, 1228, 571), ("wine", "spill")),
    obj("wine_bottle", "normal", (1290, 335, 1390, 570), ("wine", "bottle")),
    obj("waiter_uniform", "available", (41, 568, 163, 818), ("uniform", "disguise")),
    obj("waiter_uniform", "taken", (173, 568, 294, 818), ("uniform", "disguise", "taken")),
    obj("cleaning_cart", "idle", (315, 566, 510, 801), ("cart", "cleaning")),
    obj("cleaning_cart", "blocking", (470, 566, 720, 827), ("cart", "sightline_blocked")),
    obj("power_panel", "normal", (720, 580, 870, 820), ("power", "panel")),
    obj("power_panel", "tampered", (880, 584, 1035, 819), ("power", "tampered")),
    obj("hallway_camera", "active", (1042, 613, 1212, 797), ("camera", "active")),
    obj("hallway_camera", "looped", (1186, 613, 1356, 797), ("camera", "looped")),
    obj("hallway_camera", "disabled", (1343, 613, 1513, 797), ("camera", "disabled")),
    obj("balcony_rail", "normal", (33, 808, 364, 1008), ("balcony", "rail")),
    obj("balcony_rail", "tampered", (398, 809, 724, 1007), ("balcony", "rail", "tampered")),
    obj("target_phone", "idle", (769, 813, 957, 1006), ("phone", "target")),
    obj("target_phone", "message_received", (988, 809, 1178, 1006), ("phone", "message")),
    overlay("guard_sight_cone", "visible", (57, 114, 359, 371), ("guard", "sight", "cone")),
    overlay("blocked_sight_cone", "blocked", (373, 115, 668, 375), ("guard", "sight", "blocked")),
    overlay("attention_arrow", "normal", (697, 140, 876, 370), ("attention", "arrow")),
    overlay("suspicion_icon", "question", (959, 147, 1171, 359), ("suspicion", "question")),
    overlay("alert_icon", "alert", (1224, 145, 1453, 377), ("alert", "risk")),
    overlay("hacked_icon", "success", (127, 424, 320, 611), ("hacked", "info")),
    overlay("fake_message_icon", "active", (395, 443, 626, 636), ("message", "fake")),
    overlay("disguise_icon", "active", (684, 426, 891, 619), ("disguise", "social")),
    overlay("route_arrow", "bias", (970, 420, 1175, 630), ("route", "bias", "movement")),
    overlay("opportunity_window", "open", (1230, 427, 1450, 638), ("opportunity", "window")),
    overlay("accident_ready", "ready", (35, 695, 225, 895), ("accident", "ready")),
    overlay("spill_overlay", "spilled", (235, 720, 440, 881), ("spill", "wine")),
    overlay("noise_pulse", "pulse", (445, 718, 650, 876), ("noise", "pulse")),
    overlay("private_meeting_belief", "belief", (640, 697, 865, 901), ("belief", "meeting")),
    overlay("admin_service_issue_icon", "issue", (875, 708, 1061, 896), ("admin", "service", "issue")),
    overlay("camera_loop", "looped", (1090, 690, 1285, 907), ("camera", "loop")),
    overlay("evidence_risk", "risk", (1300, 704, 1500, 911), ("evidence", "risk")),
]


LOCATION_HIGHLIGHTS = [
    {
        "locationId": "kitchen",
        "path": "/sprites/map/location_highlight_kitchen.png",
        "polygon": [(45, 105), (425, 105), (425, 720), (45, 720)],
    },
    {
        "locationId": "bar",
        "path": "/sprites/map/location_highlight_bar.png",
        "polygon": [(405, 95), (760, 95), (765, 710), (405, 720)],
    },
    {
        "locationId": "lobby",
        "path": "/sprites/map/location_highlight_lobby.png",
        "polygon": [(740, 70), (1075, 70), (1080, 775), (735, 775)],
    },
    {
        "locationId": "gallery",
        "path": "/sprites/map/location_highlight_gallery.png",
        "polygon": [(1075, 70), (1490, 70), (1495, 690), (1080, 690)],
    },
    {
        "locationId": "balcony",
        "path": "/sprites/map/location_highlight_balcony.png",
        "polygon": [(1480, 150), (1805, 170), (1800, 690), (1490, 690)],
    },
]


def apply_chroma_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            green_dominance = g - max(r, b)
            bright_green = g > 120 and green_dominance > 45
            near_key = abs(r - 24) < 90 and abs(g - 240) < 80 and abs(b - 24) < 90
            if bright_green or near_key:
                pixels[x, y] = (r, g, b, 0)
            elif g > 90 and green_dominance > 20:
                alpha = max(0, min(255, 255 - int((green_dominance - 20) * 5)))
                pixels[x, y] = (r, min(g, max(r, b) + 25), b, min(a, alpha))
    return rgba


def trim_transparent(image: Image.Image, padding: int = 8) -> tuple[Image.Image, tuple[int, int, int, int]]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image, (0, 0, image.width, image.height)
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(image.width, bbox[2] + padding)
    bottom = min(image.height, bbox[3] + padding)
    return image.crop((left, top, right, bottom)), (left, top, right, bottom)


def write_location_highlights(map_size: tuple[int, int]) -> None:
    for highlight in LOCATION_HIGHLIGHTS:
        target = SPRITES / highlight["path"].removeprefix("/sprites/")
        target.parent.mkdir(parents=True, exist_ok=True)
        image = Image.new("RGBA", map_size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        polygon = highlight["polygon"]
        draw.polygon(polygon, fill=(40, 220, 255, 50), outline=(120, 245, 255, 150))
        image.save(target)


def main() -> None:
    for folder in ["map", "characters", "objects", "overlays"]:
        (SPRITES / folder).mkdir(parents=True, exist_ok=True)

    map_source = SHEETS / "sheet-a-gallery-map.png"
    map_target = SPRITES / "map" / "gallery_event_map.png"
    shutil.copy2(map_source, map_target)
    map_size = Image.open(map_source).size
    write_location_highlights(map_size)

    source_cache: dict[str, Image.Image] = {}
    manifest_assets = []
    crop_manifest_assets = []

    for spec in CROPS:
        source_path = SHEETS / spec.source
        if spec.source not in source_cache:
            source_cache[spec.source] = Image.open(source_path)
        source = source_cache[spec.source]
        x1, y1, x2, y2 = spec.rect
        cropped = source.crop((x1, y1, x2, y2))
        trim_rect = (0, 0, cropped.width, cropped.height)
        if spec.chroma:
            cropped = apply_chroma_key(cropped)
            cropped, trim_rect = trim_transparent(cropped)

        target = SPRITES / spec.output
        target.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(target)

        width = x2 - x1
        height = y2 - y1
        asset = {
            "id": spec.asset_id,
            "name": spec.name,
            "type": spec.asset_type,
            "state": spec.state,
            "path": f"/sprites/{spec.output}",
            "sourceImage": f"/sprites/sheets/{spec.source}",
            "sourceSize": {"width": source.width, "height": source.height},
            "rect": {"x": x1, "y": y1, "w": width, "h": height},
            "trim": {"x": trim_rect[0], "y": trim_rect[1], "w": trim_rect[2] - trim_rect[0], "h": trim_rect[3] - trim_rect[1]},
            "tags": list(spec.tags),
            "anchor": {"x": spec.anchor[0], "y": spec.anchor[1]},
        }
        manifest_assets.append(asset)
        crop_manifest_assets.append({key: asset[key] for key in ["id", "name", "type", "state", "sourceImage", "sourceSize", "rect", "tags", "anchor"]})

    manifest = {
        "version": 2,
        "map": {
            "background": "/sprites/map/gallery_event_map.png",
            "sourceImage": "/sprites/sheets/sheet-a-gallery-map.png",
            "sourceSize": {"width": map_size[0], "height": map_size[1]},
        },
        "locationHighlights": LOCATION_HIGHLIGHTS,
        "sheets": {
            "A": "/sprites/sheets/sheet-a-gallery-map.png",
            "B": "/sprites/sheets/sheet-b-core-characters.png",
            "C": "/sprites/sheets/sheet-c-support-objects.png",
            "D": "/sprites/sheets/sheet-d-overlays-icons.png",
        },
        "assets": manifest_assets,
    }
    crop_manifest = {
        "version": 1,
        "sourceWorkflow": "/tools/asset-cutter",
        "assets": crop_manifest_assets,
    }

    (SPRITES / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (SHEETS / "crop-manifest.json").write_text(json.dumps(crop_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Archived {len(manifest_assets)} cropped assets")
    print(f"Map size: {map_size[0]}x{map_size[1]}")


if __name__ == "__main__":
    main()
