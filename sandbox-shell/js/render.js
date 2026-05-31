const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let mapImagePromise = null;
let renderGen = 0;

const NPC_ACCENT = {
  target: "#fbbf24",
  guard: "#94a3b8",
  waiter: "#7dd3fc",
  cleaner: "#a78bfa",
  guest: "#86efac",
  face: "#fb7185",
  runner: "#f472b6",
  player: "#c4b5fd",
};

function getMapImage() {
  if (!SpriteStore.manifest) return Promise.resolve(null);
  const path = SpriteStore.manifest.mapBackground;
  if (!mapImagePromise) mapImagePromise = loadImage(path);
  return mapImagePromise;
}

function drawMapLetterbox(mapImg) {
  const scale = Math.min(W / mapImg.width, H / mapImg.height);
  const dw = mapImg.width * scale;
  const dh = mapImg.height * scale;
  const ox = (W - dw) / 2;
  const oy = (H - dh) / 2;
  ctx.drawImage(mapImg, ox, oy, dw, dh);
}

function drawMapCamera(mapImg) {
  const camera = shell.mapCamera;
  if (!camera || camera.mode === "overview" || !HitmanCore.getMapCanvasTransform) {
    drawMapLetterbox(mapImg);
    return;
  }
  const t = HitmanCore.getMapCanvasTransform(W, H, undefined, undefined, camera);
  const v = t.viewport;
  ctx.drawImage(mapImg, v.x, v.y, v.width, v.height, t.ox, t.oy, t.dw, t.dh);
}

function mapToCanvas(mapX, mapY) {
  return HitmanCore.mapToCanvasAligned(mapX, mapY, W, H, undefined, undefined, shell.mapCamera);
}

function worldVisualScale() {
  if (typeof HitmanCore.cameraVisualScaleForCanvas !== "function") return 1;
  return HitmanCore.cameraVisualScaleForCanvas(shell.mapCamera, W, H);
}

function worldPx(px) {
  return px * worldVisualScale();
}

function applyAmbientCanvas(c, id) {
  if (shell.playbackFrame || !shell.ambientTime || typeof HitmanCore.ambientEntityOffset !== "function") {
    return c;
  }
  const o = HitmanCore.ambientEntityOffset(id, shell.ambientTime);
  const { width: mapW, height: mapH } = HitmanCore.GALLERY_MAP_SIZE ?? {
    width: 1891,
    height: 832,
  };
  const mapScale = HitmanCore.getMapCanvasTransform(W, H, mapW, mapH, shell.mapCamera).scale;
  return { x: c.x + o.dx * mapScale, y: c.y + o.dy * mapScale };
}

function activeWorld() {
  return shell.playerWorld ?? shell.session?.world ?? null;
}

function resolveEntityMapPos(ent) {
  if (shell.lerp?.positions?.[ent.id]) {
    const p = shell.lerp.positions[ent.id];
    return { mapX: p.mapX, mapY: p.mapY };
  }
  const pos = shell.playbackFrame?.entities?.[ent.id];
  if (pos) return { mapX: pos.mapX, mapY: pos.mapY };

  const w = activeWorld();
  if (w) {
    if (ent.kind === "npc" && typeof HitmanCore.npcMapCoord === "function") {
      const c = HitmanCore.npcMapCoord(w, ent.id);
      if (c) return c;
    }
    if (ent.kind === "agent" && typeof HitmanCore.agentMapCoord === "function") {
      const c = HitmanCore.agentMapCoord(w, ent.id);
      if (c) return c;
    }
    if (ent.kind === "player" && typeof HitmanCore.playerMapCoord === "function") {
      return HitmanCore.playerMapCoord();
    }
  }
  return { mapX: ent.mapX, mapY: ent.mapY };
}

function resolveObjectMapPos(obj) {
  const w = activeWorld();
  if (w && typeof HitmanCore.objectMapCoord === "function") {
    const c = HitmanCore.objectMapCoord(w, obj.id);
    if (c) return c;
  }
  return { mapX: obj.mapX, mapY: obj.mapY };
}

