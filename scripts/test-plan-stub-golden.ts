/**
 * 路线金句 → planStub 第一步工具（与 test-director-golden 共用真源）。
 */
import assert from "node:assert/strict";
import { ROUTE_GOLDEN_PLANS } from "../lib/director/routeGoldenPlans";
import { compilePlanFromText } from "../lib/director/planStub";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();

for (const c of ROUTE_GOLDEN_PLANS) {
  const res = compilePlanFromText(c.text, world, c.selection ?? null);
  assert.equal(res.ok, true, `${c.name} should compile: ${c.text}`);
  if (res.ok) {
    assert.equal(res.chain[0]?.toolId, c.toolId, `${c.name} tool mismatch`);
    if (c.actor) assert.equal(res.chain[0]?.actor, c.actor, `${c.name} actor mismatch`);
  }
}

console.log(`test-plan-stub-golden: ok (${ROUTE_GOLDEN_PLANS.length} cases)`);
