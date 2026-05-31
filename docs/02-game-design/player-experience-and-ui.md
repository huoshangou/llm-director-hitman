# 玩家体验与 UI

status: active  
source: archive/v0.1 §15, §17 · [player-interaction-loop.md](./player-interaction-loop.md)

玩家默认路径：**探索 → plan → 单步执行 → 演出 → replan**（非 Showcase 点步）。实现顺序见 [../07-planning/delivery-roadmap.md](../07-planning/delivery-roadmap.md)。

## 布局

```text
┌ Top HUD ─────────────────────────────────────────────────┐
├ 2.5D Map（主区）          │  Plan / 本局反馈            │
│                           │  ◉ 现场监听（电台·环境音）  │
├ Hacker Analysis（地图下底栏）· 点选实体骇入情报 ──────────┤
```

玩家 **不到场**：地图是远程传感与监控拼图；点击实体 = 骇入分析系统拉取可供性/情报，**不是**现场弹窗 Inspector。

`/play` 地图默认是 Hacker 的 **远程 camera viewport**：主视图优先放大当前任务走廊（大堂 / 画廊 / 目标 / 阳台），canvas 内 **minimap** 保留全局方位。点选仍是骇入分析，不是角色到场。

地图上必须有轻量区域名 / 传感标注，让玩家能看出 **Kitchen / Bar / Lobby / Gallery / Balcony**。Face / Runner 的可见标签须包含职责短语（交涉 / 执行），不要只靠 Brief 或右侧 Feed 解释身份。

## 情报通道（`/play` 正式版，ADR-0012 + adr14-v13）

| 通道 | 位置 | 触发 | 内容 |
|------|------|------|------|
| **骇入分析** | 地图下底栏 `#hacker-analysis` | 点选/悬停实体 | `buildHackerAnalysis`：物件/NPC 登记、已注册 affordance |
| **现场监听** | 右侧 `#hacker-feed` | boot、环境 tick、Turn 追问 | 干员电台（Field Agent Radio）、环境音；**不**承接点选物件卡 |

角色台词采用双通道：地图气泡短时显示 3-5 秒，右侧 Command Feed 保留 transcript。系统状态、NEXT、debug trace 不进气泡。

## `/play` 操作台与入门

- `/play` 第一屏是 Hacker 的远程操作台，不是传统俯视游戏 HUD。视觉关键词：监听、信号、权限、现场频道、传感器画面。
- **玩家可见文案**使用「指令 / 发送指令」，不用 `turn` / `plan` 作主词；`turn` 仍可在代码、规则层、TRACE、GM Debug 中出现。
- **Mission Brief**（Batch A）：固定开局 overlay，内容由产品文档写死，**不由 LLM 生成**；可 `?brief=1` 强制、`?brief=0` 跳过；关闭后同 session 不自动再弹；顶栏 `MISSION BRIEF` 可重开。Overlay 为 `position: fixed`，**不改变** `#map-stage` / `#hacker-analysis` 布局高度。
- 开局 Field Agent Radio 不阻塞输入（与 Brief 独立）。Face / Runner 说明职责后，引导「点地图看骇入分析 → 发送指令」。
- **Field Agent Reply**（A5+）：执行反馈层，基于 validation / tool result 的确定性队友回复；**不可**改变 `WorldState`（见 [play-game-brief-command-agent-reply-plan.md](../07-planning/play-game-brief-command-agent-reply-plan.md)）。
- 玩家发送指令后，Field Comms 追加 `YOU / <原始指令>`，输入框清空；blocked 与 success 均清空，错误从 transcript 回看。
- Hacker quick actions 只覆盖 Player 信息类 Tool；它们生成同样的 Tool 请求并走 validate / execute，不绕过规则。Face / Runner 现场动作仍通过自然语言计划、地图引用和 toolChain 表达。
- 玩家不输入指令时，环境只播放同区 idle vignette：NPC 可转移注意力、短暂停顿、发出环境监听文字、触发轻微高亮，但不得在 `/play` 展示层跨区移动。
- Idle vignette 的目标是让画面有「现场正在运转」的感觉，不承担关键解谜信息；关键因果仍来自玩家指令与 Tool/Ripple。

### Batch B（未做）：Command Dock

地图下方 `#hacker-analysis` 将升级为 **Command Dock**（选中 dossier + NEXT + 指令输入）；右栏只保留 Brief 摘要、Field Comms、Trace。见 [play-game-brief-command-agent-reply-plan.md](../07-planning/play-game-brief-command-agent-reply-plan.md) 与 [play-shell-layout.md](../05-engineering/play-shell-layout.md)。

## Hacker Analysis（底栏，P1+）

- 位置：地图 stage 下方全宽底栏（`/play`）
- **布局**：高度恒定 **148px**（CSS `--play-analysis-h`），文案在 `#hacker-analysis-body` 内滚动；**不得**挤占地图区。见 [play-shell-layout.md](../05-engineering/play-shell-layout.md)
- 内容优先级：玩家向任务情报 > 当前机会/阻断 > 已注册 affordance > 弱化技术 trace。
- 选中目标时，必须先说明 Victor 的身份、任务目标和当前可利用入口；不能以 `ATTACK SURFACE` / `target_phone` 等开发术语开头。
- 选中普通 NPC / 干员 / 物件时，先说明它和任务的关系，再给当前位置、可用行动或阻断因素。
- 不显示未注册 tool；不替玩家决策

## 指令输入（右栏，Batch A）

- 标题：**输入指令**；主按钮：**发送指令**。
- 状态文案示例：`正在解析指令…` · `指令已执行` · `指令未执行` · `继续下达指令`。
- Placeholder 可为自然语言示例（含 Face / Runner 分工）。
- 选中实体可插入 MAP REF；仅 selection、无文字时，transcript 使用固定 fallback：`YOU / <选中项> 处理这个`。
- `/gm` 保留 **GM Debug** 术语（本 Turn 计划、提交本 Turn（GM）），与玩家 `/play` 区分。

## Object Inspector（P1 必做）

点选物件时，**仅显示**已在 toolRegistry（ADR-0006）注册 tool 对应的 affordance hint（ADR-0012）。

**不显示** poison/swap/loop 等未实现能力。

点击 NPC → 情报卡（身份、区位、粗状态）；点击不触发 tool 执行。

选中项可插入 Plan 作为引用（P1 末 / P2）。

## 失败可视化

不能只文字：Guard 摇头、suspicion UI↑、Target 拒绝移动、Hacker 终端闪红、Guard 视线锥变红（week1 可选）。

## Debug Panel（开发必开）

DirectorPlan JSON · validated chain · precondition · world delta · timeline
