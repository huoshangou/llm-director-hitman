import assert from "node:assert/strict";
import { compilePlanFromText } from "../lib/director/planStub";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { operationSetSummaryLine } from "../lib/ui/operationSetSummary";
import { cloneWorld } from "../lib/world/initialWorld";
import { objectAtLocation } from "../lib/world/selectors";

const world = cloneWorld();

const compiled = compilePlanFromText("Runner 换上服务员衣服，Face 去接触目标", world, null);
assert.equal(compiled.ok, true);
if (!compiled.ok) throw new Error("compile failed");
assert.equal(compiled.chain.length, 2);

const exec = executeOperationSet(world, compiled.chain);
assert.equal(exec.results.length, 2);
assert.ok(
  exec.results.some((r) => r.request.toolId === "impersonate_staff" && r.request.actor === "runner"),
);
assert.ok(
  exec.results.some((r) => r.request.toolId === "lure_with_private_meeting" && r.request.actor === "face"),
);

const lure = exec.results.find((r) => r.request.toolId === "lure_with_private_meeting");
assert.ok(
  lure?.generatedEvents?.some((e) => e.type === "agent_move" && e.actor === "face"),
  "Face lure must emit face agent_move engagement",
);

const summary = operationSetSummaryLine(exec.operationSet);
assert.ok(summary.includes("Face"));
assert.ok(summary.includes("Runner"));

const cartWorld = cloneWorld();
const cartExec = executeOperationSet(cartWorld, [
  {
    toolId: "move_cleaning_cart",
    actor: "runner",
    targets: ["cleaning_cart", "gallery"],
    intent: "Block",
  },
]);
const cartLoc = objectAtLocation(cartExec.world, "cleaning_cart");
assert.equal(cartLoc, "gallery", "explicit gallery must win over cart at bar");

const staleSel = compilePlanFromText(
  "Runner，动手",
  world,
  { kind: "object", id: "cleaning_cart" },
);
assert.equal(staleSel.ok, false, "stale selection must not compile move_cleaning_cart");

const pronoun = compilePlanFromText("处理这个", world, {
  kind: "object",
  id: "cleaning_cart",
});
assert.equal(pronoun.ok, true);
if (pronoun.ok) assert.equal(pronoun.chain[0]!.toolId, "move_cleaning_cart");

console.log("test-parallel-operation: ok");
