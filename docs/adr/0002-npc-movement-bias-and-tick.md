# NPC 移动：Belief / Route Bias + Turn Tick

Tool 结算**不得**直接修改 NPC 的 `location`（`agent_move` 类 Tool 对 Agent 除外，见 ADR-0003 待定）。

Social / Information Tool 只改变世界中的 **Belief**、**Route Bias**、**attentionMode**、**currentTask** 等。每个 turn 执行完 Tool（step 模式）并 apply delta 后，运行 **`tickWorld()`**：按 Route Bias 阈值、Alert、Suspicion、currentTask 决定 NPC 是否生成 `npc_move` GameEvent 并更新 location。

理由：与 ADR-0001 多 turn replan 一致；一步 spoof 后 Target 仍应在 Gallery，玩家下一步才看到移动或继续铺垫；符合 v0.1「NPC 不听 Plan，只听 belief/motive」。

**Considered options**

- B Handler 瞬移：实现快，因果链断裂，一步 turn 无意义  
- C 混合：规则不一致，Debug 难解释  
- **A（采纳）**：统一 tick 出口  

**Consequences**

- `resolveTool` handler 须删除 / 禁止 `npcs.*.location` 直接赋值  
- 新增 `lib/world/tickWorld.ts`（或 `worldRules.ts`）与 Route Bias 阈值常量  
- `lure_with_private_meeting` 改为加 bias + belief，不瞬移  
- Timeline 中 `npc_move` 由 tick 或 task 驱动产生  
- showcase 验收写分 turn 断言（turn1 belief+，turn2 npc_move…）  
- UI 可选：Route Bias 指示（箭头 / 数值 Debug）
