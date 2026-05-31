# 分层与数据流

status: draft  
source: archive/v0.1 §3.2–§3.3

> **执行语义已迁至真源**：[play-turn-execution-spec.md](./play-turn-execution-spec.md)（active）。  
> 下文「每 turn 第一步」「step 模式」等段落为历史草案，**勿按此文实现 Play**；实现以 spec + ADR-0015/0017/0019 为准。

## 一次 Plan 的数据流（设计意图，部分已 superseded）

```text
1. Player submits natural language plan
2. WorldState + ToolRegistry + NPC summaries → LLM Director
3. Director returns DirectorPlan JSON
4. Runtime validates DirectorPlan
5. ToolResolver executes tool calls (deterministic)
6. WorldState updates
7. TimelineBuilder → GameEvent[]
8. Frontend plays timeline
9. **tickWorld()** — NPC 移动、task 推进（ADR-0002）
10. Agent comms + world changes shown
11. Player replanning / revision
```

**第 10 步**：默认 multi-turn replan（ADR-0001：每 turn 执行 toolChain **第一步**）。Debug 可一次跑全链。

## API 拆分（v0.2）

| Route | 职责 |
|-------|------|
| `POST /api/director` | playerPlan + world → DirectorPlan + validation |
| `POST /api/simulate` | world + plan → nextWorld + results + timeline |

simulate 也可 client-side 执行（未 ADR）。

## executePlan 模式（ADR-0001）

| mode | 用途 | 默认 |
|------|------|------|
| `step` | OperationSet：每 actor 一步，多 actor 并行 | ✅ 玩家 / 发布 |
| `full` | 按 **数组顺序** 执行完整 toolChain（ADR-0005） | Debug Panel 仅 |

```text
POST /api/simulate  { world, plan, mode?: "step" | "full" }  // 默认 step
```

## 执行顺序（ADR-0005）

- **禁止**按 `priority` 排序（v0.2 作废）  
- **step**：每 turn 一个 OperationSet（ADR-0015），非仅 `toolChain[0]`  
- **full**：依次 `toolChain[0..n]`  
- Director prompt 须要求：数组顺序 = 因果顺序（setup → window → kill）
