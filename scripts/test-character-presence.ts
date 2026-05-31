import assert from "node:assert/strict";
import { isActorOnReactiveHold } from "../lib/world/characterPresence";
import { executeToolChain } from "../lib/tools/executePlan";
import { cloneWorld } from "../lib/world/initialWorld";
import { runIdlePass } from "../lib/world/ambientWorld";

const world = cloneWorld();

const lure = executeToolChain(world, [
  {
    toolId: "lure_with_private_meeting",
    actor: "face",
    targets: ["target"],
    intent: "Engage in gallery",
  },
]);
const afterLure = lure.world;
assert.equal(afterLure.agents.face.location, "gallery", "Face must travel to target zone on lure");
assert.equal(afterLure.agents.face.status, "acting");
assert.ok(isActorOnReactiveHold(afterLure, "face"));

let idleWorld = afterLure;
for (let i = 0; i < 4; i++) {
  idleWorld = runIdlePass(idleWorld).world;
}
assert.equal(idleWorld.agents.face.status, "acting", "idle must not reset Face during engage hold");
assert.equal(idleWorld.agents.face.location, "gallery");

const complaint = executeToolChain(cloneWorld(), [
  {
    toolId: "create_complaint",
    actor: "face",
    targets: ["guard", "guest_list_terminal"],
    intent: "Admin complaint",
  },
]);
assert.equal(
  complaint.world.agents.face.location,
  "lobby",
  "remote social complaint does not require Face to leave lobby",
);

console.log("test-character-presence: ok");
