import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { classifyTerminalState } from "../lib/convergence/terminalState";
import { cloneWorld } from "../lib/world/initialWorld";

async function main() {
  let w = cloneWorld();

  const compiled = await compileDirectorPlan({
    playerPlan: "Runner 去吧台把酒瓶下毒",
    world: w,
    selection: null,
    clientLlm: null,
  });
  assert.ok(compiled.validation?.executableChain?.length);
  let exec = executeOperationSet(w, compiled.validation!.executableChain, [], "test", true);
  w = exec.world;
  assert.equal(w.objects.wine_bottle.state.poisoned, true);

  const lure = await compileDirectorPlan({
    playerPlan: "伪造短信约 Victor 去阳台，Face 私密邀约",
    world: w,
    selection: null,
    clientLlm: null,
  });
  exec = executeOperationSet(w, lure.validation?.executableChain ?? [], [], "test", true);
  w = exec.world;

  for (let i = 0; i < 4; i++) {
    exec = executeOperationSet(w, [], [], "tick", true);
    w = exec.world;
  }

  assert.equal(w.npcs.target.location, "balcony", "target must reach balcony with playIdle tick");

  const serve = await compileDirectorPlan({
    playerPlan: "Face 在阳台递毒酒",
    world: w,
    selection: null,
    clientLlm: null,
  });
  const serveChain = serve.validation?.executableChain ?? [];
  assert.ok(serveChain.some((s) => s.toolId === "serve_poisoned_drink_on_balcony"));
  exec = executeOperationSet(w, serveChain, [], "test", true);
  w = exec.world;
  assert.equal(w.objects.wine_bottle.state.poison_served, true);

  const fin = await compileDirectorPlan({
    playerPlan: "让他在阳台倒下",
    world: w,
    selection: null,
    clientLlm: null,
  });
  exec = executeOperationSet(w, fin.validation?.executableChain ?? [], [], "test", true);
  w = exec.world;
  assert.equal(classifyTerminalState(w).id, "success_poison_balcony");

  console.log("test-poison-play-idle: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
