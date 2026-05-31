# Director Agent 雏形：工具循环、统一 Break、复合 infiltrate

status: accepted  
source: grill 2026-05-28（Steve Q1–Q4）

## 背景

Play 已接 LLM Director，但实现仍是 **单次 JSON 编译 + 弱校验**：

- 玩家说「混进画廊」时，LLM 常选 `redirect_guard_attention` / `create_complaint` → **Face 不换区**，仅气泡/注意力，体验像「顾左右言他」。
- `feasibility: impossible` 与 `unsupportedParts` **不阻断**执行；LLM 仍可能选无关 tool（例：杀保安 → 再 `disable_power_panel`）。
- Prompt 仅有 world snapshot + 短规则，**无** precondition / 工具副作用的结构化约束表。

产品方向：**LLM Director over Deterministic Sandbox** 不变；LLM 角色从「偶尔胡编的编译器」升级为 **带统一 break 出口的 agent 雏形**——仍禁止写 WorldState，胜负仍由确定性层判定。

## 决策

### 1. 角色边界（延续 ADR-0009 / 0014）

| 层 | 职责 |
|----|------|
| **Director Agent（LLM）** | 读玩家话 + 约束表 + world 摘要 + **上轮 break**；产出 `toolChain` 或 **空链 + break 叙事**；最多 **1 次** 受控重规划（见 §3） |
| **Semantic Validator（代码）** | 玩家子句 ↔ 允许 tool 映射；依赖检查；**强制 break**，禁止「随便找个 tool 交差」 |
| **Simulator（代码）** | `validateToolChain` → `resolveTool` → `tickWorld` → `classifyTerminalState` |

LLM **不是**终态裁判；LLM **可以**在 break 路径上生成 **失败叙事**（电台 / feed），不得伪造 `success` 或改 location。

### 2. 统一 Break 出口（本 turn 不推进世界，或仅播失败演出）

所有 break 使用同一类型 `DirectorBreak`（实现放 `lib/director/directorBreak.ts`）：

| `code` | 含义 | 典型触发 |
|--------|------|----------|
| `NO_TOOL_MATCH` | 无法从 manifest 编译任何合法 tool | stub/LLM 皆空 |
| `ALL_BLOCKED` | 有 tool 但 precondition 全失败 | proximity、alert |
| `SEMANTIC_MISMATCH` | 玩家明确要求 X（如进画廊），选中 tool 不产生 X | redirect 代替 infiltrate |
| `DEPENDENCY_UNMET` | 复合 tool 内依赖未满足 | guard 未引开 |
| `UNSUPPORTED_INTENT` | 意图无 tool（杀保安、无武器） | manifest 无 assault |
| `CLARIFICATION_NEEDED` | 信息不足 | 空 plan + 无 selection |
| `EXECUTION_HALTED` | 执行中 alarm 等 | 保留现有 execute 中断 |

**硬规则**：`SEMANTIC_MISMATCH` / `UNSUPPORTED_INTENT` / `DEPENDENCY_UNMET` → **`executableChain` 必须为空**；禁止当前 prompt 的「partial impossible 仍塞一个 best valid tool」。

Break turn 表现（Q2）：

1. **确定性**：写入 `DirectorBreak` + 可选 `ToolUseResult` stub（`status: failed`，无 worldDelta 或仅 exposure 微调）。
2. **叙事（LLM 可选）**：若已配置 Key，用 **同一 break + playerPlan + world** 调用 `narrateDirectorBreak()` → Field Agent Radio / feed；**不得**产出可执行 toolChain。
3. 无 Key：固定模板（ADR-0014 C）按 `code` 映射。

### 3. Agent 雏形：受控工具循环（Q1）

每玩家 turn 最多：

```text
1. compile (LLM or stub)
2. semanticValidate(plan, playerPlan) → break? → exit
3. validateToolChain → executableChain empty? → break ALL_BLOCKED
4. execute OperationSet (ADR-0015)
5. （可选，v1 可关）若 semantic 与执行结果矛盾 → 不再重试；v2：带 break 上下文 **重编译 1 次**
```

v1 实现范围：

- 步骤 2 的 **semanticValidate** 必做（规则表，非 LLM）。
- **1 次**重规划：仅当首次 `SEMANTIC_MISMATCH` 且 LLM 源；把 `break.reason` 注入 user message 再 `callDirector`；第二次仍 mismatch → break，不再执行。

循环 **不**做成多 tool 连续执行（仍 ADR-0001 step + 0015 每 actor 一步）；「循环」指 **编译↔校验↔break**，不是 ReAct 执行链。

