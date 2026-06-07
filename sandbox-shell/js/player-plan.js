/** 玩家正式流程：自然语言指令 → Director → 执行一步 */

const QUICK_ACTION_PLAN_TEXT = {
  send_fake_message: "我伪造一条阳台私密邀约，发到 Victor 手机上",
  disable_camera: "我压制走廊摄像头录像，切断备用供电记录",
  modify_guest_list: "我修改宾客名单，给 Face 一个可靠的活动联络人背书",
};

const PLAYBACK_ENTITY_IDS = new Set([
  "target",
  "guard",
  "waiter",
  "cleaner",
  "guest",
  "face",
  "runner",
]);

function playbackFollowIds(execSteps = []) {
  const ids = new Set();
  for (const step of execSteps) {
    if (step.actor && step.actor !== "player" && PLAYBACK_ENTITY_IDS.has(step.actor)) {
      ids.add(step.actor);
    }
    for (const target of step.targets ?? []) {
      if (PLAYBACK_ENTITY_IDS.has(target)) ids.add(target);
    }
    if (step.toolId === "disable_power_panel") {
      ids.add("runner");
      ids.add("guard");
    }
    if (step.toolId === "spoof_message" || step.toolId === "modify_guest_list") {
      ids.add("face");
      ids.add("target");
    }
    if (step.toolId === "suppress_camera_record") {
      ids.add("face");
      ids.add("target");
    }
    if (
      step.toolId === "lure_with_private_meeting" ||
      step.toolId === "serve_poisoned_drink_on_balcony" ||
      step.toolId === "resolve_poison_on_balcony"
    ) {
      ids.add("target");
    }
  }
  return ids.size ? [...ids] : ["target"];
}

function playerCommandTranscriptText(planText, selection) {
  const trimmed = (planText ?? "").trim();
  if (trimmed) return trimmed;
  if (selection) {
    const label = currentSelectionLabel() ?? selection.id;
    return `${label} 处理这个`;
  }
  return "";
}

function setPlanStatus(msg, kind = "info") {
  const el = document.getElementById("plan-status");
  if (!el) return;
  el.textContent = msg;
  const colors = {
    info: "#94a3b8",
    ok: "#86efac",
    error: "#fca5a5",
    busy: "#fcd34d",
  };
  el.style.color = colors[kind] ?? colors.info;
}

function escapePlanHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function currentSelectionLabel() {
  const sel = mapPick?.selection;
  if (!sel || !shell.playerWorld) return null;
  if (typeof HitmanCore.selectionLabel === "function") {
    return HitmanCore.selectionLabel(shell.playerWorld, sel);
  }
  const p = HitmanCore.mapPickablesFromWorld?.(shell.playerWorld)?.find(
    (item) => item.kind === sel.kind && item.id === sel.id,
  );
  return p?.label ?? sel.id;
}

function currentSelectionChip() {
  const sel = mapPick?.selection;
  if (!sel) return null;
  if (typeof HitmanCore.selectionChipText === "function") {
    return HitmanCore.selectionChipText(sel);
  }
  const label = currentSelectionLabel() ?? sel.id;
  return `[${label}]`;
}

function insertSelectionIntoPlan() {
  const chip = currentSelectionChip();
  const input = document.getElementById("plan-input");
  if (!chip || !input) return;
  const text = input.value ?? "";
  input.value = text.includes(chip) ? text : text ? `${text} ${chip}` : chip;
  input.focus();
  refreshLlmPlanStatus();
}

function setPlanValidationSummary(html = "") {
  const el = document.getElementById("plan-validation");
  if (!el) return;
  el.innerHTML = html;
}

function updatePlanContext() {
  setPlanValidationSummary("");
  const el = document.getElementById("plan-context");
  if (!el) return;
  const sel = mapPick?.selection;
  if (!sel) {
    el.textContent = "MAP REF / 未选中";
    return;
  }
  const label = currentSelectionLabel() ?? sel.id;
  const chip = currentSelectionChip() ?? `[${label}]`;
  el.innerHTML = `
    <span>MAP REF /</span>
    <span class="ctx-chip">${escapePlanHtml(sel.kind.toUpperCase())}:${escapePlanHtml(label)}</span>
    <button type="button" id="btn-insert-selection">插入 ${escapePlanHtml(chip)}</button>
    <span>仅空指令或含「这个/它/选中」时才会带入指代</span>
  `;
  document.getElementById("btn-insert-selection")?.addEventListener("click", insertSelectionIntoPlan);
}

