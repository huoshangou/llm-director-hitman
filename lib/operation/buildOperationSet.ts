import { validateToolRequest } from "../tools/checkPreconditions";
import type { ToolUseRequest } from "../tools/toolTypes";
import { canFaceInfiltrateGallery } from "../world/galleryInfiltration";
import type { ActorId, WorldState } from "../world/worldTypes";
import { pickBestRequestForActor } from "./pickActorRequest";
import type { OperationAction, OperationSet } from "./operationTypes";

/** Apply order: runner before face when both act in one turn (power → then infiltrate). */
const ACTOR_ORDER: ActorId[] = ["player", "runner", "face"];

/** Lower runs first within a turn (ADR-0019 poison + ADR-0017 power). */
const TOOL_TURN_PRIORITY: Partial<Record<string, number>> = {
  prepare_poisoned_drink: 5,
  disable_power_panel: 8,
  lure_with_private_meeting: 11,
  impersonate_staff: 14,
  serve_poisoned_drink_on_balcony: 18,
  resolve_poison_on_balcony: 22,
  infiltrate_gallery: 30,
  move_cleaning_cart: 32,
  redirect_guard_attention: 45,
};

function actorOrder(a: ActorId, b: ActorId): number {
  return ACTOR_ORDER.indexOf(a) - ACTOR_ORDER.indexOf(b);
}

function toolTurnPriority(toolId: string): number {
  return TOOL_TURN_PRIORITY[toolId] ?? 50;
}

function pickExecutableForActor(
  actor: ActorId,
  executable: ToolUseRequest[],
  playerPlan: string | undefined,
  world: WorldState,
): ToolUseRequest {
  if (executable.length === 1) return executable[0]!;
  const needsRedirect =
    executable.some((r) => r.toolId === "infiltrate_gallery") && !canFaceInfiltrateGallery(world).ok;
  if (needsRedirect) {
    const redirect = executable.find((r) => r.toolId === "redirect_guard_attention");
    if (redirect) return redirect;
  }
  if (actor === "runner" && playerPlan) {
    const power = executable.find((r) => r.toolId === "disable_power_panel");
    const impersonate = executable.find((r) => r.toolId === "impersonate_staff");
    if (power && impersonate && /清洁车|画廊|混进|清扫|推车/i.test(playerPlan)) {
      return power;
    }
  }
  return pickBestRequestForActor(executable, playerPlan);
}

/** Executable frontier (7b): first chain-valid step per actor; requires world. */
export function buildFrontierOperationSet(
  chain: ToolUseRequest[],
  rejected: OperationSet["rejected"] = [],
  source: OperationAction["source"] = "llm",
  playerPlan?: string,
  world?: WorldState,
): OperationSet {
  if (!world) {
    return buildLegacyOperationSet(chain, rejected, source, playerPlan);
  }

  const bucket = new Map<ActorId, ToolUseRequest[]>();

  for (const request of chain) {
    const list = bucket.get(request.actor) ?? [];
    list.push(request);
    bucket.set(request.actor, list);
  }

  const chosen = new Map<ActorId, ToolUseRequest>();
  const actions: OperationAction[] = [];
  const conflicts: OperationSet["conflicts"] = [];

  for (const [actor, requests] of bucket) {
    const executable = requests.filter((r) => validateToolRequest(r, world).ok);
    if (!executable.length) continue;
    const picked = pickExecutableForActor(actor, executable, playerPlan, world);
    chosen.set(actor, picked);
    if (requests.length > 1) {
      conflicts.push({
        actor,
        requests,
        reason: `同一 turn 内 ${actor} 有多于一个动作；已执行链上第一个可执行的 ${picked.toolId}，其余需下一 turn。`,
      });
    }
    actions.push({ actor, request: picked, source });
  }

  actions.sort((a, b) => sortActionsForTurn(a, b));

  return { actions, rejected, conflicts };
}

/** Legacy: pickBest per actor when world is omitted (unit tests). */
function buildLegacyOperationSet(
  chain: ToolUseRequest[],
  rejected: OperationSet["rejected"] = [],
  source: OperationAction["source"] = "llm",
  playerPlan?: string,
): OperationSet {
  const byActor = new Map<ActorId, ToolUseRequest[]>();

  for (const request of chain) {
    const list = byActor.get(request.actor) ?? [];
    list.push(request);
    byActor.set(request.actor, list);
  }

  const actions: OperationAction[] = [];
  const conflicts: OperationSet["conflicts"] = [];

  for (const [actor, requests] of byActor) {
    const chosen = pickBestRequestForActor(requests, playerPlan);
    if (requests.length > 1) {
      conflicts.push({
        actor,
        requests,
        reason: `同一 turn 内 ${actor} 有多于一个动作；已执行与指令最匹配的 ${chosen.toolId}，其余需下一 turn。`,
      });
    }
    actions.push({ actor, request: chosen, source });
  }

  actions.sort((a, b) => sortActionsForTurn(a, b));

  return { actions, rejected, conflicts };
}

/** From validated chain → at most one action per actor (7b when world provided). */
export function buildOperationSet(
  chain: ToolUseRequest[],
  rejected: OperationSet["rejected"] = [],
  source: OperationAction["source"] = "llm",
  playerPlan?: string,
  world?: WorldState,
): OperationSet {
  if (world) {
    return buildFrontierOperationSet(chain, rejected, source, playerPlan, world);
  }
  return buildLegacyOperationSet(chain, rejected, source, playerPlan);
}

function sortActionsForTurn(a: OperationAction, b: OperationAction): number {
  const powerThenGallery =
    (a.request.toolId === "disable_power_panel" && b.request.toolId === "infiltrate_gallery") ||
    (b.request.toolId === "disable_power_panel" && a.request.toolId === "infiltrate_gallery");
  if (powerThenGallery) {
    if (a.request.toolId === "disable_power_panel") return -1;
    if (b.request.toolId === "disable_power_panel") return 1;
  }

  const ao = actorOrder(a.actor, b.actor);
  if (ao !== 0) return ao;

  return toolTurnPriority(a.request.toolId) - toolTurnPriority(b.request.toolId);
}
