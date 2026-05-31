import type { BeatModifier } from "./beatTypes";

function ok(ctx: { result: { status: string } }): boolean {
  return ctx.result.status === "success" || ctx.result.status === "partial";
}

export const HITMAN_MODIFIERS: Record<string, BeatModifier> = {
  belief_planted: {
    id: "belief_planted",
    name: "信念植入",
    emoji: "📲",
    priority: 10,
    condition: (ctx) => ok(ctx) && ctx.result.request.toolId === "spoof_message",
    narrative: () => [
      "目标手机亮起——私密阳台交易的念头已经种下。",
      "Face 的后续话术现在有了可信锚点。",
    ],
  },
  lure_whisper: {
    id: "lure_whisper",
    name: "耳语引诱",
    emoji: "🎭",
    priority: 8,
    condition: (ctx) =>
      ok(ctx) &&
      ctx.result.request.toolId === "lure_with_private_meeting" &&
      ctx.world.npcs.target.beliefs.some(
        (b) => b.predicate.includes("balcony") || b.predicate.includes("private_meeting"),
      ),
    narrative: (ctx) => [
      `${ctx.world.npcs.target.name} 对「阳台私聊」表现出兴趣。`,
      "路线 bias 已抬高——tick 后更可能独自前往阳台。",
    ],
  },
  admin_frame: {
    id: "admin_frame",
    name: "行政话术",
    emoji: "📋",
    priority: 9,
    condition: (ctx) => ok(ctx) && ctx.result.request.toolId === "redirect_guard_attention",
    narrative: (ctx) => [
      `保安 ${ctx.world.npcs.guard.name} 被宾客名单问题占住。`,
      "大堂视线暂时从画廊/阳台移开。",
    ],
  },
  power_outage: {
    id: "power_outage",
    name: "区域停电",
    emoji: "⚡",
    priority: 9,
    condition: (ctx) => ok(ctx) && ctx.result.request.toolId === "disable_power_panel",
    narrative: (ctx) => [
      "画廊灯光压低，走廊监控能见度下降。",
      `保安 ${ctx.world.npcs.guard.name} 被派去厨房查配电。`,
    ],
  },
  guard_drift: {
    id: "guard_drift",
    name: "警戒漂移",
    emoji: "👁️",
    priority: 6,
    condition: (ctx) =>
      ctx.result.request.toolId === "redirect_guard_attention" &&
      (ctx.result.status === "failed" || ctx.result.status === "blocked"),
    narrative: () => ["保安没有被完全引开——下一幕张力会更高。"],
  },
  spill_hijack: {
    id: "spill_hijack",
    name: "泼酒截胡",
    emoji: "🍷",
    priority: 10,
    condition: (ctx) => ok(ctx) && ctx.result.request.toolId === "spill_drink",
    narrative: () => [
      "红酒泼洒——保洁与服务员的注意力被画廊的混乱吸走。",
      "这正是推清洁车挡视线的窗口。",
    ],
  },
  cart_block: {
    id: "cart_block",
    name: "推车挡线",
    emoji: "🧹",
    priority: 7,
    condition: (ctx) => ok(ctx) && ctx.result.request.toolId === "move_cleaning_cart",
    narrative: () => ["清洁车卡在走廊转角——阳台方向的视线被物理切断。"],
  },
  rail_weak: {
    id: "rail_weak",
    name: "栏杆松动",
    emoji: "🔧",
    priority: 8,
    condition: (ctx) => ok(ctx) && ctx.result.request.toolId === "tamper_balcony_rail",
    narrative: () => ["阳台栏杆的固定件已被削弱——事故条件接近就绪。"],
  },
  accident_staging: {
    id: "accident_staging",
    name: "事故彩排",
    emoji: "⚠️",
    priority: 9,
    condition: (ctx) => ctx.result.request.toolId === "stage_accident",
    narrative: (ctx) => {
      if (ok(ctx)) return ["舞台收束——世界进入终态判定。"];
      return ["事故条件未满足——导演层记录为失败幕。"];
    },
  },
};

export function pickModifier(
  modifierIds: string[],
  ctx: Parameters<BeatModifier["condition"]>[0],
  excludeId: string | null,
): BeatModifier | null {
  const candidates = modifierIds
    .map((id) => HITMAN_MODIFIERS[id])
    .filter((m): m is BeatModifier => !!m && m.id !== excludeId)
    .sort((a, b) => b.priority - a.priority);
  for (const m of candidates) {
    if (m.condition(ctx)) return m;
  }
  return null;
}
