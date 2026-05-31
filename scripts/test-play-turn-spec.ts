/**
 * 契约测试：与 docs/03-system-design/play-turn-execution-spec.md 对齐。
 */
import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { prepareDirectorPlan } from "../lib/director/planSanitize";
import { buildOperationSet } from "../lib/operation/buildOperationSet";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { executeToolChain } from "../lib/tools/executePlan";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { validateDirectorPlan } from "../lib/director/validateDirectorPlan";
import { cloneWorld } from "../lib/world/initialWorld";
import { tickWorld } from "../lib/world/tickWorld";
import { getSceneSignals } from "../lib/world/sceneSignals";

function assertContract(cond: boolean, id: string, detail?: string) {
  assert.ok(cond, `${id}: ${detail ?? "failed"}`);
}

async function main() {
// C3 + C2: multi-wave power → infiltrate
{
  const planText =
    "runner配电；face混进画廊和目标寒暄。已植入虚假访客信息";
  const llmOnly = {
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
  const w = cloneWorld();
  const prepared = prepareDirectorPlan(
    { ...llmOnly, recognizedIntent: planText } as never,
    planText,
    w,
    null,
  );
  assertContract(
    prepared.toolChain.some((s) => s.toolId === "infiltrate_gallery"),
    "C6",
    "augment missing face",
  );
  assertContract(
    prepared.toolChain.some((s) => s.toolId === "spoof_message"),
    "C7",
    "augment spoof",
  );
  const exec = executeOperationSet(w, prepared.toolChain, [], planText, true);
  const tools = exec.results.map((r) => r.request.toolId);
  assertContract(tools.includes("disable_power_panel"), "C3", tools.join());
  assertContract(tools.includes("infiltrate_gallery"), "C3", tools.join());
}

// C1: executeToolChain(planChain) runs multi-wave (via executeOperationSet)
{
  let w = cloneWorld();
  const planChain: ToolUseRequest[] = [
    {
      toolId: "disable_power_panel" as const,
      actor: "runner" as const,
      targets: ["power_panel"],
      intent: "p",
    },
    {
      toolId: "infiltrate_gallery" as const,
      actor: "face" as const,
      targets: ["gallery"],
      intent: "i",
    },
  ];
  const turn = executeToolChain(w, planChain, "step", { tickPlayIdle: true });
  assertContract(turn.results.length >= 2, "C1", `results=${turn.results.length}`);
  assertContract(
    turn.results.some((r) => r.request.toolId === "infiltrate_gallery" && r.status === "success"),
    "C1",
    "infiltrate same turn",
  );
}

// C8: continuation before LLM
{
  let w = cloneWorld();
  w = executeOperationSet(
    w,
    [
      {
        toolId: "prepare_poisoned_drink",
        actor: "runner",
        targets: ["wine_bottle"],
        intent: "p",
      },
      {
        toolId: "lure_with_private_meeting",
        actor: "face",
        targets: ["target"],
        intent: "l",
      },
    ] satisfies ToolUseRequest[],
    [],
    "",
    true,
  ).world;
  assert.equal(w.npcs.target.location, "balcony");

  const compiled = await compileDirectorPlan({
    playerPlan: "runner把酒送去阳台",
    world: w,
    selection: null,
    clientLlm: { providerId: "custom", apiKey: "sk-test", baseUrl: "http://127.0.0.1:9", model: "x" },
  });
  assertContract(!compiled.clarificationOnly, "C8");
  assertContract(
    compiled.validation?.executableChain.some((s) => s.toolId === "serve_poisoned_drink_on_balcony") ??
      false,
    "C8",
    "serve executable",
  );
}

// C4: conflicts when same actor two steps same wave
{
  const w = cloneWorld();
  const chain: ToolUseRequest[] = [
    {
      toolId: "redirect_guard_attention",
      actor: "face",
      targets: ["guard"],
      intent: "r",
    },
    {
      toolId: "lure_with_private_meeting",
      actor: "face",
      targets: ["target"],
      intent: "l",
    },
  ];
  const op = buildOperationSet(chain, [], "llm", "引开保安并邀约", w);
  assertContract(op.conflicts.some((c) => c.actor === "face"), "C4");
  assertContract(op.actions.length === 1, "C4", "one face step per wave");
}

// Spill cleanup (demo § 必过 4)
{
  let spillW = cloneWorld();
  spillW = executeOperationSet(
    spillW,
    [
      {
        toolId: "spill_drink",
        actor: "runner",
        targets: ["wine_glass", "bar"],
        intent: "s",
      },
    ] satisfies ToolUseRequest[],
    [],
    "",
    true,
  ).world;
  const loc =
    spillW.locations.bar.tags.includes("spill") ? "bar" : spillW.locations.gallery.tags.includes("spill") ? "gallery" : null;
  assert.ok(loc, "spill tag should exist after spill");
  for (let i = 0; i < 25; i++) {
    spillW = tickWorld(spillW, { playIdle: true }).world;
  }
  assertContract(getSceneSignals(spillW).spillAt === null, "spill-cleanup");
}

// OPERATION preview vs execute: multi-wave may execute more than first opSet preview
{
  const w = cloneWorld();
  const chain: ToolUseRequest[] = [
    {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "p",
    },
    {
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "i",
    },
  ];
  const preview = buildOperationSet(chain, [], "llm", "", w);
  const exec = executeOperationSet(w, chain, [], "", true);
  assertContract(preview.actions.length <= exec.results.length, "C3-preview");
}

console.log("test-play-turn-spec: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
