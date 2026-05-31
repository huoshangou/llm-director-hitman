import { makeId } from "../utils/id";
import { planFieldAgentTravel, reactiveTaskType } from "../world/characterPresence";
import { canFaceInfiltrateGallery } from "../world/galleryInfiltration";
import { planActorTravelEvents } from "../world/travel";
import { assessFaceCredibility } from "../world/faceCredibility";
import {
  objectAtLocation,
  resolveTargetLocation,
  syncPresenceLists,
} from "../world/selectors";
import type { FieldAgentId, GameEvent, LocationId, WorldState } from "../world/worldTypes";
import { applyWorldDelta } from "./applyWorldDelta";
import { checkPreconditions } from "./checkPreconditions";
import { toolRegistry } from "./toolRegistry";
import type { ToolUseRequest, ToolUseResult, WorldDelta } from "./toolTypes";

function event(type: GameEvent["type"], partial: Partial<GameEvent>): GameEvent {
  return { id: makeId("event"), t: 0, type, ...partial };
}

function baseResult(
  request: ToolUseRequest,
  status: ToolUseResult["status"],
  score: number,
  worldDelta: WorldDelta,
  generatedEvents: GameEvent[],
  reason?: string,
): ToolUseResult {
  return { request, status, score, worldDelta, generatedEvents, reason };
}

function blocked(request: ToolUseRequest, reason: string): ToolUseResult {
  return baseResult(
    request,
    "blocked",
    0,
    {},
    [event("tool_failed", { actor: request.actor, text: reason, severity: "medium" })],
    reason,
  );
}

function calculateScore(request: ToolUseRequest, world: WorldState): number {
  let score = 65;
  if (world.alertLevel === "suspicious") score -= 15;
  if (world.alertLevel === "searching") score -= 35;
  if (request.actor !== "player" && world.suspicion > 30) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function planAgentTravel(
  world: WorldState,
  request: ToolUseRequest,
  targetLocation: LocationId | null,
): { patch: Partial<WorldDelta["agents"]> | undefined; events: GameEvent[] } {
  if (request.actor === "player" || !targetLocation) {
    return { patch: undefined, events: [] };
  }
  const agentId = request.actor as FieldAgentId;
  return planFieldAgentTravel(world, agentId, targetLocation);
}

export function resolveTool(request: ToolUseRequest, world: WorldState): ToolUseResult {
  const tool = toolRegistry[request.toolId];
  if (!tool) return blocked(request, "Unknown tool");
  if (!tool.allowedActors.includes(request.actor)) {
    return blocked(request, `${request.actor} cannot use ${request.toolId}`);
  }

  const pre = checkPreconditions(tool, request, world);
  if (!pre.ok) return blocked(request, pre.reasons.join("; "));

  const score = calculateScore(request, world);
  const status: ToolUseResult["status"] = score >= 45 ? "success" : "failed";

  switch (request.toolId) {
    case "create_complaint":
      return resolveCreateComplaint(request, world, score, status);
    case "modify_guest_list":
      return resolveModifyGuestList(request, world, score, status);
    case "spoof_message":
      return resolveSpoofMessage(request, world, score, status);
    case "spill_drink":
      return resolveSpillDrink(request, world, score, status);
    case "move_cleaning_cart":
      return resolveMoveCleaningCart(request, world, score, status);
    case "impersonate_staff":
      return resolveImpersonateStaff(request, world, score, status);
    case "lure_with_private_meeting":
      return resolveLureWithPrivateMeeting(request, world, score, status);
    case "redirect_guard_attention":
      return resolveRedirectGuardAttention(request, world, score, status);
    case "infiltrate_gallery":
      return resolveInfiltrateGallery(request, world, score, status);
    case "fake_schedule_conflict":
      return resolveFakeScheduleConflict(request, world, score, status);
    case "suppress_camera_record":
      return resolveSuppressCameraRecord(request, world, score, status);
    case "disable_power_panel":
      return resolveDisablePowerPanel(request, world, score, status);
    case "tamper_balcony_rail":
      return resolveTamperBalconyRail(request, world, score, status);
    case "stage_accident":
      return resolveStageAccident(request, world, score, status);
    case "prepare_poisoned_drink":
      return resolvePreparePoisonedDrink(request, world, score, status);
    case "serve_poisoned_drink_on_balcony":
      return resolveServePoisonedDrinkOnBalcony(request, world, score, status);
    case "resolve_poison_on_balcony":
      return resolveResolvePoisonOnBalcony(request, world, score, status);
    default:
      return blocked(request, "Unknown tool");
  }
}

function resolveCreateComplaint(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 8, suspicion: 12 },
      [event("tool_failed", { actor: "face", text: "Complaint sounded suspicious." })],
      "Complaint failed",
    );
  }

  const aboutGuestList =
    request.intent.toLowerCase().includes("guest") || request.targets.includes("guest_list_terminal");

  const delta: WorldDelta = {
    timeSeconds: 8,
    agents: { face: { exposure: world.agents.face.exposure + 5 } },
  };
  const events: GameEvent[] = [
    event("dialogue_bubble", {
      actor: "face",
      text: aboutGuestList ? "There is an issue with the VIP list." : "There is a service issue here.",
    }),
  ];

  if (aboutGuestList || request.targets.includes("guard")) {
    delta.npcs = {
      guard: { attentionMode: "handling_complaint", attentionTarget: "guest_list_terminal" },
    };
    events.push(
      event("attention_shift", {
        actor: "guard",
        object: "guest_list_terminal",
        text: "Guard checks the guest list.",
      }),
    );
  }

  if (request.targets.includes("waiter")) {
    delta.npcs = {
      ...delta.npcs,
      waiter: {
        currentTask: {
          id: makeId("task"),
          type: "restock_glasses",
          location: "kitchen",
          remainingSeconds: 20,
        },
      },
    };
  }

  return baseResult(request, status, score, delta, events);
}

