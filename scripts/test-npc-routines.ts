import assert from "node:assert/strict";
import { runIdlePass } from "../lib/world/ambientWorld";
import { advanceNpcRoutines } from "../lib/world/npcRoutines";
import { executeToolChain } from "../lib/tools/executePlan";
import { tickWorld } from "../lib/world/tickWorld";
import { cloneWorld } from "../lib/world/initialWorld";

const w0 = cloneWorld();
advanceNpcRoutines(w0);
assert.ok(w0.npcs.guard.currentTask?.type === "lobby_watch");

const w1 = cloneWorld();
delete w1.npcs.guard.currentTask;
advanceNpcRoutines(w1);
assert.equal(
  (w1.npcs.guard.currentTask as { type: string } | undefined)?.type,
  "lobby_watch",
);

let w2 = cloneWorld();
for (let i = 0; i < 8; i++) {
  w2 = tickWorld(w2).world;
}
assert.equal(w2.npcs.waiter.location, "kitchen");

let wIdle = cloneWorld();
for (let i = 0; i < 12; i++) {
  wIdle = tickWorld(wIdle, { advanceAgents: false, playIdle: true }).world;
}
assert.equal(wIdle.npcs.waiter.location, "bar", "Play idle must not relocate NPCs");

const w3 = cloneWorld();
w3.objects.power_panel.state.powerStable = false;
advanceNpcRoutines(w3);
assert.ok(w3.npcs.guard.currentTask?.type?.includes("inspect_power"));
assert.equal(w3.npcs.guard.location, "kitchen", "power outage must move guard to kitchen immediately");
assert.equal(w3.npcs.guard.attentionMode, "investigating");

let wPowerIdle = cloneWorld();
wPowerIdle.objects.power_panel.state.powerStable = false;
advanceNpcRoutines(wPowerIdle, { playIdle: true });
assert.equal(wPowerIdle.npcs.guard.location, "kitchen", "reactive power move even during playIdle");
for (let i = 0; i < 3; i++) {
  wPowerIdle = runIdlePass(wPowerIdle).world;
}
assert.equal(
  wPowerIdle.npcs.guard.attentionMode,
  "investigating",
  "idle vignette must not reset guard during power outage",
);

let wPowerTool = cloneWorld();
const powerExec = executeToolChain(wPowerTool, [
  {
    toolId: "disable_power_panel",
    actor: "runner",
    targets: ["power_panel"],
    intent: "Cut power",
  },
]);
assert.equal(powerExec.world.npcs.guard.location, "kitchen");
assert.ok(
  powerExec.results[0]?.generatedEvents?.some(
    (e) => e.type === "npc_move" && e.actor === "guard" && e.to === "kitchen",
  ),
);


console.log("test-npc-routines: ok");