function resolveObjectPickPos(obj) {
  const w = activeWorld();
  if (w && typeof HitmanCore.objectPickCoord === "function") {
    const c = HitmanCore.objectPickCoord(w, obj.id);
    if (c) return c;
  }
  return resolveObjectMapPos(obj);
}

function interactionStrength(hover, selected, focus) {
  if (selected) return 1;
  if (focus) return 0.95;
  if (hover) return 0.75;
  return 0;
}

/** 悬停/选中：脚下椭圆描边 + 轻扫光弧 */
function drawInteractionHalo(x, y, strength, colorRgb) {
  if (strength <= 0) return;
  const t = (shell.ambientTime || 0) * 1.8;
  const pulse = 0.92 + Math.sin(t) * 0.08;

  const rx = worldPx(18 + strength * 8);
  const ry = worldPx(6 + strength * 2);
  ctx.save();
  ctx.strokeStyle = accentWithAlpha(colorRgb, 0.28 * strength * pulse);
  ctx.lineWidth = worldPx(1.5);
  ctx.beginPath();
  ctx.ellipse(x, y - worldPx(2), rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();

  const sweep = ((t * 0.4) % 1) * Math.PI * 2;
  ctx.strokeStyle = accentWithAlpha(colorRgb, 0.5 * strength);
  ctx.lineWidth = worldPx(2);
  ctx.beginPath();
  ctx.arc(x, y - worldPx(8), worldPx(14 + strength * 4), sweep, sweep + 1.1);
  ctx.stroke();
  ctx.restore();
}

function drawHackerPin(x, y, label, opts = {}) {
  const active = !!opts.active;
  const hover = !!opts.hover;
  const color = opts.color || "#5eead4";
  const r = active ? 9 : hover ? 8 : 5;

  ctx.save();
  ctx.fillStyle = active || hover ? color : "rgba(94, 234, 212, 0.82)";
  ctx.strokeStyle = active ? "rgba(255,255,255,0.9)" : "rgba(8,12,24,0.85)";
  ctx.lineWidth = active ? 2 : 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if ((active || hover || opts.showLabel) && label) {
    ctx.font = "11px sans-serif";
    const text = label;
    const tw = ctx.measureText(text).width + 12;
    const px = Math.min(W - tw - 8, Math.max(8, x + 10));
    const py = Math.max(8, y - 18);
    ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
    ctx.strokeStyle = "rgba(94, 234, 212, 0.45)";
    ctx.fillRect(px, py, tw, 20);
    ctx.strokeRect(px, py, tw, 20);
    ctx.fillStyle = "#ccfbf1";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, px + 6, py + 10);
  }
  ctx.restore();
}

function drawMiniMap(mapImg) {
  if (!mapImg || !HitmanCore.minimapRectForCanvas) return;
  const mini = HitmanCore.minimapRectForCanvas(W, H);
  const viewport = HitmanCore.cameraViewportForCanvas(shell.mapCamera, W, H);
  const mapSize = HitmanCore.GALLERY_MAP_SIZE;

  ctx.save();
  ctx.fillStyle = "rgba(8, 12, 24, 0.82)";
  ctx.fillRect(mini.x - 6, mini.y - 22, mini.width + 12, mini.height + 28);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
  ctx.strokeRect(mini.x - 6, mini.y - 22, mini.width + 12, mini.height + 28);

  ctx.fillStyle = "rgba(148, 163, 184, 0.82)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("MINIMAP", mini.x, mini.y - 11);

  ctx.drawImage(mapImg, mini.x, mini.y, mini.width, mini.height);
  ctx.fillStyle = "rgba(2, 6, 23, 0.28)";
  ctx.fillRect(mini.x, mini.y, mini.width, mini.height);

  const sx = mini.width / mapSize.width;
  const sy = mini.height / mapSize.height;
  ctx.strokeStyle = "#5eead4";
  ctx.fillStyle = "rgba(94, 234, 212, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.fillRect(
    mini.x + viewport.x * sx,
    mini.y + viewport.y * sy,
    viewport.width * sx,
    viewport.height * sy,
  );
  ctx.strokeRect(
    mini.x + viewport.x * sx,
    mini.y + viewport.y * sy,
    viewport.width * sx,
    viewport.height * sy,
  );
  ctx.restore();
}

