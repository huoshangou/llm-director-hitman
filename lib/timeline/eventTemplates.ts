import { entityMapPosition, mapToPercent } from "../sprites/mapLayout";
import { isSightlineClear } from "../world/selectors";
import type { GameEvent, LocationId, WorldState } from "../world/worldTypes";

export type OverlayCue = {
  id: string;
  label: string;
  locationId: LocationId;
  x: number;
  y: number;
  ephemeral?: boolean;
};

export type EntityVisual = {
  entityId: string;
  kind: "npc" | "agent";
  spriteKey: string;
  x: number;
  y: number;
};

const OVERLAY_LABELS: Record<string, string> = {
  fake_message_icon: "伪造短信",
  private_meeting_belief: "私密会面",
  route_arrow: "去阳台",
  admin_service_issue_icon: "行政分心",
  attention_arrow: "注意力",
  sight_cone_blocked: "视线被挡",
  spill_overlay: "洒酒",
  accident_ready: "可制造事故",
  disguise_icon: "伪装",
  suspicion_icon: "警觉",
  opportunity_window: "行动窗口",
};

export function overlayLabel(id: string): string {
  return OVERLAY_LABELS[id] ?? id;
}

function locAnchor(world: WorldState, locationId: LocationId): { x: number; y: number } {
  void world;
  const m = entityMapPosition(locationId, "target");
  const p = mapToPercent(m.x, m.y - 40);
  return { x: p.left, y: p.top };
}

