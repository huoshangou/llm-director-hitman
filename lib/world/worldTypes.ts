export type LocationId = "lobby" | "bar" | "kitchen" | "gallery" | "balcony";

export type NpcId = "target" | "guard" | "waiter" | "cleaner" | "guest";

export type FieldAgentId = "face" | "runner";

export type ActorId = "player" | FieldAgentId;

export type ObjectId =
  | "guest_list_terminal"
  | "wine_glass"
  | "wine_bottle"
  | "waiter_uniform"
  | "cleaning_cart"
  | "power_panel"
  | "balcony_rail"
  | "hallway_camera"
  | "target_phone"
  | "kitchen_door";

export type AlertLevel =
  | "calm"
  | "curious"
  | "suspicious"
  | "searching"
  | "lockdown"
  | "alarm";

export type AttentionMode =
  | "idle"
  | "socializing"
  | "watching_security"
  | "watching_area"
  | "handling_complaint"
  | "investigating"
  | "distracted"
  | "suspicious_focus"
  | "panic";

export type LocationTag =
  | "public"
  | "staff_only"
  | "private"
  | "crowded"
  | "quiet"
  | "spill"
  | "sightline_blocked"
  | "restricted";

export type Permission =
  | "serve_drinks"
  | "enter_bar"
  | "enter_kitchen"
  | "access_guest_terminal"
  | "access_security_camera"
  | "enter_balcony";

export type Belief = {
  id: string;
  subject: string;
  predicate: string;
  object?: string;
  confidence: number;
  source?: string;
};

export type Motive = {
  id: string;
  description: string;
  weight: number;
};

export type NpcTask = {
  id: string;
  type: string;
  target?: string;
  location?: LocationId;
  remainingSeconds: number;
};

export type LocationState = {
  id: LocationId;
  name: string;
  x: number;
  y: number;
  connectedTo: LocationId[];
  crowdLevel: number;
  noiseLevel: number;
  lightLevel: number;
  restricted: boolean;
  watchedBy: NpcId[];
  cameras: ObjectId[];
  objects: ObjectId[];
  npcsPresent: NpcId[];
  agentsPresent: FieldAgentId[];
  tags: LocationTag[];
};

export type NpcState = {
  id: NpcId;
  name: string;
  role: string;
  location: LocationId;
  attentionTarget?: string;
  attentionMode: AttentionMode;
  suspicionTowardPlayer: number;
  suspicionTowardAgents: Partial<Record<FieldAgentId, number>>;
  beliefs: Belief[];
  motives: Motive[];
  permissions: Permission[];
  currentTask?: NpcTask;
  stateTags: string[];
  routeBias: Partial<Record<LocationId, number>>;
};

export type AgentState = {
  id: FieldAgentId;
  name: string;
  location: LocationId;
  coverIdentity?: string;
  stress: number;
  exposure: number;
  skills: string[];
  availableTools: string[];
  permissions: Permission[];
  status: "idle" | "assigned" | "moving" | "acting" | "exposed" | "blocked";
  /** Reactive / tool-driven hold; idle must not reset attention while active. */
  currentTask?: NpcTask;
};

export type PlayerState = {
  traceRisk: number;
  permissions: Permission[];
  stress: number;
};

export type ObjectState = {
  id: ObjectId;
  name: string;
  type: string;
  location: LocationId | "target_inventory" | "hidden";
  visible: boolean;
  portable: boolean;
  owner?: NpcId | FieldAgentId;
  state: Record<string, unknown>;
  affordances: string[];
  tags: string[];
};

export type ObjectiveState = {
  targetHandled: boolean;
  style?: "accident" | "poison" | "direct" | "failed";
  cleanExit: boolean;
  evidenceRisk: number;
};

export type GameEventType =
  | "agent_move"
  | "npc_move"
  | "dialogue_bubble"
  | "object_state_change"
  | "attention_shift"
  | "suspicion_change"
  | "alert_change"
  | "tool_success"
  | "tool_failed"
  | "objective_update";

export type GameEvent = {
  id: string;
  t: number;
  type: GameEventType;
  actor?: ActorId | NpcId;
  object?: ObjectId;
  from?: LocationId;
  to?: LocationId;
  text?: string;
  value?: unknown;
  severity?: "low" | "medium" | "high";
};

export type WorldState = {
  turn: number;
  timeSeconds: number;
  alertLevel: AlertLevel;
  suspicion: number;
  objective: ObjectiveState;
  player: PlayerState;
  locations: Record<LocationId, LocationState>;
  npcs: Record<NpcId, NpcState>;
  agents: Record<FieldAgentId, AgentState>;
  objects: Record<ObjectId, ObjectState>;
  eventLog: GameEvent[];
};
