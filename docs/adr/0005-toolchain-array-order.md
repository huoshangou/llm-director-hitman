# ToolChain 按数组顺序执行

`executePlan` 在 **full chain** 模式下按 DirectorPlan.toolChain 的**数组顺序**依次执行；**不**按 `priority` 排序。

`priority` 字段仅作 Director 内部标注 / Debug 展示 / 未来扩展，**不参与 runtime 排序**。

**step** 模式（ADR-0001 + ADR-0015）从有序 `toolChain` 构建 OperationSet（每 actor 一步并行）；玩家下一 turn 提交新 plan 时，由 Director 产出更新后的有序数组。

理由：与 showcase 因果顺序一致（setup → window → kill）；避免 priority 错配导致 stage_accident 先于 tamper；实现简单、Debug 可读。

**Considered options**

- B priority 降序：v0.2 现状，易乱序  
- C phase 字段：更严但增加 Director schema 负担  
- **A（采纳）**：数组即剧本顺序  

**Consequences**

- 删除 v0.2 `sort((a,b) => b.priority - a.priority)`  
- Director prompt 强调：**toolChain 顺序即执行顺序**，先 setup 后终局  
- validate 可 warn：若 `stage_accident` 出现在 `tamper_balcony_rail` 之前
