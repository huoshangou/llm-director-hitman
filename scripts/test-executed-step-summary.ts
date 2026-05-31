import assert from "node:assert/strict";
import { executedStepSummary } from "../lib/ui/executedStepSummary";
import type { ToolUseRequest } from "../lib/tools/toolTypes";

const lure: ToolUseRequest = {
  toolId: "lure_with_private_meeting",
  actor: "face",
  targets: ["target"],
  intent: "Lure",
};
const runner: ToolUseRequest = {
  toolId: "disable_power_panel",
  actor: "runner",
  targets: ["power_panel"],
  intent: "Power",
};

const lureLine = executedStepSummary(lure);
assert.ok(lureLine.startsWith("EXEC / Face"));
assert.ok(lureLine.includes("私密邀约"));
assert.ok(!lureLine.includes("配电"), "summary must describe only the passed step");

const runnerLine = executedStepSummary(runner);
assert.ok(runnerLine.includes("Runner"));
assert.ok(runnerLine.includes("配电"));

const multiSecond: ToolUseRequest = {
  toolId: "tamper_balcony_rail",
  actor: "runner",
  targets: ["balcony_rail"],
  intent: "Rail",
};
const firstOnly = executedStepSummary(lure);
const secondWouldBe = executedStepSummary(multiSecond);
assert.notEqual(firstOnly, secondWouldBe);
assert.ok(!firstOnly.includes("栏杆"), "first-step summary must not claim second tool");

console.log("test-executed-step-summary: ok");
