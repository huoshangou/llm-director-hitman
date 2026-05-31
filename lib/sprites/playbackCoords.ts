import { anchorForEntityAtLocation, anchorForObjectId, OBJECT_MAP_ANCHORS } from "./mapAnchors";
import { entityMapPosition } from "./mapLayout";
import { clampMapPointToLocation } from "./navigationBoundary";
import type { GameEvent, LocationId, NpcId, ObjectId, WorldState } from "../world/worldTypes";
import type { FieldAgentId } from "../world/worldTypes";

export type PlaybackMapCoord = { mapX: number; mapY: number };

/** Map pixel position for playback lerp (uses calibrated anchors, not zone centroids). */
export function playbackCoordAtLocation(
  entityId: string,
  locationId: LocationId,
  event?: Pick<GameEvent, "text" | "to" | "from" | "type" | "actor">,
): PlaybackMapCoord {
  const special = specialPlaybackDestination(entityId, locationId, event);
  if (special) return clampMapPointToLocation(special, locationId);

  const anchored = anchorForEntityAtLocation(entityId, locationId);
  if (anchored) return clampMapPointToLocation(anchored, locationId);

  const m = entityMapPosition(locationId, entityId);
  return clampMapPointToLocation({ mapX: m.x, mapY: m.y }, locationId);
}

function besideObject(
  objectId: ObjectId,
  offset: { dx: number; dy: number } = { dx: 36, dy: -18 },
): PlaybackMapCoord | null {
  const base = anchorForObjectId(objectId);
  if (!base) return null;
  return { mapX: base.mapX + offset.dx, mapY: base.mapY + offset.dy };
}

function specialPlaybackDestination(
  entityId: string,
  locationId: LocationId,
  event?: Pick<GameEvent, "text" | "to" | "from" | "type" | "actor">,
): PlaybackMapCoord | null {
  const text = event?.text ?? "";

  if (
    entityId === "guard" &&
    locationId === "kitchen" &&
    (/配电|power|inspect_power|查电|厨房/i.test(text) || event?.to === "kitchen")
  ) {
    return besideObject("power_panel", { dx: 42, dy: -22 }) ?? OBJECT_MAP_ANCHORS.power_panel;
  }

  if (entityId === "runner" && locationId === "kitchen" && /制服|uniform|换装/i.test(text)) {
    return besideObject("waiter_uniform", { dx: 50, dy: -10 });
  }

  if (
    entityId === "runner" &&
    locationId === "bar" &&
    /酒|wine|poison|毒|杯|drink/i.test(text)
  ) {
    return besideObject("wine_glass", { dx: -36, dy: 44 });
  }

  if (entityId === "cleaner" && locationId === "kitchen" && /配电|power/i.test(text)) {
    return besideObject("power_panel", { dx: -30, dy: -18 });
  }

  return null;
}

export function playbackCoordForEntity(
  world: WorldState,
  entityId: string,
): PlaybackMapCoord | null {
  if (entityId in world.npcs) {
    const npc = world.npcs[entityId as NpcId];
    return playbackCoordAtLocation(npc.id, npc.location);
  }
  if (entityId in world.agents) {
    const agent = world.agents[entityId as FieldAgentId];
    return playbackCoordAtLocation(entityId, agent.location);
  }
  return null;
}
