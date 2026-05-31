let ROUTE_ID = "route_a";

/** var：多脚本共享全局，且便于诊断脚本读取 window.shell */
var shell = {
  playerWorld: null,
  session: null,
  scene: null,
  flashId: null,
  flashTimer: 0,
  playbackFrame: null,
  playbackActive: false,
  ambientTime: 0,
  ambientAccum: 0,
  lerp: null,
  mapCamera: null,
  edgePan: null,
  renderDirty: true,
  presentationCues: [],
};

function setMapCamera(next) {
  shell.mapCamera = next;
  shell.renderDirty = true;
}

function resetMapCamera() {
  setMapCamera(
    HitmanCore.DEFAULT_PLAY_CAMERA
      ? { ...HitmanCore.DEFAULT_PLAY_CAMERA }
      : { mode: "camera", centerMapX: 1260, centerMapY: 416, zoom: 1 },
  );
}

function updateEdgePan(dt) {
  if (
    !shell.edgePan ||
    shell.playbackActive ||
    !shell.mapCamera ||
    shell.mapCamera.mode === "overview" ||
    typeof HitmanCore.cameraViewportForCanvas !== "function" ||
    !HitmanCore.GALLERY_MAP_SIZE
  ) {
    return;
  }
  const viewport = HitmanCore.cameraViewportForCanvas(shell.mapCamera, W, H);
  const speed = Math.max(viewport.width, viewport.height) * 0.42;
  const mapSize = HitmanCore.GALLERY_MAP_SIZE;
  setMapCamera({
    ...shell.mapCamera,
    mode: "camera",
    centerMapX: Math.max(0, Math.min(mapSize.width, shell.mapCamera.centerMapX + shell.edgePan.x * speed * dt)),
    centerMapY: Math.max(0, Math.min(mapSize.height, shell.mapCamera.centerMapY + shell.edgePan.y * speed * dt)),
  });
}

window.setMapCamera = setMapCamera;
window.resetMapCamera = resetMapCamera;

function renderInjectQueue(queue) {
  const el = document.getElementById("inject-queue");
  if (!queue.length) {
    el.innerHTML = '<span class="inject-empty">（空）</span>';
    return;
  }
  el.innerHTML = queue
    .map(
      (e) =>
        `<div class="inject-item"><span class="inject-p">p${e.priority}</span> ${e.beatId} <span class="inject-ttl">TTL${e.ttlTurns}</span><br><span class="inject-reason">${e.reason}</span></div>`,
    )
    .join("");
}

function renderModifierTag(session) {
  const el = document.getElementById("mod-tags");
  const mod = session?.director?.activeBeat?.modifier;
  if (!mod) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `<span class="mod-tag">${mod.emoji} ${mod.name}</span>`;
}

function beatStatusText() {
  if (!shell.session) return "加载中…";
  return HitmanCore.sessionBeatHeader(shell.session);
}

function renderStepGuide() {
  const el = document.getElementById("step-guide-body");
  if (!el) return;
  if (!shell.session) {
    el.textContent = "加载路线…";
    return;
  }
  const step = HitmanCore.getSessionStep(shell.session);
  const route = HitmanCore.showcaseRoutes?.find((r) => r.id === ROUTE_ID);
  if (!step) {
    el.innerHTML = `<strong>路线已完成</strong> — 看终态与 Log，或 Reset / 换路线。`;
    return;
  }
  const idx = shell.session.stepIndex ?? 0;
  const total = route?.steps?.length ?? "?";
  el.innerHTML = `<strong>第 ${idx + 1} / ${total} 步 · ${step.label}</strong><br>${step.hint}<br><span style="color:#86efac;font-size:11px">${step.tool.actor} → ${step.tool.toolId}</span>`;
}

function updateHud() {
  const beat = beatStatusText();
  const beatEl = document.getElementById("beat-status-demo");
  if (beatEl) beatEl.innerHTML = `<span class="beat-tag">${beat}</span>`;
  renderStepGuide();
  renderModifierTag(shell.session);
  if (!shell.session) return;
  const w = shell.session.world;
  document.getElementById("stat-turn").textContent = String(w.turn);
  document.getElementById("stat-alert").textContent = w.alertLevel;
  document.getElementById("stat-suspicion").textContent = String(w.suspicion);
  document.getElementById("stat-tension").textContent = String(Math.round(shell.session.director.tension));
  document.getElementById("stat-terminal").textContent = HitmanCore.classifyTerminalState(w).label;
  renderInjectQueue(shell.session.director.injectQueue);
}

