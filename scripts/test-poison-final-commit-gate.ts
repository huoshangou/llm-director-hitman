import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { compilePlanFromText } from "../lib/director/planStub";
import { cloneWorld } from "../lib/world/initialWorld";

async function main() {
  const readyToServe = cloneWorld();
  readyToServe.objects.wine_bottle.state = {
    ...readyToServe.objects.wine_bottle.state,
    poisoned: true,
    poison_served: false,
  };
  readyToServe.npcs.target.location = "balcony";
  readyToServe.agents.runner.location = "bar";
  readyToServe.agents.runner.coverIdentity = "waiter";

  const runnerServe = await compileDirectorPlan({
    playerPlan: "runner，现在目标已经在阳台了，借着送酒的名义，一路往阳台走，送给目标",
    world: readyToServe,
    selection: null,
    clientLlm: null,
  });
  assert.ok(runnerServe.plan);
  const serve = runnerServe.plan.toolChain.find((s) => s.toolId === "serve_poisoned_drink_on_balcony");
  assert.equal(serve?.actor, "runner", "Runner delivery request should stay with Runner when possible");

  const served = structuredClone(readyToServe);
  served.objects.wine_bottle.state.poison_served = true;
  served.objects.power_panel.state.powerStable = false;
  served.objects.hallway_camera.state.powerMode = "backup";
  served.objects.hallway_camera.state.active = true;

  const cameraPlan = compilePlanFromText(
    "我压制走廊摄像头录像，切断备用供电记录",
    served,
    null,
  );
  assert.ok(cameraPlan.ok);
  assert.ok(cameraPlan.chain.some((s) => s.toolId === "suppress_camera_record"));
  assert.ok(
    !cameraPlan.chain.some((s) => s.toolId === "resolve_poison_on_balcony"),
    "camera prep must not auto-resolve poison without explicit final confirmation",
  );

  const finalPlan = compilePlanFromText("确认动手，让他毒发倒下", served, null);
  assert.ok(finalPlan.ok);
  assert.ok(finalPlan.chain.some((s) => s.toolId === "resolve_poison_on_balcony"));

  console.log("test-poison-final-commit-gate: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
