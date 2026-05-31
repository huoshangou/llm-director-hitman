import { compilePlanFromText } from "./planStub";
import type { DirectorPlan } from "./directorSchema";
import {
  playerExplicitlyCommitsFinal,
  poisonServeActorForText,
} from "./worldContinuation";
import {
  buildDeclineRequest,
  buildEliminateRequest,
  guidanceKeyForTargetKill,
  MISLEADING_VIOLENCE_SUBSTITUTES,
  parseLethalIntent,
} from "./lethalPolicy";
import { playerWantsGalleryInfiltration } from "./semanticValidate";
import type { MapSelection } from "../ui/mapSelection";
import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";

const FACE_UNSUPPORTED_RE =
  /face|画廊|gallery|infiltrat|混进|混到|混入|等.*(保安|guard)|guard.*(离开|leave)|wait.*guard/i;
const RUNNER_UNSUPPORTED_RE = /assassin|violence|制服.*保安.*换装/i;
const FINAL_TOOL_IDS = new Set(["stage_accident", "resolve_poison_on_balcony"]);
const EXPLICIT_TOOL_PATTERNS: Partial<Record<ToolId, RegExp>> = {
  spoof_message: /伪造|短信|spoof|假消息|邀约短信|骇入.*(手机|目标)|目标手机|手机.*(约|短信|消息)/i,
  modify_guest_list: /名单|guest.?list|终端|前台/i,
  suppress_camera_record: /摄像头|监控|camera|录像/i,
  fake_schedule_conflict: /日程|冲突|schedule/i,
  infiltrate_gallery:
    /混进.*画廊|混到.*画廊|混入画廊|进画廊|画廊.*混|趁乱.*画廊|到画廊去|去画廊/i,
  create_complaint: /投诉|complaint|名单问题|行政/i,
  redirect_guard_attention:
    /引开|支开|调开|转移.*(guard|保安|注意力)|让.*(guard|保安).*(离开|走开|调走)|注意力/i,
  lure_with_private_meeting:
    /私密|邀约|搭话|寒暄|lure|阳台见|引到阳台|引.*阳台|接触.*目标|face.*接触|去接触/i,
  impersonate_staff: /伪装|制服|服务员|服务生|侍者|工作服|服务制服|waiter|impersonate/i,
  move_cleaning_cart: /清洁车|推车|挡视线|cart/i,
  spill_drink: /洒|泼|spill|酒杯/i,
  disable_power_panel: /配电|供电|断电|停电|破坏.*电|电力|power/i,
  tamper_balcony_rail: /栏杆|rail|破坏阳台/i,
  stage_accident: /事故|accident|推落|stage/i,
  prepare_poisoned_drink: /下毒|备毒|毒酒|把酒.*毒|吧台.*毒|酒瓶.*毒/i,
  serve_poisoned_drink_on_balcony:
    /递.*(毒|酒|杯)|阳台.*递|端.*酒|喝一杯|递酒|送.*(目标|Victor)|送去阳台/i,
  resolve_poison_on_balcony: /倒下|毒发|结算|喝完/i,
};

function requestKey(req: ToolUseRequest): string {
  return `${req.actor}:${req.toolId}`;
}

function playerExplicitlyRequestsTool(toolId: ToolId, playerPlan: string): boolean {
  return EXPLICIT_TOOL_PATTERNS[toolId]?.test(playerPlan) ?? false;
}

/** Drop toolChain steps LLM marked unsupported per actor — keep other actors (ADR-0017 partial execute). */
export function sanitizeUnsupportedFromPlan(plan: DirectorPlan): DirectorPlan {
  if (!plan.unsupportedParts.length) return plan;

  const blob = plan.unsupportedParts.map((p) => `${p.text} ${p.reason}`).join(" ");
  const blockFace = FACE_UNSUPPORTED_RE.test(blob);
  const blockRunner = RUNNER_UNSUPPORTED_RE.test(blob);
  const blockPlayer = /hacker|player|名单|terminal|权限/i.test(blob);

  const chain = plan.toolChain.filter((req) => {
    if (blockFace && req.actor === "face") return false;
    if (blockRunner && req.actor === "runner") return false;
    if (blockPlayer && req.actor === "player") return false;
    return true;
  });

  return { ...plan, toolChain: chain };
}