function resolveModifyGuestList(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 7, player: { traceRisk: world.player.traceRisk + 20 } },
      [event("tool_failed", { actor: "player", text: "Guest list edit bounced." })],
      "Edit failed",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 7,
      player: { traceRisk: world.player.traceRisk + 10 },
      objects: { guest_list_terminal: { state: { modified: true } } },
      agents: {
        face: {
          coverIdentity: "vip_liaison",
        },
      },
    },
    [
      event("object_state_change", {
        actor: "player",
        object: "guest_list_terminal",
        text: "Guest list modified.",
      }),
      event("dialogue_bubble", { actor: "player", text: "Record updated from the terminal." }),
      event("dialogue_bubble", {
        actor: "face",
        text: "Guest liaison cover is now on file — I can cite VIP contact.",
      }),
    ],
  );
}

function resolveSpoofMessage(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const message = String(request.params?.message ?? "A private art deal awaits on the balcony.");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 8, player: { traceRisk: world.player.traceRisk + 25 } },
      [event("tool_failed", { actor: "player", text: "Spoof almost flagged." })],
      "Spoof failed",
    );
  }

  const target = world.npcs.target;
  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 8,
      player: { traceRisk: world.player.traceRisk + 15 },
      npcs: {
        target: {
          beliefs: [
            ...target.beliefs,
            {
              id: makeId("belief"),
              subject: "message",
              predicate: "private_meeting_on_balcony",
              object: message,
              confidence: 75,
              source: "spoof",
            },
          ],
          routeBias: { ...target.routeBias, balcony: (target.routeBias.balcony ?? 0) + 35 },
        },
      },
    },
    [
      event("dialogue_bubble", { actor: "player", text: "目标手机内容已改写。" }),
      event("dialogue_bubble", { actor: "target", text: "……这条私人邀约是谁发的？" }),
      event("dialogue_bubble", {
        actor: "face",
        text: "我看到手机锚点了；等你下令，我再进画廊接触 Victor。",
      }),
    ],
  );
}

function resolveSpillDrink(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const location = resolveTargetLocation(world, request.targets) ?? "bar";
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, location);

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 4, suspicion: 10, agents: agentPatch },
      [...moveEvents, event("tool_failed", { actor: request.actor, text: "Spill looked deliberate." })],
      "Spill failed",
    );
  }

  const locTags = [...world.locations[location].tags];
  if (!locTags.includes("spill")) locTags.push("spill");

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 4,
      suspicion: 2,
      agents: agentPatch,
      locations: { [location]: { tags: locTags as never, noiseLevel: world.locations[location].noiseLevel + 10 } },
      objects: { wine_glass: { state: { spilled: true } } },
      npcs: {
        cleaner: {
          currentTask: {
            id: makeId("task"),
            type: "clean_spill",
            location,
            remainingSeconds: 20,
          },
        },
      },
    },
    [
      ...moveEvents,
      event("object_state_change", { object: "wine_glass", text: `Drink spills in ${location}.` }),
    ],
  );
}

