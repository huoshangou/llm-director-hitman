import { getMapCanvasTransform, type MapCamera } from "../sprites/canvasLayout";
import { GALLERY_MAP_SIZE } from "../sprites/mapLayout";
import type { FieldAgentId, NpcId, ObjectId } from "../world/worldTypes";
import type { MapPickKind } from "./mapSelection";

/** 阳台栏杆可点击条带（map 像素，沿外沿近似；随 1891×832 底图校准） */
export const BALCONY_RAIL_STRIP: { mapX: number; mapY: number }[] = [
  { mapX: 1701, mapY: 342 },
  { mapX: 1776, mapY: 362 },
  { mapX: 1829, mapY: 416 },
  { mapX: 1880, mapY: 472 },
  { mapX: 1890, mapY: 532 },
];

const BALCONY_RAIL_STRIP_HALF_WIDTH = 46;

const ENTITY_HIT_RADIUS_MAP: Record<string, number> = {
  target: 52,
  guard: 40,
  waiter: 38,
  cleaner: 38,
  guest: 38,
  face: 36,
  runner: 36,
};

const OBJECT_HIT_RADIUS_MAP: Partial<Record<ObjectId, number>> = {
  guest_list_terminal: 10,
  wine_glass: 18,
  wine_bottle: 26,
  cleaning_cart: 34,
  waiter_uniform: 42,
  hallway_camera: 32,
  power_panel: 22,
  kitchen_door: 20,
};

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

export function pointInBalconyRailStrip(mapX: number, mapY: number): boolean {
  let best = Infinity;
  for (let i = 0; i < BALCONY_RAIL_STRIP.length - 1; i++) {
    const a = BALCONY_RAIL_STRIP[i]!;
    const b = BALCONY_RAIL_STRIP[i + 1]!;
    best = Math.min(best, distToSegment(mapX, mapY, a.mapX, a.mapY, b.mapX, b.mapY));
  }
  return best <= BALCONY_RAIL_STRIP_HALF_WIDTH;
}

export function hitRadiusMapPx(kind: MapPickKind, id: string): number {
  if (kind === "object") {
    return OBJECT_HIT_RADIUS_MAP[id as ObjectId] ?? 30;
  }
  return ENTITY_HIT_RADIUS_MAP[id] ?? 36;
}

export function hitRadiusCanvasPx(
  kind: MapPickKind,
  id: string,
  canvasW: number,
  canvasH: number,
  camera?: MapCamera | null,
): number {
  const t = getMapCanvasTransform(canvasW, canvasH, undefined, undefined, camera);
  return hitRadiusMapPx(kind, id) * t.scale;
}

export function balconyRailStripBBox(): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const pad = BALCONY_RAIL_STRIP_HALF_WIDTH;
  const xs = BALCONY_RAIL_STRIP.map((p) => p.mapX);
  const ys = BALCONY_RAIL_STRIP.map((p) => p.mapY);
  return {
    minX: Math.min(...xs) - pad,
    minY: Math.min(...ys) - pad,
    maxX: Math.max(...xs) + pad,
    maxY: Math.max(...ys) + pad,
  };
}

/** 主站 GameMap 透明点击层：中心点 + 宽/高（百分比） */
export function pickOverlayPercent(
  kind: MapPickKind,
  id: string,
  centerLeft: number,
  centerTop: number,
): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  if (kind === "object" && id === "balcony_rail") {
    const box = balconyRailStripBBox();
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    return {
      left: (cx / GALLERY_MAP_SIZE.width) * 100,
      top: (cy / GALLERY_MAP_SIZE.height) * 100,
      width: ((box.maxX - box.minX) / GALLERY_MAP_SIZE.width) * 100,
      height: ((box.maxY - box.minY) / GALLERY_MAP_SIZE.height) * 100,
    };
  }
  const r = hitRadiusMapPx(kind, id);
  return {
    left: centerLeft,
    top: centerTop,
    width: ((r * 2) / GALLERY_MAP_SIZE.width) * 100,
    height: ((r * 2) / GALLERY_MAP_SIZE.height) * 100,
  };
}

export type MapHitZone = "balcony_rail_strip";

export function pickHitZone(kind: MapPickKind, id: string): MapHitZone | undefined {
  if (kind === "object" && id === "balcony_rail") return "balcony_rail_strip";
  return undefined;
}

export function pickDistanceMap(
  mapX: number,
  mapY: number,
  kind: MapPickKind,
  id: string,
  anchorMapX: number,
  anchorMapY: number,
): number {
  if (kind === "object" && id === "balcony_rail") {
    return pointInBalconyRailStrip(mapX, mapY) ? 0 : 9999;
  }
  const r = hitRadiusMapPx(kind, id);
  return Math.hypot(mapX - anchorMapX, mapY - anchorMapY) <= r
    ? Math.hypot(mapX - anchorMapX, mapY - anchorMapY)
    : 9999;
}