function drawLocationLabels(locations) {
  if (!locations?.length) return;
  ctx.save();
  ctx.font = `${Math.round(worldPx(10))}px IBM Plex Mono, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const loc of locations) {
    const anchor = HitmanCore.LOCATION_LABEL_ANCHORS?.[loc.id] ?? {
      mapX: loc.mapX,
      mapY: loc.mapY,
    };
    const c = mapToCanvas(anchor.mapX, anchor.mapY);
    const text = loc.label || loc.name || loc.id;
    const tw = ctx.measureText(text).width + worldPx(12);
    const th = worldPx(18);
    ctx.fillStyle = "rgba(4, 6, 4, 0.62)";
    ctx.strokeStyle = "rgba(201, 164, 94, 0.34)";
    ctx.lineWidth = 1;
    ctx.fillRect(c.x - tw / 2, c.y - th / 2, tw, th);
    ctx.strokeRect(c.x - tw / 2, c.y - th / 2, tw, th);
    ctx.fillStyle = "rgba(225, 222, 200, 0.82)";
    ctx.fillText(text, c.x, c.y + worldPx(0.5));
  }
  ctx.restore();
}

function accentWithAlpha(hex, a) {
  if (hex.startsWith("#") && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return `rgba(253, 224, 71, ${a})`;
}

function drawEntityOutline(x, y, h, strength, color) {
  if (strength <= 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = worldPx(1.5 + strength);
  const padX = worldPx(16);
  const padY = worldPx(6);
  const w = worldPx(32);
  ctx.strokeRect(x - padX, y - h - padY, w, h + worldPx(8));
}

function drawTargetRing(x, y, h) {
  ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
  ctx.lineWidth = worldPx(1.5);
  ctx.setLineDash([worldPx(6), worldPx(5)]);
  const padX = worldPx(20);
  const padY = worldPx(8);
  ctx.strokeRect(x - padX, y - h - padY, worldPx(40), h + worldPx(10));
  ctx.setLineDash([]);
}

function objectDrawOpts(obj, focus, pickHover) {
  const selected = mapPick?.selection?.kind === "object" && mapPick.selection.id === obj.id;
  return {
    highlighted: obj.highlighted,
    hover: pickHover,
    focus: focus.has(obj.id),
    selected,
    strength: interactionStrength(pickHover, selected, focus.has(obj.id)),
  };
}

function shouldDrawObjSprite(obj, opts) {
  if (typeof HitmanCore.shouldDrawObjectSprite === "function") {
    return HitmanCore.shouldDrawObjectSprite(obj.id, {
      highlighted: opts.highlighted,
      hover: opts.hover,
      focus: opts.focus,
    });
  }
  return true;
}

async function drawObject(obj, focus, pickHover) {
  const selected =
    mapPick?.selection?.kind === "object" && mapPick.selection.id === obj.id;
  const opts = objectDrawOpts(obj, focus, pickHover || selected);
  const drawPos = resolveObjectMapPos(obj);
  const pickPos = resolveObjectPickPos(obj);
  const c = mapToCanvas(drawPos.mapX, drawPos.mapY);
  const pickC = mapToCanvas(pickPos.mapX, pickPos.mapY);

  drawInteractionHalo(
    pickC.x,
    pickC.y,
    opts.strength,
    accentWithAlpha("#86efac", opts.strength),
  );

  const drawSpriteLayer = shouldDrawObjSprite(obj, opts);
  const path = drawSpriteLayer ? assetPath(obj.spriteKey) : null;
  const alwaysOn =
    typeof HitmanCore.isObjectAlwaysVisible === "function" &&
    HitmanCore.isObjectAlwaysVisible(obj.id);
  const baseH =
    typeof HitmanCore.objectSpriteMaxHeight === "function"
      ? HitmanCore.objectSpriteMaxHeight(obj.id)
      : 44;
  const maxH = drawSpriteLayer
    ? alwaysOn
      ? worldPx(baseH)
      : opts.strength > 0.5
        ? worldPx(baseH)
        : 0
    : 0;

  if (path && maxH > 0) {
    const drew = await drawSprite(ctx, path, c.x, c.y, maxH, { x: 0.5, y: 1 });
    if (drew && opts.focus) {
      drawEntityOutline(c.x, c.y, maxH, 0.8, "rgba(134, 239, 172, 0.85)");
    }
  }

  if (obj.highlighted && !drawSpriteLayer) {
    drawInteractionHalo(c.x, c.y, 0.9, accentWithAlpha("#fbbf24", 0.9));
  }

  drawHackerPin(pickC.x, pickC.y, obj.short || obj.name || obj.id, {
    active: selected,
    hover: pickHover,
    color: "#5eead4",
  });
}

async function drawEntity(ent, focus, pickHover) {
  const { mapX, mapY } = resolveEntityMapPos(ent);
  const c = mapToCanvas(mapX, mapY);
  const selected =
    mapPick?.selection &&
    mapPick.selection.kind !== "object" &&
    mapPick.selection.id === ent.id;
  const strength = interactionStrength(
    pickHover || selected,
    selected,
    focus.has(ent.id) || shell.playbackFrame?.pulseEntityId === ent.id,
  );
  const accent = NPC_ACCENT[ent.id] || NPC_ACCENT.guest;

  const path = assetPath(ent.spriteKey);
  const baseH = ent.kind === "player" ? 44 : ent.id === "target" ? 88 : 72;
  const maxH = worldPx(baseH);
  let drew = false;
  if (path) drew = await drawSprite(ctx, path, c.x, c.y, maxH, { x: 0.5, y: 1 });
  if (!drew) {
    const r = worldPx(ent.kind === "player" ? 10 : 14);
    ctx.fillStyle = accentWithAlpha(accent, 0.55);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - maxH * 0.45, r, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accentWithAlpha(accent, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (ent.id === "target") drawTargetRing(c.x, c.y, maxH);

  if (strength > 0) {
    drawInteractionHalo(c.x, c.y, strength, accentWithAlpha(accent, strength));
    if (strength > 0.7) {
      drawEntityOutline(c.x, c.y, maxH, strength * 0.6, accentWithAlpha(accent, 0.85));
    }
  }

  const alwaysLabel = ent.id === "target" || ent.id === "face" || ent.id === "runner";
  if (strength > 0 || alwaysLabel) {
    const role =
      ent.id === "face"
        ? "Face · 交涉"
        : ent.id === "runner"
          ? "Runner · 执行"
          : ent.short || ent.name || ent.id;
    drawHackerPin(c.x, c.y - maxH - worldPx(8), role, {
      active: selected || ent.id === "target",
      hover: pickHover,
      showLabel: alwaysLabel,
      color: accent,
    });
  }
}

function drawSpeechBubble(canvasX, canvasY, text) {
  ctx.font = "12px sans-serif";
  const maxW = 160;
  const lines = text.length > 28 ? [text.slice(0, 28), text.slice(28)] : [text];
  const lineH = 14;
  const pw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14);
  const ph = lines.length * lineH + 10;
  const px = canvasX - pw / 2;
  const py = canvasY - ph - 12;
  ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
  ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
  ctx.lineWidth = 1;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = "#fef3c7";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, canvasX, py + 5 + i * lineH));
}

async function drawOverlay(o, focus) {
  if (!focus.has(o.id) && !o.id.includes("accident") && !o.id.includes("message")) return;
  const c = mapToCanvas(o.mapX, o.mapY);
  const path = assetPath(o.id);
  if (path) await drawSprite(ctx, path, c.x, c.y - worldPx(20), worldPx(32), { x: 0.5, y: 0.5 });
}

function drawStepHint(text) {
  if (!text) return;
  const line = text.replace(/^本步在做什么：/, "");
  ctx.font = "13px sans-serif";
  const tw = Math.min(ctx.measureText(line).width + 24, W - 40);
  const px = (W - tw) / 2;
  const py = H - 36;
  ctx.fillStyle = "rgba(8, 12, 24, 0.85)";
  ctx.fillRect(px, py, tw, 24);
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(line, W / 2, py + 12);
}

function drawExploreHint() {
  if (mapPick?.selection || mapPick?.hoverId) return;
  ctx.font = "12px sans-serif";
  const line = "鼠标移向地图上的物件或角色 · 可交互处会出现微光";
  const tw = ctx.measureText(line).width + 20;
  const px = (W - tw) / 2;
  const py = 14;
  ctx.fillStyle = "rgba(8, 12, 24, 0.55)";
  ctx.fillRect(px, py, tw, 22);
  ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(line, W / 2, py + 11);
}

async function renderScene(
  scene,
  _beatLabel,
  flashEntityId,
  stepCaption,
  focusIds,
  playbackFrame,
  worldForMood,
) {
  const gen = ++renderGen;
  const mapImg = await getMapImage();
  if (gen !== renderGen) return;

  const focus = new Set(focusIds || []);
  if (flashEntityId) focus.add(flashEntityId);
  const hoverId = mapPick.hoverId;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  if (mapImg) {
    drawMapCamera(mapImg);
    ctx.fillStyle = "rgba(8, 12, 24, 0.12)";
    ctx.fillRect(0, 0, W, H);
  }

  drawExploreHint();
  drawLocationLabels(scene.locations);

  for (const obj of scene.objects ?? []) {
    if (gen !== renderGen) return;
    await drawObject(obj, focus, hoverId === obj.id);
  }

  const hidden = new Set(playbackFrame?.hiddenEntityIds ?? []);
  for (const ent of scene.entities) {
    if (gen !== renderGen) return;
    if (hidden.has(ent.id)) continue;
    await drawEntity(ent, focus, hoverId === ent.id);
  }

  if (playbackFrame?.bubbles) {
    for (const b of playbackFrame.bubbles) {
      const c = mapToCanvas(b.mapX, b.mapY);
      drawSpeechBubble(c.x, c.y, b.text);
    }
  }

  for (const o of scene.overlays ?? []) {
    if (gen !== renderGen) return;
    await drawOverlay(o, focus);
  }

  drawSignalOverlay(playbackFrame);
  drawMapMoodOverlay(worldForMood);
  if (typeof drawPresentationCues === "function") {
    drawPresentationCues(ctx, mapToCanvas);
  }
  if (mapImg) drawMiniMap(mapImg);
  drawStepHint(stepCaption);
}

function drawSignalOverlay(playbackFrame) {
  const ov = playbackFrame?.signalOverlay;
  if (!ov) return;
  const lost = ov.phase === "lost";
  ctx.fillStyle = lost ? "rgba(4, 6, 4, 0.78)" : "rgba(4, 6, 4, 0.42)";
  ctx.fillRect(0, 0, W, H);
  ctx.font = "bold 13px IBM Plex Mono, Menlo, monospace";
  const label = ov.label ?? (lost ? "SIGNAL LOST" : "REACQUIRING");
  const tw = ctx.measureText(label).width + 28;
  const px = (W - tw) / 2;
  const py = H * 0.46;
  ctx.fillStyle = "rgba(8, 12, 10, 0.92)";
  ctx.fillRect(px, py, tw, 28);
  ctx.strokeStyle = lost ? "rgba(185, 95, 87, 0.55)" : "rgba(201, 164, 94, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, tw - 1, 27);
  ctx.fillStyle = lost ? "rgba(220, 170, 160, 0.95)" : "rgba(201, 164, 94, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, W / 2, py + 14);
}

function drawMapMoodOverlay(world) {
  if (!world || typeof HitmanCore.mapMoodFromWorld !== "function") return;
  const mood = HitmanCore.mapMoodFromWorld(world);
  if (mood === "failed") {
    ctx.fillStyle = "rgba(72, 18, 28, 0.38)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(220, 60, 80, 0.45)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, W - 12, H - 12);
  } else if (mood === "tense") {
    ctx.fillStyle = "rgba(48, 32, 8, 0.22)";
    ctx.fillRect(0, 0, W, H);
  }
  if (typeof HitmanCore.mapLightingFromWorld === "function") {
    const lighting = HitmanCore.mapLightingFromWorld(world);
    if (lighting === "dimmed") {
      ctx.fillStyle = "rgba(4, 8, 18, 0.36)";
      ctx.fillRect(0, 0, W, H);
    }
  }
}
