import { polylineLengthPx, samplePolylineAt, travelMapPolyline } from "../sprites/corridorPath";
import { playbackCoordAtLocation, playbackCoordForEntity } from "../sprites/playbackCoords";
import { mapToPercent } from "../sprites/mapLayout";
import { areAdjacentLocations } from "../world/locationPath";
import { isRelocationEvent } from "../world/travel";
import type { GameEvent, LocationId, WorldState } from "../world/worldTypes";

/** Wall-clock scale for timeline `t` units. */
export const PLAYBACK_MS_PER_T = 480;

/** ~1.35ms per map pixel along corridor polyline (adjacent zone walk). */
export const MOVE_MS_PER_PX = 1.35;
export const SAME_ZONE_MOVE_MS_MIN = 1400;
export const SAME_ZONE_MOVE_MS_MAX = 3200;
export const CROSS_ZONE_MOVE_MS = 1680;

/** Progress window inside a cross-zone move segment (0–1). */
const CROSS_HOLD_END = 0.14;
const CROSS_LOST_END = 0.5;
const CROSS_REACQUIRE_END = 0.84;

export type EntityMapPosition = { mapX: number; mapY: number };

export type PlaybackSignalPhase = "lost" | "reacquiring";

export type PlaybackSignalOverlay = {
  phase: PlaybackSignalPhase;
  label: string;
};

export type PlaybackBubble = {
  id: string;
  actor: string;
  text: string;
  left: number;
  top: number;
  mapX: number;
  mapY: number;
};

export type PlaybackFrame = {
  entities: Record<string, EntityMapPosition>;
  bubbles: PlaybackBubble[];
  pulseEntityId: string | null;
  activeEventId: string | null;
  /** Full-canvas cut during cross-zone relocation (non-interactive). */
  signalOverlay: PlaybackSignalOverlay | null;
  /** Entities hidden during SIGNAL LOST (no wall-lerp). */
  hiddenEntityIds: string[];
};

type Segment = {
  eventId: string;
  startMs: number;
  durationMs: number;
  event: GameEvent;
};

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** True only for non-adjacent jumps (use SIGNAL LOST). Adjacent zones walk along the corridor. */
export function isCrossLocationMove(event: GameEvent): boolean {
  return (
    (event.type === "npc_move" || event.type === "agent_move") &&
    !!event.from &&
    !!event.to &&
    event.from !== event.to &&
    !areAdjacentLocations(event.from, event.to)
  );
}

export function moveEventDurationMs(
  event: GameEvent,
  world?: WorldState,
): number {
  if (isCrossLocationMove(event)) return CROSS_ZONE_MOVE_MS;
  if (!event.actor || !event.from || !event.to || !world) {
    return SAME_ZONE_MOVE_MS_MIN;
  }
  const polyline = travelMapPolyline(
    event.from as LocationId,
    event.to as LocationId,
    event.actor,
    world.locations,
    event,
  );
  const len = polylineLengthPx(polyline);
  return Math.min(
    SAME_ZONE_MOVE_MS_MAX,
    Math.max(SAME_ZONE_MOVE_MS_MIN, Math.round(len * MOVE_MS_PER_PX)),
  );
}

export function eventDurationMs(event: GameEvent, world?: WorldState): number {
  switch (event.type) {
    case "npc_move":
    case "agent_move":
      return moveEventDurationMs(event, world);
    case "dialogue_bubble":
      return 3600;
    case "attention_shift":
      return 900;
    case "object_state_change":
      return 600;
    default:
      return 450;
  }
}

/**
 * Map GameEvent `t` to wall-clock start. Same-actor relocations chain back-to-back
 * (950ms per adjacent hop) so corridor walks do not overlap when `t` increments by 1.
 */
export function buildPlaybackSchedule(timeline: GameEvent[], world?: WorldState): Segment[] {
  const sorted = [...timeline].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const actorMoveEndMs = new Map<string, number>();
  const segments: Segment[] = [];

  for (const event of sorted) {
    const durationMs = eventDurationMs(event, world);
    let startMs = event.t * PLAYBACK_MS_PER_T;

    if (isRelocationEvent(event) && event.actor) {
      const actor = event.actor;
      const prevEnd = actorMoveEndMs.get(actor);
      if (prevEnd !== undefined) startMs = Math.max(startMs, prevEnd);
      actorMoveEndMs.set(actor, startMs + durationMs);
    }

    segments.push({ eventId: event.id, startMs, durationMs, event });
  }

  return segments;
}

export function totalPlaybackDurationMs(timeline: GameEvent[], world?: WorldState): number {
  const segs = buildPlaybackSchedule(timeline, world);
  if (segs.length === 0) return 0;
  return Math.max(...segs.map((s) => s.startMs + s.durationMs)) + 280;
}

