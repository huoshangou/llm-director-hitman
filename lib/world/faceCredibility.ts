import type { WorldState } from "./worldTypes";

export type FaceCredibilityTier = "improvising" | "partial" | "strong";

export type FaceCredibility = {
  tier: FaceCredibilityTier;
  routeBoost: number;
  summary: string;
  backing: string[];
};

/** Deterministic Face social credibility for lure_with_private_meeting. */
export function assessFaceCredibility(world: WorldState): FaceCredibility {
  const face = world.agents.face;
  const target = world.npcs.target;
  const backing: string[] = [];
  let score = 0;

  const cover = face.coverIdentity ?? "event_fixer";
  if (cover === "event_fixer") {
    score += 12;
    backing.push("默认艺术圈活动联络人");
  } else if (cover === "vip_liaison") {
    score += 28;
    backing.push("宾客名单 VIP 联络背书");
  } else if (cover === "schedule_liaison") {
    score += 22;
    backing.push("日程/私密观展理由");
  } else if (cover === "waiter") {
    score += 18;
    backing.push("服务员服务身份");
  }

  if (world.objects.guest_list_terminal.state.modified === true && cover !== "vip_liaison") {
    score += 10;
    backing.push("终端记录已改动");
  }

  const phoneBelief = target.beliefs.some(
    (b) =>
      b.source === "spoof" ||
      b.predicate.includes("private_meeting_on_balcony") ||
      b.predicate.includes("balcony"),
  );
  if (phoneBelief) {
    score += 22;
    backing.push("目标手机已有匹配私密邀约");
  }

  if (world.npcs.waiter.currentTask?.type === "schedule_check") {
    score += 14;
    backing.push("日程冲突可作私密会面借口");
  }

  if (score >= 48) {
    return {
      tier: "strong",
      routeBoost: 30,
      summary: "目标有充分理由相信 Face 的私密邀约",
      backing,
    };
  }
  if (score >= 28) {
    return {
      tier: "partial",
      routeBoost: 22,
      summary: "Face 有部分背书，目标将信将疑",
      backing,
    };
  }
  return {
    tier: "improvising",
    routeBoost: 14,
    summary: "Face 在临场发挥，目标只会部分买账",
    backing: backing.length ? backing : ["仅默认活动联络身份"],
  };
}
