"use client";

import { EVENT_TYPE_LABELS } from "@/lib/ui/labels";
import type { GameEvent } from "@/lib/world/worldTypes";

export default function EventLog({ events }: { events: GameEvent[] }) {
  const tail = events.slice(-16).reverse();
  return (
    <div className="max-h-64 overflow-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-1 font-semibold">发生了什么（Event log）</div>
      <p className="mb-3 text-xs text-neutral-500">执行指令后，因果链会记在这里。最新的在最上面。</p>
      {tail.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-700 p-4 text-sm text-neutral-500">
          还没有事件。点右侧「从这里开始」试第一条指令。
        </div>
      ) : (
        tail.map((e) => (
          <div key={e.id} className="border-b border-neutral-800 py-2 text-xs">
            <div className="text-neutral-300">{e.text ?? "（无描述）"}</div>
            <div className="mt-1 text-[10px] text-neutral-500">
              {EVENT_TYPE_LABELS[e.type] ?? e.type}
              {e.actor ? ` · ${String(e.actor)}` : ""}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
