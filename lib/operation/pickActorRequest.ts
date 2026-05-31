import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import type { ActorId } from "../world/worldTypes";

const TOOL_HINTS: Partial<Record<ToolId, RegExp[]>> = {
  infiltrate_gallery: [/混进.*画廊|混到.*画廊|混入画廊|进画廊|画廊.*混|趁乱.*画廊/i],
  lure_with_private_meeting: [/接触.*目标|搭话|私密|邀约|lure|阳台|诱.*阳台|引.*阳台/i],
  create_complaint: [/投诉|complaint|行政|名单问题|服务问题/i],
  redirect_guard_attention: [/引开|支开|调开|转移.*(保安|guard|注意力)|让.*(保安|guard).*(离开|走开|调走)|注意力/i],
  disable_power_panel: [/配电|断电|停电|破坏.*配电|配电箱|power/i],
  move_cleaning_cart: [/清洁车|推车|挡视线|cart/i],
  impersonate_staff: [/伪装|制服|服务员|服务生|侍者|工作服|服务制服|waiter|impersonate/i],
  tamper_balcony_rail: [/栏杆|rail|破坏阳台/i],
  spoof_message: [/伪造|短信|spoof|手机|骇入/i],
  prepare_poisoned_drink: [/下毒|备毒|毒酒|吧台.*毒|酒瓶/i],
  serve_poisoned_drink_on_balcony: [/递.*毒|递.*酒|阳台.*递/i],
  resolve_poison_on_balcony: [/倒下|毒发|结算|喝完/i],
};

function actorClause(plan: string, actor: ActorId): string {
  if (actor === "face") return plan.match(/face[^；;\n]*/i)?.[0] ?? plan;
  if (actor === "runner") return plan.match(/runner[^；;\n]*/i)?.[0] ?? plan;
  if (actor === "player") return plan;
  return plan;
}

/** Score how well a tool request matches player natural language (higher = better fit). */
export function scoreRequestAgainstPlan(request: ToolUseRequest, playerPlan: string): number {
  const hints = TOOL_HINTS[request.toolId];
  if (!hints?.length) return 0;
  const clause = actorClause(playerPlan, request.actor);
  let score = 0;
  for (const re of hints) {
    if (re.test(playerPlan)) score += 5;
    if (re.test(clause)) score += 20;
  }
  if (
    request.toolId === "lure_with_private_meeting" &&
    /诱.*阳台|引.*阳台|阳台.*事故|制造.*坠/i.test(playerPlan)
  ) {
    score += 35;
  }
  return score;
}

/** When LLM returns multiple tools for one actor, pick the best match to player text. */
export function pickBestRequestForActor(
  requests: ToolUseRequest[],
  playerPlan?: string,
): ToolUseRequest {
  if (requests.length <= 1) return requests[0]!;
  if (!playerPlan?.trim()) return requests[0]!;

  let best = requests[0]!;
  let bestScore = scoreRequestAgainstPlan(best, playerPlan);
  for (const req of requests.slice(1)) {
    const score = scoreRequestAgainstPlan(req, playerPlan);
    if (score > bestScore) {
      best = req;
      bestScore = score;
    }
  }
  return best;
}
