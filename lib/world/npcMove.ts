import type { GameEvent, LocationId, NpcState, WorldState } from "./worldTypes";
import { travelNpcTo } from "./characterPresence";

/** Prefer travelNpcTo(world, npcId, …). Kept for call sites that only hold NpcState. */
export function moveNpcToLocation(
  npc: NpcState,
  to: LocationId,
  events: GameEvent[],
  text?: string,
  world?: WorldState,
): boolean {
  if (world) {
    return travelNpcTo(world, npc.id, to, events, text);
  }
  return false;
}