function renderHackerQuickActions() {
  const el = document.getElementById("hacker-quick-actions");
  if (!el || !shell.playerWorld || typeof HitmanCore.buildHackerQuickActions !== "function") return;
  const actions = HitmanCore.buildHackerQuickActions(shell.playerWorld);
  el.innerHTML = actions
    .map((action) => {
      const disabled = action.enabled ? "false" : "true";
      const title = action.enabled ? action.label : action.reason || "当前不可用";
      return `
        <button type="button" class="quick-action" data-action-id="${escapePlanHtml(action.id)}" aria-disabled="${disabled}" title="${escapePlanHtml(title)}">
          <span>HACKER</span>${escapePlanHtml(action.label)}
        </button>
      `;
    })
    .join("");
  for (const btn of el.querySelectorAll(".quick-action")) {
    btn.addEventListener("click", () => {
      submitHackerQuickAction(btn.dataset.actionId);
    });
  }
}

async function submitHackerQuickAction(actionId) {
  if (!actionId || !shell.playerWorld || shell.playbackActive) return;
  const action = HitmanCore.buildHackerQuickActions?.(shell.playerWorld)?.find((a) => a.id === actionId);
  if (!action) return;
  if (!action.enabled) {
    const reason = action.reason || "当前条件不足";
    setPlanStatus(reason, "info");
    if (typeof pushCommandFeed === "function") {
      pushCommandFeed({ speaker: "NEXT", text: reason, tone: "warning" });
    }
    return;
  }

  const btn = document.getElementById("btn-submit-plan");
  if (btn) btn.disabled = true;
  shell.playbackActive = true;
  const transcript = QUICK_ACTION_PLAN_TEXT[actionId] ?? action.label;
  if (typeof pushPlayerCommandTranscript === "function") {
    pushPlayerCommandTranscript(transcript);
  }
  if (typeof pushCommandFeed === "function") {
    pushCommandFeed({ speaker: "OPS", text: `HACKER ACTION / ${action.label}`, tone: "system" });
  }
  setPlanStatus("Hacker 操作执行中…", "busy");

  try {
    const worldBefore = structuredClone(shell.playerWorld);
    const turn = HitmanCore.runHackerQuickAction(shell.playerWorld, actionId);
    shell.playerWorld = turn.world;
    shell.lerp = null;
    const execSteps = turn.results.map((r) => r.request);
    const followIds = playbackFollowIds(execSteps);

    if (typeof pushCommandFeed === "function") {
      for (const result of turn.results) {
        const execLine =
          typeof HitmanCore.executedStepSummaryFromResult === "function"
            ? HitmanCore.executedStepSummaryFromResult(result)
            : typeof HitmanCore.executedStepSummary === "function"
              ? HitmanCore.executedStepSummary(result.request)
              : `EXEC / ${result.request.actor} → ${result.request.toolId}`;
        const execBody = execLine.replace(/^EXEC\s*\/\s*/i, "").trim();
        pushCommandFeed({ speaker: "EXEC", text: execBody, tone: "system" });
      }
    }
    for (const r of turn.results) {
      const st = r.status === "success" ? "成功" : r.status === "blocked" ? "阻断" : r.status;
      shellLog(`[tool] ${r.request.toolId} · ${st}`, "tool");
    }
    if (
      typeof HitmanCore.fieldAgentRepliesForToolResults === "function" &&
      typeof pushFieldAgentReplies === "function"
    ) {
      pushFieldAgentReplies(
        HitmanCore.fieldAgentRepliesForToolResults(turn.results, shell.playerWorld),
      );
    }
    if (typeof pushTurnEventsToCommandFeed === "function" && turn.turnTimeline?.length) {
      pushTurnEventsToCommandFeed(turn.turnTimeline);
    }
    if (typeof HitmanCore.cuesForToolResult === "function" && typeof applyPresentationCues === "function") {
      for (const r of turn.results) {
        const toolCues = HitmanCore.cuesForToolResult(r);
        if (toolCues.length) applyPresentationCues(toolCues);
      }
    }
    if (turn.turnTimeline?.length && typeof playTurnTimeline === "function") {
      const primaryActor = followIds.find((id) => id !== "target") ?? followIds[0] ?? "target";
      await syncPlayerScene(primaryActor, worldBefore);
      await playTurnTimeline(worldBefore, turn.turnTimeline, (frame) => {
        shell.playbackFrame = frame;
        shell.renderDirty = true;
        const panning = shell.edgePan && (shell.edgePan.x !== 0 || shell.edgePan.y !== 0);
        if (
          frame?.entities &&
          !panning &&
          typeof HitmanCore.cameraFrameForPlaybackPositions === "function" &&
          typeof setMapCamera === "function"
        ) {
          setMapCamera(
            HitmanCore.cameraFrameForPlaybackPositions(frame.entities, followIds, shell.mapCamera),
          );
        }
      });
      shell.playbackFrame = null;
    }
    if (typeof HitmanCore.cameraFrameForEntities === "function" && typeof setMapCamera === "function") {
      setMapCamera(HitmanCore.cameraFrameForEntities(shell.playerWorld, followIds, shell.mapCamera));
    }
    const term = HitmanCore.classifyTerminalState(shell.playerWorld);
    setPlanStatus(
      term.id === "in_progress" ? "Hacker 操作完成 · 等待队友下一步" : `Hacker 操作完成 · ${term.label}`,
      term.id === "in_progress" ? "ok" : "info",
    );
    if (typeof pushHackerIntel === "function") pushHackerIntel("turn_end");
    await syncPlayerScene(null);
  } catch (err) {
    setPlanStatus(`Hacker 操作失败: ${err.message}`, "error");
    shellLog(`Hacker 操作失败: ${err.message}`, "result");
    console.error(err);
  } finally {
    shell.playbackActive = false;
    if (btn) btn.disabled = false;
    renderHackerQuickActions();
  }
}