function stepCaptionText() {
  if (!shell.session) return "";
  const step = HitmanCore.getSessionStep(shell.session);
  if (!step) return "路线已完成";
  return `本步在做什么：${step.hint}`;
}

function stepFocusIds() {
  const step = shell.session ? HitmanCore.getSessionStep(shell.session) : null;
  if (!step) return [];
  const ids = new Set([step.tool.actor, ...step.tool.targets]);
  if (step.tool.toolId === "redirect_guard_attention") ids.add("guard");
  if (step.tool.toolId === "lure_with_private_meeting") ids.add("target");
  if (step.tool.toolId === "tamper_balcony_rail" || step.tool.toolId === "stage_accident") {
    ids.add("balcony_rail");
    ids.add("target");
  }
  if (step.tool.toolId === "spill_drink") ids.add("wine_glass");
  if (step.tool.toolId === "move_cleaning_cart") ids.add("cleaning_cart");
  if (step.tool.toolId === "spoof_message") ids.add("target");
  return [...ids];
}

async function syncScene(flashId, worldOverride) {
  const w = worldOverride ?? shell.session.world;
  shell.scene = HitmanCore.worldToScene(w);
  shell.flashId = flashId || null;
  shell.flashTimer = flashId ? 0.6 : 0;
  await ensureSpritesReady(shell.scene);
  await renderScene(
    shell.scene,
    null,
    shell.flashId,
    stepCaptionText(),
    stepFocusIds(),
    shell.playbackFrame,
    w,
  );
  updateHud();
}

function setStepButtonsEnabled(on) {
  const btn = document.getElementById("btn-step");
  if (btn) btn.disabled = !on;
}

function appendLines(lines) {
  for (const l of lines) {
    shellLog(l.text, l.type);
  }
}

async function executeCurrentStep() {
  if (!shell.session) {
    shell.session = HitmanCore.createSession(ROUTE_ID);
  }
  if (shell.session.finished) {
    shellLog("路线已完成，请重置或切换路线。", "director");
    return;
  }
  if (shell.playbackActive) return;

  const step = HitmanCore.getSessionStep(shell.session);
  const worldBefore = structuredClone(shell.session.world);
  const res = HitmanCore.executeSessionStep(shell.session);
  shell.session = res.session;
  appendLines(res.lines);

  const timeline = res.turnTimeline ?? [];
  const actor = step?.tool?.actor;
  const flash = actor === "player" ? "player" : step?.tool?.targets?.[0] || null;

  if (timeline.length > 0 && typeof playTurnTimeline === "function") {
    shell.playbackActive = true;
    setStepButtonsEnabled(false);
    await syncScene(flash, worldBefore);
    await playTurnTimeline(worldBefore, timeline, (frame) => {
      shell.playbackFrame = frame;
      shell.renderDirty = true;
    });
    shell.playbackFrame = null;
    shell.playbackActive = false;
    setStepButtonsEnabled(true);
  }

  if (typeof pushHackerIntel === "function") pushHackerIntel("turn_end");
  await syncScene(flash);
}

async function resetDemoShell() {
  shell.session = HitmanCore.createSession(ROUTE_ID);
  const route = HitmanCore.getShowcaseRoute(ROUTE_ID);
  document.getElementById("log").innerHTML = "";
  shellLog(`Balcony Job · ${route.title}`, "director");
  shellLog("H1 + 美术：manifest 底图与角色 PNG。", "beat");
  SpriteStore.ready = false;
  shell.scene = HitmanCore.worldToScene(shell.session.world);
  await initSprites(shell.scene);
  shellLog("资产已从 /sprites/manifest.json 加载。", "director");
  if (typeof resetHackerFeed === "function") resetHackerFeed();
  resetMapCamera();
  await syncScene(null);
}

function onRouteChange(routeId) {
  ROUTE_ID = routeId;
  document.getElementById("route-select").value = routeId;
  resetDemoShell();
}

/** Play Idle 脉冲间隔（秒）— ADR-0014 慢节奏 */
const IDLE_PASS_INTERVAL_SEC = 10;