### 4. 复合 tool：`infiltrate_gallery`（Q3 = C）

新增 manifest tool（Face only），**单步**表达「先判条件，再进画廊」：

| 阶段 | 行为 |
|------|------|
| Pre | `guard` 已 `handling_complaint` / `investigating` / `distracted`，**或** `!isObservedByGuard(face, gallery)`（实现用 selectors） |
| Fail | `status: failed`；`reason` 明确（例：「保安仍盯着画廊通道，无法混入」）；**无** `face.location` 变化 |
| Ok | `planActorTravelEvents(face, from, gallery)` + `face.location = gallery`；可选 `attention_shift` |

玩家句「混进画廊」「趁乱进画廊」→ semantic 层 **优先映射此 tool**，禁止仅用 `redirect_guard_attention` 交差。

「先引开再进」：

- **同一 turn**：若 guard 未引开 → `infiltrate_gallery` **整 tool failed**（DEPENDENCY_UNMET）；玩家需上 turn `redirect`/`complaint` 或同 turn 并行 guard 引开 + face infiltrate（并行时 guard patch 先于 face 在同一 OperationSet 内按 actor 顺序：player → face → runner 需调整——**guard 是 NPC**，引开由 **face 的 redirect** 改 guard 状态，然后 **face infiltrate** 读更新后 world）。

**OperationSet 顺序**：同一 turn 内多 actor 并行 apply 时，resolver 读 **同一 world 快照** 还是顺序 apply？当前 `executeOperationSet` **顺序 apply**。约定：

- `redirect_guard_attention`（face）与 `infiltrate_gallery`（face）**不能**同 actor 两步；引开 + 进画廊 = **infiltrate 复合** 或 **两 turn**。
- 与 runner `disable_power` 并行：runner 断电 → guard reactive 去厨房；infiltrate 的 pre 需定义「gallery 通道无人盯」是否与「guard 不在 lobby」一致（实现时写清 precondition 表）。

### 5. 不支持暴力（Q2 + 杀保安）

无 `kill_guard` tool。玩家表达杀人/换装保安：

- semantic → `UNSUPPORTED_INTENT`
- break → 叙事：「没有可执行的致命手段 / 目标在警戒中」
- 可选 resolver stub：`attempt_direct_violence` → 恒 `failed`（若需「有 tool 但必败」的演出）；**优先 break 空链 + 叙事**，避免再选 `disable_power_panel`。

### 6. Director 约束表注入（Q4，必须）

除 `summarizeWorldForDirector` 外，prompt 必须附带 `buildDirectorConstraints()`（JSON），包含：

- 每个 tool：**allowedActors**、**是否移动 actor**、**是否移动 target NPC**、**关键 precondition 人话**
- **禁止替换表**：例 `混进画廊 → infiltrate_gallery`，禁止单独 `redirect`/`complaint` 作为终局
- **Break 契约**：`unsupportedParts` 非空 → `toolChain` 必须 `[]`

实现文件：`lib/director/directorConstraints.ts`（真源）；prompt 引用，不重复手写长文。

### 7. 与现有 ADR

| ADR | 关系 |
|-----|------|
| 0001 | 仍 step；agent 循环在编译侧 |
| 0014 | break turn = clarificationOnly 扩展 |
| 0015 | 执行仍 OperationSet |
| 0004 | infiltrate 为 Face 跨区 social，走 path events |
| 0016 | infiltrate 成功用 `planActorTravelEvents` |

## 后果

- Prompt 需删「partial impossible 仍填 best valid tool」。
- `compileDirectorPlan` 在 execute 前插入 `semanticValidate` + break 分支。
- 新增 tool + 测试：`infiltrate_gallery` 成功/失败；semantic 拒 redirect；UNSUPPORTED 不执行 disable_power。
- LLM 成本：最多 +1 次重编译；break 叙事 +0~1 次小调用。

## 实现记录

| 日期 | 内容 |
|------|------|
| 2026-05-28 | ADR accepted（Steve Q1–Q4 对齐） |
| 2026-05-28 | `directorConstraints` · `semanticValidate` · `compileDirector` break · `infiltrate_gallery` · `galleryInfiltration` · `test:director-semantic` |
| 2026-05-28 | **选项 A**：`planSanitize`/`prepareDirectorPlan` 部分执行；`buildOperationSet` runner→face + 配电先于 infiltrate；`cameraAfterFieldTurn`；`test:plan-sanitize` |
