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

  const layout = await page.evaluate(() => ({
    feedTitle: document.querySelector("#hacker-comms h4")?.textContent?.trim() ?? "",
    feedHeight: document.getElementById("hacker-comms")?.getBoundingClientRect().height ?? 0,
    traceInDetails: !!document.querySelector("details#debug-trace #action-log"),
    traceClosed: !(document.querySelector("details#debug-trace") as HTMLDetailsElement | null)
      ?.open,
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
    feedText: document.getElementById("hacker-feed")?.textContent ?? "",
  }));

  assert.ok(layout.feedTitle.includes("COMMAND FEED"), "command feed section title");
  assert.ok(layout.feedHeight >= 180, `feed too short: ${layout.feedHeight}`);
  assert.ok(layout.traceInDetails, "trace must live under debug details");
  assert.equal(layout.traceClosed, true, "debug trace should start collapsed");
  assert.ok(Math.abs(layout.footer - 148) <= 2, "hacker-analysis height must stay 148px");

  await page.fill("#plan-input", "在画廊直接干掉目标");
  await page.click("#btn-submit-plan");
  await page.waitForFunction(
    () =>
      (document.getElementById("hacker-feed")?.textContent ?? "").includes("YOU /") &&
      (document.getElementById("hacker-feed")?.textContent ?? "").includes("直接暴力"),
    { timeout: 15_000 },
  );

  const afterSend = await page.evaluate(() => ({
    feed: document.getElementById("hacker-feed")?.textContent ?? "",
    planValue: (document.getElementById("plan-input") as HTMLTextAreaElement | null)?.value ?? "",
    logVisible: (document.getElementById("log")?.textContent ?? "").length > 0,
  }));

  assert.equal(afterSend.planValue, "", "plan-input clears after send");
  assert.ok(afterSend.feed.includes("YOU /"), "feed must include YOU /");
  assert.ok(afterSend.feed.includes("干掉"), "YOU line must keep player text");
  assert.ok(
    afterSend.feed.includes("OPS /") || afterSend.feed.includes("NEXT /") || afterSend.feed.includes("Face /"),
    "feed must show ops, next, or agent reply",
  );

  await page.evaluate(() => {
    (window as unknown as {
      mapPick?: { selection: { kind: "object"; id: "balcony_rail" } };
      updatePlanContext?: () => void;
    }).mapPick!.selection = { kind: "object", id: "balcony_rail" };
    (window as unknown as { updatePlanContext?: () => void }).updatePlanContext?.();
  });
  await page.fill("#plan-input", "制造阳台事故");
  await page.click("#btn-submit-plan");
  await page.waitForFunction(
    () => (document.getElementById("hacker-feed")?.textContent ?? "").includes("NEXT /"),
    { timeout: 15_000 },
  );
  const blocked = await page.evaluate(() => document.getElementById("hacker-feed")?.textContent ?? "");
  assert.ok(blocked.includes("NEXT /"), "blocked accident must surface NEXT in feed");
  assert.ok(
    blocked.includes("阳台") || blocked.includes("事故") || blocked.includes("栏杆"),
    "NEXT should mention balcony setup",
  );

  const logRes = await page.request.get("http://127.0.0.1:8747/api/play-log?limit=40");
  assert.ok(logRes.ok(), "play-log GET failed");
  const logJson = (await logRes.json()) as { entries?: { text?: string }[] };
  const joined = (logJson.entries ?? []).map((e) => e.text ?? "").join("\n");
  assert.ok(joined.includes("YOU /"), "play-log must include YOU / transcript");
  assert.ok(
    joined.includes("Face /") || joined.includes("Runner /") || joined.includes("Hacker /"),
    "play-log must include agent feed line",
  );

  await browser.close();
  console.log("test-play-command-feed-ui: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
