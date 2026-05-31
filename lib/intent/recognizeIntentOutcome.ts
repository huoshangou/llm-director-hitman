import {
  buildDeclineRequest,
  buildEliminateRequest,
  guidanceKeyForTargetKill,
  parseLethalIntent,
} from "../director/lethalPolicy";
import { compilePlanFromText } from "../director/planStub";
import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import type { MapSelection } from "../ui/mapSelection";
import type { WorldState } from "../world/worldTypes";
import { cuesForIntentOutcome } from "../presentation/cueForIntentOutcome";
import type { IntentOutcome } from "./intentOutcome";

const POISON_RE = /投毒|下毒|poison|毒酒|毒.*酒|酒.*毒|下药|在.*(酒|吧台|香槟).*毒/i;
const DIRTY_RE =
  /直接.*(干掉|杀|推下|枪杀)|画廊.*(干掉|杀)|干掉目标|枪杀|stab|shoot|推下阳台(?!.*事故)/i;

const SPOOF_HINT_RE =
  /伪造|短信|spoof|假消息|邀约短信|手机.*(约|短信|消息|骇|hack)|骇入.*(手机|目标)|约.*阳台/i;
const POWER_HINT_RE = /配电|断电|停电|电力|power/i;
const CART_HINT_RE = /清洁车|推车|挡视线|cart|视线.*挡/i;

export const NEAREST_POISON_TOOLS: ToolId[] = [
  "prepare_poisoned_drink",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
];

function inferConvertibleTool(text: string): ToolUseRequest | null {
  if (SPOOF_HINT_RE.test(text)) {
    return {
      toolId: "spoof_message",
      actor: "player",
      targets: ["target", "target_phone"],
      intent: "Convert spoof / phone lure intent",
      params: { message: "Private art deal on the balcony." },
    };
  }
  if (POWER_HINT_RE.test(text)) {
    return {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "Convert power diversion intent",
    };
  }
  if (CART_HINT_RE.test(text)) {
    return {
      toolId: "move_cleaning_cart",
      actor: "runner",
      targets: ["cleaning_cart", "gallery"],
      intent: "Convert sightline block intent",
    };
  }
  return null;
}

function toolHint(text: string): ToolId | null {
  if (SPOOF_HINT_RE.test(text)) return "spoof_message";
  if (POWER_HINT_RE.test(text)) return "disable_power_panel";
  if (CART_HINT_RE.test(text)) return "move_cleaning_cart";
  return null;
}

function poisonOutcome(): IntentOutcome {
  const base = {
    status: "convertible" as const,
    summary: "识别为阳台毒酒链；Director 可编排备毒→阳台递酒→阳台结算",
    originalIntent: "poison_balcony",
    convertedTo: {
      toolId: "prepare_poisoned_drink" as const,
      actor: "runner" as const,
      targets: ["wine_bottle"],
      intent: "Poison balcony chain — prepare at bar",
    },
  };
  return { ...base, cues: cuesForIntentOutcome(base) };
}

function dirtyOutcome(): IntentOutcome {
  const base = {
    status: "dirty" as const,
    summary: "识别为直接暴力意图，本批次仅预警不执行",
    risk: "alarm" as const,
  };
  return { ...base, cues: cuesForIntentOutcome(base) };
}

/**
 * Pre/post interpretation layer — does not mutate WorldState or replace validateDirectorPlan.
 */
export function recognizeIntentOutcome(
  planText: string,
  world: WorldState,
  selection: MapSelection | null,
): IntentOutcome | null {
  const text = planText.trim();
  if (!text && !selection) return null;

  const probe = text || "选中项处理";
  if (POISON_RE.test(probe)) return poisonOutcome();

  const lethal = parseLethalIntent(probe);
  if (lethal?.victim === "target") {
    const convertedTo = buildDeclineRequest(
      probe,
      "target",
      guidanceKeyForTargetKill(world),
    );
    const base = {
      status: "convertible" as const,
      summary: "识别为对合同目标的直接暴力；将转译为拒绝并引导阳台链",
      originalIntent: "direct_target_lethal",
      convertedTo,
    };
    return { ...base, cues: cuesForIntentOutcome(base) };
  }
  if (lethal?.victim === "guard" || lethal?.victim === "guest") {
    const convertedTo = buildEliminateRequest(probe, lethal.victim);
    const base = {
      status: "convertible" as const,
      summary: `识别为清除${lethal.victim === "guard" ? "保安" : "宾客"}威胁`,
      originalIntent: `eliminate_${lethal.victim}`,
      convertedTo,
    };
    return { ...base, cues: cuesForIntentOutcome(base) };
  }

  if (DIRTY_RE.test(probe) && !/事故|accident|stage/i.test(probe)) {
    return dirtyOutcome();
  }

  const compiled = compilePlanFromText(text, world, selection);
  if (compiled.ok) {
    const tool = compiled.chain[0];
    const hinted = toolHint(text);
    if (hinted && tool.toolId === hinted) {
      const base = {
        status: "executable" as const,
        summary: `识别为可执行工具：${tool.toolId}`,
        toolRequest: tool,
      };
      return { ...base, cues: cuesForIntentOutcome(base) };
    }
    if (["spoof_message", "disable_power_panel", "move_cleaning_cart"].includes(tool.toolId)) {
      const base = {
        status: "executable" as const,
        summary: `识别为可执行工具：${tool.toolId}`,
        toolRequest: tool,
      };
      return { ...base, cues: cuesForIntentOutcome(base) };
    }
  }

  const converted = inferConvertibleTool(probe);
  if (converted) {
    const base = {
      status: "convertible" as const,
      summary: `意图可转译为 ${converted.toolId}`,
      originalIntent: text || "map selection intent",
      convertedTo: converted,
    };
    return { ...base, cues: cuesForIntentOutcome(base) };
  }

  return null;
}
