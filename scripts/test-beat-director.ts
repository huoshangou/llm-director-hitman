import assert from "node:assert/strict";
import { createSession, executeSessionStep } from "../lib/bridge/sandboxSession";
import { getActsForRoute } from "../lib/beats/routeActs";

function runRoute(routeId: string) {
  let session = createSession(routeId);
  const acts = getActsForRoute(routeId);
  let steps = 0;
  const maxSteps = 20;

  while (!session.finished && steps < maxSteps) {
    const beforeAct = session.director.activeBeat?.act.id;
    const res = executeSessionStep(session);
    session = res.session;
    steps += 1;
    assert.ok(res.lines.length >= 2, `step ${steps + 1} expected narrative lines`);
    void beforeAct;
  }

  assert.ok(session.finished, `${routeId} should finish`);
  assert.equal(session.world.npcs.target.location, "balcony");
  console.log(`${routeId}: ${steps} steps, acts=${acts.length}, tension=${Math.round(session.director.tension)}`);
}

for (const id of ["route_a", "route_b", "route_c"] as const) {
  runRoute(id);
}
console.log("beat-director: OK");
