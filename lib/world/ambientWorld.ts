import { advanceIdleVignettes } from "./idleVignettes";
import { advanceNpcRoutines } from "./npcRoutines";
import { syncPresenceLists } from "./selectors";
import { tickWorld } from "./tickWorld";
import type { GameEvent, WorldState } from "./worldTypes";

const MAX_LOG = 80;

/** Play Idle：每 pass 只推进 1 个 tick（慢节奏） */
export const IDLE_TICKS_PER_PASS = 1;

/** @deprecated Play 请用 runIdlePass */
export const AMBIENT_TICKS_PER_PULSE = IDLE_TICKS_PER_PASS;

function tagIdleEvents(events: GameEvent[]): GameEvent[] {
  return events.map((e) => ({
    ...e,
    text: e.text
      ? e.text.startsWith("[环境]")
        ? e.text
        : `[环境] ${e.text}`
      : "[环境] 场面更新",
  }));
}

/** Play Idle 慢速脉冲（ADR-0014） */
export function runIdlePass(world: WorldState): { world: WorldState; events: GameEvent[] } {
  let next = structuredClone(world);
  const allEvents: GameEvent[] = [];

  for (let i = 0; i < IDLE_TICKS_PER_PASS; i++) {
    const tick = tickWorld(next, { advanceAgents: false, playIdle: true });
    next = tick.world;
    allEvents.push(...tick.events);
  }

  allEvents.push(...advanceIdleVignettes(next));

  const events = tagIdleEvents(allEvents);
  next.eventLog = [...next.eventLog, ...events].slice(-MAX_LOG);
  return { world: next, events };
}

/** @deprecated 使用 runIdlePass */
export function runAmbientStep(world: WorldState): { world: WorldState; events: GameEvent[] } {
  return runIdlePass(world);
}

/** @deprecated 使用 runIdlePass */
export function runAmbientBurst(
  world: WorldState,
  _ticks: number = IDLE_TICKS_PER_PASS,
): { world: WorldState; events: GameEvent[] } {
  return runIdlePass(world);
}

/** 开局：只分配 Default/Reactive 任务，不 tick */
export function warmupAmbientTasks(world: WorldState): WorldState {
  const next = structuredClone(world);
  advanceNpcRoutines(next, { playIdle: true });
  syncPresenceLists(next);
  return next;
}

/** @deprecated */
export function primeAmbientWorld(world: WorldState): WorldState {
  return runIdlePass(world).world;
}
