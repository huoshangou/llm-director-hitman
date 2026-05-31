# Play Idle、Ripple 驱动 Reactive 与 Field Agent Radio

status: accepted  
source: grill 2026-05-25 · open-conflicts C8

## 背景

Play 壳层曾用 `runAmbientBurst` + 无来源 `patrol`/`mingle`，与 ADR-0002（Tool 改 Bias/Belief，**tickWorld** 出口移动）及产品简报「确定性沙盒 + Director 经 Tool 介入」不一致。需区分 **确定性行为层** 与 **Director 层**，并定 Play 待机与干员追问的呈现。

## 决策

### 1. 双层驱动（延伸 ADR-0001/0002/0009，非新架构）

- **Deterministic Behavior Layer**：Default NpcIntent + Reactive NpcIntent；可用行为树实现；**无 LLM 亦可运转**。
- **Director Override**：玩家 Turn 内 LLM 编译 `toolChain` + 场面 Tool → **Ripple** → 行为层下一拍读取；**禁止** Director 直接改 `npc.location`。

### 2. Play Idle（B′）

- 玩家未提交 Plan 时允许**慢节奏**跨区，但须满足：`currentTask` 有可追溯来源（`opening` | `ripple` | `belief_threshold`），禁止 `random_patrol`。
- **Reactive NpcIntent 优先于 Default**。
- Idle 与 Turn 末共用**同一套** routine 规则；Idle 仅降低频率（具体秒数实现时定），不另起随机逻辑。

### 3. Ripple 与全场反应（方案 2）

- Reactive 的**真源**是 Tool 结算产生的 **Ripple**，登记 **Ripple Scope**：`local` | `zone` | `global`。
- 全场事件（例：配电破坏 → 停电）设统一场面信号（如 `sceneDisturbance` / 等价 world flags），再按**角色反应表**生成不同 Reactive（保安查电、宾客骚动、服务生僵住、目标抱怨等）——**人人有反应、反应不同**，非同一模板。
- Turn 内：Tool 立即写世界信号；Turn 末 `tickWorld()` 处理关键 `npc_move`；Idle 慢速消化余波。

### 4. Field Agent 与 Agent Clarification

- Face / Runner **只执行**本 Turn 校验通过的 `toolChain`。
- Plan 不足或不可行时：**不执行 Tool**（追问 Turn），触发 **Agent Clarification**。
- 呈现为 **Field Agent Radio**（现场干员频道）：台词进入「Hacker · 现场监听」式 UI，**禁止** `unsupportedParts` / 校验器原文直出。

### 5. 引导问句文案（方案 C）

- 按 `clarificationReason`（缺 target、不可行 tool、proximity blocked 等）选**固定模板**（无 API Key 可玩）。
- 有 LLM 时对**同 reason** 润色为 in-character 问句，不维护两套分支逻辑。
- 硬约束：带说话人（Face/Runner）；引导性问句或下一步建议；`toolChain` 为空则不推进世界。

## 与 ADR-0002 的关系

- ADR-0002 仍成立：Tool 不直接改 NPC `location`；`tickWorld()` 为移动出口。
- 本 ADR **补充**：Play Idle 可慢速推进 task/反应，但**不**引入与 Ripple 无关的换区；Turn 末 `tickWorld()` 仍为玩家行动后的主结算拍。

## 实现记录

| 日期 | 内容 |
|------|------|
| 2026-05-25 | ADR accepted（grill C8） |
| 2026-05-27 | Play：`runIdlePass`、`npcRoutines` Reactive、`clarificationRadio`、底栏 `buildHackerAnalysis`、Field Agent Radio（build `adr14-v11`） |
| 2026-05-27 | **待机展示**：`tickWorld({ playIdle: true })` — 不更新 `npc.location`（区锚点直线 lerp 穿墙，体验否决）；仅 `ambientEntityOffset` 微动 |
| 2026-05-27 | **UI 通道**：点选 → 仅底栏骇入分析；侧栏仅电台/环境音（`adr14-v13`） |

原「实现差距」项：**随机 patrol 删除、Radio 模板、停电 Reactive 基础** 已在 Play 完成。仍可选增强：更完整 Ripple 表、独立 clarification LLM API、Turn 末移动演出。

### 与 §2 Play Idle（B′）的偏差

ADR 正文允许待机**慢节奏跨区**；2026-05-27 实测直线 lerp 穿墙不可接受，**展示层**改为待机不跨区；逻辑层 Turn 末仍可按 Bias/Ripple 换区。若将来有走道分镜/寻路，可再开待机跨区并修订本节。

## Considered options

- **A′** Idle 完全不跨区 — grill 时因过静否决；**2026-05-27 对 `/play` 展示采纳**（逻辑 tick 仍跑，不 relocation）。  
- **C′** 维持随机 ambient — 与文档冲突，否决。  
- **Clarification 系统直出** — 破坏沉浸，否决。  
- **Clarification 纯 LLM** — 无 Key 不可玩，否决；采纳 **C 混合**。
