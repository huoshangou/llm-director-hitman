import { executeOperationSet } from "../operation/executeOperationSet";
import { tickWorld } from "../world/tickWorld";
import type { WorldState } from "../world/worldTypes";
import { applyToolResult, resolveTool } from "./resolveTool";
import type { ToolUseRequest, ToolUseResult } from "./toolTypes";

export type ExecuteMode = "step" | "full";

export type ExecutePlanResult = {
  world: WorldState;
  results: ToolUseResult[];
  tickEvents: ReturnType<typeof tickWorld>["events"];
  rejected: never[];
  operationSet?: ReturnType<typeof executeOperationSet>["operationSet"];
};

export type ExecuteToolChainOptions = {
  playerPlan?: string;
  /** Play: post-turn tick keeps NPC zones stable (no task-complete teleport). */
  tickPlayIdle?: boolean;
};

export function executeToolChain(
  world: WorldState,
  chain: ToolUseRequest[],
  mode: ExecuteMode = "step",
  options?: ExecuteToolChainOptions,
): ExecutePlanResult {
  if (mode === "step") {
    const exec = executeOperationSet(
      world,
      chain,
      [],
      options?.playerPlan,
      options?.tickPlayIdle,
    );
    return {
      world: exec.world,
      results: exec.results,
      tickEvents: exec.tickEvents,
      rejected: [],
      operationSet: exec.operationSet,
    };
  }

  let current = structuredClone(world);
  const results: ToolUseResult[] = [];

  for (const request of chain) {
    const result = resolveTool(request, current);
    results.push(result);
    if (result.status !== "blocked") {
      current = applyToolResult(current, result);
    }
    if (current.alertLevel === "alarm") break;
  }

  const tick = tickWorld(current, options?.tickPlayIdle ? { playIdle: true } : undefined);
  current = tick.world;
  current.eventLog = [...current.eventLog, ...tick.events];

  return { world: current, results, tickEvents: tick.events, rejected: [] };
}