function baseEntityPositions(world: WorldState): Record<string, EntityMapPosition> {
  const out: Record<string, EntityMapPosition> = {};
  for (const npc of Object.values(world.npcs)) {
    const c = playbackCoordForEntity(world, npc.id);
    if (c) out[npc.id] = c;
  }
  for (const id of Object.keys(world.agents)) {
    const c = playbackCoordForEntity(world, id);
    if (c) out[id] = c;
  }
  return out;
}

function entityPercent(pos: EntityMapPosition) {
  return mapToPercent(pos.mapX, pos.mapY);
}

function applyCrossZoneMove(
  positions: Record<string, EntityMapPosition>,
  hiddenEntityIds: Set<string>,
  signalOverlay: PlaybackSignalOverlay | null,
  event: GameEvent,
  progress: number,
): PlaybackSignalOverlay | null {
  const id = event.actor as string;
  const from = playbackCoordAtLocation(id, event.from as LocationId, event);
  const to = playbackCoordAtLocation(id, event.to as LocationId, event);
  let overlay = signalOverlay;

  if (progress < CROSS_HOLD_END) {
    positions[id] = { mapX: from.mapX, mapY: from.mapY };
    return overlay;
  }
  if (progress < CROSS_LOST_END) {
    hiddenEntityIds.add(id);
    overlay = { phase: "lost", label: "SIGNAL LOST" };
    return overlay;
  }
  positions[id] = { mapX: to.mapX, mapY: to.mapY };
  if (progress < CROSS_REACQUIRE_END) {
    overlay = { phase: "reacquiring", label: "REACQUIRING" };
  }
  return overlay;
}

export function computePlaybackFrame(
  worldBefore: WorldState,
  timeline: GameEvent[],
  elapsedMs: number,
): PlaybackFrame {
  const positions = baseEntityPositions(worldBefore);
  const bubbles: PlaybackBubble[] = [];
  let pulseEntityId: string | null = null;
  let activeEventId: string | null = null;
  let signalOverlay: PlaybackSignalOverlay | null = null;

  const hiddenThisFrame = new Set<string>();

  for (const seg of buildPlaybackSchedule(timeline, worldBefore)) {
    const { event, startMs, durationMs } = seg;
    if (elapsedMs < startMs) continue;

    const linear = Math.min(1, (elapsedMs - startMs) / durationMs);
    const progress = easeOut(linear);
    const active = elapsedMs < startMs + durationMs;

    if (
      (event.type === "npc_move" || event.type === "agent_move") &&
      event.actor &&
      event.from &&
      event.to
    ) {
      const id = event.actor;
      if (isCrossLocationMove(event)) {
        signalOverlay = applyCrossZoneMove(
          positions,
          hiddenThisFrame,
          signalOverlay,
          event,
          linear,
        );
        if (linear >= 1) hiddenThisFrame.delete(id);
      } else {
        hiddenThisFrame.delete(id);
        const polyline = travelMapPolyline(
          event.from as LocationId,
          event.to as LocationId,
          id,
          worldBefore.locations,
          event,
        );
        const p = samplePolylineAt(polyline, progress);
        positions[id] = { mapX: p.x, mapY: p.y };
      }
      if (active) activeEventId = seg.eventId;
    }

    if (event.type === "dialogue_bubble" && event.text && event.actor && active) {
      const id = event.actor;
      const pos = positions[id] ?? baseEntityPositions(worldBefore)[id];
      if (pos) {
        const p = entityPercent(pos);
        bubbles.push({
          id: seg.eventId,
          actor: id,
          text: event.text,
          left: p.left,
          top: Math.max(4, p.top - 14),
          mapX: pos.mapX,
          mapY: pos.mapY - 55,
        });
      }
      activeEventId = seg.eventId;
    }

    if (event.type === "attention_shift" && active) {
      pulseEntityId = (event.actor as string) ?? "guard";
      activeEventId = seg.eventId;
    }
  }

  return {
    entities: positions,
    bubbles,
    pulseEntityId,
    activeEventId,
    signalOverlay,
    hiddenEntityIds: [...hiddenThisFrame],
  };
}

export function entityPercentOverride(
  entityId: string,
  locationId: LocationId,
  frame: PlaybackFrame | null,
): { left: number; top: number } | null {
  const pos = frame?.entities[entityId];
  if (!pos) return null;
  return entityPercent(pos);
}

export function isPlayableTimeline(timeline: GameEvent[]): boolean {
  return timeline.some((e) =>
    ["npc_move", "agent_move", "dialogue_bubble", "attention_shift"].includes(e.type),
  );
}
