import type { GameEvent, LocationId, NpcId } from "../world/worldTypes";
import { NPC_LABELS } from "./labels";

const LOC_ZH: Record<LocationId, string> = {
  lobby: "大堂",
  bar: "吧台",
  kitchen: "厨房",
  gallery: "画廊",
  balcony: "阳台",
};

export type CommandFeedLine = {
  speaker: "WORLD" | "Face" | "Runner" | "Hacker";
  text: string;
  priority: "high" | "normal" | "low";
};

const PRIMARY_DIALOGUE_ACTORS = new Set(["face", "runner", "target", "player"]);

function agentSpeaker(actor: string): CommandFeedLine["speaker"] | null {
  if (actor === "face" || actor === "runner") return actor === "face" ? "Face" : "Runner";
  if (actor === "player") return "Hacker";
  return null;
}

function locationZh(id: LocationId | undefined): string {
  if (!id) return "";
  return LOC_ZH[id] ?? id;
}

function npcMoveText(event: GameEvent): string | null {
  if (event.text) return event.text;
  if (event.actor === "target" && event.to === "balcony") {
    return "目标走向阳台";
  }
  const npc = event.actor as NpcId | undefined;
  const name = npc && NPC_LABELS[npc] ? NPC_LABELS[npc].short : event.actor;
  if (event.from && event.to) {
    return `${name} 从${locationZh(event.from)}移向${locationZh(event.to)}`;
  }
  return null;
}

/** Map a timeline GameEvent to a Command Feed line, or null to skip. */
export function commandFeedLineForEvent(event: GameEvent): CommandFeedLine | null {
  switch (event.type) {
    case "dialogue_bubble": {
      if (!event.text?.trim() || !event.actor) return null;
      if (!PRIMARY_DIALOGUE_ACTORS.has(event.actor)) {
        return { speaker: "WORLD", text: event.text, priority: "low" };
      }
      const agent = agentSpeaker(event.actor);
      if (agent) {
        return { speaker: agent, text: event.text, priority: "normal" };
      }
      if (event.actor === "target") {
        return { speaker: "WORLD", text: `目标：${event.text}`, priority: "normal" };
      }
      return { speaker: "WORLD", text: event.text, priority: "low" };
    }
    case "object_state_change":
    case "attention_shift":
      if (!event.text?.trim()) return null;
      return { speaker: "WORLD", text: event.text, priority: "normal" };
    case "npc_move":
    case "agent_move": {
      const text = npcMoveText(event);
      if (!text) return null;
      return { speaker: "WORLD", text, priority: "normal" };
    }
    case "objective_update": {
      const raw = event.text?.trim();
      const text =
        raw?.includes("accident") || raw?.includes("Target falls")
          ? raw.includes("traces")
            ? "目标已处理，现场可能留痕"
            : "目标坠落，现场像事故"
          : raw ?? "任务状态更新";
      return { speaker: "WORLD", text, priority: "high" };
    }
    default:
      return null;
  }
}

export function commandFeedLinesFromTimeline(events: GameEvent[]): CommandFeedLine[] {
  const out: CommandFeedLine[] = [];
  for (const event of events) {
    const line = commandFeedLineForEvent(event);
    if (!line || line.priority === "low") continue;
    out.push(line);
  }
  return out;
}