function resolveMoveCleaningCart(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const targetLocation = resolveTargetLocation(world, request.targets) ?? "gallery";
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, targetLocation);

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 6, suspicion: 15, agents: agentPatch },
      [...moveEvents, event("tool_failed", { actor: "runner", text: "Cart move drew attention." })],
      "Cart move failed",
    );
  }

  const tags = [...world.locations[targetLocation].tags];
  if (!tags.includes("sightline_blocked")) tags.push("sightline_blocked");

  const balconyTags = [...world.locations.balcony.tags];
  if (!balconyTags.includes("sightline_blocked")) balconyTags.push("sightline_blocked");

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 6,
      agents: agentPatch,
      objects: {
        cleaning_cart: { location: targetLocation, state: { blockingSightline: true } },
      },
      locations: {
        [targetLocation]: { tags: tags as never },
        balcony: { tags: balconyTags as never },
      },
    },
    [
      ...moveEvents,
      event("object_state_change", {
        object: "cleaning_cart",
        text: `Cart blocks guard/camera sightline toward balcony at ${targetLocation}.`,
      }),
    ],
  );
}

function resolveImpersonateStaff(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const uniformLoc = objectAtLocation(world, "waiter_uniform") ?? "kitchen";
  const fieldAgent = request.actor as FieldAgentId;
  const { patch: uniformPatch, events: toUniform } = planFieldAgentTravel(
    world,
    fieldAgent,
    uniformLoc,
  );
  let moveEvents = toUniform;
  let finalLoc = uniformLoc;

  if (status !== "failed" && fieldAgent === "runner") {
    const toBar = planActorTravelEvents("runner", uniformLoc, "bar", world.locations);
    moveEvents = [
      ...toUniform,
      ...toBar.map((e, i) => ({ ...e, t: toUniform.length + i })),
    ];
    finalLoc = "bar";
  }

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 6, suspicion: 20, agents: uniformPatch },
      [...moveEvents, event("tool_failed", { actor: fieldAgent, text: "Disguise attempt failed." })],
      "Disguise failed",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 6,
      agents: {
        ...uniformPatch,
        [fieldAgent]: {
          location: finalLoc,
          coverIdentity: "waiter",
          exposure: world.agents[fieldAgent].exposure + 8,
          permissions: ["serve_drinks", "enter_bar", "enter_kitchen"],
          status: "acting",
        },
      },
      objects: { waiter_uniform: { state: { available: false }, visible: false } },
    },
    [
      ...moveEvents,
      event("dialogue_bubble", {
        actor: fieldAgent,
        text: `${fieldAgent} is now disguised as staff.`,
      }),
    ],
  );
}

