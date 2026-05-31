import { isObservedByGuard } from "./selectors";
import { isPowerStealthWindow } from "./sightline";
import type { FieldAgentId, NpcId, WorldState } from "./worldTypes";

const GUARD_DISTRACTED = new Set([
  "distracted",
  "handling_complaint",
  "investigating",
  "panic",
]);

export function isNpcActive(world: WorldState, npcId: NpcId): boolean {
  const v = world.npcs[npcId]?.vitality;
  return v !== "removed";
}

export function canEliminateThreat(
  world: WorldState,
  actor: FieldAgentId,
  victimId: NpcId,
): { ok: boolean; reason: string } {
  if (victimId === "target") {
    return { ok: false, reason: "Contract target cannot be eliminated with eliminate_threat" };
  }

  const victim = world.npcs[victimId];
  if (!victim || victim.vitality === "removed") {
    return { ok: false, reason: `${victimId} is not present` };
  }

  const alertRank: Record<string, number> = {
    calm: 0,
    curious: 1,
    suspicious: 2,
    searching: 3,
    lockdown: 4,
    alarm: 5,
  };
  if (alertRank[world.alertLevel] >= alertRank.searching) {
    return { ok: false, reason: `Alert level ${world.alertLevel} is too high` };
  }

  const actorLoc = world.agents[actor].location;
  if (actorLoc !== victim.location) {
    return { ok: false, reason: `${actor} is not co-located with ${victimId}` };
  }

  if (victimId === "guard") {
    const guard = world.npcs.guard;
    const stealthOk =
      isPowerStealthWindow(world) ||
      GUARD_DISTRACTED.has(guard.attentionMode) ||
      guard.location === "kitchen" ||
      !isObservedByGuard(world, actor);
    if (!stealthOk) {
      return { ok: false, reason: "Guard still watching; need power outage or distraction first" };
    }
    return { ok: true, reason: "" };
  }

  if (victimId === "guest") {
    if (isObservedByGuard(world, actor) && victim.location === "lobby") {
      return { ok: false, reason: `${actor} is observed by guard` };
    }
    return { ok: true, reason: "" };
  }

  return { ok: false, reason: `Cannot eliminate ${victimId} in MVP` };
}
