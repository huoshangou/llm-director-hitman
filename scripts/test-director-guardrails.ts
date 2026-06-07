import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { buildDirectorPrompt } from "../lib/director/directorPrompt";
import { buildFieldAgentRadio } from "../lib/director/clarificationRadio";
import type { DirectorPlan } from "../lib/director/directorSchema";
import { cloneWorld } from "../lib/world/initialWorld";

function miniPlan(agentText: string): DirectorPlan {
  return {
    recognizedIntent: "blocked test",
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: "impossible",
    toolChain: [],
    unsupportedParts: [{ text: "blocked", reason: "test" }],
    fallbackSuggestions: [],
    riskSummary: [],
    playerFacingSummary: "Victor is already dead and police arrived.",
    agentComms: [{ agent: "face", text: agentText, tone: "blocked" }],
  };
}

async function main() {
  const promptText = buildDirectorPrompt({
    playerPlan: "runner 杀掉保安",
    selection: null,
    worldSummary: { tools: ["eliminate_threat", "decline_with_guidance"] },
    directorConstraints: {},
  })
    .map((m) => m.content)
    .join("\n");

  assert.ok(
    !promptText.includes("Kill / assassinate guard: no tool exists"),
    "prompt must not contain stale guard-kill instruction",
  );
  assert.ok(
    promptText.includes("eliminate_threat"),
    "prompt should acknowledge registered guard/guest threat handling",
  );
  assert.ok(
    promptText.includes(
      "Do not claim success, failure, death, police response, new NPCs, new exits, or new items",
    ),
    "prompt must forbid LLM-authored major facts",
  );

  const radio = await buildFieldAgentRadio({
    playerPlan: "直接解决目标",
    world: cloneWorld(),
    selection: null,
    plan: miniPlan("Victor is dead. Police are here."),
    validation: { errors: [], warnings: [], executableChain: [], rejected: [] },
  });

  assert.ok(radio.length > 0, "radio should still provide deterministic guidance");
  assert.ok(
    radio.every((line) => !line.text.includes("Victor is dead") && !line.text.includes("Police")),
    "clarification radio must not surface unsupported LLM facts",
  );

  const emptyChain = await compileDirectorPlan({
    playerPlan: "制造阳台事故",
    world: cloneWorld(),
    selection: { kind: "object", id: "balcony_rail" },
    clientLlm: null,
  });
  assert.equal(emptyChain.clarificationOnly, true);
  assert.ok(
    (emptyChain.fieldAgentRadio ?? []).length > 0,
    "empty executable plans should still provide deterministic radio guidance",
  );

  console.log("test-director-guardrails: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
