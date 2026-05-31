# ADR-0016：角色在场（Character Presence）与 Reactive Hold

status: accepted  
date: 2026-05-28  
relates: ADR-0002 · ADR-0004 · ADR-0014 · ADR-0015

## 问题

保安断电后不去厨房、Face「混进画廊」却在大堂投诉，根因不是单一 bug，而是 **三类状态各写各的**：

| 层 | NPC | Face / Runner | 问题 |
|----|-----|---------------|------|
| 位置 `location` | `tickWorld` 任务结束才换区；`playIdle` 禁止换区 | 仅部分 Tool resolver 手写 patch | 文案说去了，人还在 |
| 意图 `attentionMode` | Tool / routine / **idle vignette** 都能写 |  mostly `status` on agents | vignette 覆盖 investigating |
| 任务 `currentTask` | 有 `NpcTask` | **无** Agent 等价物 | Face 无「正在画廊接触」可追溯状态 |

ADR-0004 允许 Social Tool **跨区执行但不移动 Agent**（隔空话术）。玩家面向上仍需区分：

- **Remote social**（投诉前台）：Face 可留大堂，只改 NPC 注意力。  
- **Physical social**（混进画廊、当面接触）：必须 `location` + `agent_move` + 稳定 `attentionMode`，且 idle 不得覆盖。

## 决策

### 1. 统一入口 `lib/world/characterPresence.ts`

所有 **玩家可见的换区** 经：

- `travelNpcTo` / `travelFieldAgentTo` → 写 `location` + `npc_move` / `agent_move`  
- `holdNpcReactive` / `holdFieldAgentReactive` → 登记 **Reactive Hold**（停电查电、当面 lure 等）

禁止在 resolver 里只改 `attentionMode` 而不声明是否应移动。

### 2. Reactive Hold 屏蔽 Idle Vignette

`advanceIdleVignettes` 不得覆盖处于 Reactive Hold 的角色（保安停电、Face 接触目标等）。

### 3. Field Agent 仍无自动巡逻

ADR-0014：`advanceAgentRoutines` 保持空；Face/Runner **仅 Tool + 显式 travel** 换区。需要「人在画廊」时必须调用 `travelFieldAgentTo`，不能依赖跨区白名单 alone。

### 4. 与 ADR-0002 的折中

- **慢节奏 Idle**：仍不在 `playIdle` 下做 NPC 巡逻换区。  
- **Reactive 大事件**（全场停电、当面接触）：允许 Tool 结算时 **立即** `travelNpcTo` / `travelFieldAgentTo`，并登记 Hold，避免「24 tick 后才瞬移」。

## 非目标

- 不在此 ADR 引入完整行为树或 LLM 驱动巡逻。  
- 不为 Agent 复制全套 `NpcTask` 计时器（除非后续 turn 编排需要）。

## 实现记录

- `lib/world/characterPresence.ts`  
- `disable_power_panel` · `reactPowerOutage` · `lure_with_private_meeting` 接入  
- `advanceIdleVignettes` → `isActorOnReactiveHold`
- `lib/world/locationPath.ts` · `buildAgentPathEvents`：Runner/Face 沿地图邻接区逐跳移动；相邻区 playback 走走廊 lerp，非 SIGNAL LOST  
- `impersonate_staff`（Runner）：厨房换装后自动 `kitchen→bar`
