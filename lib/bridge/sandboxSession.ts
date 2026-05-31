import { directorStatusLabel, onAfterToolStep, syncActiveBeat } from "../director/beatDirector";
import { createDirectorState, type DirectorState } from "../director/directorTypes";
import { getShowcaseRoute } from "../routes/showcaseRoutes";
import { cloneWorld } from "../world/initialWorld";
import type { WorldState } from "../world/worldTypes";
import type { NarrativeLine } from "../beats/beatTypes";
import { classifyTerminalState, convergenceCheckpoints } from "../convergence/terminalState";
import { runOneStep, type StepOutcome } from "./sandboxApi";
import { worldToScene } from "./worldToScene";

export type SandboxSession = {
  routeId: string;
  world: WorldState;
  stepIndex: number;
  director: DirectorState;
  finished: boolean;
};

export type SessionStepResult = {
  session: SandboxSession;
  outcome: StepOutcome;
  turnTimeline: StepOutcome["turnTimeline"];
  lines: NarrativeLine[];
  beatLabel: string;
  injectQueue: DirectorState["injectQueue"];
};

export function createSession(routeId: string): SandboxSession {
  getShowcaseRoute(routeId);
  const session: SandboxSession = {
    routeId,
    world: cloneWorld(),
    stepIndex: 0,
    director: createDirectorState(),
    finished: false,
  };
  const sync = syncActiveBeat(session.director, routeId, 0);
  return { ...session, director: sync.director };
}

export function getSessionStep(session: SandboxSession) {
  const route = getShowcaseRoute(session.routeId)!;
  return route.steps[session.stepIndex];
}

export function sessionBeatHeader(session: SandboxSession): string {
  const route = getShowcaseRoute(session.routeId)!;
  const step = route.steps[session.stepIndex];
  if (!step) return `${route.title} · 已完成`;
  const dir = directorStatusLabel(session.director);
  return `${route.title} · ${step.label} · ${dir}`;
}

function toolLines(outcome: StepOutcome): NarrativeLine[] {
  const lines: NarrativeLine[] = [];
  const r = outcome.results[0];
  if (!r) return lines;
  const status =
    r.status === "success" ? "成功" : r.status === "partial" ? "部分" : r.status === "blocked" ? "阻断" : "失败";
  lines.push({
    text: `[tool] ${r.request.toolId} · ${status} — ${r.reason ?? ""}`,
    type: "tool",
  });
  for (const ev of r.generatedEvents) {
    lines.push({
      text: `  ↳ ${ev.type}: ${ev.text ?? ev.id}`,
      type: "reaction",
    });
  }
  for (const ev of outcome.tickEvents) {
    lines.push({ text: `[tick] ${ev.type}: ${ev.text ?? ""}`, type: "world" });
  }
  lines.push({ text: `终态: ${outcome.terminal.label}`, type: "result" });
  return lines;
}

export function executeSessionStep(session: SandboxSession): SessionStepResult {
  if (session.finished) {
    throw new Error("Session already finished");
  }
  const step = getSessionStep(session);
  if (!step) {
    const finishedSession = { ...session, finished: true };
    return {
      session: finishedSession,
      outcome: {
        world: session.world,
        scene: worldToScene(session.world),
        results: [],
        tickEvents: [],
        turnTimeline: [],
        terminal: classifyTerminalState(session.world),
        checkpoints: convergenceCheckpoints(session.world),
      },
      turnTimeline: [],
      lines: [{ text: "路线已走完。", type: "director" }],
      beatLabel: sessionBeatHeader(finishedSession),
      injectQueue: session.director.injectQueue,
    };
  }

  const lines: NarrativeLine[] = [];
  const pre = syncActiveBeat(session.director, session.routeId, session.stepIndex);
  lines.push(...pre.lines);

  lines.push({ text: `执行 · ${step.label}`, type: "beat" });
  lines.push({ text: step.hint, type: "director" });

  const outcome = runOneStep(session.world, step.tool);
  lines.push(...toolLines(outcome));

  const post = onAfterToolStep(
    pre.director,
    session.routeId,
    outcome.world,
    outcome.results[0]!,
    session.stepIndex,
  );
  lines.push(...post.lines);

  const nextIndex = session.stepIndex + 1;
  const route = getShowcaseRoute(session.routeId)!;
  const finished = nextIndex >= route.steps.length;

  let director = post.director;
  if (!finished) {
    const nextSync = syncActiveBeat(director, session.routeId, nextIndex);
    director = nextSync.director;
    lines.push(...nextSync.lines);
  }

  const nextSession: SandboxSession = {
    routeId: session.routeId,
    world: outcome.world,
    stepIndex: nextIndex,
    director,
    finished,
  };

  return {
    session: nextSession,
    outcome,
    turnTimeline: outcome.turnTimeline,
    lines,
    beatLabel: sessionBeatHeader(nextSession),
    injectQueue: director.injectQueue,
  };
}

export { getShowcaseRoute, showcaseRoutes } from "../routes/showcaseRoutes";
export { ROUTE_ACTS } from "../beats/routeActs";
