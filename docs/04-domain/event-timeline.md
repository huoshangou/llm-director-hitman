# Event Timeline

status: draft  
source: archive/v0.1 §14, v0.2 §15

## 原则

前端**不直接理解 Tool**；只消费 GameEvent。

## GameEvent

```text
id, t, type, actor?, object?, from?, to?, text?, value?, duration?, severity?
```

## GameEventType

agent_move · npc_move · dialogue_bubble · object_state_change · attention_shift · suspicion_change · alert_change · camera_state_change · disguise_change · tool_success · tool_failed · objective_update

## TimelineBuilder

合并多 ToolUseResult.generatedEvents，按 t 排序，步间 offset 来自 time cost。

## 示例序列（路线 A 片段）

t0 Face 气泡 → t1 Guard attention → t2 terminal 修改 → t4 Hacker 气泡 → t5 Target npc_move to balcony

## MVP 表现

- **P2 最低**：EventLog 文字 + Map 终态同步（当前）。  
- **P3 目标**：**TimelinePlayer** 按 `t`/`duration` 播放 `turnTimeline`；前端不解析 Tool，只消费 GameEvent（见 [delivery-roadmap.md](../07-planning/delivery-roadmap.md) P3）。

首批播放类型：`npc_move` · `agent_move` · `dialogue_bubble` · `attention_shift`。

## 角色移动（无引擎帧）

两层分离，**不要**在 Tool/Resolver 里写像素或 `requestAnimationFrame`：

| 层 | 模块 | 职责 |
|----|------|------|
| **逻辑** | `lib/world/travel.ts` → `planActorTravelEvents` | 图最短路径；每邻接区一条 `npc_move` / `agent_move`；`WorldState.location` 在 turn 末跳到终点 |
| **表现** | `lib/sprites/mapLayout.ts` | 每区质心 + 角色偏移 → 地图像素 `(mapX, mapY)` |
| **播放** | `lib/timeline/playback.ts` | `buildPlaybackSchedule`：把事件 `t` 换成墙钟 `startMs`；同角色 relocation **串行**（每跳 950ms 邻接 lerp / 1280ms 非邻接 SIGNAL LOST） |
| **驱动** | `playback-driver.js` | `performance.now()` + `requestAnimationFrame` → `computePlaybackFrame(worldBefore, timeline, elapsedMs)` |

**不是「多少帧走多少格」**：帧率随显示器变化；时长由常量 `SAME_ZONE_MOVE_MS` / `CROSS_ZONE_MOVE_MS` 决定。`GameEvent.t` 只表叙事顺序；多段走廊的墙钟起点由 `buildPlaybackSchedule` 按角色串联。

**环境 tick**（`world-lerp.js`）：仅同区 idle 微调，**不**跨区；跨区只在 turn playback。

新增移动一律：`planActorTravelEvents`（或 `travelNpcTo` / `planFieldAgentTravel` 封装），禁止手写 `from→to` 非邻接单跳。
