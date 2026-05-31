# Play 单条指令执行规格（真源）

status: **active**  
owner: steve  
updated: 2026-05-29  
supersedes: [layers-and-data-flow.md](./layers-and-data-flow.md) 中「一次 Plan 数据流 / step 模式」的**执行语义**（该文仍保留 API 总览）

## 真源优先级（本主题）

```text
1. 本文（play-turn-execution-spec）
2. docs/adr/0015、0017、0019（accepted；与本文冲突时以本文 + 更新 ADR 实现记录为准）
3. docs/08-alignment/changelog.md（实现批次）
4. 代码 + npm run test:play-turn-spec
```

## 一句话

**玩家一条自然语言 = 一个 turn。**  
LLM（主）编译出 `plan.toolChain` → 规则层**多 wave** 执行「链上当前可执行」步（每 actor 每 wave 至多一步）→ 改 WorldState → 表现层播 Feed/Timeline。  
**LLM 不得直接写 WorldState。**

## 三层映射（给人读代码）

| 读代码时说的层 | 目录 / 模块 | 负责 | 不负责 |
|----------------|-------------|------|--------|
| **决策 / 编译** | `lib/director/*`、`lib/intent/*`、`app/api/director` | DirectorPlan、break、stub 降级、augment 补洞 | apply 工具、改 NPC 坐标 |
| **规则 / 执行** | `lib/operation/*`、`lib/tools/*`、`lib/play/runTurn.ts` | precondition、OperationSet、resolveTool、tick | 自然语言理解 |
| **表现** | `sandbox-shell/js/player-plan.js`、`timeline`、`hacker-feed` | Feed、playback、UI 状态 | 业务判定 |

## 端到端数据流

```text
[Play] submitPlayerPlan(planText)
  │
  ├─1─ recognizeIntentOutcome（仅解释；out_of_slice/dirty 可拦）
  │
  ├─2─ POST /api/director → compileDirectorPlan
  │      ├─ (2a) playerPlanLooksLikeContinuation? → buildWorldContinuationChain
  │      │         → 命中则 **优先** 走 stub 链，不等待 LLM
  │      ├─ (2b) directorLlmConfigured? → callDirector (LLM 主路径)
  │      ├─ prepareDirectorPlan（见下「编译后处理」）
  │      ├─ semanticValidatePlan → break? → clarificationOnly
  │      ├─ validateDirectorPlan → executableChain + rejected
  │      └─ executableChain 为空且链非空? → break ALL_BLOCKED
  │      └─ clarificationOnly 且非 UNSUPPORTED_INTENT? → tryStubFallback
  │
  ├─3─ clarificationOnly || !executableChain.length → 电台追问，**不改世界**
  │
  ├─4─ planChain = plan.toolChain（完整链，非仅 executableChain）
  │      opSet = buildOperationSet(planChain, rejected, …, world)  // 7b 预览
  │      Feed: OPERATION /、EXEC /（来自 opSet.actions）
  │
  ├─5─ runTurn(worldBefore, planChain, step, { playerPlan, tickPlayIdle: true })
  │      └─ executeOperationSet(planChain)  // 多 wave，见下
  │
  ├─6─ pushValidationNextToFeed（**runTurn 之后**，用新世界态）
  │
  └─7─ playback + fieldAgentReplies(worldAfter)
```

### 硬契约（实现必须满足）

| ID | 契约 | 代码落点 |
|----|------|----------|
| C1 | 执行输入是 **`plan.toolChain`（planChain）**，不是 `validation.executableChain` 快照 | `player-plan.js` → `runTurn(..., planChain)` |
| C2 | **7b**：`buildOperationSet(chain, …, world)` 每 actor 在**当前 world** 下取链上第一个可执行步 | `buildFrontierOperationSet` |
| C3 | **多 wave**：同一 turn 内，上一步 apply 后 **重新** buildOperationSet，直到无新 action 或 `MAX_TURN_WAVES`（4） | `executeOperationSet.ts` |
| C4 | 同 actor 链上多步 → `conflicts` + Feed `NEXT /`，**不得静默丢弃** | `operationSet.conflicts` |
| C5 | turn 末：`tickWorld`（playIdle）+ 最多 6 次收敛 tick（target 赴阳台） | `executeOperationSet.ts` |
| C6 | LLM 漏整 actor → `augmentParallelActorsFromStub` 从 stub 补**缺失 actor** 的步骤 | `planSanitize.ts` |
| C7 | 叙事「植入了短信/访客」→ 补 `spoof_message`；「混画廊」→ 补 `infiltrate_gallery`；「拿酒」→ `prepare_poisoned_drink` | `planSanitize.ts` |
| C8 | 续接短句（递杯、送去阳台）→ `worldContinuation` **优先于 LLM** | `compileDirector.ts` |
| C9 | LLM 编译失败（非暴力 UNSUPPORTED_INTENT）→ `tryStubFallback` | `compileDirector.ts` |

## 编译后处理顺序（prepareDirectorPlan）

```text
sanitizeUnsupportedFromPlan   // LLM unsupportedParts 按 actor 剔除
→ augmentParallelActorsFromStub
→ augmentPoisonNarrative
→ augmentBarWineIntent
→ augmentGalleryInfiltrate
```

