/** Canvas click → map selection + 底栏骇入分析（play shell）。 */
const mapPick = {
  selection: null,
  hoverId: null,
  hoverPick: null,
};

/** 供诊断与测试读取 */
window.mapPick = mapPick;

function activeWorld() {
  return shell.playerWorld ?? shell.session?.world ?? null;
}

function effectiveSelection() {
  if (mapPick.selection) return mapPick.selection;
  if (mapPick.hoverPick) return mapPick.hoverPick;
  return null;
}

function pickMapCoord(p) {
  const lerp = shell.lerp?.positions?.[p.id];
  if (lerp) return { mapX: lerp.mapX, mapY: lerp.mapY };
  const w = activeWorld();
  if (w) {
    if (p.kind === "npc" && typeof HitmanCore.npcMapCoord === "function") {
      const c = HitmanCore.npcMapCoord(w, p.id);
      if (c) return c;
    }
    if (p.kind === "agent" && typeof HitmanCore.agentMapCoord === "function") {
      const c = HitmanCore.agentMapCoord(w, p.id);
      if (c) return c;
    }
    if (p.kind === "object" && typeof HitmanCore.objectPickCoord === "function") {
      const c = HitmanCore.objectPickCoord(w, p.id);
      if (c) return c;
    }
  }
  if (typeof p.mapX === "number" && typeof p.mapY === "number") {
    return { mapX: p.mapX, mapY: p.mapY };
  }
  const { width: mapW, height: mapH } =
    HitmanCore.GALLERY_MAP_SIZE ?? { width: 1891, height: 832 };
  return {
    mapX: (p.left / 100) * mapW,
    mapY: (p.top / 100) * mapH,
  };
}

function minimapPointFromCanvas(canvasX, canvasY) {
  if (!HitmanCore.minimapRectForCanvas || !HitmanCore.GALLERY_MAP_SIZE) return null;
  const mini = HitmanCore.minimapRectForCanvas(W, H);
  if (
    canvasX < mini.x ||
    canvasX > mini.x + mini.width ||
    canvasY < mini.y ||
    canvasY > mini.y + mini.height
  ) {
    return null;
  }
  return {
    mapX: ((canvasX - mini.x) / mini.width) * HitmanCore.GALLERY_MAP_SIZE.width,
    mapY: ((canvasY - mini.y) / mini.height) * HitmanCore.GALLERY_MAP_SIZE.height,
  };
}

function edgePanFromCanvas(canvasX, canvasY) {
  if (canvasX < 0 || canvasY < 0 || shell.playbackActive) return null;
  if (!shell.mapCamera || shell.mapCamera.mode === "overview") return null;
  if (minimapPointFromCanvas(canvasX, canvasY)) return null;

  const edge = Math.max(52, Math.min(92, W * 0.065));
  const x = canvasX < edge ? -1 : canvasX > W - edge ? 1 : 0;
  const y = canvasY < edge ? -1 : canvasY > H - edge ? 1 : 0;
  if (!x && !y) return null;
  return { x, y };
}

function pickDistance(canvasX, canvasY, p) {
  if (typeof HitmanCore.canvasToMapAligned !== "function") return 9999;
  const m = HitmanCore.canvasToMapAligned(canvasX, canvasY, W, H, undefined, undefined, shell.mapCamera);
  const anchor = pickMapCoord(p);

  if (typeof HitmanCore.pickDistanceMap === "function") {
    return HitmanCore.pickDistanceMap(m.mapX, m.mapY, p.kind, p.id, anchor.mapX, anchor.mapY);
  }

  const c =
    typeof HitmanCore.mapToCanvasAligned === "function"
      ? HitmanCore.mapToCanvasAligned(anchor.mapX, anchor.mapY, W, H, undefined, undefined, shell.mapCamera)
      : null;
  if (!c) return 9999;
  const r =
    typeof HitmanCore.hitRadiusCanvasPx === "function"
      ? HitmanCore.hitRadiusCanvasPx(p.kind, p.id, W, H, shell.mapCamera)
      : 40;
  const d = Math.hypot(canvasX - c.x, canvasY - c.y);
  return d <= r ? d : 9999;
}

