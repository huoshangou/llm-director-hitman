/**
 * Play 单条指令 UI 契约（真源：docs/03-system-design/play-turn-execution-spec.md）
 * 真实路径：#plan-input → POST /api/director → runTurn(planChain)
 *
 * 用法：
 *   npm run test:play-turn-spec-ui
 *   PLAY_UI_LOOPS=5 npm run test:play-turn-spec-ui:loop
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import {
  PLAY_URL,
  assertNoClarificationBlock,
  ensurePlayServer,
  feedExecLines,
  resetGame,
  snapWorld,
  submitPlan,
  teardownPlayServer,
} from "./lib/play-ui-harness";

const OUT = path.join(process.cwd(), ".logs", "play-turn-spec-ui");

const COMPOUND_PLAN =
  "runner，把配电箱破坏掉，然后趁乱去吧台拿酒；face，电闸一拉你就混进画廊，和目标寒暄。我已经给他的手机植入了虚假的访客信息";

type CaseResult = { id: string; ok: boolean; detail?: string };

async function runCases(page: import("playwright").Page): Promise<CaseResult[]> {
  const results: CaseResult[] = [];

  // --- UI-1 毒酒 turn1：阳台 + 备毒 ---
  try {
    await resetGame(page);
    await submitPlan(page, "在吧台酒里下毒，等 Victor 上阳台再递杯");
    const w = await snapWorld(page);
    assertNoClarificationBlock(w, "UI-1");
    assert.ok(w.winePoisoned, "UI-1: wine should be poisoned");
    assert.equal(w.targetLoc, "balcony", `UI-1: target@${w.targetLoc}`);
    const exec = await feedExecLines(page);
    assert.ok(exec.some((l) => /备毒|Prepare|下毒/i.test(l)), `UI-1 exec: ${exec.join(" | ")}`);
    results.push({ id: "UI-1-poison-balcony", ok: true });
  } catch (e) {
    results.push({ id: "UI-1-poison-balcony", ok: false, detail: String(e) });
  }

  // --- UI-2 续接「递杯」：不追问 + served ---
  try {
    await submitPlan(page, "递杯");
    const w = await snapWorld(page);
    assertNoClarificationBlock(w, "UI-2");
    assert.equal(w.targetLoc, "balcony", `UI-2: target@${w.targetLoc}`);
    assert.ok(w.wineServed, "UI-2: poison should be served");
    results.push({ id: "UI-2-serve-cup", ok: true });
  } catch (e) {
    results.push({ id: "UI-2-serve-cup", ok: false, detail: String(e) });
  }

  // --- UI-3 续接长句（log 卡死路径）---
  try {
    await resetGame(page);
    await submitPlan(page, "在吧台酒里下毒，等 Victor 上阳台再递杯");
    await submitPlan(page, "runner，你怎么没跟上，把酒送去阳台啊");
    const w = await snapWorld(page);
    assertNoClarificationBlock(w, "UI-3");
    assert.ok(w.wineServed, "UI-3: serve after continuation phrase");
    results.push({ id: "UI-3-continuation-phrase", ok: true });
  } catch (e) {
    results.push({ id: "UI-3-continuation-phrase", ok: false, detail: String(e) });
  }

  // --- UI-4 同 turn 复合：配电 + 混画廊 + spoof（stub 路径）---
  try {
    await resetGame(page);
    await submitPlan(page, COMPOUND_PLAN, 70_000);
    const w = await snapWorld(page);
    assertNoClarificationBlock(w, "UI-4");
    assert.equal(w.faceLoc, "gallery", `UI-4: face@${w.faceLoc}`);
    assert.ok(!w.powerStable, "UI-4: power panel should be unstable");
    assert.ok(w.winePoisoned, "UI-4: runner prepare poison same turn");
    const exec = (await feedExecLines(page)).join("\n");
    assert.ok(/配电|power|配电箱/i.test(exec) || /disable/i.test(exec), `UI-4 missing power exec: ${exec}`);
    assert.ok(/画廊|infiltrat|混入/i.test(exec), `UI-4 missing infiltrate exec: ${exec}`);
    results.push({ id: "UI-4-compound-same-turn", ok: true });
  } catch (e) {
    results.push({ id: "UI-4-compound-same-turn", ok: false, detail: String(e) });
  }

  // --- UI-5 脏杀：只识别不执行 ---
  try {
    await resetGame(page);
    const before = await snapWorld(page);
    await submitPlan(page, "在画廊直接干掉 Victor");
    const after = await snapWorld(page);
    assert.equal(after.turn, before.turn, "UI-5: turn should not advance");
    assert.ok(
      after.planStatus.includes("高风险") || after.planStatus.includes("切片"),
      `UI-5 status: ${after.planStatus}`,
    );
    results.push({ id: "UI-5-dirty-blocked", ok: true });
  } catch (e) {
    results.push({ id: "UI-5-dirty-blocked", ok: false, detail: String(e) });
  }

  return results;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await ensurePlayServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(PLAY_URL, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(
    () => !!(window as unknown as { shell?: { playerWorld?: unknown } }).shell?.playerWorld,
    { timeout: 25_000 },
  );

  const buildTag = await page.locator("#build-tag-top, #build-tag").first().textContent();
  console.log("build:", buildTag?.trim());

  const results = await runCases(page);
  await page.screenshot({ path: path.join(OUT, "final.png"), fullPage: false });
  await browser.close();
  await teardownPlayServer();

  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ buildTag, results, errors }, null, 2));

  console.log("\n=== test-play-turn-spec-ui ===\n");
  let failed = 0;
  for (const r of results) {
    if (r.ok) console.log(`  ✓ ${r.id}`);
    else {
      failed++;
      console.log(`  ✗ ${r.id}: ${r.detail}`);
    }
  }
  if (errors.length) {
    failed++;
    console.log("\n  page errors:");
    errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log(`\nartifacts: ${OUT}`);
  if (failed) process.exit(1);
  console.log("\ntest-play-turn-spec-ui: ok\n");
}

main().catch(async (e) => {
  console.error(e);
  await teardownPlayServer();
  process.exit(1);
});
