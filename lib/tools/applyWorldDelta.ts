import { clamp } from "../utils/clamp";
import { syncPresenceLists } from "../world/selectors";
import type { WorldState } from "../world/worldTypes";
import type { WorldDelta } from "./toolTypes";

function deriveAlertLevel(suspicion: number, current: WorldState["alertLevel"]): WorldState["alertLevel"] {
  if (current === "alarm" || current === "lockdown") return current;
  if (suspicion >= 80) return "searching";
  if (suspicion >= 55) return "suspicious";
  if (suspicion >= 25) return "curious";
  return "calm";
}

export function applyWorldDelta(world: WorldState, delta: WorldDelta): WorldState {
  const next = structuredClone(world);

  if (typeof delta.timeSeconds === "number") next.timeSeconds += delta.timeSeconds;
  if (typeof delta.suspicion === "number") next.suspicion = clamp(next.suspicion + delta.suspicion);

  if (delta.alertLevel) next.alertLevel = delta.alertLevel;
  else next.alertLevel = deriveAlertLevel(next.suspicion, next.alertLevel);

  if (delta.player) next.player = { ...next.player, ...delta.player };
  if (delta.objective) next.objective = { ...next.objective, ...delta.objective };

  for (const [id, patch] of Object.entries(delta.agents ?? {})) {
    const key = id as keyof typeof next.agents;
    next.agents[key] = { ...next.agents[key], ...patch };
  }

  for (const [id, patch] of Object.entries(delta.npcs ?? {})) {
    const key = id as keyof typeof next.npcs;
    next.npcs[key] = { ...next.npcs[key], ...patch };
  }

  for (const [id, patch] of Object.entries(delta.objects ?? {})) {
    const key = id as keyof typeof next.objects;
    const statePatch = (patch as { state?: Record<string, unknown> }).state;
    next.objects[key] = {
      ...next.objects[key],
      ...patch,
      state: { ...next.objects[key].state, ...statePatch },
    };
  }

  for (const [id, patch] of Object.entries(delta.locations ?? {})) {
    const key = id as keyof typeof next.locations;
    next.locations[key] = { ...next.locations[key], ...patch };
  }

  syncPresenceLists(next);
  next.turn += 1;
  return next;
}
