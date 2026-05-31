import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { cloneWorld } from "../lib/world/initialWorld";
import { tickWorld } from "../lib/world/tickWorld";
import type { ToolUseRequest } from "../lib/tools/toolTypes";

let w = cloneWorld();
const log: string[] = [];

function step(label: string, chain: ToolUseRequest[]) {
  const exec = executeOperationSet(w, chain, [], label, true);
  w = exec.world;
  log.push(
    `${label}: op=${exec.operationSet.actions.map((a) => a.request.toolId).join("+")} results=${exec.results.map((r) => r.status).join(",")} target@${w.npcs.target.location} poison=${w.objects.wine_bottle.state.poisoned}`,
  );
}

step("T1-prepare+lure", [
  { toolId: "prepare_poisoned_drink", actor: "runner", targets: ["wine_bottle"], intent: "p" },
  { toolId: "lure_with_private_meeting", actor: "face", targets: ["target"], intent: "l" },
]);

step("T2-spoof", [
  { toolId: "spoof_message", actor: "player", targets: ["target", "target_phone"], intent: "s" },
]);

step("T4-serve", [
  {
    toolId: "serve_poisoned_drink_on_balcony",
    actor: "face",
    targets: ["target", "wine_bottle"],
    intent: "serve",
  },
]);
step("T5-resolve", [
  { toolId: "resolve_poison_on_balcony", actor: "face", targets: ["target"], intent: "r" },
]);

console.log(log.join("\n"));