function resolveLureWithPrivateMeeting(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const target = world.npcs.target;
  const cred = assessFaceCredibility(world);
  const routeBoost = cred.routeBoost;
  const beliefConfidence = cred.tier === "strong" ? 72 : cred.tier === "partial" ? 58 : 46;

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 10, suspicion: 10, agents: { face: { exposure: world.agents.face.exposure + 5 } } },
      [event("dialogue_bubble", { actor: "target", text: "Not now. I'm staying here." })],
      "Target refused the lure",
    );
  }

  const targetReply =
    cred.tier === "strong"
      ? "…Alright. Give me a minute — I'll step outside."
      : cred.tier === "partial"
        ? "…Maybe later. Who exactly arranged this?"
        : "…Maybe later. You don't look like staff.";

  const faceLine =
    cred.tier === "improvising"
      ? "There's a quieter place to discuss this — trust me on the timing."
      : "There's a private viewing on the balcony — your name is on the list.";

  const engageLoc = target.location;
  const faceFrom = world.agents.face.location;
  const moveEvents =
    faceFrom !== engageLoc
      ? planActorTravelEvents(
          "face",
          faceFrom,
          engageLoc,
          world.locations,
          engageLoc === "gallery"
            ? "Face 在画廊靠近目标，发起 VIP 私密接触。"
            : undefined,
        )
      : [
          event("attention_shift", {
            actor: "face",
            text: "Face 在目标身旁出示联络人身份，当面发起私密邀约。",
          }),
        ];

  const coverLine =
    cred.tier === "strong"
      ? "Face 出示 VIP 联络人身份，目标接受私密叙事。"
      : cred.tier === "partial"
        ? "Face 接触目标；目标半信半疑，仍缺手机或名单背书。"
        : "Face 尝试接触；目标对身份存疑。";

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 10,
      agents: {
        face: {
          location: engageLoc,
          exposure: world.agents.face.exposure + 10,
          status: "acting",
          currentTask: {
            id: makeId("task"),
            type: reactiveTaskType("engage_target"),
            location: engageLoc,
            remainingSeconds: 16,
          },
        },
      },
      npcs: {
        target: {
          beliefs: [
            ...target.beliefs,
            {
              id: makeId("belief"),
              subject: "balcony",
              predicate: "private_meeting_pending",
              confidence: beliefConfidence,
              source: "face_lure",
            },
          ],
          routeBias: { ...target.routeBias, balcony: (target.routeBias.balcony ?? 0) + routeBoost },
          ...((target.routeBias.balcony ?? 0) + routeBoost >= 12 && target.location !== "balcony"
            ? {
                currentTask: {
                  id: makeId("task"),
                  type: reactiveTaskType("seek_balcony"),
                  location: "balcony",
                  remainingSeconds: 2,
                },
                attentionMode: "socializing",
              }
            : {}),
        },
      },
    },
    [
      ...moveEvents,
      event("dialogue_bubble", { actor: "face", text: faceLine }),
      event("dialogue_bubble", { actor: "target", text: targetReply }),
      event("dialogue_bubble", { actor: "face", text: coverLine }),
      event("dialogue_bubble", {
        actor: "face",
        text:
          cred.tier === "improvising"
            ? "Target only partly buys it — no VIP or phone backing yet."
            : `Target trusts the lure (${cred.backing.slice(0, 2).join("、")}).`,
      }),
    ],
  );
}

function resolveInfiltrateGallery(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  _status: ToolUseResult["status"],
): ToolUseResult {
  const gate = canFaceInfiltrateGallery(world);
  if (!gate.ok) {
    return baseResult(
      request,
      "failed",
      Math.min(score, 40),
      { timeSeconds: 6, agents: { face: { exposure: world.agents.face.exposure + 4 } } },
      [
        event("dialogue_bubble", {
          actor: "face",
          text: "Gallery entrance is too hot — guard still watching.",
        }),
      ],
      gate.reason,
    );
  }

  const from = world.agents.face.location;
  const moveEvents = planActorTravelEvents("face", from, "gallery", world.locations);

  return baseResult(
    request,
    "success",
    score,
    {
      timeSeconds: 8,
      agents: {
        face: {
          location: "gallery",
          exposure: world.agents.face.exposure + 8,
          status: "acting",
          currentTask: {
            id: makeId("task"),
            type: reactiveTaskType("infiltrate_gallery"),
            location: "gallery",
            remainingSeconds: 12,
          },
        },
      },
    },
    [
      ...moveEvents,
      event("attention_shift", {
        actor: "face",
        text: "Face blends into the gallery crowd near the exhibits.",
      }),
    ],
  );
}

function resolveRedirectGuardAttention(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const frame = request.params?.frame ?? "default";
  const adminFrame = frame === "admin_issue";

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 6, suspicion: 15, agents: { face: { exposure: world.agents.face.exposure + 8 } } },
      [event("dialogue_bubble", { actor: "guard", text: "Step back. What exactly are you doing?" })],
      "Guard became suspicious",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 6,
      agents: { face: { exposure: world.agents.face.exposure + 6 } },
      npcs: {
        guard: {
          attentionMode: "handling_complaint",
          attentionTarget: request.targets.find((t) => t in world.objects) ?? "guest_list_terminal",
        },
      },
    },
    [
      event("attention_shift", {
        actor: "guard",
        object: "guest_list_terminal",
        text: adminFrame
          ? "Guard handles a VIP list issue at the front desk."
          : "Guard attention redirected away from the balcony.",
      }),
    ],
  );
}

