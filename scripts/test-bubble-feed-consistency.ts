import assert from "node:assert/strict";
import { eventDurationMs } from "../lib/timeline/playback";
import { commandFeedLineForEvent } from "../lib/ui/commandFeedWorldLine";
import type { GameEvent } from "../lib/world/worldTypes";

const faceLine: GameEvent = {
  id: "bubble_face",
  t: 0,
  type: "dialogue_bubble",
  actor: "face",
  text: "我进画廊了，贴着 Victor 侧活动。",
};

const duration = eventDurationMs(faceLine);
assert.ok(duration >= 3000 && duration <= 5000, `speech bubble should last 3-5s, got ${duration}`);

const feed = commandFeedLineForEvent(faceLine);
assert.equal(feed?.speaker, "Face");
assert.equal(feed?.text, faceLine.text);

console.log("test-bubble-feed-consistency: ok");