function validationSummaryHtml(data) {
  const v = data.validation;
  if (!v) return "";
  const chain = v.executableChain ?? [];
  const rejected = v.rejected ?? [];
  const errors = v.errors ?? [];
  const warnings = v.warnings ?? [];
  const first = chain[0];
  const firstRejected = rejected[0];
  const unsupported = data.plan?.unsupportedParts?.[0];
  const reason =
    firstRejected?.reasons?.join("; ") ??
    errors[0] ??
    unsupported?.reason ??
    warnings[0] ??
    "";
  const step = first
    ? `${first.actor} → ${first.toolId} (${first.targets.join(", ")})`
    : "无可执行步骤";
  let nextLine = "";
  if (typeof HitmanCore.planNextHint === "function" && shell.playerWorld) {
    const hint = HitmanCore.planNextHint(shell.playerWorld, firstRejected ?? null);
    if (hint) nextLine = `<br><span class="plan-next-hint">${escapePlanHtml(hint)}</span>`;
  }
  return `
    <strong>VALIDATION /</strong>
    executable ${chain.length} · rejected ${rejected.length}${errors.length ? ` · errors ${errors.length}` : ""}
    <br><span>${escapePlanHtml(step)}</span>
    ${reason ? `<br><span>reason: ${escapePlanHtml(reason)}</span>` : ""}
    ${nextLine}
  `;
}

function pushValidationNextToFeed(data, operationSet = null) {
  if (typeof pushCommandFeed !== "function" || !shell.playerWorld) return;
  const lines =
    typeof HitmanCore.planDeferredNextLines === "function"
      ? HitmanCore.planDeferredNextLines(shell.playerWorld, data.validation, operationSet)
      : [];
  for (const line of lines) {
    const body = line.replace(/^NEXT\s*\/\s*/i, "").trim();
    if (body) {
      pushCommandFeed({ speaker: "NEXT", text: body, tone: "warning" });
    }
  }
  if (lines.length) return;
  const rejected = data.validation?.rejected?.[0];
  if (!rejected || typeof HitmanCore.planNextHint !== "function") return;
  const hint = HitmanCore.planNextHint(shell.playerWorld, rejected);
  if (hint && typeof pushNextHint === "function") pushNextHint(hint);
}

window.updatePlanContext = updatePlanContext;

