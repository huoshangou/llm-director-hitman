import { tickWorld } from "../world/tickWorld";
import type { WorldState } from "../world/worldTypes";
import { applyToolResult, resolveTool } from "../tools/resolveTool";
import type { ToolUseRequest, ToolUseResult } from "../tools/toolTypes";
import { buildOperationSet } from "./buildOperationSet";
import type { OperationAction, OperationSet } from "./operationTypes";

export type ExecuteOperationSetResult = {
  world: WorldState;
  results: ToolUseResult[];
  tickEvents: ReturnType<typeof tickWorld>["events"];
  operationSet: OperationSet;
};

const MAX_TURN_WAVES = 4;

function requestKey(r: ToolUseRequest): string {
  return `${r.actor}:${r.toolId}`;
}

/** Step turn: multi-wave frontier — 同 turn 内前置满足后解锁下一步（如配电 → 混画廊）。 */
export function executeOperationSet(
  world: WorldState,
  chain: ToolUseRequest[],
  rejected: OperationSet["rejected"] = [],
  playerPlan?: string,
  tickPlayIdle?: boolean,
): ExecuteOperationSetResult {
  let current = structuredClone(world);
  const results: ToolUseResult[] = [];
  const allActions: OperationAction[] = [];
  const allConflicts: OperationSet["conflicts"] = [];
  let pending = [...chain];
  const executed = new Set<string>();

  for (let wave = 0; wave < MAX_TURN_WAVES && pending.length; wave++) {
    const operationSet = buildOperationSet(pending, rejected, "llm", playerPlan, current);
    if (!operationSet.actions.length) break;

    allConflicts.push(...operationSet.conflicts);

    for (const action of operationSet.actions) {
      const { request } = action;
      const key = requestKey(request);
      if (executed.has(key)) continue;

      const result = resolveTool(request, current);
      results.push(result);
      executed.add(key);
      allActions.push(action);

      if (result.status !== "blocked") {
        current = applyToolResult(current, result);
      }
      if (current.alertLevel === "alarm") break;
    }

    pending = pending.filter((r) => !executed.has(requestKey(r)));
    if (current.alertLevel === "alarm") break;
  }

  const mergedOperationSet: OperationSet = {
    actions: allActions,
    rejected,
    conflicts: allConflicts,
  };

  const tickOpts = tickPlayIdle ? { playIdle: true as const } : undefined;
  const tickEvents: ReturnType<typeof tickWorld>["events"] = [];

  let tick = tickWorld(current, tickOpts);
  current = tick.world;
  tickEvents.push(...tick.events);

  for (let i = 0; i < 6; i++) {
    if (current.npcs.target.location === "balcony") break;
    tick = tickWorld(current, tickOpts);
    current = tick.world;
    tickEvents.push(...tick.events);
  }

  current.eventLog = [...current.eventLog, ...tickEvents];

  return { world: current, results, tickEvents, operationSet: mergedOperationSet };
}
