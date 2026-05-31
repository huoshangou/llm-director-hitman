import { cloneWorld } from "../lib/world/initialWorld";
import { manualTestPlans } from "../lib/routes/manualTestPlans";
import { showcaseRoutes } from "../lib/routes/showcaseRoutes";
import { ALL_TOOL_IDS } from "../lib/tools/toolTypes";
import { toolRegistry } from "../lib/tools/toolRegistry";
import { validateToolChain, validateToolRequest } from "../lib/tools/checkPreconditions";
import { executeToolChain } from "../lib/tools/executePlan";
import { classifyTerminalState } from "../lib/convergence/terminalState";
import { isSightlineClear } from "../lib/world/selectors";
import { assessFaceCredibility } from "../lib/world/faceCredibility";

let failed = 0;

for (const id of ALL_TOOL_IDS) {
  if (!toolRegistry[id]) {
    console.error(`FAIL missing registry entry: ${id}`);
    failed += 1;
  }
}

for (const plan of manualTestPlans) {
  const base = cloneWorld();
  const validation = validateToolChain(plan.chain, base);
  const exec = executeToolChain(base, validation.executableChain, "step");
  if (exec.results[0]?.status === "blocked") {
    console.error(`FAIL ${plan.id}:`, exec.results[0].reason);
    failed += 1;
    continue;
  }
  console.log(`OK ${plan.id} -> turn ${exec.world.turn}`);
}

for (const route of showcaseRoutes) {
  let world = cloneWorld();
  for (let i = 0; i < route.steps.length; i++) {
    const step = route.steps[i];
    const validation = validateToolRequest(step.tool, world);
    if (!validation.ok) {
      console.error(`FAIL ${route.id} step ${i + 1} (${step.label}):`, validation.reasons);
      failed += 1;
      break;
    }
    const exec = executeToolChain(world, [step.tool], "step");
    if (exec.results[0]?.status === "blocked") {
      console.error(`FAIL ${route.id} step ${i + 1} blocked:`, exec.results[0].reason);
      failed += 1;
      break;
    }
    world = exec.world;
  }

  const terminal = classifyTerminalState(world);
  if (!world.objective.targetHandled) {
    console.error(`FAIL ${route.id}: did not converge`, terminal.id);
    failed += 1;
  } else {
    console.log(`OK ${route.id} -> ${terminal.label} turn ${world.turn}`);
  }
}

if (failed > 0) process.exit(1);

// Batch B prop causality smoke
{
  let w = cloneWorld();
  const cart = executeToolChain(w, [
    {
      toolId: "move_cleaning_cart",
      actor: "runner",
      targets: ["cleaning_cart", "gallery"],
      intent: "Block sightline",
    },
  ], "step");
  if (!isSightlineClear(cart.world, "balcony")) {
    console.error("FAIL prop-causality: cart should clear balcony sightline");
    process.exit(1);
  }
  w = cloneWorld();
  w.agents.face.coverIdentity = "vip_liaison";
  if (assessFaceCredibility(w).tier !== "partial") {
    console.error("FAIL prop-causality: vip_liaison alone should be partial credibility");
    process.exit(1);
  }
  w.npcs.target.beliefs.push({
    id: "b1",
    subject: "message",
    predicate: "private_meeting_on_balcony",
    confidence: 75,
    source: "spoof",
  });
  if (assessFaceCredibility(w).tier !== "strong") {
    console.error("FAIL prop-causality: vip_liaison + phone belief should be strong");
    process.exit(1);
  }
  console.log("OK prop-causality smoke");
}