function updatePlayerGuide() {
  const el = document.getElementById("step-guide-body");
  if (!el || !shell.playerWorld) return;
  const w = shell.playerWorld;
  const term = HitmanCore.classifyTerminalState(w);
  const cps = HitmanCore.convergenceCheckpoints(w);
  const next = cps.find((cp) => !cp.done);
  if (term.id !== "in_progress") {
    el.innerHTML = `<strong>${term.label}</strong><br>${term.description}`;
    return;
  }
  if (next) {
    el.innerHTML = `<strong>当前目标</strong><br>尚未达成：${next.label}（非当前坐标，是胜利条件）— 下达指令后发送`;
  } else {
    el.innerHTML = `<strong>继续行动</strong><br>写指令，指挥 Face / Runner`;
  }
}

function updatePlayerHud() {
  const w = shell.playerWorld;
  if (!w) return;
  const beatEl = document.getElementById("beat-status");
  if (beatEl) {
    const term = HitmanCore.classifyTerminalState(w);
    beatEl.innerHTML = `<span class="beat-tag">${term.label}</span>`;
  }
  const turn = document.getElementById("stat-turn");
  const alert = document.getElementById("stat-alert");
  const suspicion = document.getElementById("stat-suspicion");
  const tension = document.getElementById("stat-tension");
  const terminal = document.getElementById("stat-terminal");
  if (turn) turn.textContent = String(w.turn);
  if (alert) alert.textContent = w.alertLevel;
  if (suspicion) suspicion.textContent = String(w.suspicion);
  if (tension) tension.textContent = String(w.tension ?? 0);
  if (terminal) terminal.textContent = HitmanCore.classifyTerminalState(w).label;
}

function hideTerminalModal() {
  const overlay = document.getElementById("terminal-overlay");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
}

function showTerminalModal(term) {
  const overlay = document.getElementById("terminal-overlay");
  const title = document.getElementById("terminal-title");
  const summary = document.getElementById("terminal-summary");
  if (!overlay || !summary) return;
  const label = term?.label ?? "任务结束";
  if (title) title.textContent = label;
  summary.textContent = term?.description ?? "终态已达成。";
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
}

function initTerminalModal() {
  document.getElementById("btn-terminal-continue")?.addEventListener("click", hideTerminalModal);
  document.getElementById("btn-terminal-reset")?.addEventListener("click", () => {
    hideTerminalModal();
    void resetPlayerGame();
  });
}

/**
 * @param {string|null} flashId
 * @param {object|null} displayWorldOnly 仅用于画面/演出，不写回 shell.playerWorld
 */
async function syncPlayerScene(flashId, displayWorldOnly) {
  const displayWorld = displayWorldOnly ?? shell.playerWorld;
  if (!displayWorld) return;

  shell.scene = HitmanCore.worldToScene(displayWorld);
  shell.renderDirty = true;
  shell.flashId = flashId || null;
  shell.flashTimer = flashId ? 0.6 : 0;

  try {
    await ensureSpritesReady(shell.scene);
  } catch (err) {
    setPlanStatus(`地图/角色资源未加载: ${err.message}`, "error");
    shellLog(`[资源] ${err.message}`, "result");
    console.error(err);
    return;
  }

  try {
    await renderScene(
      shell.scene,
      null,
      shell.flashId,
      null,
      [],
      shell.playbackFrame,
      displayWorldOnly ? shell.playerWorld : displayWorld,
    );
  } catch (err) {
    setPlanStatus(`画面渲染失败: ${err.message}`, "error");
    shellLog(`[渲染] ${err.message}`, "result");
    console.error(err);
    return;
  }

  if (!displayWorldOnly) {
    try {
      updatePlayerGuide();
      updatePlayerHud();
      refreshLlmPlanStatus();
      renderHackerQuickActions();
    } catch (err) {
      setPlanStatus(`状态栏更新失败: ${err.message}`, "error");
      shellLog(`[UI] ${err.message}`, "result");
      console.error(err);
    }
  }
}

