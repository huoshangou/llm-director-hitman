import assert from "node:assert/strict";
import { buildValidationSummaryParts } from "../lib/ui/planValidationSummary";
import { validateToolRequest } from "../lib/tools/checkPreconditions";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
const req = {
  toolId: "stage_accident" as const,
  actor: "runner" as const,
  targets: ["balcony_rail", "target"],
  intent: "accident",
};
const val = validateToolRequest(req, world);
assert.equal(val.ok, false);
const parts = buildValidationSummaryParts(world, {
  executableChain: [],
  rejected: [{ request: req, reasons: val.reasons }],
  errors: [],
  warnings: [],
});
assert.ok(parts.nextHint?.startsWith("NEXT /"));

console.log("test-plan-validation-summary: ok");
