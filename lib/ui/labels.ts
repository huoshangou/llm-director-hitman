import type { FieldAgentId, NpcId } from "../world/worldTypes";

export const NPC_LABELS: Record<NpcId, { short: string; full: string }> = {
  target: { short: "Victor", full: "Victor Vale · 暗杀目标" },
  guard: { short: "保安", full: "Mara · 保安" },
  waiter: { short: "服务员", full: "Leo · 服务员" },
  cleaner: { short: "保洁", full: "Nia · 保洁" },
  guest: { short: "宾客", full: "宾客群" },
};

export const AGENT_LABELS: Record<FieldAgentId, { short: string; full: string }> = {
  face: { short: "Face", full: "Face · 交涉员" },
  runner: { short: "Runner", full: "Runner · 执行员" },
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  agent_move: "干员移动",
  npc_move: "NPC 移动",
  dialogue_bubble: "对话",
  object_state_change: "物件变化",
  attention_shift: "注意力转移",
  tool_failed: "指令失败",
};