async function resetPlayerGame() {
  let w = HitmanCore.getInitialWorld();
  if (typeof HitmanCore.warmupAmbientTasks === "function") {
    w = HitmanCore.warmupAmbientTasks(w);
  }
  shell.ambientAccum = 0;
  shell.playerWorld = w;
  shell.playbackFrame = null;
  shell.playbackActive = false;
  shell.lerp = null;
  mapPick.selection = null;
  if (mapPick.hoverPick) mapPick.hoverPick = null;
  hideTerminalModal();
  updatePlanContext();
  setPlanValidationSummary("");
  const log = document.getElementById("log");
  if (log) log.innerHTML = "";
  if (typeof resetHackerFeed === "function") resetHackerFeed();
  if (typeof pushCommandFeed === "function" && typeof HitmanCore?.MISSION_OPS_LINE === "string") {
    pushCommandFeed({ speaker: "OPS", text: HitmanCore.MISSION_OPS_LINE, tone: "system" });
  }
  if (typeof resetPresentationCues === "function") resetPresentationCues();
  const params = new URLSearchParams(window.location.search);
  if (params.get("intro") === "1") {
    try {
      window.sessionStorage?.removeItem("play_intro_radio_seen");
    } catch {
      /* ignore */
    }
  }
  if (typeof pushOpeningRadio === "function") {
    pushOpeningRadio({ oncePerSession: true });
  }
  const planInput = document.getElementById("plan-input");
  if (planInput) planInput.value = "";
  setPlanStatus("正在加载场景…", "busy");
  await syncPlayerScene(null);
  setPlanStatus("场景已就绪，可输入指令并发送", "ok");
  shellLog("局面已重置 · 地图与角色已加载", "director");
  shellLog("无人下指令时，场内仅轻微环境动效；换区在发送指令后结算", "beat");
  if (typeof resetMapCamera === "function") resetMapCamera();
  if (typeof renderHackerAnalysis === "function") renderHackerAnalysis();
  updatePlanContext();
  renderHackerQuickActions();
}

function refreshLlmPlanStatus() {
  const hasKey = !!(LlmSettings.settings?.apiKey?.length);
  if (!document.getElementById("plan-input")?.value?.trim()) {
    setPlanStatus(
      hasKey
        ? "已配 Key · 写指令后点「发送指令」"
        : "未配 Key：Director 用规则 stub（仍可玩）",
      "info",
    );
  }
}

