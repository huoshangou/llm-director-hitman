# WorldState

status: draft  
source: archive/v0.1 §4, v0.2 §4–§7

WorldState 是唯一真实世界；LLM 不能直接覆盖，只能通过 Tool 的 worldDelta 改变。

## 顶层字段

```text
turn, timeSeconds, alertLevel, suspicion, traceRisk
objective, locations, npcs, agents, objects
knowledge, evidence, eventLog
```

## AlertLevel

calm → curious → suspicious → searching → lockdown → alarm

## LocationState

connectedTo, crowd/noise/light, restricted, watchedBy, cameras, objects, npcsPresent, agentsPresent, tags

## NpcState

location, routine, attentionMode/Target, suspicion, trust, beliefs, motives, currentTask, stateTags

## AgentState

location | remote, coverIdentity, stress, exposure, skills, availableTools, permissions, status

## ObjectState

location | target_inventory | hidden, state{}, affordances[], tags[]

## Semantic Tags

Tags are not free-form prose memory. They are compact state facts that future rules, NPC reactions, evidence checks, and UI explanation may read.

Initial scope:

- `AgentState.stateTags`: cover and exposure facts such as `disguised_as_waiter`.
- `NpcState.stateTags`: belief/awareness/result facts such as `target_has_private_meeting_belief`.
- `ObjectState.tags`: tampering/evidence facts such as `wine_bottle_poisoned`.

LLM may suggest intent and checks, but only deterministic tool resolution writes tags.

## KnowledgeState / EvidenceState

谁知道什么；visible/hidden evidence（week1 可简化）

完整 TypeScript 见 archive v0.2 `worldTypes.ts`；实现时以代码与本文档同步为准。

## 初始世界

见 archive v0.2 `initialWorld.ts` 或 [../02-game-design/scenario-balcony-job.md](../02-game-design/scenario-balcony-job.md)
