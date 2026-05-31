import type { GameEvent } from "../world/worldTypes";
import type { ToolUseResult } from "../tools/toolTypes";

function estimateResultDuration(result: ToolUseResult): number {
  const timeCost = result.worldDelta.timeSeconds ?? 4;
  return Math.max(2, Math.min(10, Math.round(timeCost / 2)));
}

/** Assign monotonic `t` across tool results (full chain or single step). */
export function buildTimeline(results: ToolUseResult[], startT = 0): GameEvent[] {
  const events: GameEvent[] = [];
  let offset = startT;

  for (const result of results) {
    for (const e of result.generatedEvents) {
      events.push({ ...e, id: e.id, t: offset + (e.t ?? 0) });
    }
    offset += estimateResultDuration(result);
  }

  return events.sort((a, b) => a.t - b.t);
}

/** Tool events then tick events for one player turn. */
export function buildTurnTimeline(
  results: ToolUseResult[],
  tickEvents: GameEvent[],
  startT = 0,
): GameEvent[] {
  const toolEvents = buildTimeline(results, startT);
  const lastT = toolEvents.length > 0 ? Math.max(...toolEvents.map((e) => e.t)) : startT;
  const tickWithT = tickEvents.map((e, i) => ({
    ...e,
    t: lastT + 1 + i,
  }));
  return [...toolEvents, ...tickWithT].sort((a, b) => a.t - b.t);
}