async function submitPlayerPlan() {
  if (shell.playbackActive || !shell.playerWorld) return;
  const planInput = document.getElementById("plan-input");
  const planText = (planInput?.value ?? "").trim();
  const selection = mapPick.selection;
  const selectionForDirector =
    selection &&
    typeof HitmanCore.selectionUsedForCompile === "function" &&
    HitmanCore.selectionUsedForCompile(planText, selection)
      ? selection
      : null;

  if (!planText && !selection) {
    setPlanStatus("写一句指令，或先在地图上点选目标", "error");
    shellLog("写一句指令，或先在地图上点选目标。", "director");
    return;
  }

  const transcriptText = playerCommandTranscriptText(planText, selection);
  if (typeof pushPlayerCommandTranscript === "function") {
    pushPlayerCommandTranscript(transcriptText);
  }
  if (planInput) planInput.value = "";

  const btn = document.getElementById("btn-submit-plan");
  if (btn) btn.disabled = true;
  setPlanStatus("正在解析指令…", "busy");
  if (typeof pushOpsStatus === "function") {
    pushOpsStatus("正在解析指令…");
  }

  const intentOutcome =
    typeof HitmanCore.recognizeIntentOutcome === "function"
      ? HitmanCore.recognizeIntentOutcome(planText, shell.playerWorld, selectionForDirector)
      : null;
  if (intentOutcome) {
    if (typeof pushIntentOutcomeToFeed === "function") {
      pushIntentOutcomeToFeed(intentOutcome);
    }
    if (intentOutcome.cues?.length && typeof applyPresentationCues === "function") {
      applyPresentationCues(intentOutcome.cues);
    }
    if (intentOutcome.status === "out_of_slice" || intentOutcome.status === "dirty") {
      const label = intentOutcome.status === "out_of_slice" ? "切片外意图" : "高风险直接行动";
      setPlanValidationSummary(`
        <strong>INTENT /</strong>
        ${escapePlanHtml(label)}
        <br><span>${escapePlanHtml(intentOutcome.summary)}</span>
      `);
      setPlanStatus(`${label}已识别 · 未执行世界改动`, "info");
      if (btn) btn.disabled = false;
      return;
    }
  }

  try {
    const res = await fetch("/api/director", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerPlan: planText,
        world: shell.playerWorld,
        selection: selectionForDirector,
        llm: LlmSettings.toApiPayload(),
      }),
    });
    const data = await res.json();
    setPlanValidationSummary(validationSummaryHtml(data));
    if (!data.ok && !data.clarificationOnly) {
      const msg = data.error ?? "Director 无法编译计划";
      setPlanStatus(msg, "error");
      shellLog(msg, "result");
      return;
    }

    const chain = data.validation?.executableChain ?? [];
    const planChain = data.plan?.toolChain ?? chain;
    if (data.clarificationOnly || !chain.length) {
      if (data.directorBreak?.playerMessage) {
        setPlanStatus(data.directorBreak.playerMessage, "info");
      }
      const radio = data.fieldAgentRadio ?? [];
      const rejected = data.validation?.rejected ?? [];
      pushValidationNextToFeed(data);
      let fieldRadio = radio;
      if (!chain.length && typeof HitmanCore.fieldAgentReplyForRejectedStep === "function" && shell.playerWorld) {
        const reply = HitmanCore.fieldAgentReplyForRejectedStep(shell.playerWorld, rejected[0]);
        if (reply && typeof pushFieldAgentReplies === "function") {
          pushFieldAgentReplies([reply]);
        }
      }
      if (typeof pushFieldAgentRadio === "function" && fieldRadio.length) {
        pushFieldAgentRadio(fieldRadio);
      }
      setPlanStatus("队友在耳机里追问 — 指令未执行，请补全后再发送", "info");
      shellLog("指令未执行 · 收听干员频道", "director");
      for (const line of radio) {
        shellLog(`${line.agent}: ${line.text}`, "beat");
      }
      return;
    }

    const srcLabel =
      data.source === "llm"
        ? `LLM · ${data.llmModel ?? ""}`
        : data.source === "llm_fallback_stub"
          ? "LLM→stub 降级"
          : "规则 stub";
    const llmSummary = data.plan?.playerFacingSummary ?? "";
    if (llmSummary) {
      shellLog(`[LLM summary · debug] ${llmSummary}`, "debug");
    }
    shellLog(`Director (${srcLabel})`, "director");

    if (
      typeof HitmanCore.selectionUsedForCompile === "function" &&
      typeof HitmanCore.selectionLabel === "function" &&
      selectionForDirector &&
      HitmanCore.selectionUsedForCompile(planText, selectionForDirector) &&
      typeof pushCommandFeed === "function"
    ) {
      const targetLabel = HitmanCore.selectionLabel(shell.playerWorld, selection);
      pushCommandFeed({
        speaker: "OPS",
        text: `COMMAND TARGET / ${targetLabel}`,
        tone: "system",
      });
    }

    const previewOpSet =
      typeof HitmanCore.buildOperationSet === "function"
        ? HitmanCore.buildOperationSet(
            planChain,
            data.validation?.rejected ?? [],
            "llm",
            planText,
            shell.playerWorld,
          )
        : null;
    setPlanStatus("Director 已编译 · 正在执行规则链…", "busy");

    const worldBefore = structuredClone(shell.playerWorld);
    const runChain = planChain.length ? planChain : chain;
    const turn = HitmanCore.runTurn(worldBefore, runChain, "step", {
      playerPlan: planText,
      tickPlayIdle: true,
    });
    shell.playerWorld = turn.world;
    shell.lerp = null;
    const actualOpSet = turn.operationSet ?? previewOpSet;
    const execSteps = actualOpSet?.actions?.length
      ? actualOpSet.actions.map((a) => a.request)
      : turn.results.map((r) => r.request);

    if (actualOpSet?.actions?.length && typeof pushCommandFeed === "function") {
      const opLine =
        typeof HitmanCore.operationSetSummaryLine === "function"
          ? HitmanCore.operationSetSummaryLine(actualOpSet)
          : execSteps.map((s) => `${s.actor}:${s.toolId}`).join(" · ");
      pushCommandFeed({ speaker: "OPS", text: `OPERATION / 本轮实际：${opLine}`, tone: "system" });
    }

    if (typeof pushCommandFeed === "function") {
      for (const result of turn.results) {
        const execLine =
          typeof HitmanCore.executedStepSummaryFromResult === "function"
            ? HitmanCore.executedStepSummaryFromResult(result)
            : typeof HitmanCore.executedStepSummary === "function"
              ? HitmanCore.executedStepSummary(result.request)
              : `EXEC / ${result.request.actor} → ${result.request.toolId}`;
        const execBody = execLine.replace(/^EXEC\s*\/\s*/i, "").trim();
        pushCommandFeed({ speaker: "EXEC", text: execBody, tone: "system" });
      }
    }
    pushValidationNextToFeed(data, actualOpSet);

    for (const r of turn.results) {
      const st =
        r.status === "success" ? "成功" : r.status === "blocked" ? "阻断" : r.status;
      shellLog(`[tool] ${r.request.toolId} · ${st}`, "tool");
    }
    if (
      typeof HitmanCore.fieldAgentRepliesForToolResults === "function" &&
      typeof pushFieldAgentReplies === "function"
    ) {
      pushFieldAgentReplies(
        HitmanCore.fieldAgentRepliesForToolResults(turn.results, shell.playerWorld),
      );
    }
    if (typeof pushTurnEventsToCommandFeed === "function" && turn.turnTimeline?.length) {
      pushTurnEventsToCommandFeed(turn.turnTimeline);
    }
    if (typeof HitmanCore.cuesForToolResult === "function" && typeof applyPresentationCues === "function") {
      for (const r of turn.results) {
        const toolCues = HitmanCore.cuesForToolResult(r);
        if (toolCues.length) applyPresentationCues(toolCues);
      }
    }
    const term = HitmanCore.classifyTerminalState(turn.world);
    const doneMsg =
      term.id === "in_progress" ? "指令已执行 · 可继续下达指令" : `指令已执行 · ${term.label}`;
    setPlanStatus(doneMsg, term.id === "in_progress" ? "ok" : "info");
    shellLog(`终态: ${term.label}`, "result");

    if (turn.turnTimeline?.length && typeof playTurnTimeline === "function") {
      shell.playbackActive = true;
      setPlanStatus("演出播放中（结束后角色会停在新位置）…", "busy");
      const playbackActors = [...new Set(execSteps.map((s) => s.actor).filter((a) => a !== "player"))];
      const primaryActor = playbackActors[0] ?? execSteps[0]?.actor ?? "runner";
      await syncPlayerScene(primaryActor, worldBefore);
      const followIds = playbackFollowIds(execSteps);
      await playTurnTimeline(worldBefore, turn.turnTimeline, (frame) => {
        shell.playbackFrame = frame;
        shell.renderDirty = true;
        const panning = shell.edgePan && (shell.edgePan.x !== 0 || shell.edgePan.y !== 0);
        if (
          frame?.entities &&
          !panning &&
          typeof HitmanCore.cameraFrameForPlaybackPositions === "function" &&
          typeof setMapCamera === "function"
        ) {
          setMapCamera(
            HitmanCore.cameraFrameForPlaybackPositions(frame.entities, followIds, shell.mapCamera),
          );
        }
      });
      shell.playbackFrame = null;
      shell.playbackActive = false;
    }

    if (typeof pushHackerIntel === "function") pushHackerIntel("turn_end");
    if (shell.playerWorld?.npcs?.target?.location === "balcony" && typeof pushCommandFeed === "function") {
      pushCommandFeed({
        speaker: "WORLD",
        text: "Victor 已在阳台，可递毒酒或推进事故链。",
        tone: "world",
        persist: false,
      });
    }
    if (typeof setMapCamera === "function") {
      const followIds = playbackFollowIds(execSteps);
      if (typeof HitmanCore.cameraFrameForEntities === "function") {
        setMapCamera(HitmanCore.cameraFrameForEntities(turn.world, followIds, shell.mapCamera));
      } else if (
        typeof HitmanCore.cameraAfterFieldTurn === "function" &&
        execSteps.some(
          (s) => s.toolId === "disable_power_panel" || s.toolId === "infiltrate_gallery",
        )
      ) {
        setMapCamera(HitmanCore.cameraAfterFieldTurn(turn.world));
      }
    }
    await syncPlayerScene(null);
    if (term.id !== "in_progress" && typeof showTerminalModal === "function") {
      showTerminalModal(term);
    }
  } catch (err) {
    setPlanStatus(`提交失败: ${err.message}`, "error");
    shellLog(`提交失败: ${err.message}`, "result");
    console.error(err);
  } finally {
    if (btn) btn.disabled = false;
  }
}
