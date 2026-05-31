import type { DirectorValidation } from "../director/validateDirectorPlan";
import type { ToolUseRequest, ToolUseResult } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";
import { planNextHint, type RejectedStep } from "../ui/planNextHint";

export type FieldAgentReply = {
  id: string;
  speaker: "face" | "runner" | "hacker" | "system";
  replyType: "ack" | "blocked" | "done" | "warning" | "suggestion";
  text: string;
  groundedIn: {
    toolId?: string;
    actor?: string;
    resultStatus?: "success" | "partial" | "failed" | "blocked";
    reason?: string;
  };
};

function speakerForActor(actor: string): FieldAgentReply["speaker"] {
  if (actor === "face" || actor === "runner") return actor;
  if (actor === "player" || actor === "hacker") return "hacker";
  return "system";
}

function shortReason(reason: string | undefined): string {
  if (!reason) return "当前条件不成立";
  if (reason.includes("observed")) return "保安视线还没断";
  if (reason.includes("not near")) return "我还没到位";
  if (reason.includes("Alert")) return "场面太紧";
  if (reason.includes("Player lacks")) return "权限还没拿到";
  if (reason.includes("not at balcony")) return "目标还没到阳台";
  if (reason.includes("tampered")) return "栏杆还没处理";
  if (reason.includes("Sightline")) return "阳台视线还没清";
  return reason.slice(0, 36);
}

function successText(
  request: ToolUseRequest,
  result?: ToolUseResult,
  world?: WorldState,
): string {
  if (request.actor === "face") {
    if (request.toolId === "redirect_guard_attention") {
      return "我接上话题，把保安注意力往行政问题上带。";
    }
    if (request.toolId === "infiltrate_gallery") {
      return "我趁空档进画廊了，在人群里贴着 Victor 侧活动。";
    }
    if (request.toolId === "serve_poisoned_drink_on_balcony") {
      return "阳台那杯已递出去，他当成私密赏画单杯。";
    }
    if (request.toolId === "resolve_poison_on_balcony") {
      return "他在阳台倒下，场面像突发不适。";
    }
    if (request.toolId === "lure_with_private_meeting") {
      if (world?.npcs.target.location === "balcony") {
        return "目标已经在阳台了；下一动递杯或等结算。";
      }
      if ((world?.npcs.target.routeBias.balcony ?? 0) >= 12) {
        return "他已经在往阳台挪；本 turn 结束后可递杯。";
      }
      const partly = result?.generatedEvents?.some((e) => e.text?.includes("only partly buys"));
      return partly
        ? "邀约只吃了半套——补一条伪造短信或名单会更稳。"
        : "我会把目标往阳台窗口引，身份叙事已对齐。";
    }
    return "我接手社交掩护，尽量让现场保持自然。";
  }

  if (request.toolId === "decline_with_guidance") {
    return result?.reason?.slice(0, 60) ?? "这步我不接，按合同走阳台链。";
  }
  if (request.toolId === "eliminate_threat") {
    return "威胁已处理，通道应该松了。";
  }

  if (request.actor === "runner") {
    if (request.toolId === "disable_power_panel") {
      return "收到，我动配电，动作会压在监控盲点里。";
    }
    if (request.toolId === "tamper_balcony_rail") {
      return "我去处理栏杆，只做成结构疲劳的样子。";
    }
    if (request.toolId === "move_cleaning_cart") {
      return "我推清洁车挡线，别让保安看见阳台边。";
    }
    if (request.toolId === "spill_drink") {
      return "我制造洒酒点，现场会像服务事故。";
    }
    if (request.toolId === "prepare_poisoned_drink") {
      if (world?.npcs.target.location === "balcony") {
        return "吧台酒具已处理；Victor 已在阳台，下一动递杯。";
      }
      return "吧台酒具已处理，等 Victor 上阳台再递杯。";
    }
    return "收到，我在现场执行，尽量不抬高风险。";
  }

  if (request.toolId === "modify_guest_list") {
    return "终端记录已写入；Face 现在有 VIP 联络背书可用。";
  }
  if (request.toolId === "spoof_message") {
    return "伪造消息已送达，目标手机会成为诱导锚点。";
  }
  return "远程指令已写入，信号层保持低噪声。";
}

function blockedText(request: ToolUseRequest, reason?: string): string {
  const r = shortReason(reason);
  if (request.toolId === "decline_with_guidance") {
    return reason?.slice(0, 60) ?? "这步我不接，先铺阳台前置。";
  }
  if (request.toolId === "eliminate_threat") {
    if (r.includes("co-located") || r.includes("not co")) {
      return "我还没和目标的贴身位对齐，得先换区或等窗口。";
    }
    if (r.includes("Guard still")) {
      return "保安视线还在，先断电或引开再清威胁。";
    }
    return `清威胁卡住：${r}。`;
  }
  if (request.toolId === "infiltrate_gallery") {
    return r.includes("guard") || r.includes("Gallery")
      ? "画廊门口还烫，保安视线没挪开——先配电或行政投诉引开他。"
      : `混不进画廊：${r}。先清保安视线。`;
  }
  if (request.actor === "face") {
    return `我现在不能硬接这步：${r}。先换个铺垫。`;
  }
  if (request.actor === "runner") {
    return `我先不动，${r}。等窗口开了再执行。`;
  }
  if (request.actor === "player" || request.actor === "hacker") {
    return `远程权限没打通：${r}。先补前置条件。`;
  }
  return `指令暂时卡住：${r}。`;
}

function trimReply(text: string): string {
  return text.length <= 60 ? text : `${text.slice(0, 58)}…`;
}

export function fieldAgentReplyForToolResult(
  result: ToolUseResult,
  world?: WorldState,
): FieldAgentReply {
  const request = result.request;
  const ok = result.status === "success" || result.status === "partial";
  return {
    id: `reply_${request.toolId}_${result.status}`,
    speaker: speakerForActor(request.actor),
    replyType: ok ? "done" : "blocked",
    text: trimReply(
      ok ? successText(request, result, world) : blockedText(request, result.reason),
    ),
    groundedIn: {
      toolId: request.toolId,
      actor: request.actor,
      resultStatus: result.status,
      reason: result.reason,
    },
  };
}

export function fieldAgentRepliesForToolResults(
  results: ToolUseResult[],
  world?: WorldState,
): FieldAgentReply[] {
  return results.map((r) => fieldAgentReplyForToolResult(r, world));
}

export function fieldAgentReplyForRejectedStep(
  world: WorldState,
  rejected: RejectedStep | null | undefined,
): FieldAgentReply | null {
  if (!rejected) return null;
  const hint = planNextHint(world, rejected);
  const reason = rejected.reasons[0];
  const text = hint
    ? hint.replace(/^NEXT\s*\/\s*/i, "").trim()
    : blockedText(rejected.request, reason);
  return {
    id: `reply_${rejected.request.toolId}_rejected`,
    speaker: speakerForActor(rejected.request.actor),
    replyType: hint ? "suggestion" : "blocked",
    text: trimReply(text),
    groundedIn: {
      toolId: rejected.request.toolId,
      actor: rejected.request.actor,
      resultStatus: "blocked",
      reason,
    },
  };
}

export function fieldAgentRepliesForValidation(
  world: WorldState,
  validation: Pick<DirectorValidation, "rejected"> | null | undefined,
): FieldAgentReply[] {
  const reply = fieldAgentReplyForRejectedStep(world, validation?.rejected?.[0] ?? null);
  return reply ? [reply] : [];
}
