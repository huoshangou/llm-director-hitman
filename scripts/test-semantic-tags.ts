import assert from "node:assert/strict";
import { applyToolResult, resolveTool } from "../lib/tools/resolveTool";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";

function run(world: ReturnType<typeof cloneWorld>, request: ToolUseRequest) {
  const result = resolveTool(request, world);
  assert.equal(result.status, "success", `${request.toolId} should succeed`);
  return applyToolResult(world, result);
}

let world = cloneWorld();

world = run(world, {
  toolId: "impersonate_staff",
  actor: "runner",
  targets: ["waiter_uniform"],
  intent: "runner gets waiter cover",
});
assert.ok(world.agents.runner.stateTags?.includes("disguised_as_waiter"));
assert.ok(world.agents.runner.stateTags?.includes("cover_valid_service"));

world = run(world, {
  toolId: "spoof_message",
  actor: "player",
  targets: ["target_phone"],
  intent: "spoof balcony invitation",
  params: { message: "Private balcony meeting." },
});
assert.ok(world.npcs.target.stateTags.includes("target_has_private_meeting_belief"));

world = run(world, {
  toolId: "prepare_poisoned_drink",
  actor: "runner",
  targets: ["wine_bottle"],
  intent: "prepare poison",
});
assert.ok(world.objects.wine_bottle.tags.includes("wine_bottle_poisoned"));
assert.ok(world.objects.wine_bottle.tags.includes("tampered_object"));

world.npcs.target.location = "balcony";
world = run(world, {
  toolId: "serve_poisoned_drink_on_balcony",
  actor: "runner",
  targets: ["target", "wine_bottle"],
  intent: "serve poisoned drink",
});
assert.ok(world.objects.wine_bottle.tags.includes("poison_served_to_target"));
assert.ok(world.npcs.target.stateTags.includes("target_accepted_poisoned_drink"));

world = run(world, {
  toolId: "resolve_poison_on_balcony",
  actor: "runner",
  targets: ["target"],
  intent: "resolve poison",
});
assert.ok(world.npcs.target.stateTags.includes("target_poisoned"));
assert.ok(world.npcs.target.stateTags.includes("target_handled"));
assert.ok(world.locations.balcony.tags.includes("private"));

const noCoverWorld = cloneWorld();
noCoverWorld.npcs.target.location = "balcony";
noCoverWorld.objects.wine_bottle.state = {
  premium: true,
  poisoned: true,
  poison_served: false,
};

const noCoverServe = resolveTool(
  {
    toolId: "serve_poisoned_drink_on_balcony",
    actor: "runner",
    targets: ["target", "wine_bottle"],
    intent: "serve without service cover",
  },
  noCoverWorld,
);
assert.equal(noCoverServe.status, "success");
const afterNoCoverServe = applyToolResult(noCoverWorld, noCoverServe);
assert.ok(afterNoCoverServe.npcs.guard.stateTags.includes("guard_suspicious_of_runner"));
assert.ok(afterNoCoverServe.npcs.guard.suspicionTowardAgents.runner! > 0);

const cameraWorld = cloneWorld();
cameraWorld.npcs.target.location = "balcony";
cameraWorld.objects.wine_bottle.state = {
  premium: true,
  poisoned: true,
  poison_served: true,
};
const poisonWithCamera = applyToolResult(
  cameraWorld,
  resolveTool(
    {
      toolId: "resolve_poison_on_balcony",
      actor: "runner",
      targets: ["target"],
      intent: "resolve poison with camera still active",
    },
    cameraWorld,
  ),
);
assert.ok(poisonWithCamera.objects.hallway_camera.tags.includes("camera_has_relevant_footage"));
assert.ok(poisonWithCamera.objective.evidenceRisk >= 20);

console.log("test-semantic-tags: ok");
