import {
  ENTITY_LOCATION_ANCHORS,
  ENTITY_MAP_ANCHORS,
  OBJECT_MAP_ANCHORS,
  type MapAnchor,
} from "../sprites/mapAnchors";
import { GALLERY_MAP_SIZE } from "../sprites/mapLayout";
import { OBJECT_LABELS } from "../sprites/objectVisual";
import { AGENT_LABELS, NPC_LABELS } from "../ui/labels";
import {
  ANCHOR_IS_PICK_OBJECT,
  objectDrawOffset,
  objectPickOffset,
} from "../sprites/mapObjectPresentation";
import { OBJECT_MAP_OFFSET } from "../sprites/objectVisualOffsets";
import type { FieldAgentId, LocationId, NpcId, ObjectId } from "../world/worldTypes";
import { cloneWorld } from "../world/initialWorld";

export type ObjectPlayCoords = {
  anchor: MapAnchor;
  draw: MapAnchor;
  pick: MapAnchor;
};

/** Preview anchor / draw / pick for map-anchors tool (matches mapCoords rules). */
export function resolveObjectPlayCoords(
  state: AnchorEditorState,
  objectId: ObjectId,
): ObjectPlayCoords {
  const anchor = state.objects[objectId] ?? { mapX: 0, mapY: 0 };
  if (ANCHOR_IS_PICK_OBJECT.has(objectId)) {
    const dOff = objectDrawOffset(objectId);
    return {
      anchor,
      pick: anchor,
      draw: { mapX: anchor.mapX + dOff.dx, mapY: anchor.mapY + dOff.dy },
    };
  }
  const mapOff = OBJECT_MAP_OFFSET[objectId] ?? { dx: 0, dy: 0 };
  const draw = { mapX: anchor.mapX + mapOff.dx, mapY: anchor.mapY + mapOff.dy };
  const pOff = objectPickOffset(objectId);
  return {
    anchor,
    draw,
    pick: { mapX: draw.mapX + pOff.dx, mapY: draw.mapY + pOff.dy },
  };
}

export type AnchorEditorState = {
  objects: Record<string, MapAnchor>;
  entities: Record<string, MapAnchor>;
  entityLocations: Record<string, Partial<Record<LocationId, MapAnchor>>>;
};

export type AnchorEditorItem = {
  key: string;
  kind: "object" | "npc" | "agent";
  id: string;
  label: string;
  location?: LocationId;
  /** Which table row this item edits */
  source: "object" | "entity_base" | "entity_location";
  mapX: number;
  mapY: number;
};

export function createAnchorEditorState(): AnchorEditorState {
  return {
    objects: { ...OBJECT_MAP_ANCHORS },
    entities: { ...ENTITY_MAP_ANCHORS },
    entityLocations: JSON.parse(JSON.stringify(ENTITY_LOCATION_ANCHORS)) as AnchorEditorState["entityLocations"],
  };
}

function entityLabel(id: string, kind: "npc" | "agent"): string {
  if (kind === "npc") {
    const n = NPC_LABELS[id as NpcId];
    return n?.short ?? id;
  }
  const a = AGENT_LABELS[id as FieldAgentId];
  return a?.short ?? id;
}

function resolveEntityAnchor(
  state: AnchorEditorState,
  entityId: string,
  locationId: LocationId,
): { anchor: MapAnchor; source: "entity_base" | "entity_location" } {
  const perLoc = state.entityLocations[entityId]?.[locationId];
  if (perLoc) return { anchor: perLoc, source: "entity_location" };
  const base = state.entities[entityId];
  if (base) return { anchor: base, source: "entity_base" };
  return { anchor: { mapX: 0, mapY: 0 }, source: "entity_base" };
}

/** Items matching initial showcase world (same ids play uses at turn 0). */
export function buildAnchorEditorItems(state: AnchorEditorState): AnchorEditorItem[] {
  const world = cloneWorld();
  const items: AnchorEditorItem[] = [];

  for (const obj of Object.values(world.objects)) {
    if (!obj.visible || obj.location === "hidden" || obj.location === "target_inventory") continue;
    const id = obj.id as ObjectId;
    const anchor = state.objects[id] ?? { mapX: 0, mapY: 0 };
    items.push({
      key: `object:${id}`,
      kind: "object",
      id,
      label: OBJECT_LABELS[id] ?? obj.name,
      source: "object",
      mapX: anchor.mapX,
      mapY: anchor.mapY,
    });
  }

  for (const npc of Object.values(world.npcs)) {
    const id = npc.id;
    const loc = npc.location;
    const { anchor, source } = resolveEntityAnchor(state, id, loc);
    items.push({
      key: `npc:${id}@${loc}`,
      kind: "npc",
      id,
      label: entityLabel(id, "npc"),
      location: loc,
      source,
      mapX: anchor.mapX,
      mapY: anchor.mapY,
    });
  }

  for (const agent of Object.values(world.agents)) {
    const id = agent.id;
    const loc = agent.location;
    const { anchor, source } = resolveEntityAnchor(state, id, loc);
    items.push({
      key: `agent:${id}@${loc}`,
      kind: "agent",
      id,
      label: entityLabel(id, "agent"),
      location: loc,
      source,
      mapX: anchor.mapX,
      mapY: anchor.mapY,
    });
  }

  return items;
}

export function setAnchorForItem(
  state: AnchorEditorState,
  item: AnchorEditorItem,
  mapX: number,
  mapY: number,
): AnchorEditorState {
  const next: AnchorEditorState = {
    objects: { ...state.objects },
    entities: { ...state.entities },
    entityLocations: JSON.parse(JSON.stringify(state.entityLocations)),
  };
  const anchor = { mapX, mapY };
  if (item.source === "object") {
    next.objects[item.id] = anchor;
  } else if (item.source === "entity_location" && item.location) {
    if (!next.entityLocations[item.id]) next.entityLocations[item.id] = {};
    next.entityLocations[item.id]![item.location] = anchor;
  } else {
    next.entities[item.id] = anchor;
  }
  return next;
}

export function formatMapAnchorsExport(state: AnchorEditorState): string {
  const fmtObj = (id: string, a: MapAnchor) =>
    `  ${id}: { mapX: ${a.mapX}, mapY: ${a.mapY} },`;

  const objectLines = Object.keys(state.objects)
    .sort()
    .map((id) => fmtObj(id, state.objects[id]!));

  const entityLines = Object.keys(state.entities)
    .sort()
    .map((id) => fmtObj(id, state.entities[id]!));

  const locBlocks: string[] = [];
  for (const entityId of Object.keys(state.entityLocations).sort()) {
    const per = state.entityLocations[entityId]!;
    const locLines = Object.keys(per)
      .sort()
      .map((loc) => `    ${loc}: { mapX: ${per[loc as LocationId]!.mapX}, mapY: ${per[loc as LocationId]!.mapY} },`);
    if (locLines.length) {
      locBlocks.push(`  ${entityId}: {\n${locLines.join("\n")}\n  },`);
    }
  }

  return `// Paste into lib/sprites/mapAnchors.ts (map ${GALLERY_MAP_SIZE.width}×${GALLERY_MAP_SIZE.height})
export const OBJECT_MAP_ANCHORS: Record<ObjectId, MapAnchor> = {
${objectLines.join("\n")}
};

export const ENTITY_MAP_ANCHORS: Record<string, MapAnchor> = {
${entityLines.join("\n")}
};

export const ENTITY_LOCATION_ANCHORS: Partial<
  Record<string, Partial<Record<LocationId, MapAnchor>>>
> = {
${locBlocks.join("\n")}
};`;
}
