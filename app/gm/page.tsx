"use client";

import { useCallback, useMemo, useState } from "react";
import HackerCommsPanel from "@/components/HackerCommsPanel";
import IntroPanel from "@/components/IntroPanel";
import { useHackerIntelFeed } from "@/components/useHackerIntelFeed";
import AgentPanel from "@/components/AgentPanel";
import ConvergencePanel from "@/components/ConvergencePanel";
import DebugPanel from "@/components/DebugPanel";
import EventLog from "@/components/EventLog";
import GameMap from "@/components/GameMap";
import Hud from "@/components/Hud";
import InspectorPanel from "@/components/InspectorPanel";
import ManualTestPanel from "@/components/ManualTestPanel";
import PlanSubmitPanel, { buildPlanPreview } from "@/components/PlanSubmitPanel";
import { useTurnPlayback } from "@/components/useTurnPlayback";
import { useAmbientWorld } from "@/components/useAmbientWorld";
import LlmSettingsPanel, { getLlmPayloadForApi } from "@/components/LlmSettingsPanel";
import MainPathGuide from "@/components/MainPathGuide";
import ShowcasePanel from "@/components/ShowcasePanel";
import TimelinePanel from "@/components/TimelinePanel";
import { fetchDirectorPlan } from "@/lib/director/fetchDirector";
import { runTurn } from "@/lib/play/runTurn";
import { cloneWorld, initialWorld } from "@/lib/world/initialWorld";
import { manualTestPlans } from "@/lib/routes/manualTestPlans";
import { getShowcaseRoute } from "@/lib/routes/showcaseRoutes";
import { validateToolChain, validateToolRequest } from "@/lib/tools/checkPreconditions";
import type { ExecuteMode } from "@/lib/tools/executePlan";
import type { ToolUseRequest } from "@/lib/tools/toolTypes";
import { buildValidationSummaryParts } from "@/lib/ui/planValidationSummary";
import { selectionChipText, type MapSelection } from "@/lib/ui/mapSelection";
import type { GameEvent, WorldState } from "@/lib/world/worldTypes";

