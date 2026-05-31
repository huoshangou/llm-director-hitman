/**
 * Playwright 共用：起服、同步 bundle、reset、提交指令、读世界态。
 */
import { execSync, spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright";
import { isServerHealthy } from "./port";
import { PORT, homeDevRoot, repoRootFromScript, URL_PLAY } from "./paths";

export const PLAY_URL =
  process.env.PLAY_URL ?? `${URL_PLAY}?brief=0&intro=0`;

export type WorldSnap = {
  turn: number;
  targetLoc: string;
  guardMode: string;
  faceLoc: string;
  runnerLoc: string;
  winePoisoned: boolean;
  wineServed: boolean;
  powerStable: boolean;
  terminal: string;
  planStatus: string;
};

let spawnedServer: ChildProcess | null = null;
let weStartedServer = false;

export function syncPlayBundle(cwd = repoRootFromScript()): void {
  console.log("→ sync:play (含 build:sandbox)");
  execSync("npm run sync:play", { cwd, stdio: "inherit" });
  const home = homeDevRoot();
  if (path.resolve(cwd) !== path.resolve(home) && fs.existsSync(path.join(home, "package.json"))) {
    console.log("→ mirror:home (同步到当前本地 demo 目录)");
    execSync("npm run mirror:home", { cwd, stdio: "inherit" });
  }
}

async function waitServerReady(maxMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isServerHealthy(4000)) return;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Play server not ready on :${PORT} after ${maxMs}ms`);
}

/** 同步 bundle；若 8747 未起则后台 next dev（仅本进程启动的会在 teardown 时结束）。 */
export async function ensurePlayServer(opts: { sync?: boolean } = {}): Promise<void> {
  const root = repoRootFromScript();
  if (opts.sync !== false) syncPlayBundle(root);

  if (await isServerHealthy(4000)) {
    console.log(`✓ Play server :${PORT} ready`);
    return;
  }

  const next = path.join(root, "node_modules", ".bin", "next");
  console.log(`→ starting next dev :${PORT} (headless acceptance)`);
  spawnedServer = spawn(next, ["dev", "--turbopack", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: root,
    stdio: "pipe",
    detached: true,
  });
  spawnedServer.unref();
  weStartedServer = true;
  await waitServerReady();
  console.log(`✓ Play server started`);
}

export async function teardownPlayServer(): Promise<void> {
  if (!weStartedServer || !spawnedServer?.pid) return;
  try {
    process.kill(-spawnedServer.pid, "SIGTERM");
  } catch {
    try {
      spawnedServer.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  spawnedServer = null;
  weStartedServer = false;
  await new Promise((r) => setTimeout(r, 500));
}

export async function snapWorld(page: Page): Promise<WorldSnap> {
  return page.evaluate(() => {
    const w = (window as unknown as { shell?: { playerWorld?: Record<string, unknown> } }).shell
      ?.playerWorld;
    const status = document.getElementById("plan-status")?.textContent ?? "";
    if (!w) {
      return {
        turn: 0,
        targetLoc: "?",
        guardMode: "?",
        faceLoc: "?",
        runnerLoc: "?",
        winePoisoned: false,
        wineServed: false,
        powerStable: true,
        terminal: "?",
        planStatus: status,
      };
    }
    const npcs = w.npcs as Record<string, { location: string; attentionMode: string }>;
    const agents = w.agents as Record<string, { location: string }>;
    const objects = w.objects as Record<string, { state: Record<string, unknown> }>;
    const objective = w.objective as { targetHandled: boolean };
    const terminal =
      typeof (window as unknown as { HitmanCore?: { classifyTerminalState: (w: unknown) => { id: string } } })
        .HitmanCore?.classifyTerminalState === "function"
        ? (
            window as unknown as {
              HitmanCore: { classifyTerminalState: (w: unknown) => { id: string } };
            }
          ).HitmanCore.classifyTerminalState(w).id
        : objective.targetHandled
          ? "handled"
          : "in_progress";
    return {
      turn: (w.turn as number) ?? 0,
      targetLoc: npcs.target?.location ?? "?",
      guardMode: npcs.guard?.attentionMode ?? "?",
      faceLoc: agents.face?.location ?? "?",
      runnerLoc: agents.runner?.location ?? "?",
      winePoisoned: objects.wine_bottle?.state?.poisoned === true,
      wineServed: objects.wine_bottle?.state?.poison_served === true,
      powerStable: objects.power_panel?.state?.powerStable !== false,
      terminal,
      planStatus: status,
    };
  });
}

export async function feedExecLines(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".feed-line")]
      .map((el) => el.textContent ?? "")
      .filter((t) => t.includes("EXEC") || t.includes("执行：")),
  );
}

export async function resetGame(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const shell = (window as unknown as { shell?: { playbackActive?: boolean } }).shell;
    if (shell) shell.playbackActive = false;
    if (typeof (window as unknown as { resetPlayerGame?: () => Promise<void> }).resetPlayerGame === "function") {
      await (window as unknown as { resetPlayerGame: () => Promise<void> }).resetPlayerGame();
    } else {
      document.getElementById("btn-reset-player")?.click();
    }
  });
  await page.waitForFunction(
    () => {
      const t = document.getElementById("plan-status")?.textContent ?? "";
      return (
        t.includes("就绪") ||
        t.includes("可输入") ||
        t.includes("可继续下达") ||
        t.includes("指令已执行") ||
        t.includes("未配 Key")
      );
    },
    { timeout: 60_000 },
  );
  await page.waitForTimeout(400);
}

export async function submitPlan(page: Page, plan: string, waitMs = 55_000): Promise<void> {
  await page.fill("#plan-input", plan);
  await page.click("#btn-submit-plan");
  const start = Date.now();
  while (Date.now() - start < waitMs) {
    const busy = await page.evaluate(() => {
      const shell = (window as unknown as { shell?: { playbackActive?: boolean } }).shell;
      const status = document.getElementById("plan-status")?.textContent ?? "";
      const btn = document.getElementById("btn-submit-plan") as HTMLButtonElement | null;
      const parsing = status.includes("正在解析");
      return {
        playback: shell?.playbackActive === true,
        btnDisabled: btn?.disabled === true,
        parsing,
        status,
      };
    });
    if (!busy.playback && !busy.btnDisabled && !busy.parsing) break;
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(600);
}

export function assertNoClarificationBlock(snap: WorldSnap, label: string): void {
  if (snap.planStatus.includes("追问") || snap.planStatus.includes("未执行")) {
    throw new Error(`${label}: 进入追问/未执行 — ${snap.planStatus}`);
  }
}
