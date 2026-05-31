import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { normalizeSpriteManifest } from "../lib/sprites/normalizeManifest";
import { assetFileForKey } from "../lib/sprites/loadManifest";
import { cloneWorld } from "../lib/world/initialWorld";
import { executeSessionStep, createSession } from "../lib/bridge/sandboxSession";
import { objectsFromWorld } from "../lib/sprites/objectVisual";
import {
  entityVisualsFromWorld,
  overlaysFromWorld,
  spriteKeyForAgent,
  spriteKeyForNpc,
} from "../lib/timeline/eventTemplates";

const manifestPath = path.join(process.cwd(), "public/sprites/manifest.json");
const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifest = normalizeSpriteManifest(raw);

assert.ok(manifest.assets.length > 40, "expected cropped assets");
assert.ok(manifest.map?.background?.includes("gallery_event_map"), "map background");

const keys = new Set<string>();
let world = cloneWorld();
keys.add(spriteKeyForNpc(world, "target"));
keys.add(spriteKeyForAgent(world, "face"));
for (const v of entityVisualsFromWorld(world)) keys.add(v.spriteKey);
for (const o of objectsFromWorld(world)) keys.add(o.spriteKey);
for (const o of overlaysFromWorld(world)) keys.add(o.id);

let session = createSession("route_a");
for (let i = 0; i < 5; i++) {
  const res = executeSessionStep(session);
  session = res.session;
  world = session.world;
  for (const v of entityVisualsFromWorld(world)) keys.add(v.spriteKey);
  for (const o of objectsFromWorld(world)) keys.add(o.spriteKey);
  for (const o of overlaysFromWorld(world)) keys.add(o.id);
}

/** No cropped PNG yet — canvas uses labeled placeholder. */
const OPTIONAL_KEYS = new Set(["kitchen_door", "hacker_remote"]);

const missing: string[] = [];
for (const key of keys) {
  if (OPTIONAL_KEYS.has(key)) continue;
  const file = assetFileForKey(manifest, key);
  if (!file) missing.push(key);
  else {
    const abs = path.join(process.cwd(), "public", file.replace(/^\//, ""));
    if (!fs.existsSync(abs)) missing.push(`${key} -> ${abs}`);
  }
}

if (missing.length) {
  console.error("Missing assets:", missing);
  process.exit(1);
}

console.log(`manifest: ${manifest.assets.length} assets, ${keys.size} runtime keys OK`);
