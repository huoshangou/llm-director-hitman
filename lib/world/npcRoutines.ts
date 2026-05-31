import { makeId } from "../utils/id";
import { reactiveTaskType, travelNpcTo } from "./characterPresence";
import { getSceneSignals } from "./sceneSignals";
import { syncPresenceLists } from "./selectors";
import type { GameEvent, LocationId, NpcId, NpcState, WorldState } from "./worldTypes";

const LOC_ZH: Record<LocationId, string> = {
  lobby: "大堂",
  bar: "吧台",
  kitchen: "厨房",
  gallery: "画廊",
  balcony: "阳台",
};

function pushEvent(events: GameEvent[], partial: Omit<GameEvent, "id" | "t">) {
  events.push({ id: makeId("event"), t: 0, ...partial });
}

export type NpcRoutineOptions = {
  /** Play 待机：不分配跨区任务（避免直线 lerp 穿墙） */
  playIdle?: boolean;
};

function assignTask(
  npc: NpcState,
  type: string,
  location: LocationId,
  seconds: number,
  opts?: NpcRoutineOptions,
) {
  if (opts?.playIdle && location !== npc.location) {
    const targetSeekBalcony = npc.id === "target" && type === "seek_balcony";
    if (!targetSeekBalcony) {
      location = npc.location;
    }
  }
  if (
    npc.currentTask &&
    npc.currentTask.type === type &&
    npc.currentTask.location === location &&
    npc.currentTask.remainingSeconds > 0
  ) {
    return;
  }
  npc.currentTask = {
    id: makeId("task"),
    type,
    location,
    remainingSeconds: seconds,
  };
}

/** Reactive：全场停电 */
function reactPowerOutage(
  world: WorldState,
  events: GameEvent[],
  opts?: NpcRoutineOptions,
): boolean {
  const { powerOutage } = getSceneSignals(world);
  if (!powerOutage) return false;

  const guard = world.npcs.guard;
  const guardAlreadyOnPower =
    guard.location === "kitchen" &&
    (guard.currentTask?.type?.includes("inspect_power") ||
      guard.currentTask?.type?.startsWith("reactive:"));

  if (!guardAlreadyOnPower) {
    travelNpcTo(world, "guard", "kitchen", events, "保安赶往厨房查配电");
    assignTask(guard, reactiveTaskType("inspect_power"), "kitchen", 24, opts);
    guard.attentionMode = "investigating";
    guard.attentionTarget = "power_panel";
  }

  const waiter = world.npcs.waiter;
  if (waiter.attentionMode !== "panic") {
    waiter.attentionMode = "panic";
    assignTask(waiter, "hold_bar", "bar", 8, opts);
  }

  const guest = world.npcs.guest;
  if (guest.currentTask?.type !== "react_power" || guest.currentTask.remainingSeconds <= 0) {
    guest.attentionMode = "distracted";
    assignTask(guest, "react_power", guest.location, 6, opts);
    pushEvent(events, {
      type: "attention_shift",
      actor: "guest",
      text: "宾客在大堂议论停电",
    });
  }

  const target = world.npcs.target;
  target.attentionMode = "distracted";
  assignTask(target, "react_power", target.location, 6, opts);

  const cleaner = world.npcs.cleaner;
  assignTask(cleaner, "inspect_power", "kitchen", 8, opts);
  cleaner.attentionMode = "investigating";

  return true;
}

function reactSpill(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions): boolean {
  const { spillAt } = getSceneSignals(world);
  if (!spillAt) return false;

  const cleaner = world.npcs.cleaner;
  if (cleaner.currentTask?.type === "clean_spill" && cleaner.currentTask.location === spillAt) {
    return false;
  }

  assignTask(cleaner, "clean_spill", spillAt, 8, opts);
  pushEvent(events, {
    type: "attention_shift",
    actor: "cleaner",
    text: `保洁处理 ${LOC_ZH[spillAt]} 洒酒`,
  });
  return true;
}

function finishSpillCleanup(world: WorldState, events: GameEvent[]) {
  const cleaner = world.npcs.cleaner;
  const task = cleaner.currentTask;
  if (task?.type !== "clean_spill" || (task.remainingSeconds ?? 0) > 0) return;

  const loc = task.location;
  if (loc && world.locations[loc]) {
    const tags = world.locations[loc].tags.filter((t) => t !== "spill");
    world.locations[loc] = { ...world.locations[loc], tags: tags as never };
  }
  if (world.objects.wine_glass) {
    world.objects.wine_glass.state = { ...world.objects.wine_glass.state, spilled: false };
  }
  cleaner.currentTask = undefined;
  pushEvent(events, {
    type: "object_state_change",
    actor: "cleaner",
    text: `${LOC_ZH[loc ?? "bar"]} 洒酒已清理`,
  });
}

function reactAlert(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions): boolean {
  const { alertElevated } = getSceneSignals(world);
  if (!alertElevated) return false;

  const guard = world.npcs.guard;
  if (!["investigating", "panic"].includes(guard.attentionMode)) {
    guard.attentionMode = "watching_security";
    guard.attentionTarget = "lobby";
  }

  const guest = world.npcs.guest;
  if (guest.location !== guard.location && guard.location === "lobby") {
    assignTask(guest, "rubberneck", "lobby", 6, opts);
    guest.attentionMode = "distracted";
    pushEvent(events, {
      type: "attention_shift",
      actor: "guest",
      text: "宾客被警戒气氛吸引到大堂",
    });
  }
  return true;
}