/** If player asked to infiltrate gallery but LLM omitted face tool, merge stub infiltrate when available. */
export function augmentGalleryInfiltrate(
  plan: DirectorPlan,
  playerPlan: string,
  world: WorldState,
  selection: MapSelection | null,
): DirectorPlan {
  if (!playerWantsGalleryInfiltration(playerPlan)) return plan;

  const hasInfiltrate = plan.toolChain.some((r) => r.toolId === "infiltrate_gallery");
  if (hasInfiltrate) return plan;

  const stub = compilePlanFromText(playerPlan, world, selection);
  if (!stub.ok) return plan;

  const faceInf = stub.chain.find((r) => r.toolId === "infiltrate_gallery");
  if (!faceInf) return plan;

  return {
    ...plan,
    toolChain: [...plan.toolChain, faceInf],
    playerFacingSummary: plan.playerFacingSummary || "已补全 Face 混画廊步骤（与 Runner 并行本 turn）。",
  };
}

/** LLM 只编了一个 actor 时，从规则 stub 补全其他 actor 的可执行步。 */
export function augmentParallelActorsFromStub(
  plan: DirectorPlan,
  playerPlan: string,
  world: WorldState,
  selection: MapSelection | null,
): DirectorPlan {
  const stub = compilePlanFromText(playerPlan, world, selection);
  if (!stub.ok || stub.chain.length < 2) return plan;

  const merged: ToolUseRequest[] = [...(plan.toolChain as ToolUseRequest[])];

  for (const actor of ["player", "runner", "face"] as const) {
    if (merged.some((m) => m.actor === actor)) continue;
    for (const req of stub.chain) {
      if (req.actor !== actor) continue;
      if (!merged.some((m) => m.actor === req.actor && m.toolId === req.toolId)) {
        merged.push(req);
      }
    }
  }

  if (merged.length === plan.toolChain.length) return plan;

  return {
    ...plan,
    toolChain: merged,
    playerFacingSummary:
      plan.playerFacingSummary || "已按规则 stub 补全 LLM 漏掉的队友并行步骤。",
  };
}

/**
 * LLM may keep only one Runner step from a compound sentence. Merge explicit stub
 * intents back into the chain; execution decides how many waves can resolve.
 */
export function augmentExplicitToolIntentsFromStub(
  plan: DirectorPlan,
  playerPlan: string,
  world: WorldState,
  selection: MapSelection | null,
): DirectorPlan {
  const stub = compilePlanFromText(playerPlan, world, selection);
  if (!stub.ok || stub.chain.length < 2) return plan;

  const explicit = stub.chain.filter((req) =>
    playerExplicitlyRequestsTool(req.toolId as ToolId, playerPlan),
  );
  if (!explicit.length) return plan;

  const merged: ToolUseRequest[] = [...(plan.toolChain as ToolUseRequest[])];
  const existing = new Set(merged.map(requestKey));
  let changed = false;

  for (const req of explicit) {
    const key = requestKey(req);
    if (existing.has(key)) continue;
    merged.push(req);
    existing.add(key);
    changed = true;
  }

  if (!changed) return plan;

  const byKey = new Map(merged.map((req) => [requestKey(req), req]));
  const ordered: ToolUseRequest[] = [];
  const used = new Set<string>();

  for (const req of stub.chain) {
    const key = requestKey(req);
    const mergedReq = byKey.get(key);
    if (!mergedReq || used.has(key)) continue;
    ordered.push(mergedReq);
    used.add(key);
  }
  for (const req of merged) {
    const key = requestKey(req);
    if (used.has(key)) continue;
    ordered.push(req);
  }

  return {
    ...plan,
    toolChain: ordered,
    playerFacingSummary:
      plan.playerFacingSummary || "已按玩家明确子意图补全漏掉的工具步骤。",
  };
}

/** 「去吧台拿酒」→ prepare_poisoned_drink（避免 LLM 编成 spill_drink）。 */
export function augmentBarWineIntent(plan: DirectorPlan, playerPlan: string): DirectorPlan {
  if (!/拿酒|取酒|酒具|吧台.*酒|把酒/i.test(playerPlan)) return plan;
  if (
    plan.toolChain.some(
      (r) => r.toolId === "prepare_poisoned_drink" || r.toolId === "spill_drink",
    )
  ) {
    return plan;
  }
  return {
    ...plan,
    toolChain: [
      ...plan.toolChain,
      {
        toolId: "prepare_poisoned_drink",
        actor: "runner",
        targets: ["wine_bottle"],
        intent: "Prepare drink at bar",
      },
    ],
  };
}

