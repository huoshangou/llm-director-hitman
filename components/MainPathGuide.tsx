"use client";

import { getShowcaseRoute } from "@/lib/routes/showcaseRoutes";
import { classifyTerminalState } from "@/lib/convergence/terminalState";
import { CHECKPOINT_HINT, nextOpenCheckpoint } from "@/lib/ui/convergenceHints";
import type { WorldState } from "@/lib/world/worldTypes";

export default function MainPathGuide({
  world,
  showcaseRouteId,
  showcaseStepIndex,
}: {
  world: WorldState;
  showcaseRouteId: string;
  showcaseStepIndex: number;
}) {
  const terminal = classifyTerminalState(world);
  const nextCp = nextOpenCheckpoint(world);
  const route = getShowcaseRoute(showcaseRouteId);
  const step = route?.steps[showcaseStepIndex];
  const done = route ? showcaseStepIndex >= route.steps.length : false;

  return (
    <div className="rounded-2xl border border-amber-700/45 bg-amber-950/25 p-4 text-sm">
      <div className="font-semibold text-amber-100">怎么玩（主路径）</div>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-amber-50/85">
        <li>
          <strong>点地图</strong>选物件/角色 → 左侧 Hacker 监听 + 右侧 Inspector
        </li>
        <li>
          <strong>看左侧「收敛」</strong>
          {nextCp && !world.objective.targetHandled ? (
            <span className="text-amber-200">
              {" "}
              — 当前缺：{CHECKPOINT_HINT[nextCp.id] ?? nextCp.label}
            </span>
          ) : (
            <span> — 检查点与终态</span>
          )}
        </li>
        <li>
          <strong>底部写 plan →「提交本 Turn」</strong>（无 key 走 stub；配 key 走 LLM）
        </li>
      </ol>
      <p className="mt-2 text-[11px] text-amber-200/55">
        阶段 1 金句回归：<code className="text-amber-100/80">npm run test:director-golden</code>
        （stub 必过；有 API key 会打印 LLM 对齐率）
      </p>
      <p className="mt-2 text-[11px] text-amber-200/60">
        终态：<span className="text-amber-100">{terminal.label}</span> · 沙盒演示{" "}
        <a href="/play/" className="underline">
          /play/
        </a>
      </p>
      <div className="mt-3 rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-100/90">
        <span className="font-medium text-violet-200">演示模式（Showcase）</span>
        {done ? (
          <span className="text-emerald-300"> — 本路线已跑完，可 Reset 或换路线</span>
        ) : step ? (
          <span>
            {" "}
            — 下一步：<strong>{step.label}</strong>（{step.hint}）
          </span>
        ) : (
          <span> — 选路线后点「执行下一步」</span>
        )}
      </div>
    </div>
  );
}
