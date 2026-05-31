/** 环境 tick / 待机后 NPC 在地图上的平滑移动（须在 shell.js 之后加载） */
const LERP_MS = 1600;

function polylineForNpcMove(worldBefore, worldAfter, id) {
  if (
    typeof HitmanCore.travelMapPolyline !== "function" ||
    !worldBefore?.locations
  ) {
    return null;
  }
  const before = worldBefore.npcs[id];
  const after = worldAfter.npcs[id];
  if (!before || !after || before.location === after.location) return null;
  return HitmanCore.travelMapPolyline(
    before.location,
    after.location,
    id,
    worldBefore.locations,
  );
}

function startNpcLerp(worldBefore, worldAfter) {
  if (typeof HitmanCore.npcMapCoord !== "function") return;
  const keys = {};
  const npcIds = ["target", "guard", "waiter", "cleaner", "guest"];

  for (const id of npcIds) {
    const before = worldBefore.npcs[id];
    const after = worldAfter.npcs[id];
    if (!before || !after) continue;

    if (before.location !== after.location) {
      const polyline = polylineForNpcMove(worldBefore, worldAfter, id);
      if (polyline && polyline.length >= 2) {
        keys[id] = { polyline };
        continue;
      }
      const from = HitmanCore.npcMapCoord(worldBefore, id);
      const to = HitmanCore.npcMapCoord(worldAfter, id);
      if (!from || !to) continue;
      keys[id] = { from, to };
      continue;
    }

    if (before.currentTask?.type === after.currentTask?.type) continue;
    const from = HitmanCore.npcMapCoord(worldBefore, id);
    const to = HitmanCore.npcMapCoord(worldAfter, id);
    if (!from || !to) continue;
    keys[id] = { from, to };
  }

  if (!Object.keys(keys).length) {
    shell.lerp = null;
    return;
  }
  shell.lerp = { started: performance.now(), duration: LERP_MS, keys };
}

function updateLerpPositions() {
  if (!shell.lerp) return false;
  const t = Math.min(1, (performance.now() - shell.lerp.started) / shell.lerp.duration);
  const eased = t * (2 - t);
  shell.lerp.positions = {};

  for (const [id, spec] of Object.entries(shell.lerp.keys)) {
    if (spec.polyline && typeof HitmanCore.samplePolylineAt === "function") {
      const p = HitmanCore.samplePolylineAt(spec.polyline, eased);
      shell.lerp.positions[id] = { mapX: p.x, mapY: p.y };
      continue;
    }
    const { from, to } = spec;
    shell.lerp.positions[id] = {
      mapX: from.mapX + (to.mapX - from.mapX) * eased,
      mapY: from.mapY + (to.mapY - from.mapY) * eased,
    };
  }

  if (t >= 1) {
    shell.lerp = null;
    return true;
  }
  return false;
}
