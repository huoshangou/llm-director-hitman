"use client";

import { getShowcaseRoute, showcaseRoutes } from "@/lib/routes/showcaseRoutes";
import type { WorldState } from "@/lib/world/worldTypes";

export default function ShowcasePanel({
  world,
  routeId,
  stepIndex,
  onRouteChange,
  onRunStep,
  busy,
}: {
  world: WorldState;
  routeId: string;
  stepIndex: number;
  onRouteChange: (id: string) => void;
  onRunStep: () => void;
  busy: boolean;
}) {
  const route = getShowcaseRoute(routeId);
  const step = route?.steps[stepIndex];
  const done = route ? stepIndex >= route.steps.length : false;

  return (
    <div className="rounded-2xl border border-violet-800/60 bg-violet-950/20 p-4">
      <div className="mb-1 font-semibold text-violet-100">演示 · Showcase 点步</div>
      <p className="mb-3 text-xs leading-relaxed text-violet-200/70">
        与 <a href="/play/" className="underline">/play/</a> 同路线。每点「执行下一步」跑一 turn + tick；想自己指挥请用下方 plan。
      </p>

      <select
        className="mb-3 w-full rounded-lg border border-violet-800 bg-neutral-950 px-2 py-1.5 text-xs"
        value={routeId}
        onChange={(e) => onRouteChange(e.target.value)}
      >
        {showcaseRoutes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>

      {route && (
        <div className="mb-3 text-xs text-violet-200/60">
          进度 {Math.min(stepIndex, route.steps.length)} / {route.steps.length} · {route.description}
        </div>
      )}

      {done ? (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3 text-sm text-emerald-100">
          本路线步骤已跑完。看下方「收敛 / 终态」面板。Reset 可重来。
        </div>
      ) : step ? (
        <div className="rounded-lg border border-violet-900/50 bg-neutral-950/60 p-3">
          <div className="text-sm font-medium text-violet-100">{step.label}</div>
          <div className="mt-1 text-xs text-neutral-400">{step.hint}</div>
          <div className="mt-2 text-[10px] text-neutral-500">
            {step.tool.actor} → {step.tool.toolId}
          </div>
          <button
            type="button"
            disabled={busy || world.objective.targetHandled}
            className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            onClick={onRunStep}
          >
            执行下一步
          </button>
        </div>
      ) : null}

      {world.objective.targetHandled && (
        <p className="mt-2 text-xs text-emerald-300">Primary objective 已完成。</p>
      )}
    </div>
  );
}
