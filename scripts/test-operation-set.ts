import assert from "node:assert/strict";
import { buildOperationSet } from "../lib/operation/buildOperationSet";
import type { ToolUseRequest } from "../lib/tools/toolTypes";

const runnerDisguise: ToolUseRequest = {
  toolId: "impersonate_staff",
  actor: "runner",
  targets: ["waiter_uniform"],
  intent: "Disguise",
};

const faceLure: ToolUseRequest = {
  toolId: "lure_with_private_meeting",
  actor: "face",
  targets: ["target"],
  intent: "Lure",
};

const op2 = buildOperationSet([runnerDisguise, faceLure]);
assert.equal(op2.actions.length, 2);
assert.equal(op2.actions[0]!.actor, "runner");
assert.equal(op2.actions[1]!.actor, "face");
assert.equal(op2.conflicts.length, 0);

const runnerTamper: ToolUseRequest = {
  toolId: "tamper_balcony_rail",
  actor: "runner",
  targets: ["balcony_rail"],
  intent: "Tamper",
};

const opConflict = buildOperationSet([runnerDisguise, runnerTamper]);
assert.equal(opConflict.actions.length, 1);
assert.equal(opConflict.actions[0]!.request.toolId, "impersonate_staff");
assert.equal(opConflict.conflicts.length, 1);
assert.equal(opConflict.conflicts[0]!.actor, "runner");
assert.ok(opConflict.conflicts[0]!.requests.length === 2);

const faceOver = buildOperationSet(
  [
    {
      toolId: "create_complaint",
      actor: "face",
      targets: ["guard", "guest_list_terminal"],
      intent: "complaint",
    },
    {
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "infiltrate",
    },
  ],
  [],
  "llm",
  "face，趁乱混进画廊",
);
assert.equal(faceOver.actions.length, 1);
assert.equal(faceOver.actions[0]!.request.toolId, "infiltrate_gallery");

const powerThenGallery = buildOperationSet(
  [
    {
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "infiltrate",
    },
    {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "power",
    },
  ],
  [],
  "llm",
  "runner配电 face混画廊",
);
assert.equal(powerThenGallery.actions[0]!.request.toolId, "disable_power_panel");
assert.equal(powerThenGallery.actions[1]!.request.toolId, "infiltrate_gallery");

console.log("test-operation-set: ok");
