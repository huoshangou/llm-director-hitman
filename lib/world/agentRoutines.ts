import type { GameEvent, WorldState } from "./worldTypes";

/** Face / Runner 仅由玩家 Turn 的 Tool 移动（ADR-0014） */
export function advanceAgentRoutines(_world: WorldState): GameEvent[] {
  return [];
}
