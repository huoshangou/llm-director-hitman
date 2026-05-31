import assert from "node:assert/strict";
import { pointInBalconyRailStrip } from "../lib/ui/mapHitTest";

assert.equal(pointInBalconyRailStrip(1738, 429), true);
assert.equal(pointInBalconyRailStrip(1200, 400), false);
console.log("test-map-hit: ok");