function gameLoop() {
  const dt = 1 / 60;
  shell.ambientTime = (shell.ambientTime || 0) + dt;
  updateEdgePan(dt);

  const needsRender =
    shell.renderDirty ||
    shell.lerp ||
    shell.flashTimer > 0 ||
    mapPick?.hoverId;

  if (
    !shell.ambientDisabled &&
    !shell.playbackActive &&
    shell.playerWorld &&
    (typeof HitmanCore.runIdlePass === "function" ||
      typeof HitmanCore.runAmbientStep === "function")
  ) {
    shell.ambientAccum += dt;
    if (shell.ambientAccum >= IDLE_PASS_INTERVAL_SEC) {
      shell.ambientAccum = 0;
      const worldBefore = structuredClone(shell.playerWorld);
      const runBurst =
        typeof HitmanCore.runIdlePass === "function"
          ? HitmanCore.runIdlePass
          : HitmanCore.runAmbientStep;
      const { world, events } = runBurst(shell.playerWorld);
      shell.playerWorld = world;
      const moves = events.filter((e) => e.type === "npc_move" || e.type === "agent_move");
      if (moves.length && typeof startNpcLerp === "function") {
        startNpcLerp(worldBefore, world);
      }
      for (const ev of moves.slice(-3)) {
        shellLog(ev.text ?? "有人移动", "world");
      }
      if (!moves.length && events.length) {
        const ev = events.find((event) => event.actor) ?? events[events.length - 1];
        shellLog(ev.text ?? "环境更新", "world");
        if (ev.actor) {
          shell.flashId = ev.actor;
          shell.flashTimer = 0.75;
        }
      }
      if (typeof pushHackerIntel === "function") pushHackerIntel("ambient");
      shell.scene = HitmanCore.worldToScene(world);
      shell.renderDirty = true;
      if (!shell.lerp) void syncPlayerScene(null);
    }
  }

  if (shell.flashTimer > 0) {
    shell.flashTimer -= dt;
    shell.renderDirty = true;
  }

  if (typeof tickPresentationCues === "function") {
    tickPresentationCues(performance.now());
  }

  if (shell.scene && needsRender) {
    if (shell.lerp && typeof updateLerpPositions === "function") {
      const done = updateLerpPositions();
      void renderScene(
        shell.scene,
        null,
        shell.flashId,
        null,
        [],
        shell.playbackFrame,
        shell.playerWorld,
      );
      shell.renderDirty = false;
      if (done) void syncPlayerScene(null);
    } else {
      void renderScene(
        shell.scene,
        null,
        shell.flashId,
        null,
        [],
        shell.playbackFrame,
        shell.playerWorld,
      );
      shell.renderDirty = false;
    }
  }
  requestAnimationFrame(gameLoop);
}

function initShell() {
  if (typeof HitmanCore === "undefined" || !HitmanCore.getInitialWorld) {
    shellLog("未找到 dist/hitman-core.js — 请先运行 npm run build:sandbox", "result");
    return;
  }
  const params = new URLSearchParams(window.location.search);
  shell.ambientDisabled = params.get("ambient") === "0";
  resetMapCamera();
  const sel = document.getElementById("route-select");
  if (sel) sel.addEventListener("change", () => onRouteChange(sel.value));
  document.getElementById("btn-step")?.addEventListener("click", () => {
    void executeCurrentStep();
  });
  document.getElementById("btn-reset-demo")?.addEventListener("click", () => {
    void resetDemoShell();
  });
  document.getElementById("btn-submit-plan")?.addEventListener("click", () => {
    void submitPlayerPlan();
  });
  document.getElementById("btn-reset-player")?.addEventListener("click", () => {
    void resetPlayerGame();
  });

  void (async () => {
    try {
      await LlmSettings.init();
      await resetPlayerGame();
      if (typeof initMissionBrief === "function") initMissionBrief();
      if (typeof initTerminalModal === "function") initTerminalModal();
      shellLog("Balcony Job · 玩家正式版", "director");
      shellLog("① 不配 Key 也能玩 ② 待机仅环境微动、不跨区 ③ 写指令指挥", "beat");
    } catch (err) {
      shellLog(`初始化失败: ${err.message}`, "result");
      console.error(err);
    }
  })();

  requestAnimationFrame(gameLoop);
  if (typeof bindMapPick === "function") bindMapPick();
}
