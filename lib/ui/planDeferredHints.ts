import type { DirectorValidation } from "../director/validateDirectorPlan";
import type { OperationSet } from "../operation/operationTypes";
import { operationConflictNextLines } from "./operationSetSummary";
import { planNextHint } from "./planNextHint";
import type { WorldState } from "../world/worldTypes";

/** Feed NEXT lines for rejected steps + same-actor deferred ops. */
export function planDeferredNextLines(
  world: WorldState,
  validation: DirectorValidation | null | undefined,
  operationSet: OperationSet | null | undefined,
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const executed = new Set(
    (operationSet?.actions ?? []).map((a) => `${a.request.actor}:${a.request.toolId}`),
  );

  for (const line of operationConflictNextLines(operationSet ?? { actions: [], rejected: [], conflicts: [] })) {
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }

  for (const rej of validation?.rejected ?? []) {
    if (executed.has(`${rej.request.actor}:${rej.request.toolId}`)) continue;
    const hint = planNextHint(world, rej);
    if (hint && !seen.has(hint)) {
      seen.add(hint);
      lines.push(hint);
    }
  }

  return lines;
}
