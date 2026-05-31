import assert from "node:assert/strict";
import { openingRadioLines } from "../lib/hacker/hackerIntro";

const lines = openingRadioLines();

assert.equal(lines.length, 3, "opening radio should stay extremely short");
assert.equal(lines[0].agent, "face");
assert.equal(lines[1].agent, "runner");
assert.ok(lines.some((line) => line.text.includes("Victor")), "must name the target");
assert.ok(lines.some((line) => line.text.includes("阳台")), "must mention balcony mandate");
assert.ok(lines.some((line) => line.text.includes("点地图")), "must teach map selection");
assert.ok(lines.some((line) => line.text.includes("指令")), "must teach command input");
assert.ok(!lines.some((line) => line.text.includes("plan")), "opening radio should avoid plan wording");

for (const line of lines) {
  assert.ok(line.id.startsWith("intro_"), `stable id missing: ${line.id}`);
  assert.ok(line.text.length <= 56, `line too long: ${line.text}`);
}

console.log("test-hacker-intro: ok");
