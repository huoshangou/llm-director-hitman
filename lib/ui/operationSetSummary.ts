import type { OperationSet } from "../operation/operationTypes";
import { toolRegistry } from "../tools/toolRegistry";
import type { ActorId } from "../world/worldTypes";

const ACTOR_LABEL: Record<ActorId, string> = {
  player: "Player",
  face: "Face",
  runner: "Runner",
};

function toolLabel(toolId: string): string {
  return toolRegistry[toolId]?.name ?? toolId;
}

/** Command Feed OPERATION line body (without prefix). */
export function operationSetSummaryLine(op: OperationSet): string {
  if (!op.actions.length) return "无可并行动作";
  const parts = op.actions.map(
    (a) => `${ACTOR_LABEL[a.actor]}: ${toolLabel(a.request.toolId)}`,
  );
  return parts.join(" · ");
}

export function operationConflictNextLines(op: OperationSet): string[] {
  const executed = new Set(op.actions.map((a) => `${a.actor}:${a.request.toolId}`));
  return op.conflicts.map((c) => {
    const rest = c.requests
      .filter((r) => !executed.has(`${r.actor}:${r.toolId}`))
      .map((r) => toolLabel(r.toolId))
      .join("、");
    if (!rest) return "";
    return `NEXT / ${ACTOR_LABEL[c.actor]} 尚有未执行：${rest}（本 turn 每 actor 仅一步）`;
  }).filter(Boolean);
}
