import { objectsFromWorld } from "../sprites/objectVisual";
import { LOCATION_CENTERS, GALLERY_MAP_SIZE } from "../sprites/mapLayout";
import { overlaysFromWorld, spriteKeyForAgent, spriteKeyForNpc } from "../timeline/eventTemplates";
import { AGENT_LABELS, NPC_LABELS } from "../ui/labels";
import { agentMapCoord, npcMapCoord } from "../ui/mapCoords";
import type { FieldAgentId, LocationId, NpcId, WorldState } from "../world/worldTypes";

export const LOCATION_LABELS: Record<LocationId, string> = {
  kitchen: "厨房",
  bar: "吧台",
  lobby: "大堂",
  gallery: "画廊",
  balcony: "阳台",
};

export type SceneEntity = {
  id: string;
  name: string;
  short: string;
  emoji: string;
  spriteKey: string;
  kind: "npc" | "agent" | "player";
  mapX: number;
  mapY: number;
  locationId: LocationId | "hacker";
  floatingText: string | null;
};

export type SceneLocation = {
  id: LocationId;
  name: string;
  label: string;
  mapX: number;
  mapY: number;
  connectedTo: LocationId[];
  tags: string[];
  hasActors: boolean;
};

export type SceneSnapshot = {
  turn: number;
  alertLevel: string;
  suspicion: number;
  locations: SceneLocation[];
  entities: SceneEntity[];
  objects: ReturnType<typeof objectsFromWorld>;
  overlays: { id: string; label: string; mapX: number; mapY: number }[];
};

const NPC_EMOJI: Record<NpcId, string> = {
  target: "🎯",
  guard: "🛡️",
  waiter: "🍷",
  cleaner: "🧹",
  guest: "👥",
};

const AGENT_EMOJI: Record<FieldAgentId, string> = {
  face: "🎭",
  runner: "🏃",
};

function entityAt(world: WorldState, id: string, kind: SceneEntity["kind"]): SceneEntity | null {
  if (kind === "player") return null;
  if (kind === "npc") {
    const npc = world.npcs[id as NpcId];
    if (!npc) return null;
    const m = npcMapCoord(world, npc.id);
    if (!m) return null;
    const label = NPC_LABELS[npc.id];
    return {
      id: npc.id,
      name: npc.name,
      short: label.short,
      emoji: NPC_EMOJI[npc.id],
      spriteKey: spriteKeyForNpc(world, npc.id),
      kind: "npc",
      mapX: m.mapX,
      mapY: m.mapY,
      locationId: npc.location,
      floatingText: null,
    };
  }
  const agent = world.agents[id as FieldAgentId];
  if (!agent) return null;
  const m = agentMapCoord(world, agent.id);
  if (!m) return null;
  const label = AGENT_LABELS[agent.id];
  return {
    id: agent.id,
    name: agent.name,
    short: label.short,
    emoji: AGENT_EMOJI[agent.id],
    spriteKey: spriteKeyForAgent(world, agent.id),
    kind: "agent",
    mapX: m.mapX,
    mapY: m.mapY,
    locationId: agent.location,
    floatingText: null,
  };
}

export function worldToScene(world: WorldState): SceneSnapshot {
  const locations: SceneLocation[] = Object.values(world.locations).map((loc) => {
    const center = LOCATION_CENTERS[loc.id];
    const hasActors =
      loc.npcsPresent.length > 0 ||
      loc.agentsPresent.length > 0 ||
      Object.values(world.objects).some((o) => o.visible && o.location === loc.id);
    return {
      id: loc.id,
      name: loc.name,
      label: LOCATION_LABELS[loc.id],
      mapX: center.x,
      mapY: center.y,
      connectedTo: loc.connectedTo,
      tags: loc.tags,
      hasActors,
    };
  });

  const entities: SceneEntity[] = [
    ...(["target", "guard", "waiter", "cleaner", "guest"] as NpcId[]).map(
      (id) => entityAt(world, id, "npc")!,
    ),
    ...(["face", "runner"] as FieldAgentId[]).map((id) => entityAt(world, id, "agent")!),
  ];

  const overlays = overlaysFromWorld(world).map((o) => ({
    id: o.id,
    label: o.label,
    mapX: (o.x / 100) * GALLERY_MAP_SIZE.width,
    mapY: (o.y / 100) * GALLERY_MAP_SIZE.height,
  }));

  return {
    turn: world.turn,
    alertLevel: world.alertLevel,
    suspicion: world.suspicion,
    locations,
    entities,
    objects: objectsFromWorld(world),
    overlays,
  };
}
