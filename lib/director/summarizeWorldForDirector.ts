import { toolRegistry } from "../tools/toolRegistry";
import type { WorldState } from "../world/worldTypes";

export function summarizeWorldForDirector(world: WorldState) {
  return {
    global: {
      turn: world.turn,
      timeSeconds: world.timeSeconds,
      alertLevel: world.alertLevel,
      suspicion: world.suspicion,
      objective: world.objective,
    },
    player: {
      traceRisk: world.player.traceRisk,
      permissions: world.player.permissions,
    },
    locations: Object.values(world.locations).map((l) => ({
      id: l.id,
      name: l.name,
      tags: l.tags,
      watchedBy: l.watchedBy,
      objects: l.objects,
      npcsPresent: l.npcsPresent,
      agentsPresent: l.agentsPresent,
    })),
    npcs: Object.values(world.npcs).map((n) => ({
      id: n.id,
      role: n.role,
      location: n.location,
      attentionMode: n.attentionMode,
      motives: n.motives,
      beliefs: n.beliefs,
      currentTask: n.currentTask,
    })),
    agents: Object.values(world.agents).map((a) => ({
      id: a.id,
      location: a.location,
      coverIdentity: a.coverIdentity,
      exposure: a.exposure,
    })),
    objects: Object.values(world.objects).map((o) => ({
      id: o.id,
      type: o.type,
      location: o.location,
      visible: o.visible,
      state: o.state,
      affordances: o.affordances,
      tags: o.tags,
    })),
    tools: Object.values(toolRegistry).map((t) => ({
      id: t.id,
      category: t.category,
      allowedActors: t.allowedActors,
      description: t.description,
    })),
  };
}
