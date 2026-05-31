import { buildTurnTimeline } from "../timeline/buildTimeline";
import type { GameEvent } from "../world/worldTypes";
import { executeToolChain, type ExecuteMode, type ExecutePlanResult } from "../tools/executePlan";
import type { ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";

export type TurnResult = ExecutePlanResult & {
  /** Events for this turn only (tool + tick), with timeline `t`. */
  turnTimeline: GameEvent[];
};

export type RunTurnOptions = {
  playerPlan?: string;
  tickPlayIdle?: boolean;
};

export function runTurn(
  world: WorldState,
  chain: ToolUseRequest[],
  mode: ExecuteMode = "step",
  options?: RunTurnOptions,
): TurnResult {
  const exec = executeToolChain(world, chain, mode, options);
  const turnTimeline = buildTurnTimeline(exec.results, exec.tickEvents, world.timeSeconds);
  return { ...exec, turnTimeline };
}
