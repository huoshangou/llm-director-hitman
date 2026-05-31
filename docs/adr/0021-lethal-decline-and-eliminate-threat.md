# Lethal policy：decline_with_guidance + eliminate_threat

status: accepted  
source: grill 2026-05-31（Steve 拍板）

## 背景

ADR-0017 §5 将一切「杀保安」类意图归为 `UNSUPPORTED_INTENT` 空链。产品需要：

1. **合同目标（Victor）**：直接杀 → **拒绝 + 引导**（不占 break 空链；本 turn 执行 `decline_with_guidance`，`blocked`，世界推进）。
2. **保安**：合理 stealth（停电、后厨无人等）→ **`eliminate_threat`** 清除威胁。
3. **宾客**：**允许执行 → 立刻坏结局**（`alert` + `objective.style = failed`）。

## 决策

### 1. 两个 manifest tool

| Tool | 用途 | Resolver |
|------|------|----------|
| `decline_with_guidance` | 拒绝并引导 | 恒 `blocked`；`params.guidanceKey` → 确定性文案；`timeSeconds` 推进 |
| `eliminate_threat` | 清除非合同 NPC | 成功设 `npc.vitality = removed`；guest 成功另设失败 objective |

**禁止**：用 `disable_power_panel` / `impersonate_staff` 等顶替杀人意图（semantic + `augmentLethalIntent`）。

### 2. NPC 生存状态

`NpcState.vitality: "alive" | "removed"`（MVP 不做 incapacitated）。`removed` 的 NPC 不参与 `npcsPresent`、观察与 infiltrate 阻挡。

### 3. Victor 终局

`objective.targetHandled` **仅**由 `stage_accident` / `resolve_poison_on_balcony`（及未来专用脏杀 tool）写入。`eliminate_threat` **不得** 对 `target` 成功。

### 4. 与 ADR-0017 关系

修订 §5：保安/宾客 lethal → `eliminate_threat`；Victor 直接杀 → `decline_with_guidance`（**非** `UNSUPPORTED_INTENT` 空链）。`UNSUPPORTED_INTENT` 保留给真正无 tool 的含糊暴力。

### 5. Play 意图层

`recognizeIntentOutcome` 对可路由 lethal 返回 `convertible`（进 Director），不再对 Victor 直接杀返回 `dirty` 拦截。

## 后果

- `lib/director/lethalPolicy.ts` 为受害者策略真源。
- `semanticValidate` 按受害者分支。
- `classifyTerminalState` 增加 `failed_collateral`。
- UI-5 验收改为：turn 推进 + decline 电台（Steve 选 A）。

## 实现记录

| 日期 | 内容 |
|------|------|
| 2026-05-31 | ADR accepted；lethalPolicy · 两 tool · vitality · 测试 |
