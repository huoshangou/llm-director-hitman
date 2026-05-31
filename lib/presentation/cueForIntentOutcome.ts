import type { ToolId } from "../tools/toolTypes";
import type { IntentOutcome, IntentOutcomeCore } from "../intent/intentOutcome";
import type { PresentationCue } from "./presentationCue";

const TOOL_LABEL: Partial<Record<ToolId, string>> = {
  impersonate_staff: "伪装服务员",
  spill_drink: "酒水服务",
  spoof_message: "伪造短信",
  disable_power_panel: "配电干扰",
  move_cleaning_cart: "移动清洁车",
  prepare_poisoned_drink: "吧台备毒",
  serve_poisoned_drink_on_balcony: "阳台递毒酒",
  resolve_poison_on_balcony: "阳台毒发结算",
};

export function cuesForIntentOutcome(outcome: IntentOutcomeCore): PresentationCue[] {
  switch (outcome.status) {
    case "executable":
    case "convertible":
      return [];
    case "locked": {
      const locked = outcome;
      return [
        {
          type: "world_fx",
          effect: "unsupported_locked",
          targetId: locked.relatedObjectIds?.[0],
          text: locked.reason,
        },
        ...(locked.relatedObjectIds ?? []).map(
          (id): PresentationCue => ({
            type: "map_ping",
            targetId: id,
            tone: "locked",
            text: "暂不可用",
          }),
        ),
      ];
    }
    case "out_of_slice":
      if (outcome.recognizedIntent === "poison_food") {
        return [
          {
            type: "world_fx",
            effect: "unsupported_locked",
            targetId: "kitchen",
            text: "本切片无投毒链",
          },
          { type: "map_ping", targetId: "kitchen", tone: "locked", text: "后厨·无投毒链" },
        ];
      }
      return [
        {
          type: "world_fx",
          effect: "unsupported_locked",
          text: outcome.summary,
        },
      ];
    case "dirty":
      return [
        {
          type: "world_fx",
          effect: "unsupported_locked",
          text: "直接行动在本批次仅预警",
        },
        {
          type: "dialogue",
          speaker: "Face",
          text: "别在这里硬来，场面会立刻失控。",
        },
      ];
    default:
      return [];
  }
}

export type IntentFeedLine = {
  speaker: string;
  text: string;
  tone?: "system" | "world" | "warning" | "agent" | "player";
};

export function commandFeedLinesForIntentOutcome(outcome: IntentOutcome): IntentFeedLine[] {
  const lines: IntentFeedLine[] = [];

  switch (outcome.status) {
    case "out_of_slice":
      if (outcome.recognizedIntent === "poison_food") {
        lines.push({ speaker: "OPS", text: "识别：投毒", tone: "system" });
        lines.push({ speaker: "Runner", text: outcome.inWorldReply, tone: "agent" });
        const nearest = outcome.nearestTools
          .map((id) => TOOL_LABEL[id] ?? id)
          .join(" / ");
        lines.push({
          speaker: "NEXT",
          text: `可尝试：${nearest}`,
          tone: "warning",
        });
      } else {
        lines.push({ speaker: "OPS", text: outcome.summary, tone: "system" });
        if (outcome.inWorldReply) {
          lines.push({ speaker: "WORLD", text: outcome.inWorldReply, tone: "world" });
        }
      }
      break;
    case "dirty":
      lines.push({ speaker: "OPS", text: "识别：直接暴力（本批次仅预警）", tone: "warning" });
      lines.push({
        speaker: "Face",
        text: "别在这里硬来，我们需要铺垫和窗口。",
        tone: "agent",
      });
      break;
    case "convertible":
      if (outcome.originalIntent === "poison_balcony") {
        lines.push({ speaker: "OPS", text: "识别：阳台毒酒链", tone: "system" });
        lines.push({
          speaker: "Runner",
          text: "我负责吧台备毒；是否递杯取决于 Victor 是否已经在阳台。",
          tone: "agent",
        });
        lines.push({
          speaker: "NEXT",
          text: "备毒 → 引阳台 → 递杯 → 结算",
          tone: "warning",
        });
      } else {
        lines.push({
          speaker: "OPS",
          text: `意图可转译 → ${outcome.convertedTo.toolId}`,
          tone: "system",
        });
      }
      break;
    case "executable":
      lines.push({ speaker: "OPS", text: outcome.summary, tone: "system" });
      break;
    case "locked":
      lines.push({ speaker: "OPS", text: outcome.summary, tone: "warning" });
      lines.push({ speaker: "NEXT", text: outcome.next, tone: "warning" });
      break;
    default:
      break;
  }

  return lines;
}

export function mergePresentationCues(...groups: PresentationCue[][]): PresentationCue[] {
  const seen = new Set<string>();
  const out: PresentationCue[] = [];
  for (const group of groups) {
    for (const cue of group) {
      const key = JSON.stringify(cue);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cue);
    }
  }
  return out;
}
