import assert from "node:assert/strict";
import { canvasToMapAligned, mapToCanvasAligned } from "../lib/sprites/canvasLayout";
import { anchorForObjectId, anchorForEntityId } from "../lib/sprites/mapAnchors";
import { objectMapCoord, npcMapCoord, agentMapCoord } from "../lib/ui/mapCoords";
import { cloneWorld } from "../lib/world/initialWorld";

const W = 1120;
const H = 800;

function main() {
  const world = cloneWorld();

  const cam = objectMapCoord(world, "hallway_camera");
  assert.ok(cam);
  assert.equal(cam.mapX, anchorForObjectId("hallway_camera")!.mapX);

  const runner = agentMapCoord(world, "runner");
  assert.ok(runner);
  assert.equal(runner.mapX, 229);
  assert.equal(runner.mapY, 465);

  const c1 = mapToCanvasAligned(cam.mapX, cam.mapY, W, H);
  const c2 = mapToCanvasAligned(anchorForObjectId("wine_glass")!.mapX, anchorForObjectId("wine_glass")!.mapY, W, H);
  assert.ok(Math.hypot(c1.x - c2.x, c1.y - c2.y) > 80, "camera vs wine_glass should be far apart on canvas");

  const back = canvasToMapAligned(c1.x, c1.y, W, H);
  assert.ok(Math.abs(back.mapX - cam.mapX) <= 1);
  assert.ok(Math.abs(back.mapY - cam.mapY) <= 1);

  console.log("test-map-anchors: ok");
  console.log("  camera canvas", c1);
  console.log("  runner map", runner);
}

main();
