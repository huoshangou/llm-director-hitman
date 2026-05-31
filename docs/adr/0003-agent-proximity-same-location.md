# Agent 位置：同区 Near，跨区 Blocked

执行需 **proximity** 的 Tool 时，Agent 必须与目标 Object / NPC / Location **处于同一 Location**（`actor.location === target.location`）。跨 Location 时 precondition 失败 → `blocked`，由 Director 降级或玩家下一 turn 再 plan。

**例外**：Hacker 固定 `location: "remote"`，不受 proximity 约束（信息类 Tool 远程执行）。

不做隐式瞬移、不做 week1 默认 `move_agent` Tool（后续 ADR 可加）。

理由：与 ADR-0001 step、ADR-0002 tick 一致；Runner 不能从 Kitchen 一步 `tamper_balcony_rail`；地图几何与 plan 可解释性绑定。

**Considered options**

- B 调初始布局：回避问题，削弱路线差异  
- C 显式 move_agent：最清晰，week1 多一个 tool  
- D MVP pass：与沙盘可信度冲突  
- **A（采纳）**：规则简单，代码量低  

**实现难度（相对）**

| 维度 | 评估 |
|------|------|
| 代码 | **低～中**：收紧 `checkPreconditions`、validate 预检、Debug 显示 blocked reason |
| 美术 | **无额外负担**：角色仍按 location 锚点摆放 |
| 设计 | **中**：玩家需 multi-turn 表达「Runner 去 gallery 侧」；短期靠 Director unsupportedParts + 示例 plan |

**Consequences**

- Face(lobby) 对 Target(gallery) 的 `lure_with_private_meeting`：**blocked**，除非 Face 先移动到 gallery（待 future move_agent 或 week1 叙事上 Face 可在 social 范围跨区 — **未开例外**）
- 需在 Director prompt / showcase 中体现「谁要先到位」
- 可选 follow-up ADR：`move_agent` 或 social tool 跨区例外
