import { makeId } from "../utils/id";
import { findLocationPath, pathHopLabel } from "./locationPath";
import type { FieldAgentId, GameEvent, LocationId, NpcId, WorldState } from "./worldTypes";
import type { WorldDelta } from "../tools/toolTypes";

const LOC_ZH: Record<LocationId, string> = {
  lobby: "大堂",
  bar: "吧台",
  kitchen: "厨房",
  gallery: "画廊",
  balcony: "阳台",
};

/** Tags on currentTask.type — while active, idle vignettes must not reset attention. */
export const REACTIVE_TASK_PREFIX = "reactive:";

export function reactiveTaskType(kind: string): string {
  return `${REACTIVE_TASK_PREFIX}${kind}`;
}

export function isReactiveTaskType(type: string | undefined): boolean {
  return !!type && type.startsWith(REACTIVE_TASK_PREFIX);
}

/** NPC immediate travel (reactive beats). Mutates npc in place for routines; prefer delta in resolvers. */
export function travelNpcTo(
  world: WorldState,
  npcId: NpcId,
  to: LocationId,
  events: GameEvent[],
  text?: string,
): boolean {
  const npc = world.npcs[npcId];
  if (npc.location === to) return false;
  const from = npc.location;
  const hops = buildNpcPathEvents(npcId, from, to, world.locations, text);
  events.push(...hops);
  npc.location = to;
  return true;
}

/** Field agent immediate travel. */
export function travelFieldAgentTo(
  world: WorldState,
  agentId: FieldAgentId,
  to: LocationId,
  events: GameEvent[],
  text?: string,
): boolean {
  const agent = world.agents[agentId];
  if (agent.location === to) return false;
  const from = agent.location;
  const hops = buildAgentPathEvents(agentId, from, to, world.locations, text);
  events.push(...hops);
  agent.location = to;
  return true;
}

/** Build travel events without mutating world (for ToolUseResult deltas). */
export function travelNpcEvents(
  from: LocationId,
  to: LocationId,
  npcId: NpcId,
  text: string,
): GameEvent[] {
  if (from === to) return [];
  return [
    {
      id: makeId("event"),
      t: 0,
      type: "npc_move",
      actor: npcId,
      from,
      to,
      text,
    },
  ];
}

export function travelFieldAgentEvents(
  from: LocationId,
  to: LocationId,
  agentId: FieldAgentId,
  locations: WorldState["locations"],
  text?: string,
): GameEvent[] {
  return buildAgentPathEvents(agentId, from, to, locations, text);
}

/** Corridor walk: one agent_move per graph hop (playback lerps adjacent zones). */
export function buildNpcPathEvents(
  npcId: NpcId,
  from: LocationId,
  to: LocationId,
  locations: WorldState["locations"],
  fallbackText?: string,
): GameEvent[] {
  const path = findLocationPath(from, to, locations);
  const hopCount = Math.max(0, path.length - 1);
  const events: GameEvent[] = [];
  for (let i = 0; i < hopCount; i++) {
    const hopFrom = path[i]!;
    const hopTo = path[i + 1]!;
    events.push({
      id: makeId("event"),
      t: i,
      type: "npc_move",
      actor: npcId,
      from: hopFrom,
      to: hopTo,
      text:
        hopCount === 1 && fallbackText
          ? fallbackText
          : pathHopLabel(npcId, hopFrom, hopTo, i, hopCount),
    });
  }
  return events;
}

export function buildAgentPathEvents(
  agentId: FieldAgentId,
  from: LocationId,
  to: LocationId,
  locations: WorldState["locations"],
  fallbackText?: string,
): GameEvent[] {
  const path = findLocationPath(from, to, locations);
  const hopCount = Math.max(0, path.length - 1);
  const events: GameEvent[] = [];
  for (let i = 0; i < hopCount; i++) {
    const hopFrom = path[i]!;
    const hopTo = path[i + 1]!;
    events.push({
      id: makeId("event"),
      t: i,
      type: "agent_move",
      actor: agentId,
      from: hopFrom,
      to: hopTo,
      text:
        hopCount === 1 && fallbackText
          ? fallbackText
          : pathHopLabel(agentId, hopFrom, hopTo, i, hopCount),
    });
  }
  return events;
}

export function planFieldAgentTravel(
  world: WorldState,
  agentId: FieldAgentId,
  to: LocationId,
): { events: GameEvent[]; patch: Partial<WorldDelta["agents"]> | undefined } {
  const from = world.agents[agentId].location;
  if (from === to) return { events: [], patch: undefined };
  const events = buildAgentPathEvents(agentId, from, to, world.locations);
  if (!events.length) return { events: [], patch: undefined };
  return {
    events,
    patch: { [agentId]: { location: to, status: "moving" } } as Partial<WorldDelta["agents"]>,
  };
}

/** Idle / vignette must not clobber reactive attention. */
export function isActorOnReactiveHold(world: WorldState, actor: NpcId | FieldAgentId): boolean {
  if (actor === "guard") {
    if (!world.objects.power_panel.state.powerStable) return true;
    const g = world.npcs.guard;
    if (g.attentionMode === "investigating") return true;
    if (isReactiveTaskType(g.currentTask?.type)) return true;
    if (g.currentTask?.type?.includes("inspect_power")) return true;
    if (g.attentionMode === "handling_complaint") return true;
  }
  if (actor === "face" || actor === "runner") {
    const a = world.agents[actor];
    if (a.status === "acting" || a.status === "moving") return true;
    if (isReactiveTaskType(a.currentTask?.type)) return true;
  }
  if (actor === "target") {
    if (world.npcs.target.beliefs.some((b) => b.source === "face_lure")) return true;
  }
  return false;
}
