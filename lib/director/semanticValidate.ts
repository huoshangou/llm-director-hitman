import type { DirectorPlan } from "./directorSchema";
import type { DirectorBreak } from "./directorBreak";
import {
  MISLEADING_VIOLENCE_SUBSTITUTES,
  parseLethalIntent,
} from "./lethalPolicy";
import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";

const GALLERY_INFILTRATE_RE =
  /混进.*画廊|混到.*画廊|混入画廊|进画廊|画廊.*混|趁乱.*画廊|到画廊去|去画廊/i;

/** 「等保安 / guard 离开后再混画廊」 */
const GUARD_LEAVE_THEN_GALLERY_RE =
  /等.*(保安|guard).*(离开|走开|不在|撤离)|guard.*(离开|leave|left)|离开.*(走廊|通道).*(后|再).*(混|进).*画廊|(混|进).*画廊.*等.*(保安|guard)/i;

const GALLERY_SUBSTITUTE_ONLY = new Set<ToolId>([
  "redirect_guard_attention",
  "create_complaint",
]);

export function playerWantsGalleryInfiltration(planText: string): boolean {
  return GALLERY_INFILTRATE_RE.test(planText) || GUARD_LEAVE_THEN_GALLERY_RE.test(planText);
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
      playerMessage: "计划不可行，本 turn 未执行。",
      detail: "feasibility impossible with empty toolChain",
    };
  }

  const lethal = parseLethalIntent(text);

  if (lethal?.victim === "target") {
    if (chain.some((r) => r.toolId === "eliminate_threat")) {
      return {
        code: "SEMANTIC_MISMATCH",
        playerMessage: "目标只能走阳台事故/毒酒链，不能用清除威胁手段。",
        detail: "eliminate_threat on contract target",
        rejectedToolId: "eliminate_threat",
      };
    }
    const bad = chain.find((r) => MISLEADING_VIOLENCE_SUBSTITUTES.has(r.toolId as ToolId));
    if (bad && !chain.some((r) => r.toolId === "decline_with_guidance")) {
      return {
        code: "SEMANTIC_MISMATCH",
        playerMessage: "不能直接对 Victor 动手；用 decline 引导或先铺阳台前置。",
        detail: `target lethal intent but toolChain contains ${bad.toolId}`,
        rejectedToolId: bad.toolId,
      };
    }
    if (chain.some((r) => r.toolId === "decline_with_guidance")) {
      return null;
    }
  }

  if (lethal?.victim === "guard" || lethal?.victim === "guest") {
    const bad = chain.find(
      (r) =>
        MISLEADING_VIOLENCE_SUBSTITUTES.has(r.toolId as ToolId) &&
        r.toolId !== "eliminate_threat",
    );
    if (bad && !chain.some((r) => r.toolId === "eliminate_threat")) {
      return {
        code: "SEMANTIC_MISMATCH",
        playerMessage: "要清除威胁就说清对象；配电/换装不能代替下手。",
        detail: `lethal on ${lethal.victim} but substituted with ${bad.toolId}`,
        rejectedToolId: bad.toolId,
      };
    }
    if (chain.some((r) => r.toolId === "eliminate_threat")) {
      return null;
    }
  }

  if (lethal && !lethal.victim && chain.length > 0) {
    const bad = chain.find((r) => MISLEADING_VIOLENCE_SUBSTITUTES.has(r.toolId as ToolId));
    if (bad) {
      return {
        code: "UNSUPPORTED_INTENT",
        playerMessage: "没有可执行的致命手段；硬来只会暴露，本 turn 未动手。",
        detail: `ambiguous lethal intent with ${bad.toolId}`,
        rejectedToolId: bad.toolId,
      };
    }
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
  }

  return null;
}
