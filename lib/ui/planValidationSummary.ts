import type { DirectorValidation } from "../director/validateDirectorPlan";
import type { WorldState } from "../world/worldTypes";
import { planNextHint } from "./planNextHint";

export type ValidationSummaryParts = {
  executableCount: number;
  rejectedCount: number;
  errorCount: number;
  stepLabel: string;
  reason: string;
  nextHint: string | null;
};

export function buildValidationSummaryParts(
  world: WorldState,
  validation: Pick<DirectorValidation, "executableChain" | "rejected" | "errors" | "warnings">,
  unsupportedReason?: string,
): ValidationSummaryParts {
  const chain = validation.executableChain;
  const rejected = validation.rejected;
  const first = chain[0];
  const firstRejected = rejected[0];
  const reason =
    firstRejected?.reasons.join("; ") ??
    validation.errors[0] ??
    unsupportedReason ??
    validation.warnings[0] ??
    "";
  const step = first
    ? `${first.actor} → ${first.toolId} (${first.targets.join(", ")})`
    : "无可执行步骤";
  return {
    executableCount: chain.length,
    rejectedCount: rejected.length,
    errorCount: validation.errors.length,
    stepLabel: step,
    reason,
    nextHint: planNextHint(world, firstRejected ?? null),
  };
}
