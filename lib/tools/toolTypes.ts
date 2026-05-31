import type { GuidanceKey } from "../director/lethalPolicy";
import type {
  ActorId,
  AlertLevel,
  FieldAgentId,
  GameEvent,
  LocationId,
  NpcId,
  ObjectId,
  WorldState,
} from "../world/worldTypes";

export type ToolId =
  | "create_complaint"
  | "impersonate_staff"
  | "lure_with_private_meeting"
  | "redirect_guard_attention"
  | "infiltrate_gallery"
  | "spoof_message"
  | "modify_guest_list"
  | "fake_schedule_conflict"
  | "suppress_camera_record"
  | "spill_drink"
  | "move_cleaning_cart"
  | "disable_power_panel"
  | "tamper_balcony_rail"
  | "stage_accident"
  | "prepare_poisoned_drink"
  | "serve_poisoned_drink_on_balcony"
  | "resolve_poison_on_balcony"
  | "decline_with_guidance"
  | "eliminate_threat";

export type ToolCategory = "social" | "information" | "physical" | "final" | "lethal";

export type ToolPrecondition =
  | { type: "alert_below"; value: AlertLevel }
  | { type: "object_exists"; object: ObjectId }
  | { type: "object_state"; object: ObjectId; key: string; equals: unknown }
  | { type: "actor_near_object"; object: ObjectId }
  | { type: "not_observed_by_guard" }
  | { type: "player_access"; permission: string }
  | { type: "npc_at_location"; npc: NpcId; location: LocationId }
  | { type: "sightline_clear"; location: LocationId };

export type WorldDelta = {
  timeSeconds?: number;
  suspicion?: number;
  alertLevel?: AlertLevel;
  player?: Partial<WorldState["player"]>;
  agents?: Partial<Record<FieldAgentId, Partial<WorldState["agents"][FieldAgentId]>>>;
  npcs?: Partial<Record<string, Partial<WorldState["npcs"][keyof WorldState["npcs"]]>>>;
  objects?: Partial<Record<ObjectId, Partial<WorldState["objects"][ObjectId]>>>;
  locations?: Partial<Record<LocationId, Partial<WorldState["locations"][LocationId]>>>;
  objective?: Partial<WorldState["objective"]>;
};

export type ToolDefinition = {
  id: ToolId;
  name: string;
  category: ToolCategory;
  allowedActors: ActorId[];
  description: string;
  preconditions: ToolPrecondition[];
};

export type SocialFrame = "admin_issue" | "default";

export type ToolUseRequest = {
  toolId: ToolId;
  actor: ActorId;
  targets: string[];
  intent: string;
  params?: {
    frame?: SocialFrame;
    message?: string;
    guidanceKey?: GuidanceKey;
  };
};

export type ToolUseResult = {
  request: ToolUseRequest;
  status: "success" | "partial" | "failed" | "blocked";
  reason?: string;
  score: number;
  worldDelta: WorldDelta;
  generatedEvents: GameEvent[];
};

export const ALL_TOOL_IDS: ToolId[] = [
  "create_complaint",
  "impersonate_staff",
  "lure_with_private_meeting",
  "redirect_guard_attention",
  "infiltrate_gallery",
  "spoof_message",
  "modify_guest_list",
  "fake_schedule_conflict",
  "suppress_camera_record",
  "spill_drink",
  "move_cleaning_cart",
  "disable_power_panel",
  "tamper_balcony_rail",
  "stage_accident",
  "prepare_poisoned_drink",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
  "decline_with_guidance",
  "eliminate_threat",
];
