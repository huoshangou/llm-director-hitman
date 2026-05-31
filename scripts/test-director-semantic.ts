import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { semanticValidatePlan } from "../lib/director/semanticValidate";
import type { DirectorPlan } from "../lib/director/directorSchema";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";
import { executeToolChain } from "../lib/tools/executePlan";

function miniPlan(chain: ToolUseRequest[]): DirectorPlan {
  return {
    recognizedIntent: "test",
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: chain.length ? "medium" : "impossible",
    toolChain: chain,
    unsupportedParts: [],
    fallbackSuggestions: [],
    riskSummary: [],
    playerFacingSummary: "",
    agentComms: [],
  };
}

async function main() {
  const world = cloneWorld();

  const galleryMismatch = semanticValidatePlan(
    miniPlan([
      {
        toolId: "redirect_guard_attention",
        actor: "face",
        targets: ["guard"],
        intent: "distract",
      },
    ]),
    "face趁乱混进画廊",
    world,
  );
  assert.equal(galleryMismatch?.code, "SEMANTIC_MISMATCH");

  const killMismatch = semanticValidatePlan(
    miniPlan([
      {
        toolId: "disable_power_panel",
        actor: "runner",
        targets: ["power_panel"],
        intent: "power",
      },
    ]),
    "runner趁机杀了保安",
    world,
  );
  assert.equal(killMismatch?.code, "SEMANTIC_MISMATCH");

  const stub = await compileDirectorPlan({
    playerPlan: "runner，破坏供电；face，趁乱混到画廊里去",
    world,
    selection: null,
    clientLlm: null,
  });
  assert.equal(stub.source, "stub");
  assert.ok(stub.validation?.executableChain.some((r) => r.toolId === "infiltrate_gallery"));
  assert.ok(stub.validation?.executableChain.some((r) => r.toolId === "disable_power_panel"));

  const killStub = await compileDirectorPlan({
    playerPlan: "runner趁机杀了保安",
    world,
    selection: null,
    clientLlm: null,
  });
  assert.notEqual(killStub.clarificationOnly, true);
  assert.ok(
    killStub.validation?.executableChain.some((r) => r.toolId === "eliminate_threat"),
    "guard lethal should compile eliminate_threat",
  );

  const blocked = executeToolChain(cloneWorld(), [
    {
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "infiltrate",
    },
  ]);
  assert.equal(blocked.results[0]?.status, "failed");

  const afterPower = executeToolChain(cloneWorld(), [
    {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "power",
    },
  ]);
  const w1 = afterPower.world;
  const infiltrate = executeToolChain(w1, [
    {
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "infiltrate",
    },
  ]);
  assert.equal(infiltrate.results[0]?.status, "success");
  assert.equal(infiltrate.world.agents.face.location, "gallery");
  const moves = infiltrate.results[0]?.generatedEvents?.filter(
    (e) => e.type === "agent_move" && e.actor === "face",
  );
  assert.ok(moves && moves.length >= 1);

  console.log("test-director-semantic: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
