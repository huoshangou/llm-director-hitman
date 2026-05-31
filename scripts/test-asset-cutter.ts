import assert from "node:assert/strict";
import {
  buildAssetManifest,
  makeAssetId,
  parseTags,
  rectFromPoints,
  sanitizeAssetFilename,
} from "../lib/assets/assetCutter";

const rect = rectFromPoints(
  { x: 420.4, y: 300.8 },
  { x: 120.2, y: 96.1 },
  { width: 512, height: 512 },
);

assert.deepEqual(rect, { x: 120, y: 96, w: 300, h: 205 });
assert.deepEqual(parseTags(" guard, sight, guard ,, alert "), ["guard", "sight", "alert"]);
assert.equal(makeAssetId("Guard Sight Cone", "watching"), "guard_sight_cone_watching");
assert.equal(sanitizeAssetFilename("Guard Sight Cone", "watching"), "guard_sight_cone_watching.png");

const manifest = buildAssetManifest({
  sourceImage: "sheet-d-overlays.png",
  sourceSize: { width: 2048, height: 2048 },
  assets: [
    {
      id: "guard_sight_cone_watching",
      name: "Guard Sight Cone",
      type: "overlay",
      state: "watching",
      rect: { x: 120, y: 96, w: 300, h: 205 },
      tags: ["guard", "sight"],
      anchor: { x: 0.5, y: 0.5 },
    },
  ],
});

assert.equal(manifest.sourceImage, "sheet-d-overlays.png");
assert.deepEqual(manifest.sourceSize, { width: 2048, height: 2048 });
assert.equal(manifest.assets[0].id, "guard_sight_cone_watching");
assert.deepEqual(manifest.assets[0].anchor, { x: 0.5, y: 0.5 });

console.log("OK asset cutter helpers");
