# ADR-0015：单条玩家指令内的并行 Operation

status: accepted  
date: 2026-05-28  
supersedes: ADR-0001 中「step 仅执行 toolChain[0]」的**无限定**表述（见 addendum）

## 背景

ADR-0001 规定玩家每轮提交 Plan 后默认 step 模式只执行 `toolChain[0]`。人工体验表明：玩家在同一自然语言指令中同时指派 Face 与 Runner 时，只跑第一步违背直觉，且 UI 会静默丢弃后续 actor。

## 决策

1. **玩家 command = 一个 turn**（replan 节奏不变）。
2. 单个 command 经 Director 校验后，由 **OperationSet** 从 `executableChain` 构建：
   - 每个 actor（`player` | `face` | `runner`）本 turn **最多执行一个** action。
   - 不同 actor 的 action 在**同一 turn 内并行执行**（确定性顺序见下）。
3. **同一 actor 多条 request**：保留链中第一条为可执行 action；其余进入 `conflicts`，由 UI 显示 `NEXT /` 或追问，**不得静默丢弃**。
4. **Debug `full` chain** 仍按数组顺序跑完整链，与玩家 step 路径分离。
5. LLM `playerFacingSummary` 不得声称已并行执行，除非 OperationSet 实际包含对应 actor。

## 执行顺序（确定性）

同一 turn 内多 actor action 的应用顺序：

1. `player`
2. `face`
3. `runner`

（同 actor 仅一条。）全部 `applyToolResult` 完成后，**只调用一次** `tickWorld`。

## 与 ADR-0001 / ADR-0005 的关系

- ADR-0001：仍「一步一 replan」；一步 = 一个 OperationSet，而非单 tool。
- ADR-0005：`toolChain` 数组顺序仍表示 Director 意图与冲突解析；并行执行不按「只取 [0]」截断多 actor。

## Consequences

- `executePlan` step 模式委托 `buildOperationSet` + `executeOperationSet`。
- `/play` Command Feed 显示 `OPERATION /` 与多条 `EXEC /`。
- selection 仅空文本或明确指代时参与编译（见 Batch A plan）。
- Face `lure_with_private_meeting` 须有 scene engagement event/cue，不能仅改 target `routeBias`。

## 实现记录

- `lib/operation/*` · `executeOperationSet` · `play-parallel-operation-v1`
