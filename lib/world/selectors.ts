import { isCleaningCartBlockingBalconySightline, isPowerStealthWindow } from "./sightline";
import { isNpcActive } from "./lethalResolve";
import type {
  FieldAgentId,
  GameEvent,
  LocationId,
  NpcId,
  ObjectId,
  WorldState,
} from "./worldTypes";

export function getFieldAgentLocation(world: WorldState, agent: FieldAgentId): LocationId {
  return world.agents[agent].location;
}

export function isLocationId(value: string): value is LocationId {
  return ["lobby", "bar", "kitchen", "gallery", "balcony"].includes(value);
}

export function isLocationIdInWorld(world: WorldState, value: string): value is LocationId {
  return value in world.locations;
}

export function objectAtLocation(world: WorldState, objectId: ObjectId): LocationId | null {
  const loc = world.objects[objectId]?.location;
  if (loc === "hidden" || loc === "target_inventory") return null;
  return loc;
}

const GUARD_NOT_WATCHING: string[] = [
  "distracted",
  "handling_complaint",
  "investigating",
  "panic",
];

export function isObservedByGuard(world: WorldState, actor: FieldAgentId): boolean {
  if (isPowerStealthWindow(world)) return false;
  const actorLocation = world.agents[actor].location;
  const location = world.locations[actorLocation];
  return location.watchedBy.some((npcId) => {
    const npc = world.npcs[npcId];
    if (!npc || !isNpcActive(world, npcId)) return false;
    if (npc.role !== "guard") return false;
    return !GUARD_NOT_WATCHING.includes(npc.attentionMode);
  });
}

export function isActorNearObject(world: WorldState, actor: FieldAgentId, objectId: ObjectId): boolean {
  const objectLocation = world.objects[objectId]?.location;
  if (objectLocation === "hidden" || objectLocation === "target_inventory") return false;
  return world.agents[actor].location === objectLocation;
}

export function isActorNearLocation(world: WorldState, actor: FieldAgentId, location: LocationId): boolean {
  return world.agents[actor].location === location;
}

export function objectStateEquals(
  world: WorldState,
  objectId: ObjectId,
  key: string,
  expected: unknown,
): boolean {
  return world.objects[objectId]?.state?.[key] === expected;
}

export const SOCIAL_CROSS_ZONE_TOOLS = new Set([
  "create_complaint",
  "lure_with_private_meeting",
  "redirect_guard_attention",
  "infiltrate_gallery",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
]);

export const RUNNER_CROSS_ZONE_TOOLS = new Set([
  "spill_drink",
  "move_cleaning_cart",
  "impersonate_staff",
  "disable_power_panel",
  "tamper_balcony_rail",
  "stage_accident",
  "prepare_poisoned_drink",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
  "eliminate_threat",
]);

export function isNpcId(value: string): value is NpcId {
  return ["target", "guard", "waiter", "cleaner", "guest"].includes(value);
}

export function syncPresenceLists(world: WorldState): void {
  for (const loc of Object.values(world.locations)) {
    loc.npcsPresent = [];
    loc.agentsPresent = [];
  }
  for (const npc of Object.values(world.npcs)) {
    if (!isNpcActive(world, npc.id)) continue;
    world.locations[npc.location].npcsPresent.push(npc.id);
  }
  for (const agent of Object.values(world.agents)) {
    world.locations[agent.location].agentsPresent.push(agent.id);
  }
}

export function resolveTargetLocation(world: WorldState, targets: string[]): LocationId | null {
  for (const t of targets) {
    if (isLocationIdInWorld(world, t)) return t;
  }
  for (const t of targets) {
    if (t in world.objects) {
      const loc = world.objects[t as ObjectId].location;
      if (loc !== "hidden" && loc !== "target_inventory") return loc;
    }
  }
  for (const t of targets) {
    if (t in world.npcs) return world.npcs[t as NpcId].location;
  }
  return null;
}

export type TickResult = {
  events: GameEvent[];
};

export const ROUTE_BIAS_THRESHOLD = 50;

export function isNpcAtLocation(world: WorldState, npcId: NpcId, location: LocationId): boolean {
  return world.npcs[npcId].location === location;
}

export function isSightlineClear(world: WorldState, location: LocationId): boolean {
  if (location === "balcony" && isCleaningCartBlockingBalconySightline(world)) {
    return true;
  }

  const loc = world.locations[location];
  if (loc.tags.includes("sightline_blocked")) return true;

  for (const watcherId of loc.watchedBy) {
    const watcher = world.npcs[watcherId];
    if (!watcher || !isNpcActive(world, watcherId)) continue;
    if (watcher.role !== "guard") continue;
    if (GUARD_NOT_WATCHING.includes(watcher.attentionMode)) {
      continue;
    }
    if (
      location === "balcony" &&
      world.objects.hallway_camera.state.visibilityReduced === true &&
      watcher.attentionMode === "watching_security"
    ) {
      continue;
    }
    return false;
  }
  return true;
}