export default function GmPage() {
  const [world, setWorld] = useState<WorldState>(() => cloneWorld());
  const [planText, setPlanText] = useState("");
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [debug, setDebug] = useState<unknown>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showcaseRouteId, setShowcaseRouteId] = useState("route_a");
  const [showcaseStepIndex, setShowcaseStepIndex] = useState(0);
  const [turnTimeline, setTurnTimeline] = useState<GameEvent[]>([]);
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const { playing, frame, displayWorld, play } = useTurnPlayback();
  const { items: hackerFeed, onAmbientPulse, resetFeed: resetHackerFeed } = useHackerIntelFeed(
    world,
    { paused: playing || busy, selection, intelOnSelect: false },
  );
  useAmbientWorld(world, setWorld, {
    enabled: true,
    paused: playing || busy,
    onAmbientTick: onAmbientPulse,
  });

  const focusEvent = useMemo(
    () => turnTimeline.find((e) => e.id === focusEventId) ?? null,
    [turnTimeline, focusEventId],
  );

  const { preview: planPreview, error: planCompileHint } = useMemo(() => {
    if (!planText.trim() && !selection) return { preview: null, error: null };
    return buildPlanPreview(planText, world, selection);
  }, [planText, world, selection]);

  const reset = useCallback(() => {
    setWorld(cloneWorld());
    setPlanText("");
    setSelection(null);
    setPlanError(null);
    setDebug(null);
    setShowcaseStepIndex(0);
    setTurnTimeline([]);
    setFocusEventId(null);
    resetHackerFeed();
  }, [resetHackerFeed]);

  const applyTurn = useCallback((base: WorldState, chain: ToolUseRequest[], mode: ExecuteMode) => {
    const turn = runTurn(base, chain, mode);
    setWorld(turn.world);
    setTurnTimeline(turn.turnTimeline);
    setFocusEventId(turn.turnTimeline[0]?.id ?? null);
    return turn;
  }, []);

  const insertSelectionChip = useCallback(() => {
    if (!selection) return;
    const chip = selectionChipText(selection);
    setPlanText((t) => (t.includes(chip) ? t : t ? `${t} ${chip}` : chip));
  }, [selection]);

  const submitPlayerPlan = useCallback(async () => {
    if (playing) return;
    setPlanError(null);

    setBusy(true);
    try {
      const directed = await fetchDirectorPlan({
        playerPlan: planText,
        world,
        selection,
        clientLlm: getLlmPayloadForApi(),
      });
      if (!directed.ok) {
        setPlanError(directed.error);
        return;
      }

      const { plan, validation, source } = directed;
      if (validation.executableChain.length === 0) {
        const parts = buildValidationSummaryParts(
          world,
          validation,
          plan.unsupportedParts[0]?.reason,
        );
        setPlanError(
          parts.nextHint ?? parts.reason ?? "本 turn 没有可执行的工具。",
        );
        setDebug({ planText, selection, source, plan, validation, validationSummary: parts });
        return;
      }

      const worldBefore = structuredClone(world);
      const turn = runTurn(worldBefore, validation.executableChain, "step");
      if (turn.turnTimeline.length > 0) {
        await play(worldBefore, turn.turnTimeline);
      }
      setWorld(turn.world);
      setTurnTimeline(turn.turnTimeline);
      setFocusEventId(turn.turnTimeline[0]?.id ?? frame?.activeEventId ?? null);
      setDebug({
        playerPlan: true,
        planText,
        selection,
        directorSource: source,
        playerFacingSummary: plan.playerFacingSummary,
        unsupportedParts: plan.unsupportedParts,
        validation,
        results: turn.results,
        tickEvents: turn.tickEvents,
        turnTimeline: turn.turnTimeline,
      });
    } finally {
      setBusy(false);
    }
  }, [frame?.activeEventId, planText, play, playing, selection, world]);

  const runManual = useCallback(
    (planId: string, mode: ExecuteMode) => {
      const plan = manualTestPlans.find((p) => p.id === planId);
      if (!plan) return;

      setBusy(true);
      try {
        const base = cloneWorld(initialWorld);
        const validation = validateToolChain(plan.chain, base);
        const turn = applyTurn(base, validation.executableChain, mode);
        setDebug({
          planId,
          mode,
          freshRun: true,
          validation,
          results: turn.results,
          tickEvents: turn.tickEvents,
          turnTimeline: turn.turnTimeline,
        });
      } finally {
        setBusy(false);
      }
    },
    [applyTurn],
  );

  const runShowcaseStep = useCallback(async () => {
    if (playing) return;
    const route = getShowcaseRoute(showcaseRouteId);
    const step = route?.steps[showcaseStepIndex];
    if (!step) return;

    setBusy(true);
    try {
      const validation = validateToolRequest(step.tool, world);
      if (!validation.ok) {
        setDebug({
          showcaseRouteId,
          stepIndex: showcaseStepIndex,
          step: step.label,
          blocked: validation.reasons,
        });
        return;
      }
      const worldBefore = structuredClone(world);
      const turn = runTurn(worldBefore, [step.tool], "step");
      if (turn.turnTimeline.length > 0) {
        await play(worldBefore, turn.turnTimeline);
      }
      setWorld(turn.world);
      setTurnTimeline(turn.turnTimeline);
      setFocusEventId(turn.turnTimeline[0]?.id ?? null);
      setShowcaseStepIndex((i) => i + 1);
      setDebug({
        showcaseRouteId,
        stepIndex: showcaseStepIndex,
        step: step.label,
        results: turn.results,
        tickEvents: turn.tickEvents,
        turnTimeline: turn.turnTimeline,
      });
    } finally {
      setBusy(false);
    }
  }, [applyTurn, play, playing, showcaseRouteId, showcaseStepIndex, world]);

  const handleRouteChange = useCallback((id: string) => {
    setShowcaseRouteId(id);
    setShowcaseStepIndex(0);
    setTurnTimeline([]);
    setFocusEventId(null);
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4">
      <Hud world={world} onReset={reset} />
      <div className="mt-4 space-y-4">
        <IntroPanel />
        <p className="rounded-xl border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
          <strong className="text-amber-200">Debug / GM</strong> — Showcase 点步、手写链、JSON
          调试。玩家体验与录 demo 请用{" "}
          <a href="/play/" className="underline">
            /play/
          </a>
          。
        </p>
        <LlmSettingsPanel compact />
        <MainPathGuide
          world={world}
          showcaseRouteId={showcaseRouteId}
          showcaseStepIndex={showcaseStepIndex}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[200px_minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <HackerCommsPanel items={hackerFeed} live={!playing && !busy} />
          <AgentPanel world={world} />
          <ConvergencePanel world={world} />
        </div>
        <GameMap
          world={displayWorld ?? world}
          focusEvent={focusEvent}
          selection={selection}
          onSelect={setSelection}
          playbackFrame={frame}
          playbackActive={playing}
        />
        <div className="space-y-4">
          <InspectorPanel world={world} selection={selection} onClear={() => setSelection(null)} />
          <TimelinePanel
            timeline={turnTimeline}
            focusEventId={playing ? frame?.activeEventId ?? focusEventId : focusEventId}
            onFocus={setFocusEventId}
          />
          <EventLog events={world.eventLog} />
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <ShowcasePanel
          world={world}
          routeId={showcaseRouteId}
          stepIndex={showcaseStepIndex}
          onRouteChange={handleRouteChange}
          onRunStep={runShowcaseStep}
          busy={busy}
        />
        <PlanSubmitPanel
          world={world}
          planText={planText}
          onChange={setPlanText}
          selection={selection}
          onInsertSelection={insertSelectionChip}
          preview={planPreview}
          compileError={planError ?? planCompileHint}
          busy={busy || playing}
          onSubmit={() => void submitPlayerPlan()}
        />
      </div>

      <details className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
        <summary className="cursor-pointer text-xs text-neutral-500">
          开发者：Showcase 点步 / 手写测试 / Debug
        </summary>
        <div className="mt-3 space-y-4">
          <ManualTestPanel onRun={runManual} busy={busy} />
          <button
            type="button"
            className="text-xs text-neutral-500 underline"
            onClick={() => setShowDebug((v) => !v)}
          >
            {showDebug ? "隐藏" : "显示"} Debug JSON
          </button>
          {showDebug && <DebugPanel data={debug} />}
        </div>
      </details>
    </main>
  );
}
