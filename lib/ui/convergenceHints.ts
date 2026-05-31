import { convergenceCheckpoints } from "../convergence/terminalState";
import type { WorldState } from "../world/worldTypes";

export const CHECKPOINT_HINT: Record<string, string> = {
  target_balcony: "还差：短信 + Face 引诱，把目标勾到阳台",
  guard_window: "还差：引开保安（配电 / 行政投诉 / 挡视线）",
  sightline: "还差：阳台视线仍被观察或遮挡",
  power_disrupted: "可选：配电干扰能拉走保安并压监控",
  rail: "还差：Runner 在阳台动栏杆",
  final: "还差：终局事故（需目标在阳台 + 栏杆 + 视线窗口）",
};

export function nextOpenCheckpoint(world: WorldState) {
  return convergenceCheckpoints(world).find((cp) => !cp.done);
}

export function nextCheckpointHint(world: WorldState): string | null {
  if (world.objective.targetHandled) return null;
  const next = nextOpenCheckpoint(world);
  if (!next) return null;
  return CHECKPOINT_HINT[next.id] ?? next.label;
}
