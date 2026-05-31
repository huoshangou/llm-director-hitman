/**
 * Playwright 多策略探针：模拟玩家自然语言指令，采集 Feed / 世界态 / 截图。
 * 用法：npm run play 已起在 127.0.0.1:8747 时
 *   npx tsx scripts/play-strategy-probe.ts
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Page } from "playwright";

const BASE = process.env.PLAY_URL ?? "http://127.0.0.1:8747/play/index.html?brief=0&intro=0";
const OUT_DIR = path.join(process.cwd(), ".logs", "strategy-probe");

type WorldSnap = {
  turn: number;
  targetLoc: string;
  guardMode: string;
  faceLoc: string;
  runnerLoc: string;
  winePoisoned: boolean;
  wineServed: boolean;
  railTampered: boolean;
  powerStable: boolean;
  terminal: string;
  alert: string;
};

type StepResult = {
  strategy: string;
  plan: string;
  feedTail: string;
  planStatus: string;
  validationHtml: string;
  directorSource?: string;
  executableCount?: number;
  execTools: string[];
  intentBlocked?: boolean;
  world: WorldSnap;
  screenshot: string;
  issues: string[];
};

async function snapWorld(page: Page): Promise<WorldSnap> {
  return page.evaluate(() => {
    const w = (window as unknown as { shell?: { playerWorld?: Record<string, unknown> } }).shell
      ?.playerWorld;
    if (!w) {
      return {
        turn: 0,
        targetLoc: "?",
        guardMode: "?",
        faceLoc: "?",
        runnerLoc: "?",
        winePoisoned: false,
        wineServed: false,
        railTampered: false,
        powerStable: true,
        terminal: "?",
        alert: "?",
      };
    }
    const npcs = w.npcs as Record<string, { location: string; attentionMode: string }>;
    const agents = w.agents as Record<string, { location: string }>;
    const objects = w.objects as Record<string, { state: Record<string, unknown> }>;
    const objective = w.objective as { targetHandled: boolean; style?: string };
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
      railTampered: objects.balcony_rail?.state?.tampered === true,
      powerStable: objects.power_panel?.state?.powerStable !== false,
      terminal,
      alert: (w.alertLevel as string) ?? "?",
    };
  });
}

async function resetGame(page: Page) {
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
        t.includes("指令已执行")
      );
    },
    { timeout: 45_000 },
  );
  await page.waitForTimeout(600);
}

async function submitPlan(page: Page, plan: string, waitMs = 45_000) {
  await page.fill("#plan-input", plan);
  await page.click("#btn-submit-plan");
  const start = Date.now();
  while (Date.now() - start < waitMs) {
    const busy = await page.evaluate(() => {
      const shell = (window as unknown as { shell?: { playbackActive?: boolean } }).shell;
      const status = document.getElementById("plan-status")?.textContent ?? "";
      const btn = document.getElementById("btn-submit-plan") as HTMLButtonElement | null;
      return {
        playback: shell?.playbackActive === true,
        btnDisabled: btn?.disabled === true,
        status,
      };
    });
    if (!busy.playback && !busy.btnDisabled) break;
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(500);
}

async function runStrategy(
  page: Page,
  strategy: string,
  plan: string,
  opts: { fresh?: boolean; expectIntentOnly?: boolean } = {},
): Promise<StepResult> {
  if (opts.fresh) await resetGame(page);

  const before = await snapWorld(page);
  await submitPlan(page, plan);

  const meta = await page.evaluate(() => {
    const feed = document.getElementById("hacker-feed")?.textContent ?? "";
    const status = document.getElementById("plan-status")?.textContent ?? "";
    const validation = document.getElementById("plan-validation")?.innerHTML ?? "";
    const intentOnly =
      validation.includes("INTENT /") &&
      (validation.includes("切片外") || validation.includes("高风险"));
    const execLines = [...document.querySelectorAll(".feed-line")]
      .map((el) => el.textContent ?? "")
      .filter((t) => t.includes("EXEC /") || t.includes("→"));
    return { feed, status, validation, intentOnly, execLines: execLines.slice(-6) };
  });

  const world = await snapWorld(page);
  const shotName = `${strategy.replace(/[^\w\u4e00-\u9fff]+/g, "_").slice(0, 40)}.png`;
  const screenshot = path.join(OUT_DIR, shotName);
  await page.screenshot({ path: screenshot, fullPage: false });

  const issues: string[] = [];

  if (opts.expectIntentOnly && !meta.intentOnly && before.turn === world.turn) {
    issues.push("预期仅 Intent 识别不执行，但 turn 未变且非 INTENT 拦截");
  }
  if (meta.feed.includes("没有毒物链")) {
    issues.push("Feed 仍出现旧文案「没有毒物链」");
  }
  if (plan.includes("下毒") && meta.feed.includes("阳台毒酒") && meta.execLines.length === 0 && !meta.intentOnly) {
    issues.push("识别毒酒链但无 EXEC（可能仅 convertible 未进 Director）");
  }

  return {
    strategy,
    plan,
    feedTail: meta.feed.slice(-1200),
    planStatus: meta.status,
    validationHtml: meta.validation.slice(0, 500),
    execTools: meta.execLines,
    intentBlocked: meta.intentOnly,
    world,
    screenshot,
    issues,
  };
}

/** 在页面内直接 POST director 并执行指定 toolChain（模拟 LLM 编译结果）。 */
async function injectDirectorChain(
  page: Page,
  label: string,
  playerPlan: string,
  toolChain: { toolId: string; actor: string; targets: string[]; intent: string }[],
): Promise<StepResult> {
  await resetGame(page);
  const result = await page.evaluate(
    async ({ playerPlan, toolChain }) => {
      const shell = (window as unknown as { shell: { playerWorld: unknown } }).shell;
      const HitmanCore = (window as unknown as {
        HitmanCore: {
          runTurn: (
            w: unknown,
            chain: unknown[],
            mode: string,
            opts: unknown,
          ) => { world: unknown; results: { request: { toolId: string }; status: string }[] };
          buildOperationSet: (
            chain: unknown[],
            rej: unknown[],
            src: string,
            plan: string,
            world: unknown,
          ) => { actions: { request: { toolId: string; actor: string } }[] };
          classifyTerminalState: (w: unknown) => { id: string };
          operationSetSummaryLine: (op: unknown) => string;
        };
      }).HitmanCore;

      const op = HitmanCore.buildOperationSet(toolChain, [], "llm", playerPlan, shell.playerWorld);
      const execSteps = op.actions.map((a) => a.request);
      const turn = HitmanCore.runTurn(shell.playerWorld, toolChain, "step", {
        playerPlan,
        tickPlayIdle: true,
      });
      shell.playerWorld = turn.world;

      if (typeof (window as unknown as { pushCommandFeed?: (o: unknown) => void }).pushCommandFeed === "function") {
        const push = (window as unknown as { pushCommandFeed: (o: unknown) => void }).pushCommandFeed;
        push({
          speaker: "OPS",
          text: `INJECT / ${HitmanCore.operationSetSummaryLine(op)}`,
          tone: "system",
        });
        for (const step of execSteps) {
          push({ speaker: "EXEC", text: `${step.actor} → ${step.toolId}`, tone: "system" });
        }
      }

      const terminal = HitmanCore.classifyTerminalState(turn.world).id;
      return {
        execTools: turn.results.map((r) => `${r.request.toolId}:${r.status}`),
        opActors: op.actions.map((a) => `${a.request.actor}:${a.request.toolId}`),
        terminal,
      };
    },
    { playerPlan, toolChain },
  );

  await page.waitForTimeout(800);
  const world = await snapWorld(page);
  const screenshot = path.join(OUT_DIR, `inject_${label}.png`);
  await page.screenshot({ path: screenshot });

  const issues: string[] = [];
  if (result.execTools.length < toolChain.length && toolChain.length > 1) {
    issues.push(`注入链 ${toolChain.length} 步，实际 results ${result.execTools.length}`);
  }

  return {
    strategy: `inject:${label}`,
    plan: playerPlan,
    feedTail: JSON.stringify(result),
    planStatus: result.terminal,
    validationHtml: result.opActors.join(" · "),
    execTools: result.execTools,
    world,
    screenshot,
    issues,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const health = await fetch("http://127.0.0.1:8747/play/index.html", { method: "HEAD" }).catch(() => null);
  if (!health?.ok) {
    console.error("dev server not up — run: npm run play");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(
    () => !!(window as unknown as { shell?: { playerWorld?: unknown } }).shell?.playerWorld,
    { timeout: 20_000 },
  );

  const results: StepResult[] = [];

  await resetGame(page);
  const missionFeed = await page.evaluate(() => document.getElementById("hacker-feed")?.textContent ?? "");
  results.push({
    strategy: "boot-mission",
    plan: "(reset)",
    feedTail: missionFeed.slice(0, 800),
    planStatus: "",
    validationHtml: "",
    execTools: [],
    world: await snapWorld(page),
    screenshot: path.join(OUT_DIR, "00_boot.png"),
    issues: missionFeed.includes("MISSION /") && missionFeed.includes("Victor")
      ? []
      : ["重置后 Feed 缺少 MISSION / Victor"],
  });
  await page.screenshot({ path: results[0]!.screenshot });

  const strategies: { name: string; plan: string; fresh?: boolean; expectIntentOnly?: boolean }[] = [
    { name: "poison-intent", plan: "在吧台酒里下毒，等 Victor 上阳台再递杯", fresh: true },
    { name: "poison-prepare", plan: "Runner 去吧台把酒瓶下毒", fresh: true },
    { name: "combo-power-infiltrate", plan: "runner，破坏配电箱，face，等保安离开走廊后混到画廊去", fresh: true },
    { name: "spoof-lure", plan: "伪造短信约 Victor 去阳台，Face 私密邀约", fresh: true },
    { name: "cart-infiltrate", plan: "推清洁车进画廊，服务员伪装混进去清扫", fresh: true },
    { name: "dirty-kill", plan: "在画廊直接干掉 Victor", fresh: true, expectIntentOnly: true },
  ];

  for (const s of strategies) {
    try {
      results.push(await runStrategy(page, s.name, s.plan, { fresh: s.fresh, expectIntentOnly: s.expectIntentOnly }));
    } catch (e) {
      results.push({
        strategy: s.name,
        plan: s.plan,
        feedTail: String(e),
        planStatus: "ERROR",
        validationHtml: "",
        execTools: [],
        world: await snapWorld(page),
        screenshot: "",
        issues: [`探针异常: ${e instanceof Error ? e.message : e}`],
      });
    }
  }

  await resetGame(page);
  await submitPlan(page, "在吧台酒里下毒，等 Victor 上阳台再递杯");
  const poisonT2 = await runStrategy(page, "poison-turn2-serve", "递杯", { fresh: false });
  if (poisonT2.world.targetLoc !== "balcony") {
    poisonT2.issues.push("递杯前 target 应在阳台");
  }
  if (!poisonT2.world.wineServed) {
    poisonT2.issues.push("第二 turn「递杯」后 wineServed 应为 true");
  }
  results.push(poisonT2);

  await browser.close();

  const reportPath = path.join(OUT_DIR, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log("\n=== Play 策略探针报告 ===\n");
  for (const r of results) {
    console.log(`## ${r.strategy}`);
    console.log(`  指令: ${r.plan.slice(0, 60)}${r.plan.length > 60 ? "…" : ""}`);
    console.log(`  状态: ${r.planStatus}`);
    console.log(`  世界: turn=${r.world.turn} target@${r.world.targetLoc} poison=${r.world.winePoisoned} served=${r.world.wineServed} terminal=${r.world.terminal}`);
    if (r.execTools.length) console.log(`  执行: ${r.execTools.join(" | ")}`);
    if (r.issues.length) console.log(`  ⚠ ${r.issues.join("; ")}`);
    const feedHints = r.feedTail.match(/(MISSION|阳台毒酒|OPERATION|EXEC|NEXT|识别|追问|没有毒物)/g);
    if (feedHints?.length) console.log(`  Feed关键词: ${[...new Set(feedHints)].join(", ")}`);
    console.log("");
  }

  const allIssues = results.flatMap((r) => r.issues.map((i) => `[${r.strategy}] ${i}`));
  console.log(`截图与 JSON: ${OUT_DIR}`);
  if (allIssues.length) {
    console.log("\n汇总问题:\n" + allIssues.map((x) => `- ${x}`).join("\n"));
    process.exitCode = 0;
  } else {
    console.log("\n探针未标记自动问题（仍需人工看截图）。");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
