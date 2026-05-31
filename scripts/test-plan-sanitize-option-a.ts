import assert from "node:assert/strict";
import { prepareDirectorPlan } from "../lib/director/planSanitize";
import { semanticValidatePlan } from "../lib/director/semanticValidate";
import type { DirectorPlan } from "../lib/director/directorSchema";
import { buildOperationSet } from "../lib/operation/buildOperationSet";
import { cloneWorld } from "../lib/world/initialWorld";
import { executeToolChain } from "../lib/tools/executePlan";

const comboText =
  "runner，破坏配电箱，face，等保安离开走廊后混到画廊去";

function llmPartialPlan(): DirectorPlan {
  return {
    recognizedIntent: comboText,
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: "impossible",
    toolChain: [
      {
        toolId: "disable_power_panel",
        actor: "runner",
        targets: ["power_panel"],
        intent: "power",
      },
    ],
    unsupportedParts: [
      {
        text: "face 等 guard 离开后再混画廊",
        reason: "cannot schedule wait",
      },
    ],
    fallbackSuggestions: [],
    riskSummary: [],
    playerFacingSummary: "",
    agentComms: [],
  };
}

function main() {
  const world = cloneWorld();
  const prepared = prepareDirectorPlan(llmPartialPlan(), comboText, world, null);
  assert.ok(prepared.toolChain.some((r) => r.toolId === "disable_power_panel"));
  assert.ok(prepared.toolChain.some((r) => r.toolId === "infiltrate_gallery"));
  assert.equal(semanticValidatePlan(prepared, comboText, world), null);

  const op = buildOperationSet(prepared.toolChain, [], "llm", comboText);
  assert.equal(op.actions[0]?.request.toolId, "disable_power_panel");
  assert.equal(op.actions[1]?.request.toolId, "infiltrate_gallery");

  const exec = executeToolChain(world, prepared.toolChain, "step", { playerPlan: comboText });
  assert.equal(exec.results[0]?.request.toolId, "disable_power_panel");
  assert.equal(exec.results[1]?.request.toolId, "infiltrate_gallery");
  assert.equal(exec.results[1]?.status, "success");
  assert.equal(exec.world.agents.face.location, "gallery");

  for (const onlyTool of ["impersonate_staff", "disable_power_panel"] as const) {
    const servicePowerText = "换好服务生衣服，切断电源，准备行动";
    const llmSingleRunner: DirectorPlan = {
      recognizedIntent: servicePowerText,
      planStyle: "improvised",
      constraints: [],
      assumptions: [],
      feasibility: "medium",
      toolChain: [
        {
          toolId: onlyTool,
          actor: "runner",
          targets: [onlyTool === "impersonate_staff" ? "waiter_uniform" : "power_panel"],
          intent: onlyTool,
        },
      ],
      unsupportedParts: [],
      fallbackSuggestions: [],
      riskSummary: [],
      playerFacingSummary: "",
      agentComms: [],
    };

    const completed = prepareDirectorPlan(llmSingleRunner, servicePowerText, world, null);
    const toolIds = completed.toolChain.map((r) => r.toolId);
    assert.ok(toolIds.includes("impersonate_staff"), `${onlyTool} case missing disguise`);
    assert.ok(toolIds.includes("disable_power_panel"), `${onlyTool} case missing power`);
    assert.equal(new Set(completed.toolChain.map((r) => `${r.actor}:${r.toolId}`)).size, completed.toolChain.length);
  }

  console.log("test-plan-sanitize-option-a: ok");
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