function resolveFakeScheduleConflict(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 8, player: { traceRisk: world.player.traceRisk + 20 } },
      [event("tool_failed", { actor: "player", text: "Schedule conflict looked implausible." })],
      "Schedule conflict failed",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 8,
      player: { traceRisk: world.player.traceRisk + 12 },
      agents: {
        face: {
          coverIdentity:
            world.agents.face.coverIdentity === "vip_liaison"
              ? "vip_liaison"
              : "schedule_liaison",
        },
      },
      npcs: {
        waiter: {
          currentTask: {
            id: makeId("task"),
            type: "schedule_check",
            location: "kitchen",
            remainingSeconds: 20,
          },
        },
      },
    },
    [
      event("dialogue_bubble", { actor: "player", text: "Schedule conflict inserted." }),
      event("dialogue_bubble", {
        actor: "face",
        text: "I can cite a private viewing conflict on the balcony.",
      }),
    ],
  );
}

function resolveSuppressCameraRecord(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 6, player: { traceRisk: world.player.traceRisk + 30 } },
      [event("tool_failed", { actor: "player", text: "Camera suppression was flagged." })],
      "Camera suppression failed",
    );
  }

  const events: GameEvent[] = [
    event("object_state_change", {
      actor: "player",
      object: "hallway_camera",
      text: "Hallway camera recording suppressed.",
    }),
  ];
  if (
    world.objects.wine_bottle.state.poison_served === true &&
    world.npcs.target.location === "balcony" &&
    !world.objective.targetHandled
  ) {
    events.push(
      event("dialogue_bubble", {
        actor: "face",
        text: "摄像头窗口开了。确认要我收尾吗？",
      }),
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 6,
      player: { traceRisk: world.player.traceRisk + 20 },
      objects: { hallway_camera: { state: { recordingSuppressed: true, active: false } } },
    },
    events,
  );
}

function resolveDisablePowerPanel(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, "kitchen");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 5, suspicion: 30, alertLevel: "searching", agents: agentPatch },
      [...moveEvents, event("alert_change", { text: "Power tampering was spotted." })],
      "Power tampering observed",
    );
  }

  const galleryLight = Math.max(15, world.locations.gallery.lightLevel - 45);
  const balconyLight = Math.max(10, world.locations.balcony.lightLevel - 30);

  const guardFrom = world.npcs.guard.location;
  const guardTravel =
    guardFrom !== "kitchen"
      ? planActorTravelEvents("guard", guardFrom, "kitchen", world.locations, "保安赶往厨房查配电")
      : [];

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 5,
      suspicion: 10,
      agents: agentPatch,
      objects: {
        power_panel: { state: { powerStable: false } },
        hallway_camera: { state: { visibilityReduced: true, powerMode: "backup" } },
      },
      locations: {
        gallery: { lightLevel: galleryLight },
        balcony: { lightLevel: balconyLight },
      },
      npcs: {
        guard: {
          location: "kitchen",
          currentTask: {
            id: makeId("task"),
            type: reactiveTaskType("inspect_power"),
            location: "kitchen",
            remainingSeconds: 24,
          },
          attentionMode: "investigating",
          attentionTarget: "power_panel",
        },
      },
    },
    [
      ...moveEvents,
      ...guardTravel,
      event("object_state_change", { object: "power_panel", text: "Power panel disrupted." }),
      event("attention_shift", {
        actor: "guard",
        object: "power_panel",
        text: "Guard inspects kitchen power — balcony watch relaxed.",
      }),
    ],
  );
}

function resolveTamperBalconyRail(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, "balcony");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 8, suspicion: 35, agents: agentPatch },
      [...moveEvents, event("tool_failed", { actor: "runner", text: "Tampering with the rail was almost seen." })],
      "Rail tamper failed",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 8,
      agents: agentPatch,
      objective: { evidenceRisk: world.objective.evidenceRisk + 20 },
      objects: { balcony_rail: { state: { tampered: true } } },
    },
    [
      ...moveEvents,
      event("object_state_change", { object: "balcony_rail", text: "Balcony rail is weakened." }),
    ],
  );
}

function resolvePreparePoisonedDrink(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, "bar");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 8, suspicion: 18, agents: agentPatch },
      [...moveEvents, event("tool_failed", { actor: "runner", text: "Poison prep was almost seen." })],
      "Poison prep failed",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 8,
      suspicion: 8,
      agents: agentPatch,
      objects: {
        wine_bottle: {
          state: {
            premium: true,
            poisoned: true,
            poison_served: world.objects.wine_bottle.state.poison_served === true,
          },
        },
      },
    },
    [
      ...moveEvents,
      event("object_state_change", {
        object: "wine_bottle",
        text: "Runner tampers with the bar wine — poison is ready.",
      }),
    ],
  );
}

