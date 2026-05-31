/**
 * 毒酒多 turn：备毒+引阳台 → 递杯 → 结算 → success_poison_balcony
 */
import assert from "node:assert/strict";
import { classifyTerminalState } from "../lib/convergence/terminalState";
import { compilePlanFromText } from "../lib/director/planStub";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { cloneWorld } from "../lib/world/initialWorld";

let w = cloneWorld();

function runPlan(text: string) {
  const compiled = compilePlanFromText(text, w, null);
  assert.equal(compiled.ok, true, `compile failed: ${text}`);
  if (!compiled.ok) return;
  const exec = executeOperationSet(w, compiled.chain, [], text, true);
  w = exec.world;
  assert.ok(exec.results.every((r) => r.status === "success"), `tool failed: ${text}`);
}

runPlan("在吧台酒里下毒，等 Victor 上阳台再递杯");
assert.equal(w.objects.wine_bottle.state.poisoned, true);
assert.equal(w.npcs.target.location, "balcony", "turn1 should converge target to balcony");

runPlan("递杯");
assert.equal(w.objects.wine_bottle.state.poison_served, true);

runPlan("结算");
assert.equal(w.objective.targetHandled, true);
assert.equal(classifyTerminalState(w).id, "success_poison_balcony");

console.log("test-poison-multi-turn: ok");
