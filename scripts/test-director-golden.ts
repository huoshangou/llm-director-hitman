/**
 * 阶段 1–2：路线金句 + 选中上下文 → 第一步 tool（stub 必过；配 API key 时额外测 LLM）。
 */
import assert from "node:assert/strict";
import { compileDirectorPlan } from "../lib/director/compileDirector";
import { compilePlanFromText } from "../lib/director/planStub";
import { directorLlmConfigured } from "../lib/director/callDirector";
import { ROUTE_GOLDEN_PLANS } from "../lib/director/routeGoldenPlans";
import { cloneWorld } from "../lib/world/initialWorld";

const world = cloneWorld();

for (const c of ROUTE_GOLDEN_PLANS) {
  const sel = c.selection ?? null;
  const stub = compilePlanFromText(c.text, world, sel);
  assert.equal(stub.ok, true, `${c.name} stub compile: ${c.text}`);
  if (stub.ok) {
    assert.equal(stub.chain[0]?.toolId, c.toolId, `${c.name} stub tool`);
    if (c.actor) {
      assert.equal(stub.chain[0]?.actor, c.actor, `${c.name} stub actor`);
    }
    console.log(
      `  [stub] ${c.name} → ${stub.chain[0]?.actor} · ${stub.chain[0]?.toolId} (${stub.chain[0]?.targets.join(", ")})`,
    );
  }
}

console.log(`test-director-golden: stub ok (${ROUTE_GOLDEN_PLANS.length} cases)`);

async function llmPass() {
  if (!directorLlmConfigured()) {
    console.log("test-director-golden: LLM skip (no OPENROUTER_API_KEY / OPENAI_API_KEY)");
    return;
  }

  const sample = ROUTE_GOLDEN_PLANS.filter(
    (c) => c.name.endsWith("_cn") || c.name.startsWith("sel_"),
  );
  let match = 0;
  for (const c of sample) {
    const r = await compileDirectorPlan({
      playerPlan: c.text,
      world,
      selection: c.selection ?? null,
    });
    const got = r.validation?.executableChain[0]?.toolId;
    const ok = got === c.toolId;
    if (ok) match += 1;
    console.log(
      `  [llm] ${c.name} source=${r.source} want=${c.toolId} got=${got ?? "—"} ${ok ? "✓" : "✗"}`,
    );
  }
  console.log(`test-director-golden: LLM ${match}/${sample.length} aligned`);
}

llmPass().catch((err) => {
  console.error(err);
  process.exit(1);
});