/** 目标：仅 Belief / RouteBias 驱动，无随机应酬 */
function routineTarget(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions) {
  const target = world.npcs.target;
  if (target.stateTags.includes("handled")) return;

  const balconyBias = target.routeBias.balcony ?? 0;
  const wantsPrivate = target.beliefs.some(
    (b) => b.source === "spoof" || b.predicate.includes("meeting"),
  );

  if (
    target.currentTask?.type === "seek_balcony" &&
    (target.currentTask.remainingSeconds ?? 0) > 0
  ) {
    return;
  }

  if (balconyBias >= 12 && target.location !== "balcony") {
    const step: LocationId =
      target.location === "gallery"
        ? "balcony"
        : target.location === "bar"
          ? "gallery"
          : "gallery";
    const seconds = balconyBias >= 35 ? 2 : 6;
    assignTask(target, "seek_balcony", step, seconds, opts);
    target.attentionMode = "socializing";
    pushEvent(events, {
      type: "attention_shift",
      actor: "target",
      text: wantsPrivate ? "目标想找个安静处看消息" : "目标在找更私密的角落",
    });
    return;
  }

  if (!target.currentTask || target.currentTask.remainingSeconds <= 0) {
    target.attentionMode = "socializing";
    assignTask(target, "hold_social", target.location, 8, opts);
  }
}

/** 保安：默认只守大堂；巡逻不随机换区到吧台 */
function routineGuard(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions) {
  const guard = world.npcs.guard;
  if (["handling_complaint", "investigating", "panic"].includes(guard.attentionMode)) {
    return;
  }

  if (!opts?.playIdle && guard.location !== "lobby") {
    assignTask(guard, "return_post", "lobby", 6, opts);
    guard.attentionMode = "watching_area";
    pushEvent(events, {
      type: "attention_shift",
      actor: "guard",
      text: "保安返回大堂岗位",
    });
    return;
  }

  if (!guard.currentTask || guard.currentTask.remainingSeconds <= 0) {
    guard.attentionMode = "watching_security";
    guard.attentionTarget = "gallery";
    assignTask(guard, "lobby_watch", guard.location, 10, opts);
  }
}

/** 服务生：吧台 ↔ 厨房补货 */
function routineWaiter(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions) {
  const waiter = world.npcs.waiter;
  if (["panic", "investigating"].includes(waiter.attentionMode)) return;

  if (!waiter.currentTask || waiter.currentTask.remainingSeconds <= 0) {
    if (opts?.playIdle) {
      assignTask(waiter, "hold_bar", waiter.location, 8, opts);
      waiter.attentionMode = "idle";
      return;
    }
    const dest: LocationId = waiter.location === "bar" ? "kitchen" : "bar";
    assignTask(waiter, "restock", dest, 6, opts);
    waiter.attentionMode = "idle";
    if (dest !== waiter.location) {
      pushEvent(events, {
        type: "attention_shift",
        actor: "waiter",
        text: `服务生去${LOC_ZH[dest]}补货`,
      });
    }
  }
}

/** 保洁：无洒酒时吧台区待命 */
function routineCleaner(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions) {
  const cleaner = world.npcs.cleaner;
  if (cleaner.currentTask?.type === "clean_spill") return;

  if (!cleaner.currentTask || cleaner.currentTask.remainingSeconds <= 0) {
    const dest: LocationId = cleaner.location === "bar" ? "bar" : "bar";
    assignTask(cleaner, "standby", dest, 8, opts);
  }
}

/** 宾客：慢节奏；先大堂，久后可能去吧台（非随机抽奖） */
function routineGuest(world: WorldState, events: GameEvent[], opts?: NpcRoutineOptions) {
  const guest = world.npcs.guest;
  const guard = world.npcs.guard;

  if (
    ["investigating", "watching_security"].includes(guard.attentionMode) &&
    guest.location !== guard.location &&
    guard.location === "lobby"
  ) {
    assignTask(guest, "rubberneck", "lobby", 6, opts);
    guest.attentionMode = "distracted";
    return;
  }

  if (guest.currentTask && guest.currentTask.remainingSeconds > 0) return;

  if (!opts?.playIdle && guest.location === "lobby" && world.timeSeconds >= 24) {
    assignTask(guest, "social_bar", "bar", 8, opts);
    guest.attentionMode = "socializing";
    pushEvent(events, {
      type: "attention_shift",
      actor: "guest",
      text: "宾客想去吧台喝一杯",
    });
    return;
  }

  assignTask(guest, "hold_lobby", guest.location, 10, opts);
  guest.attentionMode = "socializing";
}

/**
 * Reactive 优先，再 Default 例行（ADR-0014）。
 * 禁止无来源 random patrol / mingle。
 */
export function advanceNpcRoutines(
  world: WorldState,
  opts?: NpcRoutineOptions,
): GameEvent[] {
  const events: GameEvent[] = [];

  if (reactPowerOutage(world, events, opts)) {
    syncPresenceLists(world);
    return events;
  }
  reactSpill(world, events, opts);
  reactAlert(world, events, opts);
  finishSpillCleanup(world, events);

  routineTarget(world, events, opts);
  routineGuard(world, events, opts);
  routineWaiter(world, events, opts);
  routineCleaner(world, events, opts);
  routineGuest(world, events, opts);

  syncPresenceLists(world);
  return events;
}
