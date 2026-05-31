import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import type { ActorId } from "../world/worldTypes";
import { ALL_TOOL_IDS } from "../tools/toolTypes";
import type { DirectorPlan, DirectorPlanRaw } from "./directorSchema";

const TOOL_SET = new Set<string>(ALL_TOOL_IDS);

export function normalizeActor(actor: string): ActorId {
  if (actor === "hacker") return "player";
  if (actor === "player" || actor === "face" || actor === "runner") return actor;
  return "player";
}

export function normalizeToolChain(chain: DirectorPlanRaw["toolChain"]): ToolUseRequest[] {
  return chain.map((req) => ({
    actor: normalizeActor(req.actor as string),
    targets: req.targets,
    intent: req.intent,
    params: req.params as ToolUseRequest["params"] | undefined,
    toolId: (TOOL_SET.has(req.toolId) ? req.toolId : req.toolId) as ToolId,
  }));
}

export function normalizeDirectorPlan(plan: DirectorPlanRaw): DirectorPlan {
  return {
    ...plan,
    toolChain: normalizeToolChain(plan.toolChain),
    fallbackSuggestions: plan.fallbackSuggestions.map((s) => ({
      ...s,
      toolChain: normalizeToolChain(s.toolChain),
    })),
    agentComms: plan.agentComms.map((c) => ({
      ...c,
      agent: normalizeActor(c.agent as string) as "face" | "runner" | "player",
    })),
  };
}
