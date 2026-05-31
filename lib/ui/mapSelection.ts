import { mapToPercent } from "../sprites/mapLayout";
import { OBJECT_LABELS } from "../sprites/objectVisualOffsets";
import { agentMapCoord, npcMapCoord, objectPickCoord } from "./mapCoords";
import { AGENT_LABELS, NPC_LABELS } from "./labels";
import { pickHitZone } from "./mapHitTest";
import type { FieldAgentId, NpcId, ObjectId, WorldState } from "../world/worldTypes";
import type { MapHitZone } from "./mapHitTest";

export type MapPickKind = "object" | "npc" | "agent";

export type MapPickable = {
  id: string;
  kind: MapPickKind;
  /** 地图像素坐标（与 canvas 绘制共用，避免 % 往返误差） */
  mapX: number;
  mapY: number;
  left: number;
  top: number;
  label: string;
  hitZone?: MapHitZone;
};

export type MapSelection =
  | { kind: "object"; id: ObjectId }
  | { kind: "npc"; id: NpcId }
  | { kind: "agent"; id: FieldAgentId };

export function mapPickablesFromWorld(world: WorldState): MapPickable[] {
  const out: MapPickable[] = [];

  for (const obj of Object.values(world.objects)) {
    const coord = objectPickCoord(world, obj.id);
    if (!coord) continue;
    const p = mapToPercent(coord.mapX, coord.mapY);
    out.push({
      id: obj.id,
      kind: "object",
      mapX: coord.mapX,
      mapY: coord.mapY,
      left: p.left,
      top: p.top,
      label: OBJECT_LABELS[obj.id as ObjectId] ?? obj.name,
      hitZone: pickHitZone("object", obj.id),
    });
  }

  for (const npc of Object.values(world.npcs)) {
    const coord = npcMapCoord(world, npc.id);
    if (!coord) continue;
    const p = mapToPercent(coord.mapX, coord.mapY);
    const label = NPC_LABELS[npc.id as NpcId];
    out.push({
      id: npc.id,
      kind: "npc",
      mapX: coord.mapX,
      mapY: coord.mapY,
      left: p.left,
      top: p.top,
      label: label?.short ?? npc.id,
    });
  }

  for (const [id, agent] of Object.entries(world.agents)) {
    const coord = agentMapCoord(world, id as FieldAgentId);
    if (!coord) continue;
    const p = mapToPercent(coord.mapX, coord.mapY);
    const label = AGENT_LABELS[id as FieldAgentId];
    out.push({
      id,
      kind: "agent",
      mapX: coord.mapX,
      mapY: coord.mapY,
      left: p.left,
      top: p.top,
      label: label?.short ?? id,
    });
  }

  return out;
}

export function selectionLabel(world: WorldState, sel: MapSelection): string {
  if (sel.kind === "object") {
    return OBJECT_LABELS[sel.id] ?? world.objects[sel.id]?.name ?? sel.id;
  }
  if (sel.kind === "npc") {
    return NPC_LABELS[sel.id]?.short ?? sel.id;
  }
  return AGENT_LABELS[sel.id]?.short ?? sel.id;
}

export function selectionChipText(sel: MapSelection): string {
  if (sel.kind === "object") return `[${OBJECT_LABELS[sel.id] ?? sel.id}]`;
  if (sel.kind === "npc") return `[${NPC_LABELS[sel.id]?.short ?? sel.id}]`;
  return `[${AGENT_LABELS[sel.id]?.short ?? sel.id}]`;
}
