/**
 * Play shell 诊断：坐标、环境 tick、点选。
 * 用法: npx playwright install chromium 2>/dev/null; npx tsx scripts/play-diagnose.ts
 */
import { chromium } from "playwright";

const URL = process.env.PLAY_URL ?? "http://127.0.0.1:8747/play/index.html";

type Sample = {
  t: number;
  locations: Record<string, string>;
  coords: Record<string, { mapX: number; mapY: number } | null>;
  canvas: { cw: number; ch: number; rw: number; rh: number; objectFit: string };
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForFunction(
    () =>
      !!(window as unknown as { shell?: { playerWorld?: unknown } }).shell?.playerWorld,
    { timeout: 15_000 },
  );

  const buildTag = await page.locator("#build-tag-top, #build-tag").first().textContent();
  console.log("build:", buildTag?.trim());

  const sampleAt = async (ms: number): Promise<Sample> => {
    if (ms > 0) await page.waitForTimeout(ms);
    return page.evaluate((elapsed) => {
      const w = (
        window as unknown as { shell?: { playerWorld?: unknown } }
      ).shell?.playerWorld as
        | {
            npcs: Record<string, { location: string }>;
            agents: Record<string, { location: string }>;
          }
        | undefined;
      const H = (window as unknown as { HitmanCore?: typeof import("../lib/bridge/sandboxApi") })
        .HitmanCore;
      const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
      const rect = canvas?.getBoundingClientRect();
      const cs = canvas ? getComputedStyle(canvas) : null;
      const ids = ["target", "guard", "waiter", "guest", "face", "runner"];
      const locations: Record<string, string> = {};
      const coords: Record<string, { mapX: number; mapY: number } | null> = {};
      for (const id of ids) {
        if (!w) {
          locations[id] = "?";
          coords[id] = null;
          continue;
        }
        if (id === "face" || id === "runner") {
          locations[id] = w.agents[id]?.location ?? "?";
          coords[id] = H?.agentMapCoord?.(w as never, id as never) ?? null;
        } else {
          locations[id] = w.npcs[id]?.location ?? "?";
          coords[id] = H?.npcMapCoord?.(w as never, id as never) ?? null;
        }
      }
      return {
        t: elapsed,
        locations,
        coords,
        canvas: {
          cw: canvas?.width ?? 0,
          ch: canvas?.height ?? 0,
          rw: rect?.width ?? 0,
          rh: rect?.height ?? 0,
          objectFit: cs?.objectFit ?? "",
        },
      };
    }, ms);
  };

  const s0 = await sampleAt(0);
  const s400 = await sampleAt(400);
  const s2500 = await sampleAt(2100);
  const s5000 = await sampleAt(2500);

  console.log("\n--- locations / coords ---");
  for (const s of [s0, s400, s2500, s5000]) {
    console.log(`\n@${s.t}ms canvas ${s.canvas.cw}x${s.canvas.ch} display ${s.canvas.rw.toFixed(0)}x${s.canvas.rh.toFixed(0)} object-fit=${s.canvas.objectFit}`);
    console.log("  locations:", s.locations);
    const moved = Object.keys(s0.locations).filter(
      (k) => s0.locations[k] !== s.locations[k],
    );
    if (moved.length) console.log("  moved since t0:", moved);
    for (const id of ["target", "guard", "guest_list_terminal"]) {
      const c0 = s0.coords[id as keyof typeof s0.coords];
      const c = s.coords[id as keyof typeof s.coords];
      if (c0 && c && (c0.mapX !== c.mapX || c0.mapY !== c.mapY)) {
        console.log(`  coord drift ${id}: ${c0.mapX},${c0.mapY} -> ${c.mapX},${c.mapY}`);
      }
    }
  }

  const pickTest = await page.evaluate(() => {
    const H = (window as unknown as { HitmanCore?: Record<string, unknown> }).HitmanCore;
    const w = (window as unknown as { shell?: { playerWorld?: unknown } }).shell
      ?.playerWorld;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!H || !w || !canvas) return { ok: false, reason: "missing shell/core/canvas" };

    const pickCoord = H.objectPickCoord as
      | ((world: unknown, id: string) => { mapX: number; mapY: number } | null)
      | undefined;
    const terminal = pickCoord?.(w, "guest_list_terminal") ?? null;
    if (!terminal) return { ok: false, reason: "no terminal coord" };

    const W = 1120;
    const Hc = 800;
    const mapToCanvas = H.mapToCanvasAligned as
      | ((mx: number, my: number, cw: number, ch: number) => { x: number; y: number })
      | undefined;
    const c = mapToCanvas?.(terminal.mapX, terminal.mapY, W, Hc);
    if (!c) return { ok: false, reason: "no mapToCanvasAligned" };

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = Hc / rect.height;
    const bufX = c.x;
    const bufY = c.y;
    const clientX = rect.left + (bufX / W) * rect.width;
    const clientY = rect.top + (bufY / Hc) * rect.height;

    const backScaleX = (clientX - rect.left) * scaleX;
    const backScaleY = (clientY - rect.top) * scaleY;
    const canvasToMap = H.canvasToMapAligned as
      | ((cx: number, cy: number, cw: number, ch: number) => { mapX: number; mapY: number })
      | undefined;
    const map = canvasToMap?.(backScaleX, backScaleY, W, Hc);

    const pickablesFromWorld = H.mapPickablesFromWorld as
      | ((world: unknown) => { id: string; kind: string }[])
      | undefined;
    const pickables = pickablesFromWorld?.(w) ?? [];
    const pickDistance = H.pickDistanceMap as
      | ((
          mx: number,
          my: number,
          kind: string,
          id: string,
          ax: number,
          ay: number,
        ) => number)
      | undefined;
    let bestId: string | null = null;
    let bestD = Infinity;
    for (const p of pickables) {
      const d = pickDistance?.(
        map?.mapX ?? 0,
        map?.mapY ?? 0,
        p.kind,
        p.id,
        terminal.mapX,
        terminal.mapY,
      );
      if (typeof d === "number" && d < bestD) {
        bestD = d;
        bestId = p.id;
      }
    }

    return {
      ok: bestId === "guest_list_terminal",
      terminal,
      canvasBuf: { x: bufX, y: bufY },
      roundTrip: map,
      bestId,
      bestD,
      rect: { w: rect.width, h: rect.height },
    };
  });

  console.log("\n--- pick round-trip (terminal center) ---");
  console.log(JSON.stringify(pickTest, null, 2));

  if (errors.length) {
    console.log("\n--- page errors ---");
    errors.forEach((e) => console.log(" ", e));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
