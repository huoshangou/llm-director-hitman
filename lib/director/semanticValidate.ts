import type { DirectorPlan } from "./directorSchema";
import type { DirectorBreak } from "./directorBreak";
import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";

const GALLERY_INFILTRATE_RE =
  /混进.*画廊|混到.*画廊|混入画廊|进画廊|画廊.*混|趁乱.*画廊|到画廊去|去画廊/i;

/** 「等保安 / guard 离开后再混画廊」 */
const GUARD_LEAVE_THEN_GALLERY_RE =
  /等.*(保安|guard).*(离开|走开|不在|撤离)|guard.*(离开|leave|left)|离开.*(走廊|通道).*(后|再).*(混|进).*画廊|(混|进).*画廊.*等.*(保安|guard)/i;

const VIOLENCE_RE =
  /杀(?:了|掉|死)?\s*保安|杀(?:了|掉|死)?\s*guard|干掉\s*保安|刺(?:杀)?\s*保安|枪杀|shoot\s*guard|kill\s*guard|杀了对方/i;

const MISLEADING_WHEN_VIOLENCE = new Set<ToolId>([
  "disable_power_panel",
  "impersonate_staff",
  "redirect_guard_attention",
  "create_complaint",
  "tamper_balcony_rail",
  "stage_accident",
]);

const GALLERY_SUBSTITUTE_ONLY = new Set<ToolId>([
  "redirect_guard_attention",
  "create_complaint",
]);

export function playerWantsGalleryInfiltration(planText: string): boolean {
  return GALLERY_INFILTRATE_RE.test(planText) || GUARD_LEAVE_THEN_GALLERY_RE.test(planText);
}

export function playerWantsViolence(planText: string): boolean {
  return VIOLENCE_RE.test(planText);
}

function faceTools(chain: ToolUseRequest[]): ToolUseRequest[] {
  return chain.filter((r) => r.actor === "face");
}

export function semanticValidatePlan(
  plan: DirectorPlan,
  playerPlan: string,
  _world: WorldState,
): DirectorBreak | null {
  const chain = (plan.toolChain ?? []) as ToolUseRequest[];
  const text = playerPlan.trim();

  if (plan.feasibility === "impossible" && chain.length === 0) {
    return {
      code: "UNSUPPORTED_INTENT",
      playerMessage: "计划不可行，本 turn 不执行。",
      detail: "feasibility impossible with empty toolChain",
    };
  }

  if (playerWantsViolence(text)) {
    if (chain.length > 0) {
      const bad = chain.find((r) => MISLEADING_WHEN_VIOLENCE.has(r.toolId as ToolId));
      return {
        code: "UNSUPPORTED_INTENT",
        playerMessage: "没有可执行的致命手段；硬来只会暴露，本 turn 未动手。",
        detail: bad
          ? `violence intent but toolChain contains ${bad.toolId}`
          : "violence intent with toolChain",
        rejectedToolId: bad?.toolId,
      };
    }
    return {
      code: "UNSUPPORTED_INTENT",
      playerMessage: "没有可执行的致命手段；硬来只会暴露。",
      detail: "violence intent, empty toolChain allowed",
    };
  }

  if (playerWantsGalleryInfiltration(text)) {
    const face = faceTools(chain);
    const hasInfiltrate = face.some((r) => r.toolId === "infiltrate_gallery");
    const onlySubstitute =
      face.length > 0 && face.every((r) => GALLERY_SUBSTITUTE_ONLY.has(r.toolId as ToolId));

    if (onlySubstitute || (face.length > 0 && !hasInfiltrate)) {
      return {
        code: "SEMANTIC_MISMATCH",
        playerMessage: "要混进画廊得亲自过去；引开/投诉不会让你出现在画廊。",
        detail: `gallery infiltration requested but face tools: ${face.map((r) => r.toolId).join(",")}`,
        rejectedToolId: face[0]?.toolId,
      };
    }
    // Face 步骤被 LLM 标 unsupported 时已由 planSanitize 剔除；Runner 配电仍可执行（选项 A）
  }

  return null;
}
