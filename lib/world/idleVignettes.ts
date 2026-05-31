import { makeId } from "../utils/id";
import { isActorOnReactiveHold } from "./characterPresence";
import type { GameEvent, LocationId, NpcId, NpcState, WorldState } from "./worldTypes";

type IdleVignette = {
  actor: NpcId;
  taskType: string;
  attentionMode: NpcState["attentionMode"];
  attentionTarget?: string;
  text: string;
};

function setSameLocationTask(npc: NpcState, type: string, seconds: number) {
  npc.currentTask = {
    id: makeId("task"),
    type,
    location: npc.location,
    remainingSeconds: seconds,
  };
}

function eventFor(vignette: IdleVignette): GameEvent {
  return {
    id: makeId("event"),
    t: 0,
    type: "attention_shift",
    actor: vignette.actor,
    text: vignette.text,
    severity: "low",
  };
}

function vignetteForLocation(world: WorldState, actor: NpcId): IdleVignette | null {
  const npc = world.npcs[actor];
  const location = npc.location as LocationId;

  if (actor === "target") {
    if (location === "gallery") {
      return {
        actor,
        taskType: "idle_check_phone",
        attentionMode: "socializing",
        attentionTarget: "target_phone",
        text: "目标低头确认手机，又把屏幕扣回掌心",
      };
    }
    if (location === "balcony") {
      return {
        actor,
        taskType: "idle_seek_air",
        attentionMode: "distracted",
        attentionTarget: "balcony_rail",
        text: "目标靠近阳台边缘透气，视线短暂离开人群",
      };
    }
    return {
      actor,
      taskType: "idle_hold_social",
      attentionMode: "socializing",
      text: "目标维持社交姿态，注意力仍在人群里",
    };
  }

  if (actor === "guard") {
    return {
      actor,
      taskType: "idle_scan_security",
      attentionMode: "watching_security",
      attentionTarget: location === "lobby" ? "guest_list_terminal" : location,
      text: "保安扫了一眼监控与入口名单，暂时没有离岗",
    };
  }

  if (actor === "waiter") {
    return {
      actor,
      taskType: "idle_bar_reset",
      attentionMode: "idle",
      attentionTarget: location === "bar" ? "wine_glass" : location,
      text: "服务生整理杯具，吧台动线保持打开",
    };
  }

  if (actor === "cleaner") {
    return {
      actor,
      taskType: "idle_cart_check",
      attentionMode: "idle",
      attentionTarget: "cleaning_cart",
      text: "保洁确认清洁车位置，没有离开当前区域",
    };
  }

  return {
    actor,
    taskType: "idle_guest_murmur",
    attentionMode: "socializing",
    attentionTarget: world.npcs.guard.location === location ? "guard" : undefined,
    text: "宾客压低声音闲聊，现场噪声轻微上升",
  };
}

const ACTOR_ORDER: NpcId[] = ["target", "guard", "waiter", "guest", "cleaner"];

export function advanceIdleVignettes(world: WorldState): GameEvent[] {
  const slot = Math.floor(world.timeSeconds / 10) % ACTOR_ORDER.length;
  const actor = ACTOR_ORDER[slot];
  if (isActorOnReactiveHold(world, actor)) return [];

  const vignette = vignetteForLocation(world, actor);
  if (!vignette) return [];

  const npc = world.npcs[vignette.actor];
  npc.attentionMode = vignette.attentionMode;
  npc.attentionTarget = vignette.attentionTarget;
  setSameLocationTask(npc, vignette.taskType, 6);

  return [eventFor(vignette)];
}
