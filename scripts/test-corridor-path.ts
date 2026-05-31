import assert from "node:assert/strict";
import { OBJECT_MAP_ANCHORS } from "../lib/sprites/mapAnchors";
import { playbackCoordAtLocation } from "../lib/sprites/playbackCoords";
import { samplePolylineAt, travelMapPolyline } from "../lib/sprites/corridorPath";
import { cloneWorld } from "../lib/world/initialWorld";
import { computePlaybackFrame, eventDurationMs } from "../lib/timeline/playback";
import { getShowcaseRoute } from "../lib/routes/showcaseRoutes";
import { runTurn } from "../lib/play/runTurn";

const world = cloneWorld();
const tamper = getShowcaseRoute("route_a")!.steps[3]!.tool;
const turn = runTurn(world, [tamper], "step");

const line = travelMapPolyline("kitchen", "bar", "runner", world.locations);
assert.ok(line.length >= 3, "kitchen→bar should pass corridor midpoint");

const mid = samplePolylineAt(line, 0.5);
const kitchen = playbackCoordAtLocation("runner", "kitchen");
const bar = playbackCoordAtLocation("runner", "bar");
assert.ok(mid.x > kitchen.mapX && mid.x < bar.mapX, "mid walk should sit between zone anchors");

const guardKitchen = playbackCoordAtLocation("guard", "kitchen", {
  type: "npc_move",
  actor: "guard",
  to: "kitchen",
  from: "bar",
  text: "保安赶往厨房查配电",
});
const panel = OBJECT_MAP_ANCHORS.power_panel;
assert.ok(
  Math.hypot(guardKitchen.mapX - panel.mapX, guardKitchen.mapY - panel.mapY) < 80,
  "guard kitchen hop should end beside power panel",
);

const hop = turn.turnTimeline.find(
  (e) => e.type === "agent_move" && e.actor === "runner" && e.from === "kitchen" && e.to === "bar",
)!;
const hopMs = eventDurationMs(hop, world);
const frame = computePlaybackFrame(world, turn.turnTimeline, hopMs * 0.5);
const pos = frame.entities.runner;
assert.ok(pos);
assert.ok(
  pos.mapX > kitchen.mapX + 20 && pos.mapX < bar.mapX + 20,
  `playback mid hop x=${pos.mapX} should be between kitchen ${kitchen.mapX} and bar ${bar.mapX}`,
);

console.log("test-corridor-path: ok");
