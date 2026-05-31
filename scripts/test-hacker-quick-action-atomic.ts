import assert from "node:assert/strict";
import {
  buildHackerQuickActions,
  runHackerQuickAction,
} from "../lib/ui/hackerQuickActions";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();

const actions = buildHackerQuickActions(world);
assert.ok(actions.find((a) => a.id === "send_fake_message")?.enabled);

const spoof = runHackerQuickAction(world, "send_fake_message");
assert.equal(spoof.results.length, 1, "quick action should execute only the named Hacker tool");
assert.equal(spoof.results[0]!.request.toolId, "spoof_message");
assert.equal(spoof.world.agents.face.location, "lobby", "Face must wait for the next player order");
assert.equal(spoof.world.npcs.target.location, "gallery", "target must not auto-move on a Hacker prep action");
assert.ok(
  spoof.turnTimeline.some((e) => e.type === "dialogue_bubble" && e.actor === "face"),
  "Face should acknowledge the received backing/pass after Hacker prep",
);

console.log("test-hacker-quick-action-atomic: ok");
