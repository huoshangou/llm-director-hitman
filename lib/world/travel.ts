import type { FieldAgentId, GameEvent, LocationId, NpcId, WorldState } from "./worldTypes";
import { buildAgentPathEvents, buildNpcPathEvents } from "./characterPresence";

/**
 * Single entry for domain travel: graph path → one GameEvent per adjacent hop.
 * Playback timing is resolved in `lib/timeline/playback.ts` (wall-clock ms, not engine frames).
 */
export function planActorTravelEvents(
  actor: NpcId | FieldAgentId,
  from: LocationId,
  to: LocationId,
  locations: WorldState["locations"],
  fallbackText?: string,
): GameEvent[] {
  if (from === to) return [];
  if (actor === "face" || actor === "runner") {
    return buildAgentPathEvents(actor, from, to, locations, fallbackText);
  }
  return buildNpcPathEvents(actor as NpcId, from, to, locations, fallbackText);
}

export function isRelocationEvent(event: GameEvent): boolean {
  return (
    (event.type === "npc_move" || event.type === "agent_move") &&
    !!event.actor &&
    !!event.from &&
    !!event.to &&
    event.from !== event.to
  );
}
