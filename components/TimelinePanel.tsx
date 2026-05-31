"use client";

import { EVENT_TYPE_LABELS } from "@/lib/ui/labels";
import type { GameEvent } from "@/lib/world/worldTypes";

export default function TimelinePanel({
  timeline,
  focusEventId,
  onFocus,
}: {
  timeline: GameEvent[];
  focusEventId: string | null;
  onFocus: (id: string | null) => void;
}) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-xs text-neutral-500">
        本 turn 尚无 timeline。执行一步指令后，这里会按时间顺序列出事件。
      </div>
    );
  }

  const focusIndex = timeline.findIndex((e) => e.id === focusEventId);

  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">本 Turn Timeline</div>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] disabled:opacity-40"
            disabled={focusIndex <= 0}
            onClick={() => onFocus(timeline[Math.max(0, focusIndex - 1)]?.id ?? null)}
          >
            上一条
          </button>
          <button
            type="button"
            className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] disabled:opacity-40"
            disabled={focusIndex < 0 || focusIndex >= timeline.length - 1}
            onClick={() =>
              onFocus(timeline[Math.min(timeline.length - 1, focusIndex + 1)]?.id ?? null)
            }
          >
            下一条
          </button>
        </div>
      </div>
      <p className="mb-2 text-[10px] text-neutral-500">点击事件可在地图上高亮对应 overlay。</p>
      <div className="max-h-40 space-y-1 overflow-auto">
        {timeline.map((e) => {
          const active = e.id === focusEventId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onFocus(e.id)}
              className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                active
                  ? "border-amber-500/60 bg-amber-950/40"
                  : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
              }`}
            >
              <div className="text-neutral-300">{e.text ?? "（无描述）"}</div>
              <div className="mt-0.5 text-[10px] text-neutral-500">
                t{e.t} · {EVENT_TYPE_LABELS[e.type] ?? e.type}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
