/**
 * 深挖各策略失败根因：打印 fullChain vs executable vs op vs 世界态。
 */
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { buildOperationSet } from "../lib/operation/buildOperationSet";
import { executeOperationSet } from "../lib/operation/executeOperationSet";
import { planDeferredNextLines } from "../lib/ui/planDeferredHints";
import type { ToolUseRequest } from "../lib/tools/toolTypes";
import { cloneWorld } from "../lib/world/initialWorld";
import { tickWorld } from "../lib/world/tickWorld";

const CASES = [
  "在吧台酒里下毒，等 Victor 上阳台再递杯",
  "推清洁车进画廊，服务员伪装混进去清扫",
  "引开保安，破坏阳台栏杆，把 Victor 诱到阳台制造坠楼事故",
  "吧台备毒，引 Victor 上阳台，递毒酒，让他在阳台倒下",
];

async function probe(name: string, text: string) {
  let w = cloneWorld();
  const c = await compileDirectorPlan({ playerPlan: text, world: w, selection: null, clientLlm: null });
  const full = (c.plan?.toolChain ?? []) as ToolUseRequest[];
  const exe = c.validation?.executableChain ?? [];
  const op = buildOperationSet(full, c.validation?.rejected ?? [], "llm", text, w);
  const nextPre = planDeferredNextLines(w, c.validation ?? null, op);

  console.log(`\n### ${name}`);
  console.log(`  plan: ${full.map((s) => `${s.actor}:${s.toolId}`).join(" → ") || "—"}`);
  console.log(`  executable: ${exe.map((s) => s.toolId).join(" → ") || "—"}`);
  console.log(`  op: ${op.actions.map((a) => `${a.actor}:${a.request.toolId}`).join(" · ") || "—"}`);
  if (nextPre.length) console.log(`  next-pre: ${nextPre.join(" | ")}`);

  if (exe.length) {
    const run = executeOperationSet(w, exe, c.validation?.rejected ?? [], text, true);
    w = run.world;
    const nextPost = planDeferredNextLines(w, c.validation ?? null, op);
    if (nextPost.length) console.log(`  next-post: ${nextPost.join(" | ")}`);
    console.log(
      `  after: target@${w.npcs.target.location} bias=${w.npcs.target.routeBias.balcony ?? 0} poison=${w.objects.wine_bottle.state.poisoned}`,
    );
    for (const r of run.results) {
      if (r.status === "failed" || r.status === "blocked") {
        console.log(`  FAIL: ${r.request.toolId} ${r.status} — ${r.reason ?? ""}`);
      }
    }
  } else {
    console.log(`  FAIL: no executable — ${c.directorBreak?.playerMessage ?? c.message ?? "?"}`);
  }
}

async function main() {
  for (const text of CASES) {
    await probe(text.slice(0, 24), text);
  }
}

main();
