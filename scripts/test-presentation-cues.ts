import assert from "node:assert/strict";
import { cuesForIntentOutcome, commandFeedLinesForIntentOutcome } from "../lib/presentation/cueForIntentOutcome";
import { cuesForToolResult } from "../lib/presentation/cueForToolResult";
import type { ToolUseRequest, ToolUseResult, ToolId } from "../lib/tools/toolTypes";

function result(request: ToolUseRequest, status: ToolUseResult["status"]): ToolUseResult {
  return {
    request,
    status,
    score: status === "success" ? 1 : 0,
    worldDelta: {},
    generatedEvents: [],
  };
}

const spoofReq: ToolUseRequest = {
  toolId: "spoof_message",
  actor: "player",
  targets: ["target", "target_phone"],
  intent: "Spoof",
  params: { message: "Private art deal on the balcony." },
};
const spoofCues = cuesForToolResult(result(spoofReq, "success"));
assert.ok(spoofCues.some((c) => c.type === "world_fx" && c.effect === "phone_ring"));
assert.ok(spoofCues.some((c) => c.type === "map_ping" && c.targetId === "target"));
assert.ok(
  !spoofCues.some((c) => c.type === "dialogue" && /毒|poison/i.test(c.text)),
  "spoof cues must not claim poison",
);

const powerReq: ToolUseRequest = {
  toolId: "disable_power_panel",
  actor: "runner",
  targets: ["power_panel"],
  intent: "Cut power",
};
const powerCues = cuesForToolResult(result(powerReq, "success"));
assert.ok(powerCues.some((c) => c.type === "world_fx" && c.effect === "lights_dim"));
assert.ok(powerCues.some((c) => c.type === "world_fx" && c.effect === "camera_glitch"));
assert.ok(powerCues.some((c) => c.type === "map_ping" && c.targetId === "power_panel"));
assert.ok(
  powerCues.some((c) => c.type === "dialogue" && c.speaker === "WORLD" && c.text.includes("低光")),
);

const cartReq: ToolUseRequest = {
  toolId: "move_cleaning_cart",
  actor: "runner",
  targets: ["cleaning_cart", "gallery"],
  intent: "Block sightline",
};
const cartCues = cuesForToolResult(result(cartReq, "success"));
assert.ok(cartCues.some((c) => c.type === "world_fx" && c.effect === "sightline_blocked"));
assert.ok(cartCues.some((c) => c.type === "map_ping" && c.targetId === "cleaning_cart"));
assert.ok(
  cartCues.some((c) => c.type === "dialogue" && c.speaker === "WORLD" && c.text.includes("清洁车")),
);

const lureReq: ToolUseRequest = {
  toolId: "lure_with_private_meeting",
  actor: "face",
  targets: ["target"],
  intent: "Lure",
};
const lureCues = cuesForToolResult({
  ...result(lureReq, "success"),
  generatedEvents: [
    { id: "e1", t: 0, type: "agent_move", actor: "face", from: "lobby", to: "gallery", text: "Face 靠近" },
  ],
});
assert.ok(lureCues.some((c) => c.type === "map_ping" && c.targetId === "face"));
assert.ok(lureCues.some((c) => c.type === "dialogue" && c.speaker === "Face" && c.text.includes("当面接触")));

const poisonBase = {
  status: "convertible" as const,
  summary: "阳台毒酒链",
  originalIntent: "poison_balcony",
  convertedTo: {
    toolId: "prepare_poisoned_drink" as ToolId,
    actor: "runner" as const,
    targets: ["wine_bottle"],
    intent: "prepare",
  },
};
const poisonCues = cuesForIntentOutcome(poisonBase);
assert.equal(poisonCues.length, 0, "convertible poison has no locked map cues");

const poisonOutcome = { ...poisonBase, cues: poisonCues };
const feed = commandFeedLinesForIntentOutcome(poisonOutcome);
assert.ok(feed.some((l) => l.speaker === "OPS" && l.text.includes("阳台毒酒")));
assert.ok(feed.some((l) => l.speaker === "Runner" && l.text.includes("阳台")));
assert.ok(!feed.some((l) => l.text.includes("先把他引上阳台")), "feed must not claim target is off-balcony");
assert.ok(feed.some((l) => l.speaker === "NEXT" && l.text.includes("备毒")));

console.log("test-presentation-cues: ok");