**原则**：augment **补** LLM/stub 漏项，**不替代** LLM 主链；有 Key 时仍以 LLM 为首选。

## 7b + 多 wave 执行语义

### 7b（ADR-0019）

- 输入：完整 `toolChain`（有序，表因果意图）。
- 对每个 actor，在**当前 world** 下，从链中该 actor 的 requests 里选**第一个** precondition 满足的。
- 若同 actor 有多条可执行，用 `pickBestRequestForActor` / `pickExecutableForActor`（玩家文案、 infiltrate 前须 redirect 等）。

### 多 wave（本文扩展 ADR-0015/0019，2026-05-29）

**问题**：turn **开始时** Face 混画廊常因 guard 不可执行；Runner 配电后同一 turn 应解锁。

**行为**：

```text
pending = toolChain
executed = ∅
repeat up to MAX_TURN_WAVES (4):
  opSet = buildOperationSet(pending, world=current)
  if opSet.actions empty: break
  for each action in opSet.actions (sorted: player → runner → face):
    resolveTool → applyToolResult (if not blocked)
    executed.add(actor:toolId)
  pending = pending \ executed
tickWorld + convergence ticks
```

**示例**（玩家：「runner 配电；face 混画廊」）：

| Wave | 可执行 | 结果 |
|------|--------|------|
| 1 | runner: disable_power_panel | guard → kitchen |
| 2 | face: infiltrate_gallery | face → gallery |

同 wave 内多 actor 仍并行（如 player: spoof + runner: power）。

### 应用顺序（确定性）

每个 wave 内 action 应用顺序：

1. `player`
2. `runner`
3. `face`

（与 `buildOperationSet` → `sortActionsForTurn` 一致。）

## 多 turn 与玩家预期

| 玩家以为 | 实际 |
|----------|------|
| 一句指令杀完全程 | 毒酒链 3～4 turn 正常；Feed **NEXT** 提示下一步 |
| 同 actor 连续两步 | 需分 turn 或等链上下一步排到该 actor |
| Runner 递杯 | **递杯由 Face** 执行 `serve_poisoned_drink_on_balcony`；短句「送去阳台」走 worldContinuation |

## Director 三源与优先级

| 来源 | 何时 |
|------|------|
| `worldContinuation` | 续接短句 + 世界态匹配（C8） |
| `llm` | 已配置 Key，且未走 continuation |
| `llm_fallback_stub` | LLM break/空执行后 stub 可救 |
| `stub` | 无 Key |

## 表现层契约

- `OPERATION /` 与 `EXEC /` 来自 **首轮** `buildOperationSet(planChain)` 预览；实际执行结果以 `turn.results` 为准（多 wave 可能多于预览，见 C3）。
- **NEXT** 在 `runTurn` **之后** 生成，避免「还没到阳台」与 Victor 已在阳台矛盾。
- `playerFacingSummary` 仅 debug trace，**不**作为 Feed 承诺。

## 部署契约

改 `lib/` 后发布 Play 必须：

```bash
npm run build:sandbox && npm run sync:play && npm run mirror:home
```

`~/hitman` dev 与仓库不一致时，表现为「代码修了但玩起来仍旧」。

## 验收测试（可执行真源）

```bash
npm run test:play-turn-spec       # lib 契约（无浏览器）
npm run test:play-turn-spec-ui    # Playwright：真 #plan-input → Director → runTurn
npm run test:play-turn-spec-ui:loop  # 默认连跑 3 轮（PLAY_UI_LOOPS 可改）
npm run test:acceptance           # 含上项 + 毒酒/续接单测 + deep-failure-probe
npm run test:play-diagnose        # 壳坐标/tick/点选（不下达指令）
```

`test:play-turn-spec-ui` 会先 `build:sandbox` + `sync:play`；若 `:8747` 未起则自动后台 `next dev`（仅自启进程在结束时回收）。

### Demo 必过场景（人工 + 自动）

1. 无 Key：毒酒句 → prepare + lure → target@balcony；「递杯」→ serve。
2. 有 Key：复合句（配电 + face 混画廊 + 叙事发短信）→ 同 turn 至少 runner + face 有成功 result。
3. 「送去阳台 / 递杯」在 poisoned + balcony 下不进入 clarificationOnly。
4. 重置后无永久 spill 刷屏（保洁完成清 tag）。

## 相关 ADR

- [0015](../adr/0015-parallel-operation-per-command.md) — 每 actor 一步、多 actor 并行  
- [0017](../adr/0017-director-agent-loop-breaks-and-infiltrate-gallery.md) — break、infiltrate  
- [0019](../adr/0019-poison-balcony-executable-frontier.md) — 7b、毒酒链  

## 实现索引

| 主题 | 文件 |
|------|------|
| 编译 | `lib/director/compileDirector.ts` |
| 补链 | `lib/director/planSanitize.ts` |
| 续接 | `lib/director/worldContinuation.ts` |
| stub | `lib/director/planStub.ts` |
| 7b | `lib/operation/buildOperationSet.ts` |
| 多 wave | `lib/operation/executeOperationSet.ts` |
| Play 提交 | `sandbox-shell/js/player-plan.js` |
| Bundle | `lib/bridge/sandboxApi.ts` → `build:sandbox` |
