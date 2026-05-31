import assert from "node:assert/strict";
import {
  LOCATION_LABEL_ANCHORS,
  clampMapPointToLocation,
  isMapPointInsideAnyLocation,
  isMapPointInsideLocation,
  isMapPointNearAnyPortal,
} from "../lib/sprites/navigationBoundary";
import { travelMapPolyline, samplePolylineAt } from "../lib/sprites/corridorPath";
import { playbackCoordAtLocation } from "../lib/sprites/playbackCoords";
import { OBJECT_MAP_ANCHORS } from "../lib/sprites/mapAnchors";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();

for (const loc of ["kitchen", "bar", "lobby", "gallery", "balcony"] as const) {
  assert.ok(LOCATION_LABEL_ANCHORS[loc], `${loc} should have a visible label anchor`);
  assert.ok(
    isMapPointInsideLocation(LOCATION_LABEL_ANCHORS[loc], loc),
    `${loc} label should sit inside its navigation boundary`,
  );
}

const cameraWall = OBJECT_MAP_ANCHORS.hallway_camera;
assert.equal(
  isMapPointInsideLocation(cameraWall, "gallery"),
  false,
  "hallway camera wall mount should not count as gallery walkable floor",
);
const clampedCamera = clampMapPointToLocation(cameraWall, "gallery");
assert.ok(isMapPointInsideLocation(clampedCamera, "gallery"), "clamp should move wall point onto floor");

const runnerBarPrep = playbackCoordAtLocation("runner", "bar", {
  type: "agent_move",
  actor: "runner",
  from: "kitchen",
  to: "bar",
  text: "Runner tampers with the bar wine — poison is ready.",
});
assert.ok(isMapPointInsideLocation(runnerBarPrep, "bar"), "Runner bar prep anchor should be walkable");
assert.ok(
  Math.hypot(runnerBarPrep.mapX - OBJECT_MAP_ANCHORS.wine_glass.mapX, runnerBarPrep.mapY - OBJECT_MAP_ANCHORS.wine_glass.mapY) < 180,
  "Runner bar prep anchor should be near wine service, not a coarse room center",
);

const galleryToBalcony = travelMapPolyline("gallery", "balcony", "target", world.locations);
for (let i = 0; i <= 10; i++) {
  const p = samplePolylineAt(galleryToBalcony, i / 10);
  assert.ok(
    isMapPointInsideAnyLocation(p) || isMapPointNearAnyPortal(p, 80),
    `gallery→balcony sample ${i} should stay on walkable floor or near portal: ${JSON.stringify(p)}`,
  );
}

console.log("test-navigation-boundary: ok");