function hitTestPickables(canvasX, canvasY) {
  if (canvasX < 0 || canvasY < 0) return null;
  const world = activeWorld();
  if (!world || typeof HitmanCore.mapPickablesFromWorld !== "function") {
    return null;
  }
  const pickables = HitmanCore.mapPickablesFromWorld(world);
  let best = null;
  let bestD = Infinity;
  for (const p of pickables) {
    const d = pickDistance(canvasX, canvasY, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (!best || bestD >= 9999) return null;
  return best;
}

function canvasCoordsFromEvent(ev) {
  const el = document.getElementById("canvas");
  const rect = el.getBoundingClientRect();
  const bufW = el.width || W;
  const bufH = el.height || H;
  if (typeof HitmanCore.canvasClientToBuffer === "function") {
    const p = HitmanCore.canvasClientToBuffer(ev.clientX, ev.clientY, rect, bufW, bufH);
    if (p) return p;
    return { x: -1, y: -1 };
  }
  return {
    x: ((ev.clientX - rect.left) / rect.width) * bufW,
    y: ((ev.clientY - rect.top) / rect.height) * bufH,
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHackerAnalysis() {
  const footer = document.getElementById("hacker-analysis");
  const el = document.getElementById("hacker-analysis-body");
  if (!el) return;

  const sel = effectiveSelection();
  if (footer) footer.classList.toggle("ha-active", !!mapPick.selection);

  if (typeof HitmanCore === "undefined") {
    el.innerHTML =
      '<p class="ha-wait">未加载 hitman-core.js — 请运行 npm run build:sandbox && sync:play</p>';
    return;
  }

  if (typeof HitmanCore.buildHackerAnalysis !== "function") {
    el.innerHTML =
      '<p class="ha-wait">hitman-core 过旧，缺少 buildHackerAnalysis — 请硬刷新并确认 build 为 play-plan-context-validation-v1</p>';
    return;
  }

  const world = activeWorld();
  if (!world) {
    el.innerHTML =
      '<p class="ha-wait">场景加载中…若持续空白请点「重置局面」或硬刷新（Cmd+Shift+R）</p>';
    return;
  }

  try {
    const block = HitmanCore.buildHackerAnalysis(world, sel);
    const affordances =
      block.affordances.length > 0
        ? `<ul class="ha-aff">${block.affordances.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>`
        : "";
    const hoverNote =
      !mapPick.selection && mapPick.hoverPick
        ? '<p class="ha-wait" style="color:#5eead4">悬停预览 · 点击锁定</p>'
        : "";
    el.innerHTML = `
      ${hoverNote}
      <div class="ha-head">
        <div class="ha-title">${escapeHtml(block.title)}</div>
        <div class="ha-sub">${escapeHtml(block.subtitle)}</div>
      </div>
      <div class="ha-lines">${block.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>
      ${affordances}
    `;
  } catch (err) {
    el.innerHTML = `<p class="ha-wait">骇入分析渲染失败: ${escapeHtml(err.message)}</p>`;
    console.error("[hacker-analysis]", err);
  }
}

window.renderHackerAnalysis = renderHackerAnalysis;

function bindMapPick() {
  const el = document.getElementById("canvas");
  if (!el) return;

  el.addEventListener("mousemove", (ev) => {
    if (shell.playbackActive) return;
    const { x, y } = canvasCoordsFromEvent(ev);
    const miniPoint = minimapPointFromCanvas(x, y);
    if (miniPoint) {
      shell.edgePan = null;
      mapPick.hoverPick = null;
      mapPick.hoverId = null;
      el.style.cursor = "crosshair";
      if (!mapPick.selection) renderHackerAnalysis();
      void refreshSceneView();
      return;
    }
    shell.edgePan = edgePanFromCanvas(x, y);
    const hit = hitTestPickables(x, y);
    const next = hit?.id ?? null;
    const nextPick = hit ? { kind: hit.kind, id: hit.id } : null;
    const pickKey = nextPick ? `${nextPick.kind}:${nextPick.id}` : "";
    const prevKey = mapPick.hoverPick
      ? `${mapPick.hoverPick.kind}:${mapPick.hoverPick.id}`
      : "";
    mapPick.hoverPick = nextPick;
    if (next !== mapPick.hoverId || pickKey !== prevKey) {
      mapPick.hoverId = next;
      el.style.cursor = next ? "pointer" : shell.edgePan ? "move" : "default";
      if (!mapPick.selection) renderHackerAnalysis();
      void refreshSceneView();
    }
  });

  el.addEventListener("mouseleave", () => {
    shell.edgePan = null;
    mapPick.hoverPick = null;
    if (mapPick.hoverId) {
      mapPick.hoverId = null;
      el.style.cursor = "default";
      if (!mapPick.selection) renderHackerAnalysis();
      void refreshSceneView();
    }
  });

  el.addEventListener("click", (ev) => {
    if (shell.playbackActive) return;
    const { x, y } = canvasCoordsFromEvent(ev);
    const miniPoint = minimapPointFromCanvas(x, y);
    if (miniPoint) {
      if (typeof HitmanCore.mapCameraFromMinimapPoint === "function") {
        shell.mapCamera = HitmanCore.mapCameraFromMinimapPoint(
          miniPoint.mapX,
          miniPoint.mapY,
          shell.mapCamera,
        );
      } else {
        shell.mapCamera = {
          ...(shell.mapCamera || {}),
          mode: "camera",
          centerMapX: miniPoint.mapX,
          centerMapY: miniPoint.mapY,
        };
      }
      shell.renderDirty = true;
      void refreshSceneView();
      return;
    }
    const hit = hitTestPickables(x, y);
    if (!hit) {
      mapPick.selection = null;
    } else {
      mapPick.selection = { kind: hit.kind, id: hit.id };
      mapPick.hoverPick = { kind: hit.kind, id: hit.id };
    }
    if (typeof updatePlanContext === "function") updatePlanContext();
    renderHackerAnalysis();
    void refreshSceneView();
  });

  renderHackerAnalysis();
}

function refreshSceneView() {
  const w = activeWorld();
  if (!shell.scene && w && typeof HitmanCore.worldToScene === "function") {
    shell.scene = HitmanCore.worldToScene(w);
  }
  if (!shell.scene) return;
  shell.renderDirty = true;
  const stepCap =
    shell.session && typeof stepCaptionText === "function" ? stepCaptionText() : null;
  const focus =
    shell.session && typeof stepFocusIds === "function" ? stepFocusIds() : [];
  return renderScene(
    shell.scene,
    null,
    shell.flashId,
    stepCap,
    focus,
    shell.playbackFrame,
    w,
  );
}
