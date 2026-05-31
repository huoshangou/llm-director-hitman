import { toolRegistry } from "../tools/toolRegistry";
import type { ToolId } from "../tools/toolTypes";

const MOVES_ACTOR = new Set<ToolId>([
  "impersonate_staff",
  "infiltrate_gallery",
  "lure_with_private_meeting",
  "spill_drink",
  "move_cleaning_cart",
  "disable_power_panel",
  "tamper_balcony_rail",
  "stage_accident",
  "prepare_poisoned_drink",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
]);

const MOVES_ACTOR_TO_TARGET = new Set<ToolId>([
  "lure_with_private_meeting",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
]);

const NO_ACTOR_MOVE = new Set<ToolId>([
  "create_complaint",
  "redirect_guard_attention",
  "spoof_message",
  "modify_guest_list",
  "fake_schedule_conflict",
  "suppress_camera_record",
]);

/** Injected into Director prompt (ADR-0017 Q4). */
export function buildDirectorConstraints() {
  const tools = Object.values(toolRegistry).map((t) => ({
    id: t.id,
    allowedActors: t.allowedActors,
    category: t.category,
    movesActor: MOVES_ACTOR.has(t.id as ToolId),
    movesActorToTargetLocation: MOVES_ACTOR_TO_TARGET.has(t.id as ToolId),
    actorStaysPut: NO_ACTOR_MOVE.has(t.id as ToolId),
    preconditionsHuman: t.preconditions.map((p) => preconditionLabel(p)),
    description: t.description,
  }));

  return {
    breakContract:
      "If unsupportedParts is non-empty OR intent is impossible, toolChain MUST be []. Never substitute unrelated tools.",
    forbiddenSubstitutions: [
      {
        playerIntent: "混进画廊 / 进画廊 / 混入画廊",
        requiredToolId: "infiltrate_gallery",
        forbiddenAlone: ["redirect_guard_attention", "create_complaint"],
        note: "redirect/complaint do not change face.location; infiltrate moves Face to gallery when guard allows.",
      },
      {
        playerIntent: "杀保安 / 刺杀 / 制服保安并换装",
        requiredToolId: null,
        forbiddenAlone: ["disable_power_panel", "impersonate_staff", "redirect_guard_attention"],
        note: "No lethal tool; use unsupportedParts + empty toolChain, not unrelated physical tools.",
      },
    ],
    tools,
    balconyMandate:
      "Victor must be handled on the balcony. Poison: prepare at bar → serve when target@balcony → resolve_poison_on_balcony. No lethal poison win in gallery/lobby.",
    poisonChainExample: [
      "prepare_poisoned_drink (runner, wine_bottle@bar)",
      "lure_with_private_meeting or spoof_message (optional, target→balcony)",
      "serve_poisoned_drink_on_balcony (face, target@balcony)",
      "resolve_poison_on_balcony",
    ],
    turnRules: [
      "Executable frontier (7b): each turn runs ALL chain steps whose preconditions pass now — one per actor, parallel across actors.",
      "World state changes only via tool resolvers + tickWorld; you cannot set locations directly.",
      "infiltrate_gallery fails as a whole if guard still blocks gallery access.",
    ],
  };
}

function preconditionLabel(pre: { type: string; [key: string]: unknown }): string {
  switch (pre.type) {
    case "alert_below":
      return `alert below ${pre.value}`;
    case "not_observed_by_guard":
      return "actor not observed by active guard";
    case "object_exists":
      return `object ${pre.object} exists`;
    case "player_access":
      return `player has ${pre.permission}`;
    default:
      return pre.type;
  }
}
