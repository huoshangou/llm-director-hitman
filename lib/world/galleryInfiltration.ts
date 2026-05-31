import { isNpcActive } from "./lethalResolve";
import { isObservedByGuard } from "./selectors";
import { isPowerStealthWindow } from "./sightline";
import type { WorldState } from "./worldTypes";

const GUARD_DISTRACTED = new Set([
  "distracted",
  "handling_complaint",
  "investigating",
  "panic",
]);

/** Whether Face may enter gallery this turn (compound infiltrate pre). */
export function canFaceInfiltrateGallery(world: WorldState): { ok: boolean; reason: string } {
  if (world.agents.face.location === "gallery") {
    return { ok: true, reason: "" };
  }

  const guard = world.npcs.guard;

  if (!isNpcActive(world, "guard")) {
    return { ok: true, reason: "" };
  }

  if (GUARD_DISTRACTED.has(guard.attentionMode)) {
    return { ok: true, reason: "" };
  }

  if (guard.location === "kitchen") {
    return { ok: true, reason: "" };
  }

  if (isPowerStealthWindow(world)) {
    return { ok: true, reason: "" };
  }

  if (!isObservedByGuard(world, "face")) {
    return { ok: true, reason: "" };
  }

  return {
    ok: false,
    reason: "保安仍盯着画廊通道，无法混入（需先引开保安或制造停电等干扰）",
  };
}
