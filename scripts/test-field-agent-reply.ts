import assert from "node:assert/strict";
import {
  fieldAgentRepliesForToolResults,
  fieldAgentReplyForRejectedStep,
} from "../lib/hacker/fieldAgentReply";
import { validateToolRequest } from "../lib/tools/checkPreconditions";
import type { ToolUseRequest, ToolUseResult } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";

function result(request: ToolUseRequest, status: ToolUseResult["status"]): ToolUseResult {
  return {
    request,
    status,
    score: status === "success" ? 1 : 0,
    worldDelta: {},
    generatedEvents: [],
  };
}

const faceReq: ToolUseRequest = {
  toolId: "redirect_guard_attention",
  actor: "face",
  targets: ["guard"],
  intent: "Redirect guard",
  params: { frame: "admin_issue" },
};
const runnerReq: ToolUseRequest = {
  toolId: "disable_power_panel",
  actor: "runner",
  targets: ["power_panel"],
  intent: "Cut power",
};
const hackerReq: ToolUseRequest = {
  toolId: "modify_guest_list",
  actor: "player",
  targets: ["guest_list_terminal"],
  intent: "Modify list",
};
const poisonPrepReq: ToolUseRequest = {
  toolId: "prepare_poisoned_drink",
  actor: "runner",
  targets: ["wine_bottle"],
  intent: "Prepare poison",
};

const replies = fieldAgentRepliesForToolResults([
  result(faceReq, "success"),
  result(runnerReq, "success"),
  result(hackerReq, "success"),
]);

assert.equal(replies[0].speaker, "face");
assert.equal(replies[0].replyType, "done");
assert.ok(replies[0].text.includes("保安") || replies[0].text.includes("话题"));
assert.equal(replies[1].speaker, "runner");
assert.ok(replies[1].text.includes("配电") || replies[1].text.includes("现场"));
assert.equal(replies[2].speaker, "hacker");
assert.ok(replies[2].text.includes("终端") || replies[2].text.includes("远程"));

const balconyWorld = cloneWorld();
balconyWorld.npcs.target.location = "balcony";
const poisonReply = fieldAgentRepliesForToolResults(
  [result(poisonPrepReq, "success")],
  balconyWorld,
)[0]!;
assert.ok(poisonReply.text.includes("已在阳台"), "poison prep reply should respect current target location");
assert.ok(!poisonReply.text.includes("等 Victor 上阳台"), "poison prep reply must not report a stale location");

for (const reply of replies) {
  assert.ok(reply.text.length <= 60, `reply too long: ${reply.text}`);
  assert.ok(!/resolver|validation|tool/i.test(reply.text), `leaks implementation: ${reply.text}`);
  assert.ok(reply.groundedIn.toolId, "reply must stay grounded in a tool");
}

const world = cloneWorld();
const accidentReq: ToolUseRequest = {
  toolId: "stage_accident",
  actor: "runner",
  targets: ["balcony_rail", "target"],
  intent: "Stage accident",
};
const rejected = validateToolRequest(accidentReq, world);
assert.equal(rejected.ok, false);
const blocked = fieldAgentReplyForRejectedStep(world, {
  request: accidentReq,
  reasons: rejected.reasons,
});

assert.ok(blocked);
assert.equal(blocked.speaker, "runner");
assert.ok(blocked.text.includes("事故") || blocked.text.includes("阳台"));
assert.equal(blocked.groundedIn.resultStatus, "blocked");
assert.ok(blocked.text.length <= 60);

console.log("test-field-agent-reply: ok");
