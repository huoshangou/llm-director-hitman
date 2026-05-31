"use client";

import type { WorldState } from "@/lib/world/worldTypes";

const ALERT_CLASS: Record<string, string> = {
  calm: "text-neutral-300",
  curious: "text-sky-300",
  suspicious: "text-amber-300",
  searching: "text-orange-300",
  lockdown: "text-red-300",
  alarm: "text-red-400 font-medium",
};

const GUARD_ATTENTION_LABEL: Record<string, string> = {
  watching: "巡视",
  handling_complaint: "处理投诉",
  distracted: "分心",
  investigating: "查配电",
  panic: "恐慌",
};

export default function Hud({ world, onReset }: { world: WorldState; onReset: () => void }) {
  const guard = world.npcs.guard;
  const alertClass = ALERT_CLASS[world.alertLevel] ?? ALERT_CLASS.calm;
  const suspicionHigh = world.suspicion >= 40;
  const traceHigh = world.player.traceRisk >= 35;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div>
        <div className="text-xl font-bold">Balcony Job · GM</div>
        <div className="text-sm text-neutral-400">开发/对照 · 首页已默认进入玩家版</div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className={alertClass}>警戒: {world.alertLevel}</span>
        <span className={suspicionHigh ? "text-amber-300" : "text-neutral-300"}>
          怀疑: {world.suspicion}
        </span>
        <span className={traceHigh ? "text-rose-300" : "text-neutral-300"}>
          痕迹: {world.player.traceRisk}
        </span>
        <span className="text-neutral-400">时间: {world.timeSeconds}s</span>
        <span className="text-neutral-400">Turn: {world.turn}</span>
        <span className="text-neutral-300">
          保安: {GUARD_ATTENTION_LABEL[guard.attentionMode] ?? guard.attentionMode}
          {guard.location ? ` @ ${guard.location}` : ""}
        </span>
        <span className={world.objective.targetHandled ? "text-emerald-300" : "text-neutral-400"}>
          目标: {world.objective.targetHandled ? "已处理" : "进行中"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/play/"
          className="rounded-lg bg-sky-800 px-3 py-1 text-sm font-medium text-sky-50 hover:bg-sky-700"
        >
          返回游戏
        </a>
        <button
          type="button"
          className="rounded-lg bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
