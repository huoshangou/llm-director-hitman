"use client";

import { compilePlanFromText } from "@/lib/director/planStub";
import type { MapSelection } from "@/lib/ui/mapSelection";
import { selectionChipText, selectionLabel } from "@/lib/ui/mapSelection";
import { buildValidationSummaryParts } from "@/lib/ui/planValidationSummary";
import { validateToolChain } from "@/lib/tools/checkPreconditions";
import type { ToolUseRequest } from "@/lib/tools/toolTypes";
import type { WorldState } from "@/lib/world/worldTypes";

export type PlanSubmitPreview = {
  compileNote?: string;
  chain: ToolUseRequest[];
  rejected: { request: ToolUseRequest; reasons: string[] }[];
  summary: ReturnType<typeof buildValidationSummaryParts>;
};

export default function PlanSubmitPanel({
  world,
  planText,
  onChange,
  selection,
  onInsertSelection,
  preview,
  compileError,
  busy,
  onSubmit,
  mode = "gm",
}: {
  world: WorldState;
  planText: string;
  onChange: (v: string) => void;
  selection: MapSelection | null;
  onInsertSelection: () => void;
  preview: PlanSubmitPreview | null;
  compileError: string | null;
  busy: boolean;
  onSubmit: () => void;
  /** gm = Debug 页；与 /play 共用 validation 语义 */
  mode?: "gm" | "play";
}) {
  const summary = preview?.summary;
  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-neutral-300">
          本 Turn 计划（GM Debug · Hacker）
        </div>
        <span className="text-[10px] text-neutral-500">
          GM 提交 → Director（用上方保存的本机 Key，无 key 则 stub）
        </span>
      </div>
      {mode === "gm" && (
        <p className="mb-2 text-[10px] text-neutral-500">
          Debug 页：validation / MAP REF 与{" "}
          <a href="/play/" className="text-amber-200/90 underline">
            /play
          </a>{" "}
          一致；玩家主路径请用 /play。
        </p>
      )}

      {selection && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-amber-100/90">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">MAP REF /</span>
          <span className="rounded-md border border-amber-600/50 bg-amber-950/40 px-2 py-0.5">
            {selection.kind}:{selectionLabel(world, selection)}
          </span>
          <span className="rounded-md border border-amber-600/50 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-100">
            {selectionChipText(selection)}
          </span>
          <button
            type="button"
            className="text-[10px] text-amber-200/80 underline"
            onClick={onInsertSelection}
          >
            插入到计划
          </button>
        </div>
      )}

      <textarea
        className="h-24 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm outline-none focus:border-neutral-500"
        placeholder="例：我先伪造一条阳台私密邀约短信；别让保安当成安保事件；下一步让 Face 去引开他……"
        value={planText}
        onChange={(e) => onChange(e.target.value)}
      />

      {compileError && (
        <p className="mt-2 text-xs text-amber-200/80">{compileError}</p>
      )}

      {preview && summary && (
        <div className="mt-3 space-y-2 text-xs">
          {preview.compileNote && (
            <p className="text-neutral-500">{preview.compileNote}</p>
          )}
          <div className="rounded-lg border border-neutral-700 bg-neutral-950/80 p-2 text-neutral-300">
            <div className="font-medium text-neutral-400">VALIDATION /</div>
            <div className="mt-1">
              executable {summary.executableCount} · rejected {summary.rejectedCount}
              {summary.errorCount > 0 ? ` · errors ${summary.errorCount}` : ""}
            </div>
            <div className="mt-1">{summary.stepLabel}</div>
            {summary.reason && (
              <div className="mt-1 text-red-200/80">reason: {summary.reason}</div>
            )}
            {summary.nextHint && (
              <div className="mt-1 text-amber-200/90">{summary.nextHint}</div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
        onClick={onSubmit}
      >
        {busy ? "执行中…" : "提交本 Turn（GM）"}
      </button>
    </div>
  );
}

export function buildPlanPreview(
  planText: string,
  world: WorldState,
  selection: MapSelection | null,
): { preview: PlanSubmitPreview | null; error: string | null } {
  const compiled = compilePlanFromText(planText, world, selection);
  if (!compiled.ok) {
    return { preview: null, error: compiled.message };
  }
  const { executableChain, rejected } = validateToolChain(compiled.chain, world);
  const summary = buildValidationSummaryParts(world, {
    executableChain,
    rejected,
    errors: [],
    warnings: [],
  });
  return {
    preview: {
      compileNote: compiled.note,
      chain: executableChain,
      rejected,
      summary,
    },
    error: null,
  };
}
