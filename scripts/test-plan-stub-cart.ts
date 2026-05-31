import assert from "node:assert/strict";
import { buildFrontierOperationSet } from "../lib/operation/buildOperationSet";
import { compilePlanFromText } from "../lib/director/planStub";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
const text = "推清洁车进画廊，服务员伪装混进去清扫";
const r = compilePlanFromText(text, world, null);
assert.equal(r.ok, true);
if (r.ok) {
  assert.ok(r.chain.some((s) => s.toolId === "move_cleaning_cart"));
  assert.ok(r.chain.some((s) => s.toolId === "impersonate_staff"));
  assert.ok(r.chain.some((s) => s.toolId === "redirect_guard_attention"));
  assert.ok(r.chain.some((s) => s.toolId === "disable_power_panel"));
  assert.ok(r.chain.some((s) => s.toolId === "infiltrate_gallery"));

  const op = buildFrontierOperationSet(r.chain, [], "llm", text, world);
  const tools = op.actions.map((a) => a.request.toolId);
  assert.ok(tools.includes("redirect_guard_attention"), `turn1 face: ${tools.join(",")}`);
  assert.ok(tools.includes("disable_power_panel"), `turn1 runner: ${tools.join(",")}`);
}

console.log("test-plan-stub-cart: ok");
