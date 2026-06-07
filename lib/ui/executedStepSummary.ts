import { toolRegistry } from "../tools/toolRegistry";
import type { ToolUseRequest, ToolUseResult } from "../tools/toolTypes";

const ACTOR_LABEL: Record<string, string> = {
  face: "Face",
  runner: "Runner",
  player: "Hacker",
  hacker: "Hacker",
};

/** Player-facing one-line summary for the single step executed in /play step mode. */
const TOOL_EXEC_ZH: Record<string, string> = {
  create_complaint: "行政投诉引开注意力",
  impersonate_staff: "取得服务员伪装",
  lure_with_private_meeting: "私密邀约目标去阳台",
  redirect_guard_attention: "把保安注意力引向行政问题",
  modify_guest_list: "接入宾客数据库节点",
  spoof_message: "向目标手机植入伪造阳台私信",
  fake_schedule_conflict: "插入日程冲突",
  suppress_camera_record: "压制安保视频流录像",
  spill_drink: "制造洒酒干扰",
  move_cleaning_cart: "推清洁车挡阳台视线",
  disable_power_panel: "处理配电箱",
  tamper_balcony_rail: "弱化阳台栏杆",
  stage_accident: "在阳台制造事故",
};

function toolActionZh(toolId: string): string {
  return TOOL_EXEC_ZH[toolId] ?? toolRegistry[toolId]?.name ?? toolId;
}

export function executedStepSummary(request: ToolUseRequest): string {
  const actor = ACTOR_LABEL[request.actor] ?? request.actor;
  return `EXEC / ${actor} 执行：${toolActionZh(request.toolId)}`;
}

export function executedStepSummaryFromResult(result: ToolUseResult): string {
  const actor = ACTOR_LABEL[result.request.actor] ?? result.request.actor;
  const action = toolActionZh(result.request.toolId);
  if (result.status === "blocked") return `EXEC / ${actor} 受阻：${action}`;
  if (result.status === "failed") return `EXEC / ${actor} 失败：${action}`;
  if (result.status === "partial") return `EXEC / ${actor} 部分完成：${action}`;
  return `EXEC / ${actor} 执行：${action}`;
}
