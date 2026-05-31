import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { parseLethalIntent } from "../lib/director/lethalPolicy";
import { semanticValidatePlan } from "../lib/director/semanticValidate";
import type { DirectorPlan } from "../lib/director/directorSchema";
import { classifyTerminalState } from "../lib/convergence/terminalState";
import { recognizeIntentOutcome } from "../lib/intent/recognizeIntentOutcome";
import { executeToolChain } from "../lib/tools/executePlan";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";
import { syncPresenceLists } from "../lib/world/selectors";

function miniPlan(chain: ToolUseRequest[]): DirectorPlan {
  return {
    recognizedIntent: "test",
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: "medium",
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

  assert.equal(parseLethalIntent("runner趁机杀了保安")?.victim, "guard");
  assert.equal(parseLethalIntent("在画廊直接干掉 Victor")?.victim, "target");

  const substituteBreak = semanticValidatePlan(
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
  assert.equal(substituteBreak?.code, "SEMANTIC_MISMATCH");

  const guardCompile = await compileDirectorPlan({
    playerPlan: "runner趁机杀了保安",
    world,
    selection: null,
    clientLlm: null,
  });
  assert.notEqual(guardCompile.clarificationOnly, true);
  assert.ok(
    guardCompile.validation?.executableChain.some((r) => r.toolId === "eliminate_threat"),
    "guard kill should compile eliminate_threat",
  );

  const wKitchen = cloneWorld();
  wKitchen.objects.power_panel.state.powerStable = false;
  wKitchen.npcs.guard.location = "kitchen";
  wKitchen.npcs.guard.attentionMode = "investigating";
  syncPresenceLists(wKitchen);

  const guardExec = executeToolChain(wKitchen, [
    {
      toolId: "eliminate_threat",
      actor: "runner",
      targets: ["guard"],
      intent: "Clear guard in kitchen during outage",
    },
  ]);
  assert.equal(guardExec.results[0]?.status, "success");
  assert.equal(guardExec.world.npcs.guard.vitality, "removed");
  assert.equal(guardExec.world.turn, 1);

  const wLobby = cloneWorld();
  wLobby.agents.runner.location = "lobby";
  wLobby.npcs.guard.location = "kitchen";
  wLobby.npcs.guard.attentionMode = "investigating";
  syncPresenceLists(wLobby);
  const guestExec = executeToolChain(wLobby, [
    {
      toolId: "eliminate_threat",
      actor: "runner",
      targets: ["guest"],
      intent: "Kill guest",
    },
  ]);
  assert.equal(guestExec.results[0]?.status, "success");
  assert.equal(guestExec.world.objective.style, "collateral");
  assert.equal(classifyTerminalState(guestExec.world).id, "failed_collateral");

  const declineExec = executeToolChain(cloneWorld(), [
    {
      toolId: "decline_with_guidance",
      actor: "face",
      targets: ["target"],
      intent: "Decline direct kill",
      params: { guidanceKey: "target_needs_balcony_setup" },
    },
  ]);
  assert.equal(declineExec.results[0]?.status, "blocked");
  assert.equal(declineExec.world.turn, 1);

  const victorIntent = recognizeIntentOutcome("在画廊直接干掉 Victor", world, null);
  assert.equal(victorIntent?.status, "convertible");
  assert.equal(victorIntent?.convertedTo?.toolId, "decline_with_guidance");

  const victorCompile = await compileDirectorPlan({
    playerPlan: "在画廊直接干掉 Victor",
    world,
    selection: null,
    clientLlm: null,
  });
  assert.ok(
    victorCompile.validation?.executableChain.some((r) => r.toolId === "decline_with_guidance"),
  );

  console.log("test-lethal-tools: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
