import { chromium } from "playwright";

const URL = process.env.PLAY_URL ?? "http://127.0.0.1:8747/play/index.html";

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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(
    () =>
      !!(window as unknown as { shell?: { playerWorld?: unknown; mapCamera?: unknown } }).shell
        ?.playerWorld,
    { timeout: 15_000 },
  );

  const before = await page.evaluate(() => ({
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
    camera: (window as unknown as { shell?: { mapCamera?: { centerMapX: number; centerMapY: number } } })
      .shell?.mapCamera,
  }));

  await clickPickable(page, "guest_list_terminal");
  await page.waitForTimeout(150);

  const guest = await page.evaluate(() => ({
    selection: (window as unknown as { mapPick?: { selection?: { id: string } } }).mapPick
      ?.selection,
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
  }));

  if (guest.selection?.id !== "guest_list_terminal") {
    console.error("FAIL: expected guest_list_terminal", guest);
    process.exit(1);
  }

  const miniPoint = await page.evaluate(() => {
    const H = (window as unknown as { HitmanCore?: import("./lib/playBrowserCore").PlayBrowserCore })
      .HitmanCore;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!H) throw new Error("missing HitmanCore");
    const rect = canvas.getBoundingClientRect();
    const mini = H.minimapRectForCanvas(canvas.width, canvas.height);
    const mapSize = H.GALLERY_MAP_SIZE;
    const mapX = 329;
    const mapY = 658;
    const x = mini.x + (mapX / mapSize.width) * mini.width;
    const y = mini.y + (mapY / mapSize.height) * mini.height;
    const client = H.bufferToCanvasClient(x, y, rect, canvas.width, canvas.height);
    if (!client) throw new Error("minimap click off letterbox");
    return { x: client.clientX - rect.left, y: client.clientY - rect.top };
  });
  await page.click("#canvas", { position: miniPoint });
  await page.waitForTimeout(150);

  const afterMini = await page.evaluate(() => ({
    selection: (window as unknown as { mapPick?: { selection?: { id: string } } }).mapPick
      ?.selection,
    camera: (window as unknown as { shell?: { mapCamera?: { centerMapX: number; centerMapY: number } } })
      .shell?.mapCamera,
    footer: document.getElementById("hacker-analysis")?.getBoundingClientRect().height ?? 0,
    map: document.getElementById("map-canvas-wrap")?.getBoundingClientRect().height ?? 0,
  }));

  if (afterMini.selection?.id !== "guest_list_terminal") {
    console.error("FAIL: minimap click should not change selection", afterMini.selection);
    process.exit(1);
  }
  if (
    Math.abs((afterMini.camera?.centerMapX ?? 0) - 329) > 40 ||
    Math.abs((afterMini.camera?.centerMapY ?? 0) - 658) > 40
  ) {
    console.error("FAIL: minimap did not recenter near power panel", afterMini.camera);
    process.exit(1);
  }
  if (before.footer !== guest.footer || before.footer !== afterMini.footer) {
    console.error("FAIL: footer height changed", { before, guest, afterMini });
    process.exit(1);
  }
  if (Math.abs(before.map - guest.map) > 2 || Math.abs(before.map - afterMini.map) > 2) {
    console.error("FAIL: map wrap height changed", { before, guest, afterMini });
    process.exit(1);
  }

  await page.evaluate(() => {
    (window as unknown as { resetMapCamera?: () => void }).resetMapCamera?.();
  });
  const edgeBefore = await page.evaluate(() => {
    const rect = document.getElementById("canvas")!.getBoundingClientRect();
    const camera = (window as unknown as { shell?: { mapCamera?: { centerMapX: number } } })
      .shell?.mapCamera;
    return {
      x: rect.left + rect.width - 6,
      y: rect.top + rect.height / 2,
      centerMapX: camera?.centerMapX ?? 0,
    };
  });
  await page.mouse.move(edgeBefore.x, edgeBefore.y);
  await page.waitForTimeout(450);
  const edgeAfter = await page.evaluate(() => ({
    camera: (window as unknown as { shell?: { mapCamera?: { centerMapX: number } } })
      .shell?.mapCamera,
    edgePan: (window as unknown as { shell?: { edgePan?: { x: number; y: number } | null } })
      .shell?.edgePan,
  }));
  if ((edgeAfter.camera?.centerMapX ?? 0) <= edgeBefore.centerMapX + 5) {
    console.error("FAIL: right edge hover did not pan camera", { edgeBefore, edgeAfter });
    process.exit(1);
  }
  if (edgeAfter.edgePan?.x !== 1) {
    console.error("FAIL: right edge hover did not set edgePan", edgeAfter.edgePan);
    process.exit(1);
  }

  console.log("test-play-camera-ui: ok");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
