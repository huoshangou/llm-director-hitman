/**
 * 复现 play-session.log 中 Steve 卡死路径（LLM + 续接话术）。
 */
import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { playerPlanLooksLikeContinuation } from "../lib/director/worldContinuation";
import { fieldAgentRepliesForToolResults } from "../lib/hacker/fieldAgentReply";
import { cloneWorld } from "../lib/world/initialWorld";
import { tickWorld } from "../lib/world/tickWorld";

async function main() {
  let w = cloneWorld();

  const t1 = await executeOperationSet(
    w,
    [
      { toolId: "prepare_poisoned_drink", actor: "runner", targets: ["wine_bottle"], intent: "p" },
      { toolId: "lure_with_private_meeting", actor: "face", targets: ["target"], intent: "l" },
    ],
    [],
    "",
    true,
  );
  w = t1.world;
  assert.equal(w.npcs.target.location, "balcony");
  assert.equal(w.objects.wine_bottle.state.poisoned, true);

  const stuckPhrase = "runner，你怎么没跟上，把酒送去阳台啊";
  assert.equal(playerPlanLooksLikeContinuation(stuckPhrase, w), true);

  const compiled = await compileDirectorPlan({
    playerPlan: stuckPhrase,
    world: w,
    selection: null,
    clientLlm: { providerId: "custom", apiKey: "sk-test", baseUrl: "http://127.0.0.1:9", model: "x" },
  });
  assert.equal(compiled.clarificationOnly, undefined, "续接不应进追问电台");
  assert.ok(
    compiled.validation?.executableChain.some((s) => s.toolId === "serve_poisoned_drink_on_balcony"),
    `expected serve executable, got ${compiled.validation?.executableChain.map((s) => s.toolId).join(",")}`,
  );

  const lureReply = fieldAgentRepliesForToolResults(t1.results, w).find((r) => r.speaker === "face");
  assert.ok(lureReply?.text.includes("阳台"), `lure reply should mention balcony progress: ${lureReply?.text}`);

  w = executeOperationSet(w, compiled.validation!.executableChain, [], stuckPhrase, true).world;
  assert.equal(w.objects.wine_bottle.state.poison_served, true);

  let spillW = cloneWorld();
  spillW = executeOperationSet(
    spillW,
    [
      {
        toolId: "spill_drink",
        actor: "runner",
        targets: ["wine_glass", "gallery"],
        intent: "spill",
      },
    ],
    [],
    "",
    true,
  ).world;
  assert.ok(spillW.locations.gallery.tags.includes("spill"));
  for (let i = 0; i < 24; i++) {
    spillW = tickWorld(spillW, { playIdle: true }).world;
  }
  assert.ok(
    !spillW.locations.gallery.tags.includes("spill"),
    "spill tag should clear after cleaner finishes",
  );

  console.log("test-user-log-replay: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
