# 校验与失败体验

status: active  
source: archive v0.1 §13, §17 · ADR-0010

## Validation 层级

| 层 | 检查 |
|----|------|
| Schema | Zod 解析 DirectorPlan |
| Manifest | toolId ∈ ADR-0006 |
| Registry | allowedActors（player / face / runner） |
| Target | id 存在于 world |
| **Precondition scan** | 当前 WorldState 下 `checkPreconditions`（**ADR-0010**） |
| Constraint | hard 约束 vs 高风险 tool；frame warning（ADR-0008） |

## Precondition Scan 输出

```ts
type ValidationResult = {
  errors: string[];           // fatal：unknown tool, wrong actor
  warnings: string[];         // soft：frame=default 但 player asked subtlety
  executableChain: ToolUseRequest[];  // 通过 scan 的子集
  rejected: { request; reason }[];
};
```

- **玩家路径**：仅 `executableChain` 进入 simulate（step 取 `[0]`）  
- rejected 合并进 `unsupportedParts` 或 validation UI，**禁止**假装执行  

## 失败类型

missing_affordance · precondition_failed · too_risky · contradictory_constraints · npc_motive_mismatch · observed · time_window_missed · **cross_zone** · **wrong_actor**

## 降级示例

玩家：「Runner 从通风管爬进阳台」  
→ unsupportedParts: 无 vent affordance  
→ fallback: kitchen 路线 + camera window  

玩家可见：Agent/Player comms 说明不可行 + 替代建议。

## feasibility 语义

| 值 | 含义 |
|----|------|
| high / medium / low | 可执行度估计 |
| partial | 部分步骤被 scan 拒绝 |
| impossible | executableChain 为空 |

不能假装支持所有计划。
