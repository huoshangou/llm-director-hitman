import type { ToolId } from "../tools/toolTypes";
import type { MapSelection } from "../ui/mapSelection";
import { showcaseRoutes } from "../routes/showcaseRoutes";

export type RouteGoldenCase = {
  routeId: string;
  name: string;
  /** 玩家口吻 plan */
  text: string;
  /** step 模式期望的第一步工具 */
  toolId: ToolId;
  /** 地图选中上下文（阶段 2 指代消解） */
  selection?: MapSelection | null;
  /** 可选：断言 actor */
  actor?: "player" | "face" | "runner";
};

/** 每条 showcase 路线 Turn1 + 常见口语变体（阶段 1 金句回归真源） */
export const ROUTE_GOLDEN_PLANS: RouteGoldenCase[] = [
  ...showcaseRoutes.map((route) => {
    const step = route.steps[0]!;
    const shortLabel = step.label.replace(/^Turn \d+ · /, "");
    return {
      routeId: route.id,
      name: `${route.id}_showcase_turn1`,
      text: shortLabel,
      toolId: step.tool.toolId as ToolId,
      actor: step.tool.actor,
    };
  }),
  {
    routeId: "route_a",
    name: "route_a_spoof_cn",
    text: "伪造阳台私密短信",
    toolId: "spoof_message",
    actor: "player",
  },
  {
    routeId: "route_b",
    name: "route_b_power_cn",
    text: "让 Runner 断电",
    toolId: "disable_power_panel",
    actor: "runner",
  },
  {
    routeId: "route_c",
    name: "route_c_spill_cn",
    text: "在画廊泼酒制造混乱",
    toolId: "spill_drink",
    actor: "runner",
  },
  {
    routeId: "route_a",
    name: "route_a_lure_cn",
    text: "把目标引到阳台",
    toolId: "lure_with_private_meeting",
    actor: "face",
  },
  {
    routeId: "any",
    name: "guard_redirect_cn",
    text: "让 Face 引开保安",
    toolId: "redirect_guard_attention",
    actor: "face",
  },
  {
    routeId: "any",
    name: "rail_cn",
    text: "破坏阳台栏杆",
    toolId: "tamper_balcony_rail",
    actor: "runner",
  },
  {
    routeId: "any",
    name: "sel_guest_terminal_cn",
    text: "处理这个",
    toolId: "modify_guest_list",
    actor: "player",
    selection: { kind: "object", id: "guest_list_terminal" },
  },
  {
    routeId: "any",
    name: "sel_balcony_rail_cn",
    text: "动这个栏杆",
    toolId: "tamper_balcony_rail",
    actor: "runner",
    selection: { kind: "object", id: "balcony_rail" },
  },
];
