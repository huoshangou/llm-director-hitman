import { agentMapCoord, npcMapCoord } from "../ui/mapCoords";
import type { MapCamera } from "./canvasLayout";
import { GALLERY_MAP_SIZE } from "./mapLayout";
import type { FieldAgentId, NpcId, WorldState } from "../world/worldTypes";

const NPC_IDS: NpcId[] = ["target", "guard", "waiter", "cleaner", "guest"];
const AGENT_IDS: FieldAgentId[] = ["face", "runner"];

/** Center play camera on given entities (or everyone) so post-turn moves stay visible. */
export function cameraFrameForEntities(
  world: WorldState,
  entityIds?: string[],
  base: MapCamera | null = null,
): MapCamera {
  const ids =
    entityIds ??
    [...NPC_IDS, ...AGENT_IDS].filter((id) => {
      if (id in world.npcs || id in world.agents) return true;
      return false;
    });

  const points: { mapX: number; mapY: number }[] = [];
  for (const id of ids) {
    if (id in world.npcs) {
      const c = npcMapCoord(world, id as NpcId);
      if (c) points.push(c);
    } else if (id in world.agents) {
      const c = agentMapCoord(world, id as FieldAgentId);
      if (c) points.push(c);
    }
  }

  if (!points.length) {
    return base ?? { mode: "camera", centerMapX: 1260, centerMapY: 416, zoom: 1 };
  }

  const minX = Math.min(...points.map((p) => p.mapX));
  const maxX = Math.max(...points.map((p) => p.mapX));
  const minY = Math.min(...points.map((p) => p.mapY));
  const maxY = Math.max(...points.map((p) => p.mapY));

  const centerMapX = (minX + maxX) / 2;
  const centerMapY = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY);
  const zoom =
    span > 900 ? 1 : span > 600 ? 1.15 : span > 350 ? 1.35 : base?.zoom ?? 1.45;

  return {
    mode: "camera",
    centerMapX: Math.max(0, Math.min(GALLERY_MAP_SIZE.width, centerMapX)),
    centerMapY: Math.max(0, Math.min(GALLERY_MAP_SIZE.height, centerMapY)),
    zoom: Math.min(1.75, Math.max(1, zoom)),
  };
}

/** After power + guard leaves, include kitchen (guard) and gallery (face) in frame. */
export function cameraAfterFieldTurn(world: WorldState): MapCamera {
  return cameraFrameForEntities(world, ["guard", "face", "runner", "target"]);
}

export type PlaybackMapPoint = { mapX: number; mapY: number };

/** Frame camera to moving entities during turn playback. */
export function cameraFrameForPlaybackPositions(
  positions: Record<string, PlaybackMapPoint>,
  entityIds: string[],
  base: MapCamera | null = null,
): MapCamera {
  const points = entityIds
    .map((id) => positions[id])
    .filter((p): p is PlaybackMapPoint => !!p);
  if (!points.length) {
    return base ?? { mode: "camera", centerMapX: 1260, centerMapY: 416, zoom: 1 };
  }

  const minX = Math.min(...points.map((p) => p.mapX));
  const maxX = Math.max(...points.map((p) => p.mapX));
  const minY = Math.min(...points.map((p) => p.mapY));
  const maxY = Math.max(...points.map((p) => p.mapY));
  const span = Math.max(maxX - minX, maxY - minY, 120);

  const target = {
    mode: "camera" as const,
    centerMapX: Math.max(0, Math.min(GALLERY_MAP_SIZE.width, (minX + maxX) / 2)),
    centerMapY: Math.max(0, Math.min(GALLERY_MAP_SIZE.height, (minY + maxY) / 2)),
    zoom:
      span > 900 ? 1.05 : span > 600 ? 1.2 : span > 350 ? 1.35 : Math.min(1.55, base?.zoom ?? 1.45),
  };

  if (!base || base.mode === "overview") return target;

  const blend = 0.22;
  return {
    mode: "camera",
    centerMapX: base.centerMapX + (target.centerMapX - base.centerMapX) * blend,
    centerMapY: base.centerMapY + (target.centerMapY - base.centerMapY) * blend,
    zoom: base.zoom + (target.zoom - base.zoom) * blend,
  };
}
