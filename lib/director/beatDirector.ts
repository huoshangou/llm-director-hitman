import type { ActiveBeat, BeatAct, NarrativeLine } from "../beats/beatTypes";
import { pickModifier } from "../beats/modifiers";
import { actForStep, actIndexForStep, getActsForRoute } from "../beats/routeActs";
import type { ToolUseResult } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";
import type { DirectorState } from "./directorTypes";
import {
  consumeInjectHead,
  evaluateInjections,
  expireInjections,
  mergeInjectQueue,
} from "./injectRules";

function line(text: string, type: NarrativeLine["type"]): NarrativeLine {
  return { text, type };
}

function startBeat(act: BeatAct, modifier: ActiveBeat["modifier"]): ActiveBeat {
  return { act, phase: "setup", modifier, resolvingTurns: 0 };
}

function advanceBeatPhase(beat: ActiveBeat, completedLastStepInAct: boolean): ActiveBeat {
  if (beat.phase === "setup") return { ...beat, phase: "active" };
  if (beat.phase === "active" && completedLastStepInAct) {
    return { ...beat, phase: "resolving", resolvingTurns: 1 };
  }
  if (beat.phase === "resolving") {
    return { ...beat, phase: "done", resolvingTurns: beat.resolvingTurns + 1 };
  }
  return beat;
}

export function syncActiveBeat(
  director: DirectorState,
  routeId: string,
  stepIndex: number,
): { director: DirectorState; lines: NarrativeLine[] } {
  const acts = getActsForRoute(routeId);
  const act = actForStep(acts, stepIndex);
  const idx = actIndexForStep(acts, stepIndex);
  const lines: NarrativeLine[] = [];

  if (!act) {
    return { director: { ...director, activeBeat: null, actIndex: acts.length }, lines };
  }

  const sameAct =
    director.activeBeat?.act.id === act.id && director.activeBeat.phase !== "done";

  if (sameAct && director.activeBeat) {
    if (director.activeBeat.phase === "setup") {
      const advanced = advanceBeatPhase(director.activeBeat, false);
      lines.push(line(`🎭 幕进行中 [${act.emoji} ${act.name}]`, "beat"));
      if (advanced.modifier) {
        lines.push(
          line(`🔮 修饰器 [${advanced.modifier.emoji} ${advanced.modifier.name}]`, "modifier"),
        );
      }
      return { director: { ...director, activeBeat: advanced, actIndex: idx }, lines };
    }
    return { director: { ...director, actIndex: idx }, lines };
  }

  const fresh = startBeat(act, null);
  lines.push(line("─────────────────────────────", "world"));
  lines.push(line(`🎬 导演：开启第 ${idx + 1} 幕 · [${act.emoji} ${act.name}]`, "director"));
  const active = advanceBeatPhase(fresh, false);
  return {
    director: { ...director, activeBeat: active, actIndex: idx, lastModifierId: null },
    lines,
  };
}

export function onAfterToolStep(
  director: DirectorState,
  routeId: string,
  world: WorldState,
  result: ToolUseResult,
  stepIndex: number,
): { director: DirectorState; lines: NarrativeLine[] } {
  const lines: NarrativeLine[] = [];
  let d = { ...director };

  const { queue: afterExpire, expired } = expireInjections(d.injectQueue, world.turn);
  for (const e of expired) {
    lines.push(line(`🃏 注入 [${e.beatId}] 已过期（${e.reason}）`, "director"));
  }
  d = { ...d, injectQueue: afterExpire };

  const consumed = consumeInjectHead(d.injectQueue, d.tension);
  d.injectQueue = consumed.queue;
  for (const t of consumed.lines) lines.push(line(t, "director"));
  d.tension = Math.min(100, d.tension + consumed.tensionDelta);

  const incoming = evaluateInjections(world, result, stepIndex);
  d.injectQueue = mergeInjectQueue(d.injectQueue, incoming);
  for (const inj of incoming) {
    lines.push(
      line(`🃏 入队 [${inj.beatId}] p${inj.priority} · ${inj.reason}`, "director"),
    );
  }

  const acts = getActsForRoute(routeId);
  const act = actForStep(acts, stepIndex);
  if (!act || !d.activeBeat) return { director: d, lines };

  const modCtx = { world, act, routeId, result, stepIndex };
  const picked = pickModifier(act.modifiers, modCtx, d.lastModifierId);
  let beat: ActiveBeat | null = d.activeBeat;
  if (picked) {
    for (const t of picked.narrative(modCtx)) {
      lines.push(line(`${picked.emoji} ${t}`, "modifier"));
    }
    beat = { ...beat, modifier: picked };
    d = { ...d, lastModifierId: picked.id };
    if (picked.id !== "guard_drift" && picked.id !== "accident_staging") {
      d.tension = Math.min(100, d.tension + 8);
    }
  }

  const completedAct = stepIndex >= act.toStep;
  beat = advanceBeatPhase(beat, completedAct);
  if (beat.phase === "resolving") {
    lines.push(line(`🎬 幕 [${act.name}] 收束中…`, "beat"));
    beat = advanceBeatPhase(beat, true);
  }
  if (beat.phase === "done") {
    lines.push(line(`✓ 幕 [${act.name}] 完成`, "result"));
    d.tension = Math.max(0, d.tension - 5);
    beat = null;
  }

  d.activeBeat = beat;
  d.tension = Math.max(0, d.tension - 1.5);

  return { director: d, lines };
}

export function directorStatusLabel(director: DirectorState): string {
  const beat = director.activeBeat;
  if (!beat) return "无活跃幕";
  const mod = beat.modifier ? ` · ${beat.modifier.emoji}${beat.modifier.name}` : "";
  return `${beat.act.emoji} ${beat.act.name} (${beat.phase})${mod}`;
}
