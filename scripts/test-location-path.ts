import assert from "node:assert/strict";
import { findLocationPath, areAdjacentLocations } from "../lib/world/locationPath";
import { planActorTravelEvents } from "../lib/world/travel";
import { buildPlaybackSchedule } from "../lib/timeline/playback";
import { executeToolChain } from "../lib/tools/executePlan";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
const locations = world.locations;

const kitchenToBalcony = findLocationPath("kitchen", "balcony", locations);
assert.deepEqual(kitchenToBalcony, ["kitchen", "bar", "lobby", "gallery", "balcony"]);

const kitchenToGallery = findLocationPath("kitchen", "gallery", locations);
assert.deepEqual(kitchenToGallery, ["kitchen", "bar", "lobby", "gallery"]);

assert.ok(areAdjacentLocations("kitchen", "bar"));
assert.ok(!areAdjacentLocations("kitchen", "balcony"));

const tamper = executeToolChain(cloneWorld(), [
  {
    toolId: "tamper_balcony_rail",
    actor: "runner",
    targets: ["balcony_rail"],
    intent: "Tamper",
  },
]);
const runnerMoves = tamper.results[0]?.generatedEvents?.filter(
  (e) => e.type === "agent_move" && e.actor === "runner",
);
assert.ok(runnerMoves && runnerMoves.length >= 4, `expected corridor hops, got ${runnerMoves?.length}`);
assert.ok(
  !runnerMoves.some((e) => e.from === "kitchen" && e.to === "balcony"),
  "must not teleport kitchen→balcony in one hop",
);

const disguise = executeToolChain(cloneWorld(), [
  {
    toolId: "impersonate_staff",
    actor: "runner",
    targets: ["waiter_uniform"],
    intent: "Disguise",
  },
]);
assert.equal(disguise.world.agents.runner.location, "bar", "runner should enter bar after uniform");
const disguiseMoves = disguise.results[0]?.generatedEvents?.filter(
  (e) => e.type === "agent_move" && e.actor === "runner",
);
assert.ok(disguiseMoves?.some((e) => e.from === "kitchen" && e.to === "bar"));

const hops = planActorTravelEvents("runner", "kitchen", "balcony", locations);
const schedule = buildPlaybackSchedule(hops);
for (let i = 1; i < schedule.length; i++) {
  assert.ok(
    schedule[i]!.startMs >= schedule[i - 1]!.startMs + schedule[i - 1]!.durationMs - 1,
    "runner hops must not overlap in playback",
  );
}

console.log("test-location-path: ok");
