import { buildFieldAgentRadio, type FieldAgentRadioLine } from "./clarificationRadio";
import { compilePlanFromText, selectionUsedForCompile } from "./planStub";
import {
  buildWorldContinuationChain,
  playerPlanLooksLikeContinuation,
} from "./worldContinuation";
import {
  callDirector,
  directorLlmConfigured,
  type ClientLlmSettings,
} from "./callDirector";
import type { DirectorBreak } from "./directorBreak";
import { buildBreakRadio } from "./narrateDirectorBreak";
import { prepareDirectorPlan } from "./planSanitize";
import { semanticValidatePlan } from "./semanticValidate";
import type { DirectorPlan } from "./directorSchema";
import { validateDirectorPlan, type DirectorValidation } from "./validateDirectorPlan";
import type { MapSelection } from "../ui/mapSelection";
import type { WorldState } from "../world/worldTypes";
import type { ToolUseRequest } from "../tools/toolTypes";

export type DirectorCompileSource = "llm" | "stub" | "llm_fallback_stub";

export type DirectorCompileResult = {
  ok: boolean;
  clarificationOnly?: boolean;
  fieldAgentRadio?: FieldAgentRadioLine[];
  directorBreak?: DirectorBreak;
  source: DirectorCompileSource;
  plan: DirectorPlan | null;
  validation: DirectorValidation | null;
  message?: string;
};

function stubToDirectorPlan(
  playerPlan: string,
  note: string,
  chain: ToolUseRequest[],
  agentComms: DirectorPlan["agentComms"] = [],
): DirectorPlan {
  return {
    recognizedIntent: playerPlan.trim() || "选中地图目标",
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: chain.length ? "medium" : "impossible",
    toolChain: chain,
    unsupportedParts: [],
    fallbackSuggestions: [],
    riskSummary: [],
    playerFacingSummary: note,
    agentComms,
  };
}

function emptyPlanFromBreak(playerPlan: string, breakInfo: DirectorBreak): DirectorPlan {
  return {
    recognizedIntent: playerPlan.trim(),
    planStyle: "improvised",
    constraints: [],
    assumptions: [],
    feasibility: "impossible",
    toolChain: [],
    unsupportedParts: [{ text: playerPlan.trim(), reason: breakInfo.detail }],
    fallbackSuggestions: [],
    riskSummary: [],
    playerFacingSummary: breakInfo.playerMessage,
    agentComms: [],
  };
}

async function clarificationResult(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  plan: DirectorPlan;
  validation: DirectorValidation;
  source: DirectorCompileSource;
  stubMessage?: string;
  clientLlm?: ClientLlmSettings | null;
  message?: string;
  directorBreak?: DirectorBreak;
}): Promise<DirectorCompileResult> {
  const radio = input.directorBreak
    ? await buildBreakRadio({
        break: input.directorBreak,
        playerPlan: input.playerPlan,
        world: input.world,
      })
    : await buildFieldAgentRadio({
        playerPlan: input.playerPlan,
        world: input.world,
        selection: input.selection,
        plan: input.plan,
        validation: input.validation,
        stubMessage: input.stubMessage,
      });

  return {
    ok: true,
    clarificationOnly: true,
    fieldAgentRadio: radio,
    directorBreak: input.directorBreak,
    source: input.source,
    plan: input.plan,
    validation: input.validation,
    message: input.message ?? input.directorBreak?.playerMessage ?? "队友在耳机里追问，本 turn 未执行",
  };
}

async function breakCompileResult(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  break: DirectorBreak;
  source: DirectorCompileSource;
  clientLlm?: ClientLlmSettings | null;
}): Promise<DirectorCompileResult> {
  const plan = emptyPlanFromBreak(input.playerPlan, input.break);
  const validation = validateDirectorPlan(plan, input.world);
  return clarificationResult({
    playerPlan: input.playerPlan,
    world: input.world,
    selection: input.selection,
    plan,
    validation,
    source: input.source,
    clientLlm: input.clientLlm,
    message: input.break.playerMessage,
    directorBreak: input.break,
  });
}