function pushOverlay(
  list: OverlayCue[],
  seen: Set<string>,
  cue: OverlayCue,
): void {
  const key = `${cue.id}@${cue.locationId}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push(cue);
}

/** Persistent overlays driven by WorldState (survives between turns). */
export function overlaysFromWorld(world: WorldState): OverlayCue[] {
  const out: OverlayCue[] = [];
  const seen = new Set<string>();

  for (const [locId, loc] of Object.entries(world.locations)) {
    const anchor = locAnchor(world, locId as LocationId);
    if (loc.tags.includes("spill")) {
      pushOverlay(out, seen, {
        id: "spill_overlay",
        label: overlayLabel("spill_overlay"),
        locationId: locId as LocationId,
        ...anchor,
      });
    }
    if (loc.tags.includes("sightline_blocked")) {
      pushOverlay(out, seen, {
        id: "sight_cone_blocked",
        label: overlayLabel("sight_cone_blocked"),
        locationId: locId as LocationId,
        x: anchor.x + 20,
        y: anchor.y,
      });
    }
  }

  const target = world.npcs.target;
  const targetAnchor = locAnchor(world, target.location);
  if ((target.routeBias.balcony ?? 0) >= 25 && target.location !== "balcony") {
    pushOverlay(out, seen, {
      id: "route_arrow",
      label: overlayLabel("route_arrow"),
      locationId: target.location,
      x: targetAnchor.x,
      y: targetAnchor.y - 12,
    });
  }
  if (target.beliefs.some((b) => b.source === "spoof" || b.predicate.includes("meeting"))) {
    pushOverlay(out, seen, {
      id: "private_meeting_belief",
      label: overlayLabel("private_meeting_belief"),
      locationId: target.location,
      x: targetAnchor.x - 18,
      y: targetAnchor.y,
    });
  }

  const guard = world.npcs.guard;
  if (guard.attentionMode === "handling_complaint") {
    const a = locAnchor(world, guard.location);
    pushOverlay(out, seen, {
      id: "admin_service_issue_icon",
      label: overlayLabel("admin_service_issue_icon"),
      locationId: guard.location,
      ...a,
    });
  }

  if (
    world.objects.balcony_rail.state.tampered === true &&
    target.location === "balcony" &&
    isSightlineClear(world, "balcony")
  ) {
    pushOverlay(out, seen, {
      id: "accident_ready",
      label: overlayLabel("accident_ready"),
      locationId: "balcony",
      ...locAnchor(world, "balcony"),
    });
  }

  if (world.alertLevel === "suspicious" || world.alertLevel === "searching") {
    pushOverlay(out, seen, {
      id: "suspicion_icon",
      label: overlayLabel("suspicion_icon"),
      locationId: guard.location,
      ...locAnchor(world, guard.location),
    });
  }

  return out;
}

/** Ephemeral overlays for a single GameEvent (timeline playback). */
export function overlaysFromEvent(world: WorldState, event: GameEvent): OverlayCue[] {
  const locationId = (event.to ?? event.from ?? "gallery") as LocationId;
  const anchor = locAnchor(world, locationId);

  switch (event.type) {
    case "dialogue_bubble":
      if (event.actor === "target" && event.text?.includes("?")) {
        return [
          {
            id: "fake_message_icon",
            label: overlayLabel("fake_message_icon"),
            locationId: world.npcs.target.location,
            ...locAnchor(world, world.npcs.target.location),
            ephemeral: true,
          },
        ];
      }
      return [];
    case "attention_shift":
      return [
        {
          id: "attention_arrow",
          label: overlayLabel("attention_arrow"),
          locationId: world.npcs.guard.location,
          ...locAnchor(world, world.npcs.guard.location),
          ephemeral: true,
        },
        {
          id: "admin_issue_belief",
          label: overlayLabel("admin_issue_belief"),
          locationId: world.npcs.guard.location,
          x: anchor.x,
          y: anchor.y,
          ephemeral: true,
        },
      ];
    case "object_state_change":
      if (event.object === "wine_glass" || event.text?.includes("spill")) {
        return [
          {
            id: "spill_overlay",
            label: overlayLabel("spill_overlay"),
            locationId: locationId,
            ...anchor,
            ephemeral: true,
          },
        ];
      }
      if (event.object === "balcony_rail") {
        return [
          {
            id: "accident_ready",
            label: overlayLabel("accident_ready"),
            locationId: "balcony",
            ...locAnchor(world, "balcony"),
            ephemeral: true,
          },
        ];
      }
      if (event.object === "cleaning_cart") {
        return [
          {
            id: "sight_cone_blocked",
            label: overlayLabel("sight_cone_blocked"),
            locationId: locationId,
            ...anchor,
            ephemeral: true,
          },
        ];
      }
      return [];
    case "agent_move":
      if (event.actor === "runner") {
        const to = (event.to ?? "kitchen") as LocationId;
        return [
          {
            id: "disguise_icon",
            label: "Runner 移动",
            locationId: to,
            ...locAnchor(world, to),
            ephemeral: true,
          },
        ];
      }
      return [];
    case "npc_move":
      if (event.actor === "target") {
        return [
          {
            id: "route_arrow",
            label: overlayLabel("route_arrow"),
            locationId: (event.to ?? "balcony") as LocationId,
            ...locAnchor(world, (event.to ?? "balcony") as LocationId),
            ephemeral: true,
          },
        ];
      }
      return [];
    case "objective_update":
      return [
        {
          id: "accident_ready",
          label: "事故完成",
          locationId: "balcony",
          ...locAnchor(world, "balcony"),
          ephemeral: true,
        },
      ];
    case "alert_change":
      return [
        {
          id: "suspicion_alert",
          label: overlayLabel("suspicion_alert"),
          locationId: world.npcs.guard.location,
          ...locAnchor(world, world.npcs.guard.location),
          ephemeral: true,
        },
      ];
    default:
      return [];
  }
}

export function spriteKeyForNpc(world: WorldState, npcId: string): string {
  const npc = world.npcs[npcId as keyof typeof world.npcs];
  if (!npc) return `${npcId}_idle`;
  if (npc.id === "target") {
    if (npc.beliefs.some((b) => b.source === "spoof")) return "target_checking_phone";
    if (npc.stateTags.includes("handled")) return "target_idle";
    if (npc.location === "balcony") return "target_moving_to_balcony";
    return "target_idle";
  }
  if (npc.id === "guard") {
    if (npc.attentionMode === "handling_complaint" || npc.attentionMode === "distracted") {
      return "guard_distracted";
    }
    if (npc.attentionMode === "investigating") return "guard_investigating";
    if (world.alertLevel === "alarm") return "guard_alarmed";
    return "guard_watching";
  }
  if (npc.id === "waiter") return "waiter_idle";
  if (npc.id === "cleaner") return "cleaner_idle";
  if (npc.id === "guest") return "guest_cluster_idle";
  return `${npc.id}_idle`;
}

export function spriteKeyForAgent(
  world: WorldState,
  agentId: "face" | "runner",
): string {
  const agent = world.agents[agentId];
  if (agent.coverIdentity === "waiter") return "runner_disguised_waiter";
  if (agent.status === "moving") return `${agentId}_moving`;
  return `${agentId}_idle`;
}

export function entityVisualsFromWorld(world: WorldState): EntityVisual[] {
  const visuals: EntityVisual[] = [];

  for (const npc of Object.values(world.npcs)) {
    const m = entityMapPosition(npc.location, npc.id);
    const p = mapToPercent(m.x, m.y);
    visuals.push({
      entityId: npc.id,
      kind: "npc",
      spriteKey: spriteKeyForNpc(world, npc.id),
      x: p.left,
      y: p.top,
    });
  }

  for (const [id, agent] of Object.entries(world.agents)) {
    const m = entityMapPosition(agent.location, id);
    const p = mapToPercent(m.x, m.y);
    visuals.push({
      entityId: id,
      kind: "agent",
      spriteKey: spriteKeyForAgent(world, id as "face" | "runner"),
      x: p.left,
      y: p.top,
    });
  }

  return visuals;
}

export function resolveMapVisuals(
  world: WorldState,
  options?: { focusEvent?: GameEvent | null },
): { overlays: OverlayCue[]; entities: EntityVisual[] } {
  const persistent = overlaysFromWorld(world);
  const ephemeral = options?.focusEvent ? overlaysFromEvent(world, options.focusEvent) : [];
  const merged = [...persistent];
  for (const e of ephemeral) {
    merged.push({ ...e, ephemeral: true });
  }
  return {
    overlays: merged,
    entities: entityVisualsFromWorld(world),
  };
}
