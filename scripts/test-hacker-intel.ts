import assert from "node:assert/strict";
import { collectHackerIntel, pickHackerIntel } from "../lib/hacker/hackerIntel";
import { buildHackerAnalysis } from "../lib/ui/hackerAnalysis";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();
const seen = new Set<string>();

const boot = collectHackerIntel(world, "boot");
assert.ok(boot.length >= 1);

const line = pickHackerIntel(world, "select", seen, { kind: "object", id: "power_panel" });
assert.ok(line?.text.includes("配电"));

const railAnalysis = buildHackerAnalysis(world, { kind: "object", id: "balcony_rail" });
assert.ok(
  railAnalysis.lines.some((l) => l.includes("阻断") || l.includes("可执行")),
  "balcony_rail blocker line",
);

console.log("test-hacker-intel: ok");
