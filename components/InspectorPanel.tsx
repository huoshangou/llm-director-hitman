"use client";

import { nextCheckpointHint } from "@/lib/ui/convergenceHints";
import { buildHackerAnalysis } from "@/lib/ui/hackerAnalysis";
import type { MapSelection } from "@/lib/ui/mapSelection";
import type { WorldState } from "@/lib/world/worldTypes";

export default function InspectorPanel({
  world,
  selection,
  onClear,
}: {
  world: WorldState;
  selection: MapSelection | null;
  onClear: () => void;
}) {
  const convergeHint = nextCheckpointHint(world);

  if (!selection) {
    return (
      <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
        <div className="font-medium text-neutral-400">骇入分析 · Inspector（只读）</div>
        <p className="mt-2 leading-relaxed">
          与 /play 底栏同源：点击地图物件或角色查看可供性与阻断因素。左侧 FIELD COMMS
          仅电台/环境音，不重复物件长文。
        </p>
        {convergeHint && (
          <p className="mt-3 border-t border-neutral-800 pt-2 text-xs text-amber-200/85">
            收敛：{convergeHint}
          </p>
        )}
      </div>
    );
  }

  const block = buildHackerAnalysis(world, selection);

  return (
    <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-emerald-100">{block.title}</div>
          <div className="mt-0.5 text-xs text-neutral-400">{block.subtitle}</div>
        </div>
        <button
          type="button"
          className="text-[10px] text-neutral-500 underline"
          onClick={onClear}
        >
          取消选中
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-neutral-300">
        {block.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {block.affordances.length > 0 && (
        <>
          <div className="mt-3 text-xs font-medium text-emerald-200/90">已注册操作</div>
          <ul className="mt-1 space-y-1">
            {block.affordances.map((label) => (
              <li
                key={label}
                className="rounded-lg border border-emerald-800/40 bg-neutral-950/60 px-2 py-1.5 text-xs text-emerald-50/90"
              >
                {label}
              </li>
            ))}
          </ul>
        </>
      )}
      {convergeHint && (
        <p className="mt-3 border-t border-emerald-800/40 pt-2 text-xs text-amber-200/90">
          收敛：{convergeHint}
        </p>
      )}
      <p className="mt-2 text-[10px] text-neutral-500">
        写入下方 plan；MAP REF 与 /play 相同，提交时进入 Director 上下文。
      </p>
    </div>
  );
}
