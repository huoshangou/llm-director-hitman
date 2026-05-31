# 规则与确定性结算

status: draft  
source: archive/v0.1 §11, v0.2 §11–§13

## 不用随机黑箱（week1）

```text
score = base + skill + intentMatch + worldSupport
      - alert - observation - suspicion - contradiction - accumulatedRisk

score >= 75 → success
score >= 45 → partial
else → failed
```

后续可加 seeded randomness。

## 核心规则

### Observation

Guard 等 NPC 在 non-distracted 状态下注视 location → `isObserved` → 高风险 tool 降分或失败。

### AttentionMode

idle, socializing, watching_security, handling_complaint, investigating, distracted, …

Guard `handling_complaint` 时降低对 hallway/balcony 实时观察。

### Belief → Route Bias → tickWorld（ADR-0002）

```text
private_meeting_pending → +bias
confidential_art_deal_on_balcony → +bias
privacy motive → +bias
high alert / suspicion → -bias
```

**阈值达标后**，仅 **tickWorld()** 在 turn 末触发 `npc_move` 并写入 GameEvent。  
**Tool handler 禁止** `npcs.*.location = …`（archive v0.2 lure/spill 等直接改 location 的实现作废）。

### Suspicion

全局 suspicion 与 per-NPC per-agent suspicion 分开；traceRisk 独立。

### Ripple

Tool 价值在涟漪：spill → cleaner task → cart move → sightline → crowd look。

v0.2 registry 中 rippleRules 多为描述；**实现以 handler + 未来 tick 为准**。

## v0.2 实现策略

- toolRegistry：metadata  
- resolveTool：**switch per tool handler**（文档已承认，非全数据驱动）

## Proximity（ADR-0003 + 0004）

- **默认**：Agent 与目标 Object / Location 须同 Location  
- **Social 白名单**（对 **NpcId** 可跨区）：`create_complaint`, `lure_with_private_meeting`, `redirect_guard_attention`  
- **Player** 信息类 Tool 不受 location 约束  
- **Field agent**（Face、Runner）：默认同区；Social 白名单对 NpcId 可跨区（ADR-0004）

## executePlan

- **step**（默认）：每 turn 一个 OperationSet，每 actor 至多一步（ADR-0001 + ADR-0015）  
- **full**（Debug）：按 **数组顺序** 执行全链（ADR-0005）；alarm 时 stop  
- **禁止** priority 排序（v0.2 作废）
