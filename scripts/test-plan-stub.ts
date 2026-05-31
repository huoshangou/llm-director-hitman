import assert from "node:assert/strict";
import { compilePlanFromText } from "../lib/director/planStub";
import { hintForObject } from "../lib/ui/hintForObject";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();

const spoof = compilePlanFromText("先伪造一条阳台私密邀约短信", world, null);
assert.equal(spoof.ok, true);
if (spoof.ok) assert.equal(spoof.chain[0].toolId, "spoof_message");

const terminal = world.objects.guest_list_terminal;
const hints = hintForObject(terminal);
assert.ok(hints.some((h) => h.toolId === "modify_guest_list"));

const sel = compilePlanFromText("", world, { kind: "object", id: "guest_list_terminal" });
assert.equal(sel.ok, true);

const pronoun = compilePlanFromText("处理这个", world, {
  kind: "object",
  id: "guest_list_terminal",
});
assert.equal(pronoun.ok, true);
if (pronoun.ok) assert.equal(pronoun.chain[0].toolId, "modify_guest_list");

const phoneHack = compilePlanFromText("骇入目标手机发阳台邀约", world, null);
assert.equal(phoneHack.ok, true);
if (phoneHack.ok) assert.equal(phoneHack.chain[0].toolId, "spoof_message");

const targetSel = compilePlanFromText("给目标发消息约他去阳台", world, { kind: "npc", id: "target" });
assert.equal(targetSel.ok, true);
if (targetSel.ok) assert.equal(targetSel.chain[0].toolId, "spoof_message");

const targetPronoun = compilePlanFromText("处理这个", world, { kind: "npc", id: "target" });
assert.equal(targetPronoun.ok, true);
if (targetPronoun.ok) assert.equal(targetPronoun.chain[0].toolId, "spoof_message");

const parallel = compilePlanFromText("Runner 换上服务员衣服，Face 去接触目标", world, null);
assert.equal(parallel.ok, true);
if (parallel.ok) {
  assert.equal(parallel.chain.length, 2);
  assert.ok(parallel.chain.some((s) => s.actor === "runner" && s.toolId === "impersonate_staff"));
  assert.ok(parallel.chain.some((s) => s.actor === "face" && s.toolId === "lure_with_private_meeting"));
}

const staleCart = compilePlanFromText("Runner，动手", world, {
  kind: "object",
  id: "cleaning_cart",
});
assert.equal(staleCart.ok, false);

const poisonPrep = compilePlanFromText("Runner 去吧台把酒瓶下毒", world, null);
assert.equal(poisonPrep.ok, true);
if (poisonPrep.ok) {
  assert.equal(poisonPrep.chain[0]!.toolId, "prepare_poisoned_drink");
}

const poisonMulti = compilePlanFromText(
  "吧台备毒，引 Victor 上阳台，递毒酒，让他在阳台倒下",
  world,
  null,
);
assert.equal(poisonMulti.ok, true);
if (poisonMulti.ok) {
  assert.ok(poisonMulti.chain.some((s) => s.toolId === "prepare_poisoned_drink"));
  assert.ok(poisonMulti.chain.some((s) => s.toolId === "serve_poisoned_drink_on_balcony"));
  assert.ok(poisonMulti.chain.some((s) => s.toolId === "resolve_poison_on_balcony"));
}

console.log("test-plan-stub: ok");
