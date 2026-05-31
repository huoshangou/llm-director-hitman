import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { cloneWorld } from "../lib/world/initialWorld";

async function main() {
  const world = cloneWorld();
  const r = await compileDirectorPlan({
    playerPlan: "伪造一条阳台私密邀约短信",
    world,
    selection: null,
  });

  assert.equal(r.ok, true);
  assert.ok(r.plan);
  assert.ok(r.validation && r.validation.executableChain.length >= 1);
  assert.equal(r.validation.executableChain[0].toolId, "spoof_message");
  assert.equal(r.source, "stub");

  const vague = await compileDirectorPlan({
    playerPlan: "做点什么",
    world,
    selection: null,
  });
  assert.equal(vague.ok, true);
  assert.equal(vague.clarificationOnly, true);
  assert.ok((vague.fieldAgentRadio?.length ?? 0) >= 1);

  const selected = await compileDirectorPlan({
    playerPlan: "处理这个",
    world,
    selection: { kind: "object", id: "guest_list_terminal" },
  });
  assert.equal(selected.ok, true);
  assert.ok(selected.validation && selected.validation.executableChain.length >= 1);
  assert.equal(selected.validation.executableChain[0].toolId, "modify_guest_list");

  const targetSelected = await compileDirectorPlan({
    playerPlan: "处理这个",
    world,
    selection: { kind: "npc", id: "target" },
  });
  assert.equal(targetSelected.ok, true);
  assert.ok(targetSelected.validation && targetSelected.validation.executableChain.length >= 1);
  assert.equal(targetSelected.validation.executableChain[0].toolId, "spoof_message");

  console.log("test-director-compile: ok", r.source);
}

main();
