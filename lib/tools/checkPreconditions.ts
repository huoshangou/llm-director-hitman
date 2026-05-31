import {
  isActorNearObject,
  isNpcAtLocation,
  isObservedByGuard,
  isSightlineClear,
  RUNNER_CROSS_ZONE_TOOLS,
  SOCIAL_CROSS_ZONE_TOOLS,
} from "../world/selectors";
import type { WorldState } from "../world/worldTypes";
import type { ToolDefinition, ToolPrecondition, ToolUseRequest } from "./toolTypes";
import { toolRegistry } from "./toolRegistry";

const alertRank: Record<string, number> = {
  calm: 0,
  curious: 1,
  suspicious: 2,
  searching: 3,
  lockdown: 4,
  alarm: 5,
};

export type PreconditionResult = { ok: boolean; reasons: string[] };

export function checkProximity(
  tool: ToolDefinition,
  request: ToolUseRequest,
  world: WorldState,
): { ok: boolean; reason?: string } {
  if (request.actor === "player") return { ok: true };

  const targetsNpc = request.targets.some((t) => t in world.npcs);
  if (SOCIAL_CROSS_ZONE_TOOLS.has(tool.id) && targetsNpc) return { ok: true };
  if (request.actor === "runner" && RUNNER_CROSS_ZONE_TOOLS.has(tool.id)) return { ok: true };

  if (tool.id === "impersonate_staff") {
    const near = isActorNearObject(world, request.actor, "waiter_uniform");
    if (near) return { ok: true };
    return { ok: false, reason: `${request.actor} is not near waiter_uniform` };
  }

  for (const target of request.targets) {
    if (target in world.objects) {
      if (!isActorNearObject(world, request.actor, target as keyof typeof world.objects)) {
        return { ok: false, reason: `${request.actor} is not near ${target}` };
      }
    }
  }

  return { ok: true };
}

function checkOne(
  pre: ToolPrecondition,
  request: ToolUseRequest,
  world: WorldState,
): { ok: boolean; reason: string } {
  switch (pre.type) {
    case "alert_below":
      return {
        ok: alertRank[world.alertLevel] < alertRank[pre.value],
        reason: `Alert level ${world.alertLevel} is not below ${pre.value}`,
      };
    case "object_exists":
      return {
        ok: Boolean(world.objects[pre.object]),
        reason: `Missing object ${pre.object}`,
      };
    case "object_state":
      return {
        ok: world.objects[pre.object]?.state?.[pre.key] === pre.equals,
        reason: `${pre.object}.${pre.key} is not ${String(pre.equals)}`,
      };
    case "actor_near_object":
      return request.actor === "player"
        ? { ok: true, reason: "" }
        : {
            ok: isActorNearObject(world, request.actor, pre.object),
            reason: `${request.actor} is not near ${pre.object}`,
          };
    case "not_observed_by_guard":
      return request.actor === "player"
        ? { ok: true, reason: "" }
        : {
            ok: !isObservedByGuard(world, request.actor),
            reason: `${request.actor} is observed by guard`,
          };
    case "player_access":
      return {
        ok: world.player.permissions.includes(pre.permission as never),
        reason: `Player lacks ${pre.permission}`,
      };
    case "npc_at_location":
      return {
        ok: isNpcAtLocation(world, pre.npc, pre.location),
        reason: `${pre.npc} is not at ${pre.location}`,
      };
    case "sightline_clear":
      return {
        ok: isSightlineClear(world, pre.location),
        reason: `Sightline to ${pre.location} is not clear`,
      };
    default:
      return { ok: true, reason: "" };
  }
}

export function checkPreconditions(
  tool: ToolDefinition,
  request: ToolUseRequest,
  world: WorldState,
): PreconditionResult {
  const reasons: string[] = [];

  for (const pre of tool.preconditions) {
    const result = checkOne(pre, request, world);
    if (!result.ok && result.reason) reasons.push(result.reason);
  }

  const proximity = checkProximity(tool, request, world);
  if (!proximity.ok && proximity.reason) reasons.push(proximity.reason);

  return { ok: reasons.length === 0, reasons };
}

export function validateToolRequest(request: ToolUseRequest, world: WorldState): PreconditionResult {
  const tool = toolRegistry[request.toolId];
  if (!tool) return { ok: false, reasons: [`Unknown tool ${request.toolId}`] };
  if (!tool.allowedActors.includes(request.actor)) {
    return { ok: false, reasons: [`${request.actor} cannot use ${request.toolId}`] };
  }
  return checkPreconditions(tool, request, world);
}

export function validateToolChain(
  requests: ToolUseRequest[],
  world: WorldState,
): {
  executableChain: ToolUseRequest[];
  rejected: { request: ToolUseRequest; reasons: string[] }[];
} {
  const executableChain: ToolUseRequest[] = [];
  const rejected: { request: ToolUseRequest; reasons: string[] }[] = [];
  for (const req of requests) {
    const result = validateToolRequest(req, world);
    if (result.ok) executableChain.push(req);
    else rejected.push({ request: req, reasons: result.reasons });
  }
  return { executableChain, rejected };
}
