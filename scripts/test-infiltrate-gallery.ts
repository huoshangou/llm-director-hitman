import assert from "node:assert/strict";
import { canFaceInfiltrateGallery } from "../lib/world/galleryInfiltration";
import { cloneWorld } from "../lib/world/initialWorld";
import { executeToolChain } from "../lib/tools/executePlan";

const world = cloneWorld();
assert.equal(canFaceInfiltrateGallery(world).ok, false);

const afterPower = executeToolChain(cloneWorld(), [
  {
    toolId: "disable_power_panel",
    actor: "runner",
    targets: ["power_panel"],
    intent: "power",
  },
]);
assert.equal(canFaceInfiltrateGallery(afterPower.world).ok, true);

const turn = executeToolChain(afterPower.world, [
  {
    toolId: "infiltrate_gallery",
    actor: "face",
    targets: ["gallery"],
    intent: "infiltrate",
  },
]);
assert.equal(turn.results[0]?.status, "success");
assert.equal(turn.world.agents.face.location, "gallery");

console.log("test-infiltrate-gallery: ok");
