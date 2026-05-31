"use client";

import { manualTestPlans } from "@/lib/routes/manualTestPlans";
import type { ExecuteMode } from "@/lib/tools/executePlan";

const STARTER_PLAN_ID = "runner_spill_gallery";

export default function ManualTestPanel({
  onRun,
  busy,
}: {
  onRun: (planId: string, mode: ExecuteMode) => void;
  busy: boolean;
}) {
  const starter = manualTestPlans.find((p) => p.id === STARTER_PLAN_ID);

  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-1 font-semibold">试指令（预设脚本）</div>
      <p className="mb-3 text-xs leading-relaxed text-neutral-400">
        点 <strong className="text-neutral-200">执行一步</strong>，Runner 会从 Kitchen 赶到 Gallery
        泼酒；右侧 Event log 会记录发生了什么，地图上会出现 spill 标记。
      </p>

      {starter && (
        <button
          type="button"
          disabled={busy}
          className="mb-4 w-full rounded-xl border border-emerald-700 bg-emerald-950/60 px-3 py-3 text-left text-sm hover:bg-emerald-900/40 disabled:opacity-40"
          onClick={() => onRun(starter.id, "step")}
        >
          <div className="font-medium text-emerald-100">从这里开始：Runner 跨区泼酒</div>
          <div className="mt-1 text-xs text-emerald-200/70">{starter.description}</div>
        </button>
      )}

      <details className="text-xs text-neutral-500">
        <summary className="cursor-pointer text-neutral-400">更多测试（6 工具 + 链式）</summary>
        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-auto">
          {manualTestPlans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-2">
              <div className="text-sm font-medium text-neutral-200">{plan.title}</div>
              <div className="text-[11px] text-neutral-500">{plan.description}</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded bg-white px-2 py-1 text-xs text-black disabled:opacity-40"
                  onClick={() => onRun(plan.id, "step")}
                >
                  执行一步
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded bg-neutral-700 px-2 py-1 text-xs disabled:opacity-40"
                  onClick={() => onRun(plan.id, "full")}
                >
                  整条链
                </button>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
