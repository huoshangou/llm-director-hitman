import assert from "node:assert/strict";
import {
  DEFAULT_PLAY_CAMERA,
  cameraVisualScaleForCanvas,
  cameraViewportForCanvas,
  canvasToMapAligned,
  mapToCanvasAligned,
  minimapRectForCanvas,
} from "../lib/sprites/canvasLayout";
import { GALLERY_MAP_SIZE } from "../lib/sprites/mapLayout";

const W = 1120;
const H = 800;

const camera = {
  ...DEFAULT_PLAY_CAMERA,
  mode: "camera" as const,
  centerMapX: 1260,
  centerMapY: 416,
  zoom: 1,
};

const viewport = cameraViewportForCanvas(camera, W, H);

assert.equal(Math.round((viewport.width / viewport.height) * 100), Math.round((W / H) * 100));
assert.ok(viewport.x >= 0);
assert.ok(viewport.y >= 0);
assert.ok(viewport.x + viewport.width <= GALLERY_MAP_SIZE.width);
assert.ok(viewport.y + viewport.height <= GALLERY_MAP_SIZE.height);
assert.ok(viewport.width < GALLERY_MAP_SIZE.width, "camera viewport should crop the full map width");

const targetMap = { mapX: 1223, mapY: 385 };
const targetCanvas = mapToCanvasAligned(targetMap.mapX, targetMap.mapY, W, H, undefined, undefined, camera);
const roundTrip = canvasToMapAligned(targetCanvas.x, targetCanvas.y, W, H, undefined, undefined, camera);
assert.ok(Math.abs(roundTrip.mapX - targetMap.mapX) <= 1);
assert.ok(Math.abs(roundTrip.mapY - targetMap.mapY) <= 1);

const legacyCanvas = mapToCanvasAligned(targetMap.mapX, targetMap.mapY, W, H);
const legacyRoundTrip = canvasToMapAligned(legacyCanvas.x, legacyCanvas.y, W, H);
assert.ok(Math.abs(legacyRoundTrip.mapX - targetMap.mapX) <= 1);
assert.ok(Math.abs(legacyRoundTrip.mapY - targetMap.mapY) <= 1);

const mini = minimapRectForCanvas(W, H);
assert.ok(mini.width > 100);
assert.ok(mini.height > 40);
assert.ok(mini.x + mini.width <= W - 8);
assert.ok(mini.y + mini.height <= H - 8);

const visualScale = cameraVisualScaleForCanvas(camera, W, H);
assert.ok(visualScale > 1, "camera mode should scale world sprites above overview size");
assert.ok(visualScale <= 1.75, "visual scale should stay capped");
assert.equal(
  cameraVisualScaleForCanvas({ ...camera, mode: "overview" }, W, H),
  1,
);

console.log("test-map-camera: ok");
