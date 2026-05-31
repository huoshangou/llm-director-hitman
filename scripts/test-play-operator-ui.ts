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

  const before = await page.evaluate(() => ({
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
    feedText: document.getElementById("hacker-feed")?.textContent ?? "",
    bodyBg: getComputedStyle(document.body).backgroundImage,
    wrapPointerBefore: getComputedStyle(
      document.getElementById("map-canvas-wrap")!,
      "::before",
    ).pointerEvents,
  }));

  assert.ok(before.feedText.includes("Face /"), "opening Face radio missing");
  assert.ok(before.feedText.includes("Runner /"), "opening Runner radio missing");
  assert.ok(before.feedText.includes("指令"), "opening radio must teach command input");
  assert.ok(!before.feedText.includes("plan"), "opening radio should avoid plan wording");
  assert.equal(before.wrapPointerBefore, "none", "map overlay must not block clicks");
  assert.ok(before.bodyBg.includes("gradient"), "operator skin background not applied");

  await page.click("#canvas", { position: { x: 420, y: 260 } });
  await page.waitForTimeout(250);

  const after = await page.evaluate(() => ({
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
    textareaDisabled: (document.querySelector("textarea") as HTMLTextAreaElement | null)
      ?.disabled ?? true,
  }));

  assert.ok(Math.abs(before.footer - after.footer) <= 1, "footer height changed after click");
  assert.ok(Math.abs(before.map - after.map) <= 2, "map height changed after click");
  assert.equal(after.textareaDisabled, false, "intro must not block plan input");

  await page.evaluate(() => {
    (window as unknown as {
      mapPick?: { selection: { kind: "object"; id: "guest_list_terminal" } };
      updatePlanContext?: () => void;
    }).mapPick!.selection = { kind: "object", id: "guest_list_terminal" };
    (window as unknown as { updatePlanContext?: () => void }).updatePlanContext?.();
  });
  await page.fill("#plan-input", "处理这个");
  await page.click("#btn-submit-plan");
  await page.waitForFunction(
    () => (document.getElementById("plan-validation")?.textContent ?? "").includes("modify_guest_list"),
    { timeout: 15_000 },
  );
  const validation = await page.evaluate(() => ({
    text: document.getElementById("plan-validation")?.textContent ?? "",
    status: document.getElementById("plan-status")?.textContent ?? "",
    feed: document.getElementById("hacker-feed")?.textContent ?? "",
    planValue: (document.getElementById("plan-input") as HTMLTextAreaElement | null)?.value ?? "",
    submitLabel: document.getElementById("btn-submit-plan")?.textContent?.trim() ?? "",
    planHeading: document.querySelector("#player-plan h4")?.textContent?.trim() ?? "",
    feedTitle: document.querySelector("#hacker-comms h4")?.textContent?.trim() ?? "",
  }));
  assert.equal(validation.planValue, "", "plan-input must clear after send");
  assert.ok(validation.feed.includes("YOU /"), "field comms must include YOU / transcript");
  assert.ok(validation.feed.includes("处理这个"), "YOU transcript must include player command");
  assert.equal(validation.submitLabel, "发送指令", "submit button copy");
  assert.equal(validation.planHeading, "输入指令", "plan section heading");
  assert.ok(validation.text.includes("executable 1"), "validation summary missing executable count");
  assert.ok(validation.text.includes("modify_guest_list"), "selected context did not compile to terminal tool");
  assert.ok(!validation.status.includes("追问"), "selected context should execute without clarification");
  assert.ok(
    validation.feed.includes("Hacker /") || validation.feed.includes("EXEC /"),
    "feed must show hacker reply or EXEC after execution",
  );
  assert.ok(validation.feedTitle.includes("COMMAND FEED"), "command feed section title");
  assert.ok(!/resolver|validation|tool/i.test(validation.feed), "field agent reply leaked implementation terms");

  await browser.close();
  console.log("test-play-operator-ui: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
