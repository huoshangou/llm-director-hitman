import assert from "node:assert/strict";
import { recognizeIntentOutcome } from "../lib/intent/recognizeIntentOutcome";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
const worldBefore = structuredClone(world);

const poison = recognizeIntentOutcome("在吧台酒里下毒，阳台递给他", world, null);
assert.ok(poison);
assert.equal(poison!.status, "convertible");
if (poison!.status === "convertible") {
  assert.equal(poison.originalIntent, "poison_balcony");
  assert.equal(poison.convertedTo.toolId, "prepare_poisoned_drink");
}

const spoof = recognizeIntentOutcome("伪造短信约目标去阳台", world, null);
assert.ok(spoof);
assert.ok(spoof!.status === "executable" || spoof!.status === "convertible");
if (spoof!.status === "executable") {
  assert.equal(spoof!.toolRequest.toolId, "spoof_message");
}

const power = recognizeIntentOutcome("让 Runner 去配电箱断电", world, null);
assert.ok(power);
assert.ok(power!.status === "executable" || power!.status === "convertible");

const cart = recognizeIntentOutcome("推清洁车挡住保安视线", world, null);
assert.ok(cart);
assert.ok(cart!.status === "executable" || cart!.status === "convertible");

const directTarget = recognizeIntentOutcome("在画廊直接干掉目标", world, null);
assert.ok(directTarget);
assert.equal(directTarget!.status, "convertible");
if (directTarget!.status === "convertible") {
  assert.equal(directTarget.convertedTo.toolId, "decline_with_guidance");
}

const unknown = recognizeIntentOutcome("随便说点什么无关的", world, null);
assert.equal(unknown, null);

assert.deepEqual(world, worldBefore, "recognition must not mutate WorldState");

console.log("test-intent-outcome: ok");
