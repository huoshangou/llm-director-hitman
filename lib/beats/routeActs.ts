import type { BeatAct } from "./beatTypes";

export const ROUTE_ACTS: Record<string, BeatAct[]> = {
  route_a: [
    {
      id: "private_invitation",
      name: "私人邀约",
      emoji: "📱",
      fromStep: 0,
      toStep: 1,
      modifiers: ["belief_planted", "lure_whisper"],
    },
    {
      id: "service_cover",
      name: "前台掩护",
      emoji: "🛡️",
      fromStep: 2,
      toStep: 2,
      modifiers: ["admin_frame", "guard_drift"],
    },
    {
      id: "balcony_window",
      name: "阳台窗口",
      emoji: "🌆",
      fromStep: 3,
      toStep: 4,
      modifiers: ["rail_weak", "accident_staging"],
    },
  ],
  route_b: [
    {
      id: "power_diversion",
      name: "配电引开",
      emoji: "⚡",
      fromStep: 0,
      toStep: 0,
      modifiers: ["power_outage"],
    },
    {
      id: "private_invitation",
      name: "私人邀约",
      emoji: "📱",
      fromStep: 1,
      toStep: 2,
      modifiers: ["belief_planted", "lure_whisper"],
    },
    {
      id: "balcony_window",
      name: "阳台窗口",
      emoji: "🌆",
      fromStep: 3,
      toStep: 4,
      modifiers: ["rail_weak", "accident_staging"],
    },
  ],
  route_c: [
    {
      id: "spill_cover",
      name: "泼酒掩护",
      emoji: "🍷",
      fromStep: 0,
      toStep: 1,
      modifiers: ["spill_hijack", "cart_block"],
    },
    {
      id: "service_cover",
      name: "前台掩护",
      emoji: "🛡️",
      fromStep: 2,
      toStep: 2,
      modifiers: ["admin_frame", "guard_drift"],
    },
    {
      id: "private_invitation",
      name: "私人邀约",
      emoji: "📱",
      fromStep: 3,
      toStep: 4,
      modifiers: ["belief_planted", "lure_whisper"],
    },
    {
      id: "balcony_window",
      name: "阳台窗口",
      emoji: "🌆",
      fromStep: 5,
      toStep: 6,
      modifiers: ["rail_weak", "accident_staging"],
    },
  ],
};

export function getActsForRoute(routeId: string): BeatAct[] {
  const acts = ROUTE_ACTS[routeId];
  if (!acts) throw new Error(`No beat acts for route: ${routeId}`);
  return acts;
}

export function actForStep(acts: BeatAct[], stepIndex: number): BeatAct | null {
  return acts.find((a) => stepIndex >= a.fromStep && stepIndex <= a.toStep) ?? null;
}

export function actIndexForStep(acts: BeatAct[], stepIndex: number): number {
  return acts.findIndex((a) => stepIndex >= a.fromStep && stepIndex <= a.toStep);
}
