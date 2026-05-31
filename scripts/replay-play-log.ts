/**
 * 解析 ~/hitman/.logs/play-session.log，输出卡死 turn 摘要。
 * 用法：npx tsx scripts/replay-play-log.ts [logPath]
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const logPath =
  process.argv[2] ??
  path.join(os.homedir(), "hitman", ".logs", "play-session.log");

if (!fs.existsSync(logPath)) {
  console.error(`log not found: ${logPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, "utf8").split("\n");

type Turn = { you?: string; exec: string[]; next: string[]; director: string[]; issues: string[] };

let current: Turn | null = null;
const turns: Turn[] = [];

for (const line of lines) {
  const m = line.match(/^\[([^\]]+)\] \[(\w+)\] (.*)$/);
  if (!m) continue;
  const [, , kind, body] = m;

  if (body.startsWith("YOU / ")) {
    if (current) turns.push(current);
    current = { exec: [], next: [], director: [], issues: [] };
    current.you = body.replace(/^YOU \/ /, "").trim();
    continue;
  }
  if (!current) continue;

  if (kind === "feed" && body.startsWith("EXEC /")) current.exec.push(body);
  if (kind === "feed" && body.startsWith("NEXT /")) current.next.push(body);
  if (kind === "director") current.director.push(body);
  if (body.includes("指令未执行")) current.issues.push(body);
  if (kind === "tool" && body.includes("blocked")) current.issues.push(body);
}
if (current) turns.push(current);

const stuck = turns.filter((t) => t.issues.length > 0 || t.director.some((d) => d.includes("未执行")));

console.log(`\n=== play log 分析: ${logPath} ===\n`);
console.log(`总指令 turn: ${turns.length} · 未执行/阻断: ${stuck.length}\n`);

for (const t of stuck.slice(-8)) {
  console.log(`YOU: ${t.you?.slice(0, 80) ?? "?"}`);
  if (t.exec.length) console.log(`  EXEC: ${t.exec.join(" | ")}`);
  if (t.next.length) console.log(`  NEXT: ${t.next.slice(0, 3).join(" | ")}`);
  if (t.issues.length) console.log(`  ⚠ ${t.issues.join(" | ")}`);
  console.log("");
}

const poison = turns.filter((t) => t.you?.includes("毒") || t.you?.includes("递杯") || t.you?.includes("阳台"));
console.log(`毒酒相关 turn: ${poison.length}`);
for (const t of poison.slice(-5)) {
  console.log(`  - ${t.you?.slice(0, 60)} → ${t.exec.length ? "EXEC" : t.issues.length ? "STUCK" : "?"}`);
}
