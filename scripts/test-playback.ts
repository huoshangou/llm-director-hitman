import assert from "node:assert/strict";
import { getShowcaseRoute } from "../lib/routes/showcaseRoutes";
import { runTurn } from "../lib/play/runTurn";
import { cloneWorld } from "../lib/world/initialWorld";
import {
  computePlaybackFrame,
  isCrossLocationMove,
  totalPlaybackDurationMs,
} from "../lib/timeline/playback";

const world = cloneWorld();
const route = getShowcaseRoute("route_a")!;
const step0 = route.steps[0]!.tool;

const turn = runTurn(world, [step0], "step");
assert.ok(turn.turnTimeline.length > 0);

const duration = totalPlaybackDurationMs(turn.turnTimeline, world);
assert.ok(duration > 500);

const mid = computePlaybackFrame(world, turn.turnTimeline, duration / 2);
assert.ok(Object.keys(mid.entities).length >= 2);
assert.ok(Array.isArray(mid.hiddenEntityIds));

const crossMoves = turn.turnTimeline.filter(isCrossLocationMove);
assert.ok(
  crossMoves.length === 0 || mid.signalOverlay === null || mid.signalOverlay.phase,
);

console.log("test-playback: ok", {
  events: turn.turnTimeline.length,
  durationMs: duration,
  crossMoves: crossMoves.length,
});
