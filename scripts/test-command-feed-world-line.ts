import assert from "node:assert/strict";
import { commandFeedLineForEvent, commandFeedLinesFromTimeline } from "../lib/ui/commandFeedWorldLine";
import type { GameEvent } from "../lib/world/worldTypes";

const targetMove: GameEvent = {
  id: "e1",
  t: 1,
  type: "npc_move",
  actor: "target",
  from: "gallery",
  to: "balcony",
  text: "目标走向阳台",
};
const line = commandFeedLineForEvent(targetMove);
assert.ok(line);
assert.equal(line?.speaker, "WORLD");
assert.equal(line?.text, "目标走向阳台");

const faceDialogue: GameEvent = {
  id: "e2",
  t: 2,
  type: "dialogue_bubble",
  actor: "face",
  text: "阳台那边更安静。",
};
const faceLine = commandFeedLineForEvent(faceDialogue);
assert.equal(faceLine?.speaker, "Face");

const idleWaiter: GameEvent = {
  id: "e3",
  t: 3,
  type: "dialogue_bubble",
  actor: "waiter",
  text: "托盘要补酒了。",
};
assert.equal(commandFeedLineForEvent(idleWaiter)?.priority, "low");

const lines = commandFeedLinesFromTimeline([targetMove, faceDialogue, idleWaiter]);
assert.equal(lines.length, 2);

console.log("test-command-feed-world-line: ok");
