import assert from "node:assert/strict";
import { playbackCoordAtLocation } from "../lib/sprites/playbackCoords";
import { getShowcaseRoute } from "../lib/routes/showcaseRoutes";
import { runTurn } from "../lib/play/runTurn";
import { cloneWorld } from "../lib/world/initialWorld";
import {
  PLAYBACK_MS_PER_T,
  computePlaybackFrame,
  eventDurationMs,
  isCrossLocationMove,
} from "../lib/timeline/playback";

const world = cloneWorld();
const tamper = getShowcaseRoute("route_a")!.steps[3]!.tool;
const turn = runTurn(world, [tamper], "step");

const runnerMoves = turn.turnTimeline.filter(
  (e) => e.type === "agent_move" && e.actor === "runner",
);
assert.ok(runnerMoves.length >= 3, "tamper should walk corridor in multiple hops");

const teleport = runnerMoves.find((e) => e.from === "kitchen" && e.to === "balcony");
assert.equal(teleport, undefined, "no single-hop kitchen→balcony");

const firstHop = runnerMoves[0]!;
assert.ok(firstHop.from && firstHop.to);
assert.equal(isCrossLocationMove(firstHop), false, "adjacent hops use walk lerp not SIGNAL LOST");

const hopDur = eventDurationMs(firstHop, world);
assert.ok(hopDur >= 1400, `hop should be slower walk, got ${hopDur}ms`);

const startMs = firstHop.t * PLAYBACK_MS_PER_T;
const from = playbackCoordAtLocation("runner", firstHop.from!, firstHop);
const to = playbackCoordAtLocation("runner", firstHop.to!, firstHop);
const midFrame = computePlaybackFrame(world, turn.turnTimeline, startMs + hopDur * 0.5);
assert.equal(midFrame.signalOverlay, null, "adjacent walk should not show SIGNAL LOST");
assert.ok(midFrame.entities.runner);
const midX = midFrame.entities.runner!.mapX;
assert.ok(midX > from.mapX && midX < to.mapX + 50, "runner should lerp between adjacent zones");

console.log("test-play-cross-zone-playback: ok", {
  hops: runnerMoves.map((e) => `${e.from}→${e.to}`).join(", "),
});
