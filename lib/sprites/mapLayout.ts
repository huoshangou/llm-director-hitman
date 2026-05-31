import type { LocationId } from "../world/worldTypes";

/** Native pixels of gallery_event_map.png (manifest map.sourceSize). */
export const GALLERY_MAP_SIZE = { width: 1891, height: 832 } as const;

/** Centroids from manifest locationHighlights polygons. */
export const LOCATION_CENTERS: Record<LocationId, { x: number; y: number }> = {
  kitchen: { x: 235, y: 412 },
  bar: { x: 584, y: 405 },
  lobby: { x: 908, y: 423 },
  gallery: { x: 1285, y: 380 },
  balcony: { x: 1644, y: 425 },
};

const ENTITY_OFFSET: Record<string, { dx: number; dy: number }> = {
  target: { dx: -20, dy: -30 },
  guard: { dx: 35, dy: -10 },
  waiter: { dx: -40, dy: 20 },
  cleaner: { dx: 40, dy: 25 },
  guest: { dx: 0, dy: 35 },
  face: { dx: -25, dy: -15 },
  runner: { dx: 30, dy: -20 },
};

export function entityMapPosition(
  locationId: LocationId,
  entityId: string,
): { x: number; y: number } {
  const base = LOCATION_CENTERS[locationId];
  const off = ENTITY_OFFSET[entityId] ?? { dx: 0, dy: 0 };
  return { x: base.x + off.dx, y: base.y + off.dy };
}

export function mapToPercent(x: number, y: number): { left: number; top: number } {
  return {
    left: (x / GALLERY_MAP_SIZE.width) * 100,
    top: (y / GALLERY_MAP_SIZE.height) * 100,
  };
}

export function mapToCanvas(
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  return {
    x: (x / GALLERY_MAP_SIZE.width) * canvasW,
    y: (y / GALLERY_MAP_SIZE.height) * canvasH,
  };
}

export function polygonBBox(polygon: [number, number][]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(...xs) - minX,
    h: Math.max(...ys) - minY,
  };
}
