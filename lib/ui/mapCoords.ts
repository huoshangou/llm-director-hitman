import {
  anchorForEntityAtLocation,
  anchorForObjectId,
  LOCATION_FALLBACK_ANCHORS,
} from "../sprites/mapAnchors";
import {
  ANCHOR_IS_PICK_OBJECT,
  objectDrawOffset,
  objectPickOffset,
} from "../sprites/mapObjectPresentation";
import { OBJECT_MAP_OFFSET } from "../sprites/objectVisualOffsets";
import { entityMapPosition, LOCATION_CENTERS } from "../sprites/mapLayout";
import type { FieldAgentId, LocationId, NpcId, ObjectId, WorldState } from "../world/worldTypes";

export type MapCoord = { mapX: number; mapY: number };

function entityAtLocation(world: WorldState, locationId: LocationId, entityId: string): MapCoord {
  const atLoc = anchorForEntityAtLocation(entityId, locationId);
  if (atLoc) return atLoc;

  if (LOCATION_FALLBACK_ANCHORS[locationId]) {
    return LOCATION_FALLBACK_ANCHORS[locationId];
  }

  const m = entityMapPosition(locationId, entityId);
  return { mapX: m.x, mapY: m.y };
}

export function objectMapCoord(
  world: WorldState,
  objectId: ObjectId,
): MapCoord | null {
  const obj = world.objects[objectId];
  if (!obj?.visible || obj.location === "hidden" || obj.location === "target_inventory") {
    return null;
  }
  const locId = obj.location as LocationId;
  if (!world.locations[locId]) return null;

  const fixed = anchorForObjectId(objectId);
  if (fixed) {
    if (ANCHOR_IS_PICK_OBJECT.has(objectId)) {
      const off = objectDrawOffset(objectId);
      return { mapX: fixed.mapX + off.dx, mapY: fixed.mapY + off.dy };
    }
    const off = OBJECT_MAP_OFFSET[objectId] ?? { dx: 0, dy: 0 };
    return { mapX: fixed.mapX + off.dx, mapY: fixed.mapY + off.dy };
  }

  const m = entityMapPosition(locId, objectId);
  return { mapX: m.x, mapY: m.y };
}

/** 地图点击 / 选中热点（绘制锚点 + 可选上移，如高大制服） */
export function objectPickCoord(
  world: WorldState,
  objectId: ObjectId,
): MapCoord | null {
  const obj = world.objects[objectId];
  if (!obj?.visible || obj.location === "hidden" || obj.location === "target_inventory") {
    return null;
  }
  const locId = obj.location as LocationId;
  if (!world.locations[locId]) return null;

  const fixed = anchorForObjectId(objectId);
  if (fixed && ANCHOR_IS_PICK_OBJECT.has(objectId)) {
    return fixed;
  }

  const base = objectMapCoord(world, objectId);
  if (!base) return null;
  const off = objectPickOffset(objectId);
  return { mapX: base.mapX + off.dx, mapY: base.mapY + off.dy };
}

export function npcMapCoord(world: WorldState, npcId: NpcId): MapCoord | null {
  const npc = world.npcs[npcId];
  if (!npc) return null;
  return entityAtLocation(world, npc.location, npcId);
}

export function agentMapCoord(world: WorldState, agentId: FieldAgentId): MapCoord | null {
  const agent = world.agents[agentId];
  if (!agent) return null;
  return entityAtLocation(world, agent.location, agentId);
}

export function playerMapCoord(): MapCoord {
  return anchorForEntityAtLocation("player", "lobby") ?? { mapX: 911, mapY: 780 };
}

export function locationMapCoord(locationId: LocationId): MapCoord {
  const c = LOCATION_CENTERS[locationId];
  return { mapX: c.x, mapY: c.y };
}
