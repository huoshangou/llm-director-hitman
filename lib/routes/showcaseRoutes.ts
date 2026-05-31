import type { ToolUseRequest } from "../tools/toolTypes";

export type ShowcaseStep = {
  label: string;
  hint: string;
  tool: ToolUseRequest;
};

export type ShowcaseRoute = {
  id: string;
  title: string;
  description: string;
  steps: ShowcaseStep[];
};

export const showcaseRoutes: ShowcaseRoute[] = [
  {
    id: "route_a",
    title: "路线 A · 私人邀约",
    description: "经典链：短信铺垫 → Face 引诱 → 引开保安 → Runner 动手脚 → 事故。",
    steps: [
      {
        label: "Turn 1 · 伪造短信",
        hint: "Player 远程植入阳台私密会面信念。",
        tool: {
          toolId: "spoof_message",
          actor: "player",
          targets: ["target", "target_phone"],
          intent: "Plant private balcony meeting belief",
          params: { message: "Private art deal on the balcony." },
        },
      },
      {
        label: "Turn 2 · Face 引诱",
        hint: "提高 target 去 balcony 的 route bias；tick 后目标应移动。",
        tool: {
          toolId: "lure_with_private_meeting",
          actor: "face",
          targets: ["target", "balcony"],
          intent: "Lure target toward balcony",
        },
      },
      {
        label: "Turn 3 · 引开保安",
        hint: "用 admin_issue frame 占住 Guard 注意力。",
        tool: {
          toolId: "redirect_guard_attention",
          actor: "face",
          targets: ["guard", "guest_list_terminal"],
          intent: "VIP list distraction",
          params: { frame: "admin_issue" },
        },
      },
      {
        label: "Turn 4 · 动栏杆",
        hint: "Runner 跨区到 balcony，削弱栏杆。",
        tool: {
          toolId: "tamper_balcony_rail",
          actor: "runner",
          targets: ["balcony_rail", "balcony"],
          intent: "Weaken rail before accident",
        },
      },
      {
        label: "Turn 5 · 事故",
        hint: "终局：需目标在阳台 + 栏杆 tampered + 视线窗口。",
        tool: {
          toolId: "stage_accident",
          actor: "runner",
          targets: ["target", "balcony_rail", "balcony"],
          intent: "Stage balcony accident",
        },
      },
    ],
  },
  {
    id: "route_b",
    title: "路线 B · 配电停电",
    description: "Runner 动配电引开保安 → 短信铺垫 → Face 引诱 → 栏杆 → 事故。",
    steps: [
      {
        label: "Turn 1 · 干扰配电",
        hint: "Runner 在厨房动配电箱；保安去查电，画廊变暗、监控减弱。",
        tool: {
          toolId: "disable_power_panel",
          actor: "runner",
          targets: ["power_panel"],
          intent: "Trigger power diversion",
        },
      },
      {
        label: "Turn 2 · 伪造短信",
        hint: "Player 植入阳台私密会面信念。",
        tool: {
          toolId: "spoof_message",
          actor: "player",
          targets: ["target", "target_phone"],
          intent: "Plant balcony meeting belief",
          params: { message: "Urgent private viewing on the balcony." },
        },
      },
      {
        label: "Turn 3 · Face 引诱",
        hint: "tick 后目标应移向 balcony。",
        tool: {
          toolId: "lure_with_private_meeting",
          actor: "face",
          targets: ["target", "balcony"],
          intent: "Lure target to balcony",
        },
      },
      {
        label: "Turn 4 · 动栏杆",
        hint: "保安仍在查配电时 Runner 动手脚。",
        tool: {
          toolId: "tamper_balcony_rail",
          actor: "runner",
          targets: ["balcony_rail", "balcony"],
          intent: "Weaken rail",
        },
      },
      {
        label: "Turn 5 · 事故",
        hint: "终局：目标在阳台 + 栏杆 tampered + 视线窗口。",
        tool: {
          toolId: "stage_accident",
          actor: "runner",
          targets: ["target", "balcony_rail", "balcony"],
          intent: "Stage balcony accident",
        },
      },
    ],
  },
  {
    id: "route_c",
    title: "路线 C · 清洁车挡视线",
    description: "Runner 泼酒/推车 → Face 引开 Guard → 引诱 → 动手脚 → 事故。",
    steps: [
      {
        label: "Turn 1 · 泼酒",
        hint: "Gallery 制造 spill，引保洁。",
        tool: {
          toolId: "spill_drink",
          actor: "runner",
          targets: ["wine_glass", "gallery"],
          intent: "Spill in gallery",
        },
      },
      {
        label: "Turn 2 · 推清洁车",
        hint: "挡 gallery 视线。",
        tool: {
          toolId: "move_cleaning_cart",
          actor: "runner",
          targets: ["cleaning_cart", "gallery"],
          intent: "Block sightline",
        },
      },
      {
        label: "Turn 3 · 引开保安",
        hint: "Admin frame 引开 Guard。",
        tool: {
          toolId: "redirect_guard_attention",
          actor: "face",
          targets: ["guard", "guest_list_terminal"],
          intent: "Admin distraction",
          params: { frame: "admin_issue" },
        },
      },
      {
        label: "Turn 4 · 伪造短信",
        hint: "提高 target 去 balcony 的意愿。",
        tool: {
          toolId: "spoof_message",
          actor: "player",
          targets: ["target", "target_phone"],
          intent: "Balcony meeting bait",
        },
      },
      {
        label: "Turn 5 · Face 引诱",
        hint: "tick 后目标应上阳台。",
        tool: {
          toolId: "lure_with_private_meeting",
          actor: "face",
          targets: ["target", "balcony"],
          intent: "Move target to balcony",
        },
      },
      {
        label: "Turn 6 · 动栏杆",
        hint: "Runner 跨区 tamper。",
        tool: {
          toolId: "tamper_balcony_rail",
          actor: "runner",
          targets: ["balcony_rail", "balcony"],
          intent: "Tamper rail",
        },
      },
      {
        label: "Turn 7 · 事故",
        hint: "终局 stage_accident。",
        tool: {
          toolId: "stage_accident",
          actor: "runner",
          targets: ["target", "balcony_rail", "balcony"],
          intent: "Final accident",
        },
      },
    ],
  },
];

export function getShowcaseRoute(id: string): ShowcaseRoute | undefined {
  return showcaseRoutes.find((r) => r.id === id);
}
