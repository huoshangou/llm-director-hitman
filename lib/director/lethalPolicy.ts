import type { ActorId, FieldAgentId, NpcId } from "../world/worldTypes";
import type { ToolUseRequest } from "../tools/toolTypes";

export type GuidanceKey =
  | "target_needs_balcony_setup"
  | "target_use_final_chain"
  | "violence_substitute_forbidden"
  | "need_stealth_for_guard";

export const GUIDANCE_TEXT: Record<GuidanceKey, string> = {
  target_needs_balcony_setup:
    "不行——合同要阳台上的意外场面。先把他引到阳台，再走栏杆或毒酒链，不能在大堂/画廊硬来。",
  target_use_final_chain:
    "目标不能这样处理。先凑齐阳台前置，再用事故或毒酒收尾。",
  violence_substitute_forbidden:
    "配电/换装解决不了你要的「清除威胁」。要说清对谁、在什么窗口动手。",
  need_stealth_for_guard:
    "现在下手只会暴露。先断电引开保安，或等他在后厨/调查时再清威胁。",
};

const LETHAL_RE =
  /杀(?:了|掉|死)?|干掉|刺杀|枪杀|shoot|stab|灭口|勒死|闷死|刺(?:杀)?\s*保安|kill\s*(?:the\s+)?guard/i;

const TARGET_RE = /Victor|维克多|韦尔|目标(?!\s*手机)|\btarget\b/i;
const GUARD_RE = /保安|guard|Mara/i;
const GUEST_RE = /宾客|guest|客人/i;

const ACCIDENT_EXEMPT_RE = /事故|accident|stage|坠楼|推下.*栏杆/i;

export type LethalIntent = {
  victim: NpcId | null;
  text: string;
};

export function parseLethalIntent(text: string): LethalIntent | null {
  const probe = text.trim();
  if (!probe || !LETHAL_RE.test(probe)) return null;
  if (ACCIDENT_EXEMPT_RE.test(probe)) return null;

  if (GUARD_RE.test(probe)) return { victim: "guard", text: probe };
  if (GUEST_RE.test(probe)) return { victim: "guest", text: probe };
  if (TARGET_RE.test(probe)) return { victim: "target", text: probe };

  return { victim: null, text: probe };
}

export function pickLethalActor(text: string, prefer: FieldAgentId = "runner"): ActorId {
  if (/face|脸|社交/i.test(text)) return "face";
  if (/runner|跑者|后勤/i.test(text)) return "runner";
  return prefer;
}

export function guidanceKeyForTargetKill(world?: { npcs: { target: { location: string } } }): GuidanceKey {
  if (world?.npcs.target.location === "balcony") {
    return "target_use_final_chain";
  }
  return "target_needs_balcony_setup";
}

export const MISLEADING_VIOLENCE_SUBSTITUTES = new Set([
  "disable_power_panel",
  "impersonate_staff",
  "redirect_guard_attention",
  "create_complaint",
  "tamper_balcony_rail",
  "stage_accident",
  "resolve_poison_on_balcony",
  "serve_poisoned_drink_on_balcony",
]);

export function buildDeclineRequest(
  text: string,
  victim: NpcId,
  guidanceKey: GuidanceKey,
): ToolUseRequest {
  return {
    toolId: "decline_with_guidance",
    actor: pickLethalActor(text, "face"),
    targets: [victim],
    intent: "Decline lethal request with guidance",
    params: { guidanceKey },
  };
}

export function buildEliminateRequest(text: string, victim: NpcId): ToolUseRequest {
  return {
    toolId: "eliminate_threat",
    actor: pickLethalActor(text, "runner"),
    targets: [victim],
    intent: `Eliminate ${victim} when stealth allows`,
  };
}
