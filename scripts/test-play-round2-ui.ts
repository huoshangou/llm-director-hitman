import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import {
  PLAY_URL,
  ensurePlayServer,
  resetGame,
  snapWorld,
  submitPlan,
  teardownPlayServer,
} from "./lib/play-ui-harness";

const OUT = path.join(process.cwd(), ".logs", "play-round2-ui");

async function waitIdle(page: import("playwright").Page, timeout = 45_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const busy = await page.evaluate(() => {
      const shell = (window as unknown as { shell?: { playbackActive?: boolean } }).shell;
      const btn = document.getElementById("btn-submit-plan") as HTMLButtonElement | null;
      const status = document.getElementById("plan-status")?.textContent ?? "";
      return shell?.playbackActive === true || btn?.disabled === true || status.includes("执行中");
    });
    if (!busy) return;
    await page.waitForTimeout(300);
  }
  throw new Error("play UI did not become idle");
}

async function feedText(page: import("playwright").Page): Promise<string> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".feed-line")]
      .map((el) => el.textContent ?? "")
      .join("\n"),
  );
}

async function primeServedPoisonWindow(page: import("playwright").Page): Promise<void> {
  await page.evaluate(async () => {
    const w = (window as unknown as { shell: { playerWorld: any } }).shell.playerWorld;
    w.objects.wine_bottle.state.poisoned = true;
    w.objects.wine_bottle.state.poison_served = true;
    w.objects.power_panel.state.powerStable = false;
    w.objects.hallway_camera.state.powerMode = "backup";
    w.objects.hallway_camera.state.active = true;
    w.objects.hallway_camera.state.recordingSuppressed = false;
    w.npcs.target.location = "balcony";
    w.agents.face.location = "balcony";
    w.agents.runner.location = "bar";
    if (typeof (window as unknown as { syncPlayerScene?: (id: null) => Promise<void> }).syncPlayerScene === "function") {
      await (window as unknown as { syncPlayerScene: (id: null) => Promise<void> }).syncPlayerScene(null);
    }
  });
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

  await resetGame(page);
  await page.click('.quick-action[data-action-id="send_fake_message"]');
  await waitIdle(page);
  const afterQuick = await snapWorld(page);
  assert.equal(afterQuick.faceLoc, "lobby", "Hacker quick action must not move Face automatically");
  assert.equal(afterQuick.targetLoc, "gallery", "Hacker quick action must not move Victor automatically");
  assert.match(await feedText(page), /等你下令|手机锚点/, "Face should explain that the backing is ready");

  await primeServedPoisonWindow(page);
  await submitPlan(page, "我压制走廊摄像头录像，切断备用供电记录");
  const afterCamera = await snapWorld(page);
  assert.equal(afterCamera.terminal, "in_progress", "Camera suppression must not finish the mission");
  assert.equal(
    await page.locator("#terminal-overlay").evaluate((el) => (el as HTMLElement).hidden),
    true,
    "Terminal modal should stay hidden before explicit final confirmation",
  );
  assert.match(await feedText(page), /确认要我收尾吗/, "Face should ask for final confirmation");

  await submitPlan(page, "确认动手，让他毒发倒下");
  const afterFinal = await snapWorld(page);
  assert.notEqual(afterFinal.terminal, "in_progress", "Explicit final confirmation should resolve the mission");
  assert.equal(
    await page.locator("#terminal-overlay").evaluate((el) => (el as HTMLElement).hidden),
    false,
    "Terminal modal should appear when mission reaches terminal state",
  );

  await page.screenshot({ path: path.join(OUT, "final.png"), fullPage: false });
  await browser.close();
  await teardownPlayServer();

  if (errors.length) {
    throw new Error(`page errors:\n${errors.join("\n")}`);
  }
  console.log(`artifacts: ${OUT}`);
  console.log("test-play-round2-ui: ok");
}

main().catch(async (e) => {
  console.error(e);
  await teardownPlayServer();
  process.exit(1);
});
