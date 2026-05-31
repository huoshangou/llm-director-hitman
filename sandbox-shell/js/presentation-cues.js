/** Canvas/CSS fallback presentation cues — play-prop-causality-v1 */

let cueSeq = 0;

function resolveCueTargetPos(targetId) {
  const w = shell.playerWorld ?? shell.session?.world;
  if (!w || !targetId) return null;

  const locs = ["kitchen", "bar", "lobby", "gallery", "balcony"];
  if (locs.includes(targetId) && typeof HitmanCore.locationMapCoord === "function") {
    return HitmanCore.locationMapCoord(targetId);
  }

  if (w.npcs?.[targetId] && typeof HitmanCore.npcMapCoord === "function") {
    return HitmanCore.npcMapCoord(w, targetId);
  }
  if (w.agents?.[targetId] && typeof HitmanCore.agentMapCoord === "function") {
    return HitmanCore.agentMapCoord(w, targetId);
  }
  if (w.objects?.[targetId] && typeof HitmanCore.objectMapCoord === "function") {
    return HitmanCore.objectMapCoord(w, targetId);
  }
  return null;
}

function cueToneColor(tone) {
  if (tone === "success") return "134, 239, 172";
  if (tone === "warning") return "251, 191, 36";
  if (tone === "locked") return "148, 163, 184";
  if (tone === "danger") return "248, 113, 113";
  return "159, 184, 156";
}

function applyPresentationCues(cues, ttlMs) {
  if (!cues?.length) return;
  const ttl = ttlMs ?? HitmanCore.PRESENTATION_CUE_TTL_MS ?? 4200;
  const now = performance.now();
  if (!shell.presentationCues) shell.presentationCues = [];
  for (const cue of cues) {
    shell.presentationCues.push({
      ...cue,
      id: `cue-${++cueSeq}`,
      expiresAtMs: now + ttl,
    });
  }
  shell.renderDirty = true;
}

function tickPresentationCues(nowMs) {
  if (!shell.presentationCues?.length) return;
  const before = shell.presentationCues.length;
  shell.presentationCues = shell.presentationCues.filter((c) => c.expiresAtMs > nowMs);
  if (shell.presentationCues.length !== before) shell.renderDirty = true;
}

function drawPresentationCues(ctx, mapToCanvasFn) {
  const cues = shell.presentationCues ?? [];
  if (!cues.length) return;

  const activeFx = new Set();
  for (const cue of cues) {
    if (cue.type === "world_fx") activeFx.add(cue.effect);
  }

  if (activeFx.has("lights_dim")) {
    ctx.fillStyle = "rgba(4, 8, 18, 0.42)";
    ctx.fillRect(0, 0, W, H);
  }

  if (activeFx.has("camera_glitch")) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let y = 0; y < H; y += 4) {
      const shift = Math.sin((y + (shell.ambientTime || 0) * 120) * 0.08) * 3;
      ctx.drawImage(canvas, 0, y, W, 2, shift, y, W, 2);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(248, 113, 113, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.setLineDash([]);
  }

  const now = performance.now();
  for (const cue of cues) {
    const life = Math.max(0, (cue.expiresAtMs - now) / (HitmanCore.PRESENTATION_CUE_TTL_MS ?? 4200));
    if (life <= 0) continue;

    if (cue.type === "world_fx" && cue.effect === "sightline_blocked") {
      ctx.save();
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.35 + life * 0.4})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(W * 0.55, H * 0.35);
      ctx.lineTo(W * 0.78, H * 0.42);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const targetId =
      cue.type === "overlay" || cue.type === "map_ping"
        ? cue.targetId
        : cue.type === "world_fx"
          ? cue.targetId
          : null;
    if (!targetId) continue;

    const pos = resolveCueTargetPos(targetId);
    if (!pos) continue;
    const c = mapToCanvasFn(pos.mapX, pos.mapY);

    if (cue.type === "map_ping" || cue.type === "overlay") {
      const tone = cue.tone ?? "success";
      const rgb = cueToneColor(tone);
      const r = 16 + (1 - life) * 10;
      ctx.save();
      ctx.strokeStyle = `rgba(${rgb}, ${0.25 + life * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 12, r + 8 * (1 - life), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x, c.y - 12, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const label = cue.text ?? (cue.type === "overlay" ? cue.assetId : "");
      if (label) {
        ctx.font = "11px IBM Plex Mono, Menlo, monospace";
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
        ctx.fillRect(c.x - tw / 2, c.y - 38, tw, 18);
        ctx.fillStyle = `rgba(${rgb}, 0.95)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, c.x, c.y - 29);
      }
    }

    if (cue.type === "world_fx" && cue.effect === "phone_ring") {
      const pulse = 0.85 + Math.sin((shell.ambientTime || 0) * 8) * 0.15;
      ctx.save();
      ctx.font = `${Math.round(18 * pulse)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📱", c.x, c.y - 22);
      if (cue.text) {
        ctx.font = "10px IBM Plex Mono, Menlo, monospace";
        ctx.fillStyle = "rgba(134, 239, 172, 0.95)";
        ctx.fillText(cue.text, c.x, c.y - 42);
      }
      ctx.restore();
    }

    if (cue.type === "world_fx" && cue.effect === "unsupported_locked") {
      ctx.save();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔒", c.x, c.y - 18);
      if (cue.text) {
        ctx.font = "10px IBM Plex Mono, Menlo, monospace";
        ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
        ctx.fillText(cue.text, c.x, c.y - 36);
      }
      ctx.restore();
    }
  }
}

function resetPresentationCues() {
  shell.presentationCues = [];
  shell.renderDirty = true;
}

window.applyPresentationCues = applyPresentationCues;
window.tickPresentationCues = tickPresentationCues;
window.drawPresentationCues = drawPresentationCues;
window.resetPresentationCues = resetPresentationCues;
