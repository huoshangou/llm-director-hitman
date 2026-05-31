import { findLocationPath } from "../world/locationPath";
import type { GameEvent, LocationId, WorldState } from "../world/worldTypes";
import { navigationLaneForHop } from "./navigationBoundary";
import { playbackCoordAtLocation } from "./playbackCoords";

/** Corridor midpoints between adjacent zones (map pixels). */
const EDGE_MIDPOINTS: Partial<Record<LocationId, Partial<Record<LocationId, { x: number; y: number }>>>> = {
  kitchen: { bar: { x: 410, y: 455 } },
  bar: { kitchen: { x: 410, y: 455 }, lobby: { x: 748, y: 468 } },
  lobby: { bar: { x: 748, y: 468 }, gallery: { x: 1095, y: 445 } },
  gallery: { lobby: { x: 1095, y: 445 }, balcony: { x: 1465, y: 458 } },
  balcony: { gallery: { x: 1465, y: 458 } },
};

function edgeMid(from: LocationId, to: LocationId): { x: number; y: number } | null {
  return EDGE_MIDPOINTS[from]?.[to] ?? EDGE_MIDPOINTS[to]?.[from] ?? null;
}

function hopPolyline(
  from: LocationId,
  to: LocationId,
  entityId: string,
  event?: Pick<GameEvent, "text" | "to" | "from" | "type" | "actor">,
): { x: number; y: number }[] {
  const a = playbackCoordAtLocation(entityId, from, event);
  const endEvent =
    event && event.to === to ? event : { ...event, to, from, type: "npc_move" as const };
  const b = playbackCoordAtLocation(entityId, to, endEvent);
  const navLane = navigationLaneForHop(from, to, a, b);
  if (navLane.length > 2) return navLane.map((p) => ({ x: p.mapX, y: p.mapY }));
  const mid = edgeMid(from, to);
  if (!mid) return [{ x: a.mapX, y: a.mapY }, { x: b.mapX, y: b.mapY }];
  return [{ x: a.mapX, y: a.mapY }, mid, { x: b.mapX, y: b.mapY }];
}

/** Full walk polyline across zones (deduped vertices). */
export function travelMapPolyline(
  from: LocationId,
  to: LocationId,
  entityId: string,
  locations: WorldState["locations"],
  event?: Pick<GameEvent, "text" | "to" | "from" | "type" | "actor">,
): { x: number; y: number }[] {
  if (from === to) {
    const p = playbackCoordAtLocation(entityId, from, event);
    return [{ x: p.mapX, y: p.mapY }];
  }

  const path = findLocationPath(from, to, locations);
  const out: { x: number; y: number }[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const hopFrom = path[i]!;
    const hopTo = path[i + 1]!;
    const hopEvent =
      i === path.length - 2 && event
        ? event
        : { from: hopFrom, to: hopTo, type: "npc_move" as const, text: "" };
    const seg = hopPolyline(hopFrom, hopTo, entityId, hopEvent);
    for (const p of seg) {
      const last = out[out.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
    }
  }

  return out.length ? out : hopPolyline(from, to, entityId, event);
}

export function polylineLengthPx(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  return total;
}

/** Sample point along polyline at t∈[0,1] (arc-length uniform). */
export function samplePolylineAt(
  points: { x: number; y: number }[],
  t: number,
): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || t <= 0) return { ...points[0]! };
  if (t >= 1) return { ...points[points.length - 1]! };

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }

  if (total < 1) return { ...points[points.length - 1]! };

  let target = t * total;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (target <= len) {
      const p0 = points[i]!;
      const p1 = points[i + 1]!;
      const u = len > 0 ? target / len : 1;
      return { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u };
    }
    target -= len;
  }
  return { ...points[points.length - 1]! };
}
