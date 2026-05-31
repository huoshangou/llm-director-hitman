/**
 * 连跑 Play UI 契约，抓 flaky。默认 3 轮，PLAY_UI_LOOPS 可改。
 */
import { spawnSync } from "node:child_process";

const loops = Math.max(1, Number(process.env.PLAY_UI_LOOPS ?? "3") || 3);

for (let i = 1; i <= loops; i++) {
  console.log(`\n========== play-turn-spec-ui loop ${i}/${loops} ==========\n`);
  const r = spawnSync("npm", ["run", "test:play-turn-spec-ui"], {
    stdio: "inherit",
    shell: false,
    cwd: process.cwd(),
    env: { ...process.env, PLAY_UI_LOOP_INDEX: String(i) },
  });
  if (r.status !== 0) {
    console.error(`\nloop ${i} failed (exit ${r.status})\n`);
    process.exit(r.status ?? 1);
  }
}

console.log(`\nplay-turn-spec-ui-loop: ${loops} runs ok\n`);
