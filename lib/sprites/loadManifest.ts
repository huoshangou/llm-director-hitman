import { defaultSpriteManifest } from "./defaultManifest";
import { normalizeSpriteManifest } from "./normalizeManifest";
import type { SpriteManifest } from "./types";

let cached: SpriteManifest | null = null;

export function getSpriteManifestSync(): SpriteManifest {
  return cached ?? defaultSpriteManifest;
}

export async function loadSpriteManifest(): Promise<SpriteManifest> {
  if (cached) return cached;
  try {
    const res = await fetch("/sprites/manifest.json");
    if (!res.ok) {
      cached = defaultSpriteManifest;
      return cached;
    }
    const data = await res.json();
    cached = normalizeSpriteManifest(data);
    return cached;
  } catch {
    cached = defaultSpriteManifest;
    return cached;
  }
}

export function assetFileForKey(manifest: SpriteManifest, spriteKey: string): string | null {
  const entry = manifest.assets.find((a) => a.id === spriteKey || a.name === spriteKey);
  const file = entry?.file;
  return file && file.length > 0 ? file : null;
}

export function invalidateManifestCache(): void {
  cached = null;
}
