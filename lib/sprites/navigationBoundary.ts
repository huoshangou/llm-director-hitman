import type { LocationId } from "../world/worldTypes";

export type NavPoint = { mapX: number; mapY: number };
type PointLike = { mapX?: number; mapY?: number; x?: number; y?: number };

type Segment = [NavPoint, NavPoint];

export const NAVIGATION_BOUNDARIES: Record<LocationId, NavPoint[]> = {
  kitchen: [
    { mapX: 80, mapY: 360 },
    { mapX: 440, mapY: 350 },
    { mapX: 462, mapY: 645 },
    { mapX: 70, mapY: 715 },
  ],
  bar: [
    { mapX: 40, mapY: 330 },
    { mapX: 720, mapY: 340 },
    { mapX: 748, mapY: 610 },
    { mapX: 88, mapY: 710 },
  ],
  lobby: [
    { mapX: 720, mapY: 300 },
    { mapX: 1095, mapY: 300 },
    { mapX: 1120, mapY: 650 },
    { mapX: 745, mapY: 650 },
  ],
  gallery: [
    { mapX: 1095, mapY: 245 },
    { mapX: 1515, mapY: 250 },
    { mapX: 1538, mapY: 610 },
    { mapX: 1105, mapY: 622 },
  ],
  balcony: [
    { mapX: 1450, mapY: 250 },
    { mapX: 1855, mapY: 205 },
    { mapX: 1880, mapY: 675 },
    { mapX: 1500, mapY: 705 },
  ],
};

export const LOCATION_LABEL_ANCHORS: Record<LocationId, NavPoint> = {
  kitchen: { mapX: 235, mapY: 410 },
  bar: { mapX: 520, mapY: 390 },
  lobby: { mapX: 910, mapY: 360 },
  gallery: { mapX: 1285, mapY: 330 },
  balcony: { mapX: 1660, mapY: 360 },
};

export const NAVIGATION_PORTALS: Partial<Record<LocationId, Partial<Record<LocationId, NavPoint>>>> = {
  kitchen: { bar: { mapX: 430, mapY: 505 } },
  bar: {
    kitchen: { mapX: 430, mapY: 505 },
    lobby: { mapX: 745, mapY: 480 },
  },
  lobby: {
    bar: { mapX: 745, mapY: 480 },
    gallery: { mapX: 1098, mapY: 455 },
  },
  gallery: {
    lobby: { mapX: 1098, mapY: 455 },
    balcony: { mapX: 1465, mapY: 458 },
  },
  balcony: { gallery: { mapX: 1465, mapY: 458 } },
};

function point(p: PointLike): NavPoint {
  return {
    mapX: p.mapX ?? p.x ?? 0,
    mapY: p.mapY ?? p.y ?? 0,
  };
}

function polygonSegments(poly: NavPoint[]): Segment[] {
  return poly.map((a, i) => [a, poly[(i + 1) % poly.length]!] as Segment);
}

export function isMapPointInsideLocation(p: PointLike, locationId: LocationId): boolean {
  const q = point(p);
  const poly = NAVIGATION_BOUNDARIES[locationId];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const crosses =
      a.mapY > q.mapY !== b.mapY > q.mapY &&
      q.mapX < ((b.mapX - a.mapX) * (q.mapY - a.mapY)) / (b.mapY - a.mapY) + a.mapX;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function isMapPointInsideAnyLocation(p: PointLike): boolean {
  return (Object.keys(NAVIGATION_BOUNDARIES) as LocationId[]).some((loc) =>
    isMapPointInsideLocation(p, loc),
  );
}

function closestPointOnSegment(p: NavPoint, a: NavPoint, b: NavPoint): NavPoint {
  const dx = b.mapX - a.mapX;
  const dy = b.mapY - a.mapY;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return a;
  const t = Math.max(0, Math.min(1, ((p.mapX - a.mapX) * dx + (p.mapY - a.mapY) * dy) / len2));
  return { mapX: a.mapX + dx * t, mapY: a.mapY + dy * t };
}

export function clampMapPointToLocation(p: PointLike, locationId: LocationId): NavPoint {
  const q = point(p);
  if (isMapPointInsideLocation(q, locationId)) return q;

  let best = LOCATION_LABEL_ANCHORS[locationId];
  let bestD = Number.POSITIVE_INFINITY;
  for (const [a, b] of polygonSegments(NAVIGATION_BOUNDARIES[locationId])) {
    const c = closestPointOnSegment(q, a, b);
    const d = Math.hypot(c.mapX - q.mapX, c.mapY - q.mapY);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

export function portalBetween(from: LocationId, to: LocationId): NavPoint | null {
  return NAVIGATION_PORTALS[from]?.[to] ?? NAVIGATION_PORTALS[to]?.[from] ?? null;
}

export function isMapPointNearAnyPortal(p: PointLike, radius = 72): boolean {
  const q = point(p);
  const seen = new Set<string>();
  for (const from of Object.keys(NAVIGATION_PORTALS) as LocationId[]) {
    for (const to of Object.keys(NAVIGATION_PORTALS[from] ?? {}) as LocationId[]) {
      const portal = portalBetween(from, to);
      if (!portal) continue;
      const key = `${portal.mapX}:${portal.mapY}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (Math.hypot(q.mapX - portal.mapX, q.mapY - portal.mapY) <= radius) return true;
    }
  }
  return false;
}

export function navigationLaneForHop(
  from: LocationId,
  to: LocationId,
  start: PointLike,
  end: PointLike,
): NavPoint[] {
  const a = clampMapPointToLocation(start, from);
  const b = clampMapPointToLocation(end, to);
  const portal = portalBetween(from, to);
  if (!portal) return [a, b];
  return [a, portal, b];
}
