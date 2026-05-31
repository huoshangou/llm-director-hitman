import assert from "node:assert/strict";
import { worldToScene } from "../lib/bridge/worldToScene";
import { agentMapCoord } from "../lib/ui/mapCoords";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
world.agents.runner.location = "bar";
world.agents.runner.coverIdentity = "waiter";

const runnerBar = agentMapCoord(world, "runner");
assert.ok(runnerBar);
assert.ok(runnerBar.mapX >= 520, `runner bar anchor x=${runnerBar.mapX} should be inside visible bar service area`);
assert.ok(runnerBar.mapY <= 475, `runner bar anchor y=${runnerBar.mapY} should not sit on the lower wall edge`);

const scene = worldToScene(world);
assert.ok(
  !scene.entities.some((e) => e.id === "player"),
  "remote Hacker/player must not render as a physical marker in the lobby",
);

console.log("test-play-spatial-round2: ok");
