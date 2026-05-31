import assert from "node:assert/strict";
import { getInitialWorld, runOneStep } from "../lib/bridge/sandboxApi";
import { getShowcaseRoute } from "../lib/routes/showcaseRoutes";

const route = getShowcaseRoute("route_a");
assert.ok(route);
let world = getInitialWorld();

for (let i = 0; i < route.steps.length; i++) {
  const step = route.steps[i]!;
  const out = runOneStep(world, step.tool);
  world = out.world;
  assert.equal(out.results.length, 1);
  assert.ok(out.scene.entities.length >= 7);
  if (out.results[0]!.status === "blocked") {
    console.warn(`Step ${i + 1} blocked:`, out.results[0]!.reason);
  }
}

assert.equal(world.npcs.target.location, "balcony");
console.log("sandbox-api: route_a full chain OK, turn=", world.turn);