type ResolvedCompile = {
  plan: DirectorPlan;
  validation: DirectorValidation;
  source: DirectorCompileSource;
  message?: string;
};

async function resolvePlanWithSemanticGate(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  plan: DirectorPlan;
  source: DirectorCompileSource;
  clientLlm?: ClientLlmSettings | null;
  message?: string;
}): Promise<DirectorCompileResult | ResolvedCompile> {
  const plan = prepareDirectorPlan(
    input.plan,
    input.playerPlan,
    input.world,
    input.selection,
  );
  const semanticBreak = semanticValidatePlan(plan, input.playerPlan, input.world);
  if (semanticBreak) {
    return breakCompileResult({
      playerPlan: input.playerPlan,
      world: input.world,
      selection: input.selection,
      break: semanticBreak,
      source: input.source,
      clientLlm: input.clientLlm,
    });
  }

  const validation = validateDirectorPlan(plan, input.world);
  if (validation.executableChain.length > 0) {
    return {
      plan,
      validation,
      source: input.source,
      message: input.message,
    };
  }

  if (plan.toolChain.length > 0) {
    const poisonPlan = /毒|poison|备毒|递酒/i.test(input.playerPlan);
    return breakCompileResult({
      playerPlan: input.playerPlan,
      world: input.world,
      selection: input.selection,
      break: {
        code: "ALL_BLOCKED",
        playerMessage: poisonPlan
          ? "毒酒链里本 turn 的前置还没齐（常见：Victor 未到阳台、酒未备毒）。先执行可执行步，或再发指令补 lure / 备毒。"
          : "计划里的工具本 turn 都接不上，没有执行。",
        detail: validation.rejected.map((r) => r.reasons.join("; ")).join(" | ") || "preconditions",
      },
      source: input.source,
      clientLlm: input.clientLlm,
    });
  }

  return {
    plan,
    validation,
    source: input.source,
    message: input.message,
  };
}

async function tryStubFallback(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  clientLlm?: ClientLlmSettings | null;
  prior: DirectorCompileResult;
}): Promise<DirectorCompileResult | null> {
  if (!input.prior.clarificationOnly) return null;
  if (input.prior.directorBreak?.code === "UNSUPPORTED_INTENT") return null;

  const stub = compilePlanFromText(input.playerPlan, input.world, input.selection);
  if (!stub.ok || !stub.chain.length) return null;

  const fallbackPlan = stubToDirectorPlan(input.playerPlan, stub.note, stub.chain);
  const fallbackResolved = await resolvePlanWithSemanticGate({
    playerPlan: input.playerPlan,
    world: input.world,
    selection: input.selection,
    plan: fallbackPlan,
    source: "llm_fallback_stub",
    clientLlm: input.clientLlm,
    message: "LLM 未产出可执行步，已降级为规则 stub。",
  });
  if ("clarificationOnly" in fallbackResolved) return null;
  return { ok: true, ...fallbackResolved };
}

async function tryWorldContinuationCompile(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  clientLlm?: ClientLlmSettings | null;
}): Promise<DirectorCompileResult | null> {
  if (!playerPlanLooksLikeContinuation(input.playerPlan, input.world)) return null;
  const chain = buildWorldContinuationChain(input.world);
  if (!chain.length) return null;

  const plan = stubToDirectorPlan(
    input.playerPlan,
    "已根据当前局面续接下一步（优先规则，不等待 LLM）。",
    chain,
  );
  const resolved = await resolvePlanWithSemanticGate({
    ...input,
    plan,
    source: "stub",
    message: plan.playerFacingSummary,
  });
  if ("clarificationOnly" in resolved) return null;
  return { ok: true, ...resolved };
}

