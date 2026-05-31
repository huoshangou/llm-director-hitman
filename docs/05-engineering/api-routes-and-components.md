# API 与前端组件

status: active  
source: archive/v0.2 §20–§21  
updated: 2026-05-28

## 玩家主路径 vs Debug

| 入口 | 定位 |
|------|------|
| `/play/` | 默认玩家体验（operator console、骇入分析底栏、FIELD COMMS） |
| `/gm` | Debug / GM：Showcase 点步、手写测试、Debug JSON；plan validation 语义与 /play 一致 |

## API

### POST /api/director

Body: `{ playerPlan, world, selection?, llm? }`  
Response: `{ ok, plan, validation, source, fieldAgentRadio?, ... }`

- `validation.executableChain` / `rejected` — 与 `validateDirectorPlan` 一致
- `selection` — 地图选中项（MAP REF），与 `/play` plan context 相同

### POST /api/simulate

Body: `{ world, plan }`  
Response: `{ nextWorld, results, timeline }`

## 页面状态流（/gm）

```text
world, plan, selection, timeline, busy, debug
submitPlan → fetch director → runTurn(step) → playback → setWorld + timeline
reset → initialWorld
```

## 组件职责

| 组件 | 职责 |
|------|------|
| Hud | alert, suspicion, trace, time, objective, reset |
| AgentPanel | field agents 状态 |
| GameMap | 地图、选中、playback frame |
| PlanSubmitPanel | plan 输入、MAP REF、**VALIDATION / NEXT**（`planValidationSummary`） |
| InspectorPanel | **buildHackerAnalysis** 只读（= /play 底栏结构） |
| HackerCommsPanel | **电台 / 环境音**；不承接物件卡 |
| TimelinePanel | turnTimeline |
| ShowcasePanel / ManualTestPanel | Debug 仅 /gm |
| DebugPanel | director + turn JSON |

## 共享 lib

| 模块 | 用途 |
|------|------|
| `lib/ui/planValidationSummary.ts` | `/gm` Plan 区与 `/play` 同构 validation 文案 |
| `lib/ui/planNextHint.ts` | blocked 时 `NEXT /` |
| `lib/ui/hackerAnalysis.ts` | 点选情报真源 |

## GameMap 注意

archive 示例用 `Math.random()` 摆 object — **必须改为 deterministic offset map**（hydration 稳定）。
