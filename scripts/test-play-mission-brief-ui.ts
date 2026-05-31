import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.PLAY_URL?.replace(/\?.*$/, "") ?? "http://127.0.0.1:8747/play/index.html";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${BASE}?brief=1`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(
    () => !!(window as unknown as { shell?: { playerWorld?: unknown } }).shell?.playerWorld,
    { timeout: 15_000 },
  );

  const visible = await page.evaluate(() => {
    const overlay = document.getElementById("mission-brief-overlay");
    return {
      hidden: overlay?.hidden ?? true,
      display: overlay ? getComputedStyle(overlay).display : "none",
      title: document.getElementById("mission-brief-title")?.textContent ?? "",
    };
  });
  assert.equal(visible.hidden, false, "overlay should be visible with ?brief=1");
  assert.notEqual(visible.display, "none", "overlay display should not be none");
  assert.ok(visible.title.includes("MISSION BRIEF"), "brief title missing");

  const briefBody = await page.evaluate(() =>
    document.getElementById("mission-brief-body")?.textContent ?? "",
  );
  assert.ok(briefBody.includes("Victor"), "brief must name Victor Vale");
  assert.ok(briefBody.includes("阳台"), "brief must mention balcony");

  await page.click("#btn-mission-brief-start");
  await page.waitForFunction(
    () => document.getElementById("mission-brief-overlay")?.hidden === true,
    { timeout: 5_000 },
  );

  const afterDismiss = await page.evaluate(() => ({
    overlayHidden: document.getElementById("mission-brief-overlay")?.hidden ?? false,
    footerH: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    analysisVar: getComputedStyle(document.documentElement).getPropertyValue("--play-analysis-h").trim(),
  }));
  assert.equal(afterDismiss.overlayHidden, true, "overlay should hide after 开始行动");
  assert.ok(Math.abs(afterDismiss.footerH - 148) <= 1, "hacker-analysis height must stay 148px");
  assert.equal(afterDismiss.analysisVar, "148px", "--play-analysis-h token");

  await page.click("#canvas", { position: { x: 420, y: 260 } });
  await page.fill("#plan-input", "测试指令输入");
  const inputOk = await page.evaluate(() => {
    const input = document.getElementById("plan-input") as HTMLTextAreaElement | null;
    return {
      value: input?.value ?? "",
      disabled: input?.disabled ?? true,
    };
  });
  assert.equal(inputOk.disabled, false, "plan-input must accept typing after brief dismiss");
  assert.equal(inputOk.value, "测试指令输入");

  await browser.close();
  console.log("test-play-mission-brief-ui: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
