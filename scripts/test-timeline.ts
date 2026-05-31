import { cloneWorld } from "../lib/world/initialWorld";
import { showcaseRoutes } from "../lib/routes/showcaseRoutes";
import { runTurn } from "../lib/play/runTurn";
import { validateToolRequest } from "../lib/tools/checkPreconditions";
import { buildTurnTimeline } from "../lib/timeline/buildTimeline";
import { overlaysFromWorld } from "../lib/timeline/eventTemplates";

let failed = 0;

const world = cloneWorld();
const empty = buildTurnTimeline([], [], 0);
if (empty.length !== 0) {
  console.error("FAIL empty turn timeline should be empty");
  failed += 1;
}

for (const route of showcaseRoutes) {
  let w = cloneWorld();
  for (const step of route.steps) {
    const v = validateToolRequest(step.tool, w);
    if (!v.ok) {
      console.error(`FAIL ${route.id} ${step.label}:`, v.reasons);
      failed += 1;
      break;
    }
    const turn = runTurn(w, [step.tool], "step");
    if (turn.turnTimeline.length === 0) {
      console.error(`FAIL ${route.id} ${step.label}: empty turnTimeline`);
      failed += 1;
      break;
    }
    w = turn.world;
  }
  const overlays = overlaysFromWorld(w);
  if (!w.objective.targetHandled) {
    console.error(`FAIL ${route.id}: no convergence`);
    failed += 1;
  } else if (overlays.length < 2) {
    console.error(`FAIL ${route.id}: expected overlays, got`, overlays.length);
    failed += 1;
  } else {
    console.log(`OK ${route.id} timeline+overlays (${overlays.length})`);
  }
}

if (failed > 0) process.exit(1);