async function compileWithLlm(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  clientLlm?: ClientLlmSettings | null;
}): Promise<DirectorCompileResult> {
  const worldFirst = await tryWorldContinuationCompile(input);
  if (worldFirst) return worldFirst;

  let plan = await callDirector({
    playerPlan: input.playerPlan,
    world: input.world,
    selection: input.selection,
    clientLlm: input.clientLlm,
  });

  let resolved = await resolvePlanWithSemanticGate({
    ...input,
    plan,
    source: "llm",
  });

  if ("clarificationOnly" in resolved) {
    const firstBreak = resolved.directorBreak;
    if (firstBreak?.code === "SEMANTIC_MISMATCH") {
      plan = await callDirector({
        playerPlan: input.playerPlan,
        world: input.world,
        selection: input.selection,
        clientLlm: input.clientLlm,
        priorBreak: firstBreak,
      });
      resolved = await resolvePlanWithSemanticGate({
        ...input,
        plan,
        source: "llm",
        message: "已根据 break 重编译一次",
      });
    } else {
      const stubbed = await tryStubFallback({ ...input, prior: resolved });
      return stubbed ?? resolved;
    }
  }

  if ("clarificationOnly" in resolved) {
    const stubbed = await tryStubFallback({ ...input, prior: resolved });
    if (stubbed) return stubbed;
    return resolved;
  }

  return { ok: true, ...resolved };
}

export async function compileDirectorPlan(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  clientLlm?: ClientLlmSettings | null;
}): Promise<DirectorCompileResult> {
  const { playerPlan, world, selection: rawSelection, clientLlm } = input;
  const selection = selectionUsedForCompile(playerPlan, rawSelection) ? rawSelection : null;

  const worldFirst = await tryWorldContinuationCompile({
    playerPlan,
    world,
    selection,
    clientLlm,
  });
  if (worldFirst) return worldFirst;

  if (directorLlmConfigured(clientLlm)) {
    try {
      return await compileWithLlm({ playerPlan, world, selection, clientLlm });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "LLM 调用失败";
      const stub = compilePlanFromText(playerPlan, world, selection);
      if (stub.ok && stub.chain.length > 0) {
        const plan = stubToDirectorPlan(playerPlan, `${stub.note}（LLM 降级：${msg}）`, stub.chain);
        const resolved = await resolvePlanWithSemanticGate({
          playerPlan,
          world,
          selection,
          plan,
          source: "llm_fallback_stub",
          message: msg,
        });
        if (!("clarificationOnly" in resolved)) {
          return { ok: true, ...resolved };
        }
      }
      const emptyPlan = stubToDirectorPlan(playerPlan, msg, []);
      const validation = validateDirectorPlan(emptyPlan, world);
      return clarificationResult({
        playerPlan,
        world,
        selection,
        plan: emptyPlan,
        validation,
        source: "llm",
        stubMessage: stub.ok ? undefined : stub.message,
        clientLlm,
        message: msg,
      });
    }
  }

  const stub = compilePlanFromText(playerPlan, world, selection);
  if (!stub.ok) {
    const plan = stubToDirectorPlan(playerPlan, stub.message, []);
    const validation = validateDirectorPlan(plan, world);
    return clarificationResult({
      playerPlan,
      world,
      selection,
      plan,
      validation,
      source: "stub",
      stubMessage: stub.message,
      clientLlm,
      message: stub.message,
      directorBreak: {
        code: "NO_TOOL_MATCH",
        playerMessage: stub.message,
        detail: stub.message,
      },
    });
  }

  const plan = stubToDirectorPlan(playerPlan, stub.note, stub.chain);
  const resolved = await resolvePlanWithSemanticGate({
    playerPlan,
    world,
    selection,
    plan,
    source: "stub",
    message: stub.note,
  });

  if ("clarificationOnly" in resolved) {
    return resolved;
  }

  return { ok: true, ...resolved };
}
