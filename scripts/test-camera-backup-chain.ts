import assert from "node:assert/strict";
import { validateToolRequest } from "../lib/tools/checkPreconditions";
import { executeToolChain } from "../lib/tools/executePlan";
import { planNextHint } from "../lib/ui/planNextHint";
import { cloneWorld } from "../lib/world/initialWorld";
import type { ToolUseRequest } from "../lib/tools/toolTypes";

const suppress: ToolUseRequest = {
  toolId: "suppress_camera_record",
  actor: "player",
  targets: ["hallway_camera"],
  intent: "Disable hallway camera recording",
};

const initial = cloneWorld();
const direct = validateToolRequest(suppress, initial);
assert.equal(direct.ok, false, "camera suppression should be blocked while main power is stable");
assert.ok(
  planNextHint(initial, { request: suppress, reasons: direct.reasons })?.includes("配电"),
  "blocked camera hint should point to power disruption first",
);

let powered = executeToolChain(
  cloneWorld(),
  [
    {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "Cut gallery power",
    },
  ],
  "step",
  { tickPlayIdle: true },
).world;

assert.equal(powered.objects.hallway_camera.state.powerMode, "backup");
assert.equal(validateToolRequest(suppress, powered).ok, true);

const suppressed = executeToolChain(powered, [suppress], "step", { tickPlayIdle: true });
assert.equal(suppressed.results[0]?.status, "success");
assert.equal(suppressed.world.objects.hallway_camera.state.recordingSuppressed, true);
assert.equal(suppressed.world.objects.hallway_camera.state.active, false);

console.log("test-camera-backup-chain: ok");
