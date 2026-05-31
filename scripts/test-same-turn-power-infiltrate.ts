/**
 * 同 turn：配电后 Face 应能 infiltrate（多 wave frontier）。
 */
import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { prepareDirectorPlan } from "../lib/director/planSanitize";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { validateDirectorPlan } from "../lib/director/validateDirectorPlan";
import { cloneWorld } from "../lib/world/initialWorld";

const planText =
  "runner，把配电箱破坏掉，然后趁乱去吧台拿酒；face，电闸一拉你就混进画廊，和目标寒暄。我已经给他的手机植入了虚假的访客信息";

let w = cloneWorld();
const llmOnlyRunner = {
  toolChain: [
    {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "power",
    },
  ],
  unsupportedParts: [],
  feasibility: "medium",
} as const;

const prepared = prepareDirectorPlan(
  { ...llmOnlyRunner, recognizedIntent: planText } as never,
  planText,
  w,
  null,
);
assert.ok(
  prepared.toolChain.some((s) => s.toolId === "infiltrate_gallery"),
  `missing infiltrate: ${prepared.toolChain.map((s) => s.toolId).join(",")}`,
);
assert.ok(
  prepared.toolChain.some((s) => s.toolId === "spoof_message"),
  "missing spoof from 植入虚假访客",
);

const v = validateDirectorPlan(prepared, w);
const exec = executeOperationSet(w, prepared.toolChain, v.rejected, planText, true);
w = exec.world;

const tools = exec.results.map((r) => r.request.toolId);
assert.ok(tools.includes("disable_power_panel"), `results: ${tools.join(",")}`);
assert.ok(tools.includes("infiltrate_gallery"), `face should infiltrate same turn: ${tools.join(",")}`);
assert.equal(exec.results.find((r) => r.request.toolId === "infiltrate_gallery")?.status, "success");

async function main() {
  const full = await compileDirectorPlan({
    playerPlan: planText,
    world: cloneWorld(),
    selection: null,
    clientLlm: null,
  });
  assert.ok(full.plan);
  const fullValidation = validateDirectorPlan(full.plan, cloneWorld());
  const fullExec = executeOperationSet(
    cloneWorld(),
    full.plan.toolChain,
    fullValidation.rejected,
    planText,
    true,
  );
  const fullTools = fullExec.results.map((r) => r.request.toolId);
  assert.ok(fullTools.includes("disable_power_panel"), `full results: ${fullTools.join(",")}`);
  assert.ok(fullTools.includes("prepare_poisoned_drink"), `full results: ${fullTools.join(",")}`);
  assert.ok(
    fullTools.indexOf("disable_power_panel") < fullTools.indexOf("prepare_poisoned_drink"),
    `power must precede bar prep: ${fullTools.join(",")}`,
  );

  console.log("test-same-turn-power-infiltrate: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
