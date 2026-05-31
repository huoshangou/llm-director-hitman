import type { ToolUseResult } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";
import type { InjectEntry } from "./directorTypes";

const ALERT_RANK: Record<string, number> = {
  calm: 0,
  curious: 1,
  suspicious: 2,
  searching: 3,
  lockdown: 4,
  alarm: 5,
};

export function evaluateInjections(
  world: WorldState,
  result: ToolUseResult,
  stepIndex: number,
): InjectEntry[] {
  const entries: InjectEntry[] = [];
  const turn = world.turn;

  if (ALERT_RANK[world.alertLevel] >= ALERT_RANK.searching) {
    entries.push({
      beatId: "security_review",
      priority: 8,
      ttlTurns: 3,
      injectedAtTurn: turn,
      reason: `警戒升至 ${world.alertLevel}`,
    });
  }

  if (result.status === "blocked" || result.status === "failed") {
    entries.push({
      beatId: "trace_risk",
      priority: 6,
      ttlTurns: 2,
      injectedAtTurn: turn,
      reason: `${result.request.toolId} ${result.status}`,
    });
  }

  if (
    result.request.toolId === "spoof_message" &&
    (result.status === "success" || result.status === "partial")
  ) {
    entries.push({
      beatId: "lure_window",
      priority: 5,
      ttlTurns: 2,
      injectedAtTurn: turn,
      reason: "短信信念已植入",
    });
  }

  if (
    result.request.toolId === "tamper_balcony_rail" &&
    (result.status === "success" || result.status === "partial") &&
    world.npcs.target.location === "balcony"
  ) {
    entries.push({
      beatId: "accident_window",
      priority: 10,
      ttlTurns: 2,
      injectedAtTurn: turn,
      reason: "目标在阳台且栏杆已动",
    });
  }

  if (result.request.toolId === "spill_drink" && result.status === "success") {
    entries.push({
      beatId: "cleaner_divert",
      priority: 4,
      ttlTurns: 2,
      injectedAtTurn: turn,
      reason: "画廊泼酒",
    });
  }

  void stepIndex;
  return entries;
}

export function mergeInjectQueue(queue: InjectEntry[], incoming: InjectEntry[]): InjectEntry[] {
  const merged = [...queue, ...incoming];
  merged.sort((a, b) => b.priority - a.priority);
  return merged;
}

export function expireInjections(queue: InjectEntry[], currentTurn: number): {
  queue: InjectEntry[];
  expired: InjectEntry[];
} {
  const kept: InjectEntry[] = [];
  const expired: InjectEntry[] = [];
  for (const e of queue) {
    if (currentTurn - e.injectedAtTurn > e.ttlTurns) expired.push(e);
    else kept.push(e);
  }
  return { queue: kept, expired };
}

const INJECT_NARRATIVE: Record<string, string> = {
  security_review: "🃏 注入：保安主管开始复盘监控——下一动必须更干净。",
  trace_risk: "🃏 注入：数字痕迹上升，Hacker 通道变窄。",
  lure_window: "🃏 注入：目标对私密会面的窗口打开。",
  accident_window: "🃏 注入：阳台事故窗口——终幕优先级拉满。",
  cleaner_divert: "🃏 注入：保洁动线被泼酒劫持，视线出现空档。",
};

export function consumeInjectHead(
  queue: InjectEntry[],
  tension: number,
): { queue: InjectEntry[]; lines: string[]; tensionDelta: number } {
  if (!queue.length) return { queue, lines: [], tensionDelta: 0 };
  if (tension > 70 && queue[0]!.priority < 8) {
    return { queue, lines: [`🎭 导演：张力 ${Math.round(tension)}，低优先级注入暂缓`], tensionDelta: 0 };
  }
  const head = queue[0]!;
  const narrative = INJECT_NARRATIVE[head.beatId] ?? `🃏 注入 [${head.beatId}]：${head.reason}`;
  return {
    queue: queue.slice(1),
    lines: [narrative, `   （优先级 ${head.priority} · TTL ${head.ttlTurns} turn）`],
    tensionDelta: head.priority >= 8 ? 12 : 6,
  };
}
