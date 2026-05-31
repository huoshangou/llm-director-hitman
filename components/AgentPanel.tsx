"use client";

import type { WorldState } from "@/lib/world/worldTypes";

export default function AgentPanel({ world }: { world: WorldState }) {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="font-semibold">你 · Hacker（幕后指挥）</div>
      <div className="rounded-xl border border-violet-800 bg-neutral-950 p-3 text-xs text-neutral-300">
        <div>数字痕迹 Trace: {world.player.traceRisk}</div>
        <div className="mt-1 text-neutral-500">你不在地图上，通过远程指令操作</div>
      </div>

      <div className="pt-2 font-semibold">现场干员</div>
      {Object.values(world.agents).map((a) => (
        <div key={a.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs">
          <div className="font-medium">{a.name}</div>
          <div className="text-neutral-500">位置: {a.location}</div>
          <div className="text-neutral-500">伪装: {a.coverIdentity ?? "无"}</div>
          <div className="text-neutral-500">Exposure: {a.exposure}</div>
        </div>
      ))}

      <div className="pt-2 font-semibold">目标动向</div>
      <div className="text-xs text-neutral-400">
        去阳台倾向 {world.npcs.target.routeBias.balcony ?? 0} / 50（满 50 且 tick 后会移动）
      </div>
    </div>
  );
}