/** 叙事里提到伪造短信但 LLM 漏了 spoof_message 时补上。 */
export function augmentPoisonNarrative(
  plan: DirectorPlan,
  playerPlan: string,
): DirectorPlan {
  if (
    !/伪造|短信|spoof|发了.*短信|植入.*(虚假|伪造)|手机.*(短信|消息|访客)|骇入.*手机/i.test(
      playerPlan,
    )
  ) {
    return plan;
  }
  if (plan.toolChain.some((r) => r.toolId === "spoof_message")) return plan;
  return {
    ...plan,
    toolChain: [
      {
        toolId: "spoof_message",
        actor: "player",
        targets: ["target", "target_phone"],
        intent: "Spoof balcony private meeting",
        params: { message: "Private art deal on the balcony." },
      },
      ...plan.toolChain,
    ],
  };
}

export function alignPoisonDeliveryActor(
  plan: DirectorPlan,
  playerPlan: string,
  world: WorldState,
): DirectorPlan {
  const actor = poisonServeActorForText(playerPlan, world);
  if (actor !== "runner") return plan;
  let changed = false;
  const toolChain = plan.toolChain.map((req) => {
    if (req.toolId !== "serve_poisoned_drink_on_balcony") return req;
    changed = changed || req.actor !== "runner";
    return { ...req, actor: "runner" as const };
  });
  return changed ? { ...plan, toolChain } : plan;
}

export function enforceFinalCommitGate(plan: DirectorPlan, playerPlan: string): DirectorPlan {
  if (playerExplicitlyCommitsFinal(playerPlan)) return plan;
  const toolChain = plan.toolChain.filter((req) => !FINAL_TOOL_IDS.has(req.toolId));
  if (toolChain.length === plan.toolChain.length) return plan;
  return {
    ...plan,
    toolChain,
    playerFacingSummary:
      plan.playerFacingSummary ||
      "收尾动作需要玩家显式确认；当前仅执行准备与遮蔽步骤。",
  };
}

/** ADR-0021: map lethal player text → decline / eliminate; strip misleading substitutes. */
export function augmentLethalIntent(
  plan: DirectorPlan,
  playerPlan: string,
  world: WorldState,
): DirectorPlan {
  const lethal = parseLethalIntent(playerPlan);
  if (!lethal) return plan;

  const stripMisleading = (chain: ToolUseRequest[]) =>
    chain.filter((r) => !MISLEADING_VIOLENCE_SUBSTITUTES.has(r.toolId as ToolId));

  if (lethal.victim === "target") {
    const chain = stripMisleading(plan.toolChain as ToolUseRequest[]);
    const hasDecline = chain.some((r) => r.toolId === "decline_with_guidance");
    const decline = buildDeclineRequest(
      playerPlan,
      "target",
      guidanceKeyForTargetKill(world),
    );
    return {
      ...plan,
      toolChain: hasDecline ? chain : [decline, ...chain],
      feasibility: chain.length || hasDecline ? "partial" : "impossible",
    };
  }

  if (lethal.victim === "guard" || lethal.victim === "guest") {
    const chain = stripMisleading(plan.toolChain as ToolUseRequest[]);
    const hasEliminate = chain.some((r) => r.toolId === "eliminate_threat");
    const eliminate = buildEliminateRequest(playerPlan, lethal.victim);
    return {
      ...plan,
      toolChain: hasEliminate ? chain : [...chain, eliminate],
      feasibility: plan.feasibility === "impossible" ? "partial" : plan.feasibility,
    };
  }

  return plan;
}

export function prepareDirectorPlan(
  plan: DirectorPlan,
  playerPlan: string,
  world: WorldState,
  selection: MapSelection | null,
): DirectorPlan {
  let next = sanitizeUnsupportedFromPlan(plan);
  next = augmentLethalIntent(next, playerPlan, world);
  next = augmentParallelActorsFromStub(next, playerPlan, world, selection);
  next = augmentExplicitToolIntentsFromStub(next, playerPlan, world, selection);
  next = augmentPoisonNarrative(next, playerPlan);
  next = augmentBarWineIntent(next, playerPlan);
  next = augmentGalleryInfiltrate(next, playerPlan, world, selection);
  next = alignPoisonDeliveryActor(next, playerPlan, world);
  next = enforceFinalCommitGate(next, playerPlan);
  if (next.toolChain.length > 0 && plan.feasibility === "impossible") {
    next = { ...next, feasibility: "partial" };
  }
  return next;
}
