import assert from "node:assert/strict";
import { runIdlePass } from "../lib/world/ambientWorld";
import { cloneWorld } from "../lib/world/initialWorld";
import type { NpcId } from "../lib/world/worldTypes";

let world = cloneWorld();
const startLocations = Object.fromEntries(
  Object.entries(world.npcs).map(([id, npc]) => [id, npc.location]),
) as Record<NpcId, string>;

const seenTexts: string[] = [];

for (let i = 0; i < 8; i++) {
  const result = runIdlePass(world);
  world = result.world;
  seenTexts.push(...result.events.map((event) => event.text ?? ""));

  for (const id of Object.keys(world.npcs) as NpcId[]) {
    const npc = world.npcs[id];
    assert.equal(npc.location, startLocations[id], `${id} moved during play idle`);
    if (npc.currentTask?.location) {
      assert.equal(
        npc.currentTask.location,
        npc.location,
        `${id} has cross-location idle task`,
      );
    }
  }

  assert.equal(
    result.events.some((event) => event.type === "npc_move" || event.type === "agent_move"),
    false,
    "idle pass must not emit move events",
  );
}

assert.ok(
  seenTexts.some((text) => text.includes("[环境]")),
  "idle vignette should be tagged as environment",
);
assert.ok(
  seenTexts.some((text) => /目标|保安|服务生|宾客|保洁/.test(text)),
  "idle vignette should mention a world actor",
);

console.log("test-idle-vignettes: ok");
