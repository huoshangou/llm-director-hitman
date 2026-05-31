import assert from "node:assert/strict";
import {
  MISSION_BRIEF_LINES,
  MISSION_OPS_LINE,
  MISSION_TARGET_NAME,
} from "../lib/mission/missionFrame";

assert.ok(MISSION_TARGET_NAME.includes("Victor"));
assert.ok(MISSION_OPS_LINE.includes("阳台"));
assert.equal(MISSION_BRIEF_LINES.length, 6);
assert.ok(MISSION_BRIEF_LINES.some((l) => l.includes("Victor")));
assert.ok(MISSION_BRIEF_LINES.some((l) => l.includes("阳台")));

console.log("test-mission-frame: ok");
