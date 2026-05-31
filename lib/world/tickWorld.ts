import { advanceAgentRoutines } from "./agentRoutines";
import { travelNpcTo } from "./characterPresence";
import { advanceNpcRoutines } from "./npcRoutines";
import { ROUTE_BIAS_THRESHOLD, syncPresenceLists } from "./selectors";
import type { GameEvent, LocationId, WorldState } from "./worldTypes";

const LOC_ZH: Record<LocationId, string> = {
  lobby: "大堂",
  bar: "吧台",
  kitchen: "厨房",
  gallery: "画廊",
  balcony: "阳台",
};

export type TickWorldOptions = {
  /** Play Idle 不自动巡逻 Face/Runner（仅 Tool 驱动） */
  advanceAgents?: boolean;
  /** Play 待机：不更新 npc.location（避免区锚点直线 lerp 穿墙） */
  playIdle?: boolean;
};

export function tickWorld(
  world: WorldState,
  opts?: TickWorldOptions,
): { world: WorldState; events: GameEvent[] } {
  const next = structuredClone(world);
  const routineOpts = opts?.playIdle ? { playIdle: true as const } : undefined;
  const events: GameEvent[] = [...advanceNpcRoutines(next, routineOpts)];
  if (opts?.advanceAgents !== false) {
    events.push(...advanceAgentRoutines(next));
  }

  for (const npc of Object.values(next.npcs)) {
    if (npc.currentTask && npc.currentTask.remainingSeconds > 0) {
      npc.currentTask.remainingSeconds = Math.max(0, npc.currentTask.remainingSeconds - 1);
      // 任务倒计时结束后再换区，避免一分配任务就瞬移（开局/环境 tick 位置漂移）
      const targetMayMove = !opts?.playIdle || npc.id === "target";
      if (
        targetMayMove &&
        npc.currentTask.remainingSeconds === 0 &&
        npc.currentTask.location &&
        npc.location !== npc.currentTask.location
      ) {
        travelNpcTo(
          next,
          npc.id,
          npc.currentTask.location,
          events,
          `${npc.name} 前往 ${LOC_ZH[npc.currentTask.location] ?? npc.currentTask.location}`,
        );
      }
    }

    const balconyBias = npc.routeBias.balcony ?? 0;
    const targetMayMove = !opts?.playIdle || npc.id === "target";
    const biasThreshold = npc.id === "target" ? 38 : ROUTE_BIAS_THRESHOLD;
    if (
      targetMayMove &&
      balconyBias >= biasThreshold &&
      npc.location !== "balcony"
    ) {
      if (npc.id === "target" && next.alertLevel !== "searching" && next.alertLevel !== "alarm") {
        travelNpcTo(next, "target", "balcony", events, "目标走向阳台");
      }
    }
  }

  syncPresenceLists(next);
  next.timeSeconds += 1;
  return { world: next, events };
}
