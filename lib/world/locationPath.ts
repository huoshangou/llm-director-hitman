import type { LocationId, LocationState } from "./worldTypes";

const LOC_ZH: Record<LocationId, string> = {
  lobby: "大堂",
  bar: "吧台",
  kitchen: "厨房",
  gallery: "画廊",
  balcony: "阳台",
};

/** Graph edges from world locations (symmetric walk). */
export function areAdjacentLocations(a: LocationId, b: LocationId): boolean {
  if (a === b) return true;
  const edges: Record<LocationId, LocationId[]> = {
    lobby: ["bar", "gallery"],
    bar: ["lobby", "kitchen"],
    kitchen: ["bar"],
    gallery: ["lobby", "balcony"],
    balcony: ["gallery"],
  };
  return edges[a]?.includes(b) ?? false;
}

/** BFS shortest path including start and end. */
export function findLocationPath(
  from: LocationId,
  to: LocationId,
  locations: Record<LocationId, LocationState>,
): LocationId[] {
  if (from === to) return [from];
  const queue: LocationId[] = [from];
  const prev = new Map<LocationId, LocationId | null>([[from, null]]);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const next of locations[cur].connectedTo) {
      if (prev.has(next)) continue;
      prev.set(next, cur);
      queue.push(next);
    }
  }

  if (!prev.has(to)) return [from, to];

  const path: LocationId[] = [];
  let node: LocationId | null = to;
  while (node) {
    path.unshift(node);
    node = prev.get(node) ?? null;
  }
  return path;
}

export function pathHopLabel(
  agentId: string,
  from: LocationId,
  to: LocationId,
  hopIndex: number,
  hopCount: number,
): string {
  const who = agentId === "runner" ? "Runner" : agentId === "face" ? "Face" : agentId;
  if (hopCount === 1) {
    return `${who} 前往 ${LOC_ZH[to] ?? to}`;
  }
  if (from === "kitchen" && to === "bar") {
    return `${who} 换上制服后进入吧台区`;
  }
  if (from === "bar" && to === "lobby") {
    return `${who} 穿过大堂入口`;
  }
  if (from === "lobby" && to === "gallery") {
    return `${who} 进入画廊走廊`;
  }
  if (from === "gallery" && to === "balcony") {
    return `${who} 前往阳台`;
  }
  if (from === "lobby" && to === "bar") {
    return `${who} 退回吧台侧`;
  }
  return `${who} 经 ${LOC_ZH[from] ?? from} 前往 ${LOC_ZH[to] ?? to}（${hopIndex + 1}/${hopCount}）`;
}