function resolveServePoisonedDrinkOnBalcony(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const fieldAgent = request.actor as FieldAgentId;
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, "balcony");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      { timeSeconds: 8, suspicion: 15, agents: agentPatch },
      [...moveEvents, event("tool_failed", { actor: fieldAgent, text: "Serving the cup looked unnatural." })],
      "Serve failed",
    );
  }

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 10,
      agents: {
        ...agentPatch,
        [fieldAgent]: {
          location: "balcony",
          exposure: world.agents[fieldAgent].exposure + 12,
          status: "acting",
        },
      },
      objects: {
        wine_bottle: {
          state: {
            premium: true,
            poisoned: true,
            poison_served: true,
          },
        },
      },
      npcs: {
        target: {
          beliefs: [
            ...world.npcs.target.beliefs,
            {
              id: makeId("belief"),
              subject: "balcony",
              predicate: "private_poisoned_drink_taken",
              confidence: 78,
              source: fieldAgent,
            },
          ],
        },
      },
    },
    [
      ...moveEvents,
      event("dialogue_bubble", {
        actor: "target",
        text: "Victor takes the private cup on the balcony.",
      }),
      event("object_state_change", {
        object: "wine_bottle",
        text: "Poisoned wine is served on the balcony.",
      }),
    ],
  );
}

function resolveResolvePoisonOnBalcony(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const fieldAgent = request.actor as FieldAgentId;
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, "balcony");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      {
        timeSeconds: 4,
        suspicion: 40,
        alertLevel: "alarm",
        agents: agentPatch,
        objective: { style: "failed", cleanExit: false },
      },
      [...moveEvents, event("tool_failed", { actor: fieldAgent, text: "Poison resolution was exposed." })],
      "Poison resolution exposed",
    );
  }

  const cleanExit = world.objective.evidenceRisk < 55 && world.player.traceRisk < 45;

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 4,
      alertLevel: world.objective.evidenceRisk > 50 ? "suspicious" : "curious",
      agents: agentPatch,
      objective: { targetHandled: true, style: "poison", cleanExit },
      npcs: {
        target: { stateTags: [...world.npcs.target.stateTags, "handled", "poisoned"] },
      },
    },
    [
      ...moveEvents,
      event("objective_update", {
        actor: "target",
        text: cleanExit
          ? "Victor collapses on the balcony — reads like a private medical episode."
          : "Victor falls on the balcony — the scene may leave traces.",
        severity: "high",
      }),
    ],
  );
}

function resolveStageAccident(
  request: ToolUseRequest,
  world: WorldState,
  score: number,
  status: ToolUseResult["status"],
): ToolUseResult {
  const { patch: agentPatch, events: moveEvents } = planAgentTravel(world, request, "balcony");

  if (status === "failed") {
    return baseResult(
      request,
      status,
      score,
      {
        timeSeconds: 4,
        suspicion: 50,
        alertLevel: "alarm",
        agents: agentPatch,
        objective: { style: "failed", cleanExit: false },
      },
      [...moveEvents, event("tool_failed", { actor: "runner", text: "The final move was exposed." })],
      "Final action exposed",
    );
  }

  const cleanExit = world.objective.evidenceRisk < 50 && world.player.traceRisk < 40;

  return baseResult(
    request,
    status,
    score,
    {
      timeSeconds: 4,
      alertLevel: world.objective.evidenceRisk > 50 ? "suspicious" : "curious",
      agents: agentPatch,
      objective: { targetHandled: true, style: "accident", cleanExit },
      npcs: {
        target: { stateTags: [...world.npcs.target.stateTags, "handled"] },
      },
    },
    [
      ...moveEvents,
      event("objective_update", {
        actor: "target",
        text: cleanExit
          ? "Target falls. It looks like an accident."
          : "Target falls — but the scene may leave traces.",
        severity: "high",
      }),
    ],
  );
}

export function applyToolResult(world: WorldState, result: ToolUseResult): WorldState {
  const withDelta = applyWorldDelta(world, result.worldDelta);
  withDelta.eventLog = [...withDelta.eventLog, ...result.generatedEvents];
  syncPresenceLists(withDelta);
  return withDelta;
}
