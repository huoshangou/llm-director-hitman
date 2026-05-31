/**
 * 本地 Director（stub）+ 确定性执行探针，不依赖浏览器。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { buildOperationSet } from "../lib/operation/buildOperationSet";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { recognizeIntentOutcome } from "../lib/intent/recognizeIntentOutcome";
import { classifyTerminalState } from "../lib/convergence/terminalState";
import { cloneWorld } from "../lib/world/initialWorld";
import type { WorldState } from "../lib/world/worldTypes";

const PLANS = [
  { name: "poison-intent", text: "在吧台酒里下毒，等 Victor 上阳台再递杯" },
  { name: "poison-prepare", text: "Runner 去吧台把酒瓶下毒" },
  { name: "combo-power-infiltrate", text: "runner，破坏配电箱，face，等保安离开走廊后混到画廊去" },
  { name: "spoof-lure", text: "伪造短信约 Victor 去阳台，Face 私密邀约" },
  { name: "dirty-kill", text: "在画廊直接干掉 Victor" },
  { name: "poison-oneshot", text: "吧台备毒，引 Victor 上阳台，递毒酒，让他在阳台倒下" },
  { name: "cart-disguise", text: "推清洁车进画廊，服务员伪装混进去清扫" },
  { name: "rail-accident", text: "引开保安，破坏阳台栏杆，把 Victor 诱到阳台制造坠楼事故" },
  { name: "serve-before-prep", text: "Face 在阳台给 Victor 递毒酒" },
];

type Row = {
  name: string;
  intent: string | null;
  directorSource: string;
  ok: boolean;
  chain: string[];
  opSet: string[];
  results: string[];
  terminal: string;
  targetLoc: string;
  wine: string;
  issues: string[];
};

async function runOne(name: string, text: string, world: WorldState): Promise<{ row: Row; world: WorldState }> {
  const issues: string[] = [];
  const intent = recognizeIntentOutcome(text, world, null);
  const intentLabel = intent ? `${intent.status}:${intent.summary.slice(0, 40)}` : null;

  if (intent?.status === "dirty" || intent?.status === "out_of_slice") {
    return {
      row: {
        name,
        intent: intentLabel,
        directorSource: "—",
        ok: false,
        chain: [],
        opSet: [],
        results: [],
        terminal: classifyTerminalState(world).id,
        targetLoc: world.npcs.target.location,
        wine: wineLabel(world),
        issues: intent.status === "dirty" ? ["dirty 拦截，未进 Director"] : ["out_of_slice 拦截"],
      },
      world,
    };
  }

  const compiled = await compileDirectorPlan({ playerPlan: text, world, selection: null, clientLlm: null });
  const chain = compiled.validation?.executableChain ?? [];
  const chainIds = chain.map((s) => `${s.actor}:${s.toolId}`);

  if (!compiled.ok && !compiled.clarificationOnly) {
    issues.push(`Director 失败: ${compiled.message ?? compiled.directorBreak?.playerMessage ?? "?"}`);
  }
  if (compiled.clarificationOnly || chain.length === 0) {
    issues.push("无可执行链（clarification/break）");
    return {
      row: {
        name,
        intent: intentLabel,
        directorSource: compiled.source,
        ok: compiled.ok,
        chain: chainIds,
        opSet: [],
        results: [],
        terminal: classifyTerminalState(world).id,
        targetLoc: world.npcs.target.location,
        wine: wineLabel(world),
        issues,
      },
      world,
    };
  }

  const op = buildOperationSet(chain, compiled.validation?.rejected ?? [], "llm", text, world);
  const opIds = op.actions.map((a) => `${a.actor}:${a.request.toolId}`);

  if (text.includes("下毒") && !chainIds.some((id) => id.includes("poison"))) {
    issues.push("玩家提到毒酒但 Director 链无 poison tool");
  }
  if (text.includes("配电") && text.includes("画廊") && opIds.length < 2) {
    issues.push("组合指令期望双 EXEC，OperationSet 仅一步");
  }

  const exec = executeOperationSet(world, chain, compiled.validation?.rejected ?? [], text, true);
  const resultIds = exec.results.map((r) => `${r.request.toolId}:${r.status}`);
  const terminal = classifyTerminalState(exec.world).id;

  if (exec.results.some((r) => r.status === "blocked")) {
    issues.push("有 blocked tool（链上选了但 resolver 阻断）");
  }

  return {
    row: {
      name,
      intent: intentLabel,
      directorSource: compiled.source,
      ok: compiled.ok,
      chain: chainIds,
      opSet: opIds,
      results: resultIds,
      terminal,
      targetLoc: exec.world.npcs.target.location,
      wine: wineLabel(exec.world),
      issues,
    },
    world: exec.world,
  };
}

function wineLabel(w: WorldState) {
  const b = w.objects.wine_bottle.state;
  return `p=${b.poisoned === true} s=${b.poison_served === true}`;
}

async function main() {
  let world = cloneWorld();
  const rows: Row[] = [];

  for (const p of PLANS) {
    world = cloneWorld();
    const { row, world: w2 } = await runOne(p.name, p.text, world);
    rows.push(row);
    void w2;
  }

  const idealChain = [
    { toolId: "prepare_poisoned_drink" as const, actor: "runner" as const, targets: ["wine_bottle"], intent: "p" },
    { toolId: "lure_with_private_meeting" as const, actor: "face" as const, targets: ["target"], intent: "l" },
    { toolId: "serve_poisoned_drink_on_balcony" as const, actor: "face" as const, targets: ["target", "wine_bottle"], intent: "s" },
    { toolId: "resolve_poison_on_balcony" as const, actor: "face" as const, targets: ["target"], intent: "r" },
  ];

  let wIdeal = cloneWorld();
  const turns: string[] = [];
  for (let i = 0; i < idealChain.length; i++) {
    const step = idealChain[i]!;
    const exec = executeOperationSet(wIdeal, [step], [], "ideal", true);
    wIdeal = exec.world;
    turns.push(`T${i + 1} ${step.toolId}:${exec.results[0]?.status} target@${wIdeal.npcs.target.location}`);
  }
  const idealTerminal = classifyTerminalState(wIdeal).id;

  const outDir = path.join(process.cwd(), ".logs", "strategy-probe");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "director-report.json"), JSON.stringify({ rows, idealTurns: turns, idealTerminal }, null, 2));

  console.log("\n=== Director stub 策略探针 ===\n");
  for (const r of rows) {
    console.log(`## ${r.name} (${r.directorSource})`);
    if (r.intent) console.log(`  Intent: ${r.intent}`);
    console.log(`  chain: ${r.chain.join(" → ") || "—"}`);
    console.log(`  op:    ${r.opSet.join(" · ") || "—"}`);
    console.log(`  exec:  ${r.results.join(" · ") || "—"}`);
    console.log(`  after: target@${r.targetLoc} ${r.wine} terminal=${r.terminal}`);
    if (r.issues.length) console.log(`  ⚠ ${r.issues.join("; ")}`);
    console.log("");
  }
  console.log("理想毒酒多 turn:", turns.join(" | "));
  console.log("理想终态:", idealTerminal);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
