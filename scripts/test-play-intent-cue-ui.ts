import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL =
  process.env.PLAY_URL ?? "http://127.0.0.1:8747/play/index.html?intro=1&brief=0";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(
    () => !!(window as unknown as { shell?: { playerWorld?: unknown } }).shell?.playerWorld,
    { timeout: 15_000 },
  );

  const buildTag = await page.textContent("#build-tag");
  assert.ok(buildTag?.includes("play-parallel-operation-v1"), "build tag must update");

  await page.fill("#plan-input", "在吧台酒里下毒，等 Victor 上阳台再递杯");
  await page.click("#btn-submit-plan");
  await page.waitForFunction(
    () => (document.getElementById("hacker-feed")?.textContent ?? "").includes("OPS /"),
    { timeout: 15_000 },
  );

  const poisonFeed = await page.evaluate(() => document.getElementById("hacker-feed")?.textContent ?? "");
  assert.ok(
    poisonFeed.includes("阳台毒酒") || poisonFeed.includes("毒酒"),
    "feed must recognize balcony poison chain",
  );
  assert.ok(
    poisonFeed.includes("NEXT /") && poisonFeed.includes("备毒"),
    "feed must suggest poison chain steps",
  );
  assert.ok(poisonFeed.includes("Victor") || poisonFeed.includes("阳台"), "feed must mention balcony mandate");

  await page.fill("#plan-input", "伪造短信约目标去阳台");
  await page.click("#btn-submit-plan");
  await page.waitForFunction(
    () => (document.getElementById("hacker-feed")?.textContent ?? "").includes("EXEC /"),
    { timeout: 20_000 },
  );

  await page.waitForFunction(
    () =>
      (window as unknown as { shell?: { presentationCues?: { effect?: string; type?: string }[] } }).shell
        ?.presentationCues?.some((c) => c.type === "world_fx" && c.effect === "phone_ring") ?? false,
    { timeout: 5_000 },
  );

  const spoofState = await page.evaluate(() => ({
    feed: document.getElementById("hacker-feed")?.textContent ?? "",
    phoneCue:
      (window as unknown as { shell?: { presentationCues?: { effect?: string; type?: string }[] } }).shell
        ?.presentationCues?.some((c) => c.type === "world_fx" && c.effect === "phone_ring") ?? false,
  }));
  assert.ok(spoofState.feed.includes("EXEC /"), "spoof must execute and show EXEC feed");
  assert.ok(spoofState.phoneCue, "canvas cue state must include phone_ring after spoof_message");

  const logRes = await page.request.get("http://127.0.0.1:8747/api/play-log?limit=60");
  assert.ok(logRes.ok(), "play-log GET failed");
  const logJson = (await logRes.json()) as { entries?: { text?: string }[] };
  const joined = (logJson.entries ?? []).map((e) => e.text ?? "").join("\n");
  assert.ok(
    joined.includes("阳台毒酒") || joined.includes("毒酒"),
    "play-log must include poison chain reply",
  );

  await browser.close();
  console.log("test-play-intent-cue-ui: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
