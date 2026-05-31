import { chromium } from "playwright";
import { ensurePlayServer, PLAY_URL, teardownPlayServer } from "./lib/play-ui-harness";

const URL = PLAY_URL;

async function clickPickable(page: import("playwright").Page, pickId: string) {
  const point = await page.evaluate((id) => {
    const w = (window as unknown as { shell?: { playerWorld?: unknown; mapCamera?: unknown } })
      .shell?.playerWorld;
    const H = (window as unknown as { HitmanCore?: import("./lib/playBrowserCore").PlayBrowserCore })
      .HitmanCore;
    const shell = (window as unknown as { shell?: { mapCamera?: unknown } }).shell;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
    if (!H || !w || !canvas) throw new Error("missing shell/core/canvas");
    const pickables = H.mapPickablesFromWorld(w);
    const pick = pickables.find((p) => p.id === id);
    if (!pick) throw new Error(`missing pickable ${id}`);
    let coord: { mapX: number; mapY: number } | null = null;
    if (pick.kind === "object") coord = H.objectPickCoord(w, pick.id);
    if (pick.kind === "npc") coord = H.npcMapCoord(w, pick.id);
    if (pick.kind === "agent") coord = H.agentMapCoord(w, pick.id);
    if (!coord) throw new Error(`missing coord for ${id}`);
    const c = H.mapToCanvasAligned(
      coord.mapX,
      coord.mapY,
      canvas.width,
      canvas.height,
      undefined,
      undefined,
      shell?.mapCamera,
    );
    const rect = canvas.getBoundingClientRect();
    const client = H.bufferToCanvasClient(c.x, c.y, rect, canvas.width, canvas.height);
    if (!client) throw new Error("pick off canvas letterbox");
    return { x: client.clientX - rect.left, y: client.clientY - rect.top };
  }, pickId);
  await page.click("#canvas", { position: point });
}

async function main() {
  await ensurePlayServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(
    () => !!(window as unknown as { shell?: { playerWorld?: unknown } }).shell?.playerWorld,
    { timeout: 15_000 },
  );

  const layout = await page.evaluate(() => {
    const footer = document.getElementById("hacker-analysis");
    const body = document.getElementById("hacker-analysis-body");
    const fr = footer?.getBoundingClientRect();
    const br = body?.getBoundingClientRect();
    return {
      build: document.getElementById("build-tag-top")?.textContent?.trim(),
      footerH: fr?.height ?? 0,
      bodyH: br?.height ?? 0,
      bodyLen: body?.innerHTML?.length ?? 0,
      hasFn: typeof (window as unknown as { HitmanCore?: { buildHackerAnalysis?: unknown } })
        .HitmanCore?.buildHackerAnalysis === "function",
    };
  });
  console.log("layout idle:", layout);

  const sizes0 = await page.evaluate(() => ({
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
  }));

  await clickPickable(page, "guest_list_terminal");
  await page.waitForTimeout(300);

  const clicked = await page.evaluate(() => {
    const mp = (window as unknown as { mapPick?: { selection?: unknown } }).mapPick;
    const body = document.getElementById("hacker-analysis-body");
    return {
      selection: mp?.selection ?? null,
      bodyLen: body?.innerHTML?.length ?? 0,
      bodyText: body?.innerText?.slice(0, 120) ?? "",
      bodyH: body?.getBoundingClientRect().height ?? 0,
    };
  });
  if (
    (clicked.selection as { id?: string } | null)?.id !== "guest_list_terminal"
  ) {
    console.error("FAIL: expected guest_list_terminal selection", clicked.selection);
    process.exit(1);
  }
  const planContext = await page.evaluate(() => ({
    text: document.getElementById("plan-context")?.textContent ?? "",
  }));
  if (!planContext.text.includes("宾客终端")) {
    console.error("FAIL: selected map ref missing in plan context", planContext);
    process.exit(1);
  }
  console.log("after click:", clicked);

  const sizes1 = await page.evaluate(() => ({
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
  }));
  console.log("layout sizes:", { before: sizes0, afterClick: sizes1 });
  if (Math.abs(sizes0.footer - sizes1.footer) > 1) {
    console.error("FAIL: footer height changed after click", sizes0.footer, sizes1.footer);
    process.exit(1);
  }
  if (Math.abs(sizes0.map - sizes1.map) > 2) {
    console.error("FAIL: map area height changed after click", sizes0.map, sizes1.map);
    process.exit(1);
  }

  if (!layout.hasFn) {
    console.error("FAIL: buildHackerAnalysis missing");
    process.exit(1);
  }
  if (layout.bodyLen < 20) {
    console.error("FAIL: idle body empty (world not rendered?)");
    process.exit(1);
  }
  if (clicked.bodyLen < 20) {
    console.error("FAIL: click body still empty");
    process.exit(1);
  }

  await clickPickable(page, "target");
  await page.waitForTimeout(300);
  const targetClicked = await page.evaluate(() => {
    const mp = (window as unknown as { mapPick?: { selection?: unknown } }).mapPick;
    const body = document.getElementById("hacker-analysis-body");
    return {
      selection: mp?.selection ?? null,
      bodyText: body?.innerText ?? "",
    };
  });
  if ((targetClicked.selection as { id?: string } | null)?.id !== "target") {
    console.error("FAIL: expected target selection", targetClicked.selection);
    process.exit(1);
  }
  if (
    !targetClicked.bodyText.includes("任务目标") ||
    !targetClicked.bodyText.includes("目标手机") ||
    !targetClicked.bodyText.includes("伪造")
  ) {
    console.error("FAIL: target analysis missing player-facing target dossier", targetClicked.bodyText.slice(0, 220));
    process.exit(1);
  }

  await browser.close();
  await teardownPlayServer();
  console.log("test-hacker-analysis-ui: ok");
}

main().catch(async (e) => {
  console.error(e);
  await teardownPlayServer();
  process.exit(1);
});
