"use client";

import {
  classifyTerminalState,
  convergenceCheckpoints,
} from "@/lib/convergence/terminalState";
import { CHECKPOINT_HINT, nextCheckpointHint } from "@/lib/ui/convergenceHints";
import type { WorldState } from "@/lib/world/worldTypes";

const TERMINAL_COLORS: Record<string, string> = {
  in_progress: "border-neutral-600 text-neutral-300",
  success_clean_accident: "border-emerald-600 text-emerald-200",
  success_messy_accident: "border-amber-600 text-amber-200",
  failed_alarm: "border-red-600 text-red-200",
  failed_final_exposed: "border-red-700 text-red-300",
  stalled_target: "border-orange-700 text-orange-200",
};

export default function ConvergencePanel({ world }: { world: WorldState }) {
  const terminal = classifyTerminalState(world);
  const checkpoints = convergenceCheckpoints(world);
  const nextOpen = checkpoints.find((cp) => !cp.done);
  const nextHint = nextCheckpointHint(world);
  const failed = terminal.id.startsWith("failed_");

  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-2 font-semibold">收敛 / 终态</div>
      <div className={`rounded-xl border px-3 py-2 ${TERMINAL_COLORS[terminal.id] ?? TERMINAL_COLORS.in_progress}`}>
        <div className="font-medium">{terminal.label}</div>
        <div className="mt-1 text-xs opacity-80">{terminal.description}</div>
      </div>

      {failed && (
        <p className="mt-3 text-xs text-red-300/90">
          本局可能已失败，可看 HUD 警戒/怀疑与下方未完成检查点。
        </p>
      )}
      {nextHint && (
        <p className="mt-2 text-xs text-amber-200/85">下一步：{nextHint}</p>
      )}
      <div className="mt-4 space-y-1.5">
        <div className="text-xs text-neutral-500">Balcony Job 收敛检查点</div>
        {checkpoints.map((cp) => {
          const isNext = nextOpen?.id === cp.id && !cp.done;
          return (
            <div
              key={cp.id}
              className={`flex items-center gap-2 text-xs ${isNext ? "rounded-md bg-amber-950/40 px-1 py-0.5" : ""}`}
            >
              <span className={cp.done ? "text-emerald-400" : isNext ? "text-amber-400" : "text-neutral-600"}>
                {cp.done ? "✓" : "○"}
              </span>
              <span
                className={
                  cp.done ? "text-neutral-200" : isNext ? "text-amber-100" : "text-neutral-500"
                }
              >
                {cp.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
