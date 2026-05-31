import assert from "node:assert/strict";
import { buildOperationSet } from "../lib/operation/buildOperationSet";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
const plan = "引开保安，破坏阳台栏杆，把 Victor 诱到阳台制造坠楼事故";

const chain: ToolUseRequest[] = [
  {
    toolId: "redirect_guard_attention",
    actor: "face",
    targets: ["guard"],
    intent: "redirect",
  },
  {
    toolId: "lure_with_private_meeting",
    actor: "face",
    targets: ["target"],
    intent: "lure",
  },
  {
    toolId: "tamper_balcony_rail",
    actor: "runner",
    targets: ["balcony_rail"],
    intent: "tamper",
  },
];

const op = buildOperationSet(chain, [], "llm", plan, world);
const facePick = op.actions.find((a) => a.actor === "face")?.request.toolId;
assert.equal(facePick, "lure_with_private_meeting", "face should pick lure when plan mentions 阳台");

console.log("test-frontier-face-pick: ok");
