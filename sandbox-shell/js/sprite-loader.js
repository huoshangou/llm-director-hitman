const SpriteStore = {
  manifest: null,
  images: new Map(),
  ready: false,
};

async function loadSpriteManifest() {
  const res = await fetch("/sprites/manifest.json");
  if (!res.ok) throw new Error("manifest.json missing");
  const raw = await res.json();
  SpriteStore.manifest = {
    mapBackground: raw.map?.background ?? "/sprites/map/gallery_event_map.png",
    assets: (raw.assets ?? []).map((a) => ({
      id: a.id,
      file: a.path ?? a.file,
      anchor: a.anchor ?? { x: 0.5, y: 1 },
    })),
  };
  return SpriteStore.manifest;
}

function assetPath(spriteKey) {
  if (!SpriteStore.manifest) return null;
  const entry = SpriteStore.manifest.assets.find((a) => a.id === spriteKey);
  return entry?.file ?? null;
}

function loadImage(path) {
  if (!path) return Promise.resolve(null);
  if (SpriteStore.images.has(path)) return SpriteStore.images.get(path);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
  SpriteStore.images.set(path, p);
  return p;
}

function collectScenePaths(scene) {
  const keys = new Set([SpriteStore.manifest.mapBackground]);
  for (const ent of scene.entities) keys.add(assetPath(ent.spriteKey));
  for (const obj of scene.objects ?? []) keys.add(assetPath(obj.spriteKey));
  for (const o of scene.overlays ?? []) keys.add(assetPath(o.id));
  return [...keys].filter(Boolean);
}

async function drawSprite(ctx, path, x, y, maxH, anchor) {
  const img = await loadImage(path);
  if (!img) return false;
  const scale = maxH / img.height;
  const w = img.width * scale;
  const h = img.height * scale;
  const ax = (anchor?.x ?? 0.5) * w;
  const ay = (anchor?.y ?? 1) * h;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(img, x - ax, y - ay, w, h);
  ctx.restore();
  return true;
}

async function preloadCoreSprites(scene) {
  if (!SpriteStore.manifest) {
    await loadSpriteManifest();
  }
  await Promise.all(collectScenePaths(scene).map(loadImage));
  SpriteStore.ready = true;
}

async function ensureSpritesReady(scene) {
  if (!SpriteStore.manifest) {
    await loadSpriteManifest();
    await loadImage(SpriteStore.manifest.mapBackground);
  }
  await preloadCoreSprites(scene);
}

async function initSprites(scene) {
  await loadSpriteManifest();
  await loadImage(SpriteStore.manifest.mapBackground);
  await preloadCoreSprites(scene);
}
