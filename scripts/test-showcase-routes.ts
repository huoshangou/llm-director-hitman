import assert from "node:assert/strict";
import { createSession, executeSessionStep } from "../lib/bridge/sandboxSession";
import { getShowcaseRoute, showcaseRoutes } from "../lib/routes/showcaseRoutes";
import { classifyTerminalState } from "../lib/convergence/terminalState";

const ROUTE_IDS = ["route_a", "route_b", "route_c"] as const;

function runRoute(routeId: (typeof ROUTE_IDS)[number]) {
  const route = getShowcaseRoute(routeId)!;
  let session = createSession(routeId);
  let steps = 0;
  const maxSteps = route.steps.length + 2;

  while (!session.finished && steps < maxSteps) {
    const res = executeSessionStep(session);
    session = res.session;
    steps += 1;

    if (steps === 1 && routeId === "route_b") {
      assert.equal(session.world.objects.power_panel.state.powerStable, false);
      assert.equal(session.world.npcs.guard.attentionMode, "investigating");
    }
    if (steps === 1 && routeId === "route_a") {
      assert.ok(
        session.world.npcs.target.beliefs.some((b) => b.predicate.includes("private_meeting")),
      );
    }
  }

  assert.ok(session.finished, `${routeId} should finish`);
  assert.equal(session.world.npcs.target.location, "balcony");
  assert.equal(session.world.objective.targetHandled, true);
  const terminal = classifyTerminalState(session.world);
  assert.ok(
    terminal.id === "success_clean_accident" || terminal.id === "success_messy_accident",
    `${routeId} terminal=${terminal.id}`,
  );
  console.log(`  ${routeId}: ${steps} steps → ${terminal.label}`);
}

assert.equal(showcaseRoutes.length, 3, "expect A/B/C showcase routes");

for (const id of ROUTE_IDS) {
  runRoute(id);
}

console.log("test-showcase-routes: ok");
