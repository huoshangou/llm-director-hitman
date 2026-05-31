# Turn 模型：默认 Replan，Debug 全链

玩家每轮提交 Plan 后，运行时**默认执行一个 OperationSet**（一步一 turn）：从校验后的 `toolChain` 构建 **每 actor 至多一个 action**，不同 actor 在同一 turn 内并行执行；然后播放 timeline、**一次**世界 tick，再等待下一次 Plan 输入。这是对外 demo 与最终发布的唯一默认行为。

> **2026-05-28 addendum（ADR-0015）**：不再将「step = 仅 `toolChain[0]`」作为无限定规则。单条指令可同时执行 Player + Face + Runner 各一步；同 actor 多步进入冲突/NEXT，不得静默丢弃。

开发/测试时可开启 **Run full chain**（Debug）：在同一 world 快照上按顺序执行 Director 返回的完整 toolChain，用于快速验证 resolver 与 showcase，**不得**作为玩家-facing 默认。

理由：v0.1 核心体验依赖「可见因果链 + replanning」；全链一次性结算会把 NPC 瞬移、agent 未移动等问题掩盖，且不像暗杀沙盒。

**Considered options**

- A only：最符合体验，但调试整条 showcase 较慢  
- B only：实现简单，与 product brief 冲突  
- **C（采纳）**：发布/录 demo 用 A；本地与 Debug Panel 用 B  

**Consequences**

- `executePlan` 需 `mode: "step" | "full"`，默认 `"step"`  
- 前端 Plan 提交走 step；Debug 单独按钮走 full  
- showcase 验收需定义 **分 turn 状态断言**，不能只看一次性终态  
- DoD 与 week 排期需体现 multi-turn 主路径
