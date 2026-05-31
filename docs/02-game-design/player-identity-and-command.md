# 玩家身份与指挥结构

status: active  
source: ADR-0009 · Steve 2026-05-25

## 一句话

**你在监控室里。** 通过摄像头和情报总览看完整场酒会；你用自然语言 **指挥 Face 和 Runner**，并 **亲自** 做黑客动作（伪造短信、改名单、压摄像头）。

## 不是什么

- 不是「四个平等意志」（神秘玩家 + Face + Hacker + Runner）  
- 不是 Hacker 作为第三个 AI 队友需要 Director 单独分工  

## Director 怎么简化

| 谁 | Director 编排 |
|----|----------------|
| **Player** | 信息类 tool：`spoof_message`, `modify_guest_list`, `fake_schedule_conflict`, `suppress_camera_record` → `actor: "player"` |
| **Face** | social tool |
| **Runner** | social（若允许）+ physical + final |

玩家 Plan 可以混写：「我先发假短信，让 Face 去跟目标搭话，Runner 先别动。」  
Director 产出 **有序 toolChain**（ADR-0005）。**单条玩家指令**经校验后构建 **OperationSet**（ADR-0015）：不同 actor 各执行一步并行动作；同 actor 多步进入冲突/NEXT。多 turn 节奏仍是「一条指令 → 一次 replan」。

## UI 结构（建议）

```text
┌ Player POV / trace / access ─────────────────────────────┐
├ Face card │  MAP（监控视角）  │ Runner card ─────────────┤
├ Plan: "Spoof the target, then..." ───────────────────────┤
└ Timeline + Debug ──────────────────────────────────────┘
```

- Hacker portrait 资源 = **玩家 comms 状态**（typing / success / warning），不是 map 上的第三人  
- Face / Runner 卡片 = 队友状态 + 最近 comms  

## 代入感

- 玩家身份明确：策划者 / 幕后黑客  
- Agent comms 像队友汇报；信息 tool 反馈像「你的终端」  
- showcase 文案可改为第一人称：「我伪造…」「让 Face…」

## 实现备注

- WorldState：推荐顶层 `player: { traceRisk, permissions, … }`；archive 的 `agents.hacker` 迁移为 player 或别名  
- `summarizeWorldForDirector`：agents 段只列 face、runner + player capabilities
