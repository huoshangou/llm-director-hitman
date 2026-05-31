import assert from "node:assert/strict";
import { planNextHint } from "../lib/ui/planNextHint";
import { validateToolRequest } from "../lib/tools/checkPreconditions";
import { executeToolChain } from "../lib/tools/executePlan";
import { isSightlineClear, isObservedByGuard } from "../lib/world/selectors";
import { mapLightingFromWorld } from "../lib/ui/mapMood";
import { assessFaceCredibility } from "../lib/world/faceCredibility";
import { cloneWorld } from "../lib/world/initialWorld";
import type { ToolUseRequest } from "../lib/tools/toolTypes";

const world = cloneWorld();

const accidentReq: ToolUseRequest = {
  toolId: "stage_accident",
  actor: "runner",
  targets: ["balcony_rail", "target"],
  intent: "Stage accident",
};
const accidentVal = validateToolRequest(accidentReq, world);
assert.equal(accidentVal.ok, false);
const accidentHint = planNextHint(world, { request: accidentReq, reasons: accidentVal.reasons });
assert.ok(accidentHint?.includes("NEXT /"));
assert.ok(accidentHint?.includes("目标在阳台") || accidentHint?.includes("栏杆"));

const powerReq: ToolUseRequest = {
  toolId: "disable_power_panel",
  actor: "runner",
  targets: ["power_panel"],
  intent: "Cut power",
};
world.npcs.guard.attentionMode = "watching_area";
world.npcs.guard.location = "gallery";
world.agents.runner.location = "kitchen";
const powerVal = validateToolRequest(powerReq, world);
if (!powerVal.ok) {
  const h = planNextHint(world, { request: powerReq, reasons: powerVal.reasons });
  assert.ok(h?.includes("保安") || h?.includes("配电") || h?.includes("同区"), `power hint: ${h}`);
}

const noPerm = cloneWorld();
noPerm.player.permissions = noPerm.player.permissions.filter((p) => p !== "access_guest_terminal");
const spoofReq: ToolUseRequest = {
  toolId: "spoof_message",
  actor: "player",
  targets: ["target", "target_phone"],
  intent: "Spoof",
};
const spoofVal = validateToolRequest(spoofReq, noPerm);
assert.equal(spoofVal.ok, false);
const spoofHint = planNextHint(noPerm, { request: spoofReq, reasons: spoofVal.reasons });
assert.ok(spoofHint?.includes("guest_list_terminal"));

let cartWorld = cloneWorld();
const cartReq: ToolUseRequest = {
  toolId: "move_cleaning_cart",
  actor: "runner",
  targets: ["cleaning_cart", "gallery"],
  intent: "Block sightline",
};
const cartExec = executeToolChain(cartWorld, [cartReq], "step");
cartWorld = cartExec.world;
assert.equal(cartExec.results[0]?.status, "success");
assert.equal(isSightlineClear(cartWorld, "balcony"), true);

let powerWorld = cloneWorld();
const powerExec = executeToolChain(powerWorld, [
  {
    toolId: "disable_power_panel",
    actor: "runner",
    targets: ["power_panel"],
    intent: "Cut power",
  },
], "step");
powerWorld = powerExec.world;
assert.equal(powerExec.results[0]?.status, "success");
assert.equal(mapLightingFromWorld(powerWorld), "dimmed");
assert.equal(powerWorld.npcs.guard.attentionMode, "investigating");
assert.equal(isObservedByGuard(powerWorld, "runner"), false);

const credDefault = assessFaceCredibility(cloneWorld());
assert.equal(credDefault.tier, "improvising");
let credWorld = cloneWorld();
credWorld = executeToolChain(credWorld, [
  {
    toolId: "modify_guest_list",
    actor: "player",
    targets: ["guest_list_terminal"],
    intent: "Modify list",
  },
], "step").world;
assert.equal(assessFaceCredibility(credWorld).tier, "partial");
credWorld.npcs.target.beliefs.push({
  id: "b1",
  subject: "message",
  predicate: "private_meeting_on_balcony",
  confidence: 75,
  source: "spoof",
});
assert.equal(assessFaceCredibility(credWorld).tier, "strong");

console.log("test-plan-next-hint: ok");
