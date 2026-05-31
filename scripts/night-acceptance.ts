/**
 * 明早验收批跑：核心单测 + 引擎深挖探针；Playwright 需 dev 已起。
 */
import { spawnSync } from "node:child_process";

const UNIT = [
  "test:play-turn-spec",
  "test:play-turn-spec-ui",
  "test:play-round2-ui",
  "test:hacker-analysis-dossier",
  "test:hacker-analysis-ui",
  "test:poison-balcony",
  "test:poison-play-idle",
  "test:poison-multi-turn",
  "test:user-log-replay",
  "test:same-turn-power-infiltrate",
  "test:frontier-face-pick",
  "test:plan-stub-cart",
  "test:plan-next-hint",
  "test:mission-frame",
  "test:intent-outcome",
];

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false, cwd: process.cwd() });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("=== night-acceptance: unit tests ===\n");
for (const script of UNIT) {
  console.log(`> npm run ${script}`);
  run("npm", ["run", script]);
}

console.log("\n=== night-acceptance: deep-failure-probe ===\n");
run("npx", ["tsx", "scripts/deep-failure-probe.ts"]);

const health = spawnSync(
  "curl",
  ["-sf", "-o", "/dev/null", "http://127.0.0.1:8747/play/index.html"],
  { stdio: "ignore" },
);
if (health.status === 0) {
  console.log("\n=== night-acceptance: play-strategy-probe (server up) ===\n");
  run("npx", ["tsx", "scripts/play-strategy-probe.ts"]);
} else {
  console.log("\n(skip play-strategy-probe — run `npm run play` then re-run)\n");
}

console.log("\nnight-acceptance: all requested checks passed.\n");
