import assert from "node:assert/strict";
import { buildHackerAnalysis } from "../lib/ui/hackerAnalysis";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();

const target = buildHackerAnalysis(world, { kind: "npc", id: "target" });
assert.match(target.title, /Victor/, "target dossier should name Victor");
assert.ok(
  target.lines[0]?.includes("暗杀目标") || target.lines[0]?.includes("任务目标"),
  `first target line should be mission-facing, got: ${target.lines[0]}`,
);
assert.ok(
  target.lines.some((line) => line.includes("目标手机") && line.includes("伪造")),
  `target dossier should explain the phone lure in player terms: ${target.lines.join(" | ")}`,
);
assert.ok(
  !target.lines.slice(0, 2).some((line) => /ATTACK SURFACE|target_phone/.test(line)),
  `technical identifiers should not lead target dossier: ${target.lines.slice(0, 2).join(" | ")}`,
);

const guard = buildHackerAnalysis(world, { kind: "npc", id: "guard" });
assert.ok(
  guard.lines.some((line) => line.includes("阻碍") || line.includes("保安") || line.includes("视线")),
  `guard dossier should explain mission relevance: ${guard.lines.join(" | ")}`,
);

const runner = buildHackerAnalysis(world, { kind: "agent", id: "runner" });
assert.ok(
  runner.lines.some((line) => line.includes("执行员") || line.includes("现场动手")),
  `runner dossier should explain teammate role: ${runner.lines.join(" | ")}`,
);

console.log("test-hacker-analysis-dossier: ok");
