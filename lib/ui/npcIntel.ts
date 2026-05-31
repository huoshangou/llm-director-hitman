import type { NpcId, WorldState } from "../world/worldTypes";
import { LOCATION_LABELS } from "./locationLabels";
import { NPC_LABELS } from "./labels";

export type NpcIntelCard = {
  title: string;
  locationLabel: string;
  attention: string;
  notes: string[];
};

const ATTENTION_LABELS: Record<string, string> = {
  idle: "常态巡逻",
  watching: "注视场内",
  investigating: "调查中",
  distracted: "被分心",
  handling_complaint: "处理投诉",
};

export function npcIntelCard(world: WorldState, npcId: NpcId): NpcIntelCard {
  const npc = world.npcs[npcId];
  const title = NPC_LABELS[npcId]?.full ?? npcId;
  const notes: string[] = [];

  if (npcId === "target") {
    const balconyBias = npc.routeBias.balcony ?? 0;
    if (balconyBias >= 25) notes.push(`去阳台意愿偏高（${balconyBias}）`);
    if (npc.beliefs.some((b) => b.source === "spoof")) notes.push("似乎刚收到一条私密短信");
    if (npc.stateTags.includes("handled")) notes.push("已失去行动能力");
  }
  if (npcId === "guard") {
    notes.push(`怀疑度感知：全场 ${world.suspicion}`);
    if (npc.attentionMode === "handling_complaint") notes.push("正被行政问题占用");
  }

  return {
    title,
    locationLabel: LOCATION_LABELS[npc.location],
    attention: ATTENTION_LABELS[npc.attentionMode] ?? npc.attentionMode,
    notes,
  };
}
