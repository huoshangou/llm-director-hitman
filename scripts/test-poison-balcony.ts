import assert from "node:assert/strict";
import { classifyTerminalState } from "../lib/convergence/terminalState";
import { buildFrontierOperationSet } from "../lib/operation/buildOperationSet";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { validateToolRequest } from "../lib/tools/checkPreconditions";
import { applyToolResult, resolveTool } from "../lib/tools/resolveTool";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";

const prepare: ToolUseRequest = {
  toolId: "prepare_poisoned_drink",
  actor: "runner",
  targets: ["wine_bottle"],
  intent: "prepare",
};

const serve: ToolUseRequest = {
  toolId: "serve_poisoned_drink_on_balcony",
  actor: "face",
  targets: ["target", "wine_bottle"],
  intent: "serve",
};

const resolveStep: ToolUseRequest = {
  toolId: "resolve_poison_on_balcony",
  actor: "face",
  targets: ["target"],
  intent: "resolve",
};

let w = cloneWorld();
assert.ok(validateToolRequest(prepare, w).ok, "prepare should pass at start");

w.npcs.target.location = "gallery";
assert.ok(!validateToolRequest(serve, w).ok, "serve blocked when target not on balcony");

w = cloneWorld();
const prepResult = resolveTool(prepare, w);
assert.equal(prepResult.status, "success");
w = applyToolResult(w, prepResult);
assert.equal(w.objects.wine_bottle.state.poisoned, true);

w.npcs.target.location = "balcony";
const serveResult = resolveTool(serve, w);
assert.equal(serveResult.status, "success");
w = applyToolResult(w, serveResult);
assert.equal(w.objects.wine_bottle.state.poison_served, true);

const fin = resolveTool(resolveStep, w);
assert.equal(fin.status, "success");
w = applyToolResult(w, fin);
assert.equal(w.objective.targetHandled, true);
assert.equal(w.objective.style, "poison");

const terminal = classifyTerminalState(w);
assert.equal(terminal.id, "success_poison_balcony");

const lure: ToolUseRequest = {
  toolId: "lure_with_private_meeting",
  actor: "face",
  targets: ["target"],
  intent: "lure",
};

const wDual = cloneWorld();
const opDual = buildFrontierOperationSet([prepare, lure], [], "llm", "", wDual);
assert.equal(opDual.actions.length, 2, "7b: runner prepare + face lure when both pre pass at turn start");
assert.equal(opDual.actions[0]!.request.toolId, "prepare_poisoned_drink");
assert.equal(opDual.actions[1]!.request.toolId, "lure_with_private_meeting");

const wEarly = cloneWorld();
const opEarly = buildFrontierOperationSet([prepare, serve, resolveStep], [], "llm", "", wEarly);
assert.equal(opEarly.actions.length, 1);
assert.equal(opEarly.actions[0]!.request.toolId, "prepare_poisoned_drink");

const execDual = executeOperationSet(wDual, [prepare, lure], [], "", true);
assert.equal(execDual.results.length, 2);
assert.equal(execDual.world.objects.wine_bottle.state.poisoned, true);

const wServed = cloneWorld();
wServed.npcs.target.location = "balcony";
wServed.objects.wine_bottle.state = { premium: true, poisoned: true, poison_served: false };
const opServeOnly = buildFrontierOperationSet([prepare, serve], [], "llm", "", wServed);
assert.equal(opServeOnly.actions.length, 1);
assert.equal(opServeOnly.actions[0]!.request.toolId, "serve_poisoned_drink_on_balcony");

console.log("test-poison-balcony: ok");
