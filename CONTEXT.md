# LLM Director Hitman Demo

一个 LLM 编译玩家暗杀计划、确定性沙盒结算因果、2.5D 画面回放的小型 demo。

## Language

### 体验层

**Player（玩家）**  
幕后 Hacker：通过监控/总览观察场景，输入 Plan，执行信息类 Tool，指挥 Face 与 Runner。  
_Avoid_: 与 Face/Runner 并列的「第四个 agent」

**Hacker Analysis（骇入分析）**  
玩家点击地图实体后，**地图下底栏**展示的只读情报与可供性摘要；表示远程传感/数据分析结果，非现场弹窗。  
**Field Agent Radio / 现场监听**（侧栏）仅干员追问、环境音、boot 情报 — **不**重复点选物件卡。  
_Avoid_: Inspector（易与 GM 调试面板混淆）；点选情报写进侧栏气泡（已废弃，见 changelog adr14-v13）

**Plan（计划）**  
玩家输入的自然语言暗杀方案。  
_Avoid_: prompt, command（易与 LLM prompt 混淆）

**Director / LLM Director**  
将 Plan 编译为 DirectorPlan（意图、约束、工具链）的 LLM 层；不直接改世界。职责是 **在规则内实现玩家合理描述**（有序 toolChain），而非写死 turn 剧本。  
_Avoid_: GM, narrator；把 Director 当成固定关卡步骤表

**DirectorPlan**  
Director 的结构化输出：intent、constraints、toolChain、unsupportedParts 等。

**Executable frontier（可执行前沿）**  
Director 将玩家意图编为有序 toolChain；每 turn 引擎执行链上 **当前 precondition 已满足** 的步骤（7b：多 actor 可同 turn 各执行一步）。未满足步骤通过 NEXT/电台说明缺口，而非写死 turn 剧本。  
_Avoid_: 固定 Turn1/2/3 关卡表

**Poison balcony chain（阳台毒酒链）**  
本切片毒杀路线三件套：**备毒**（吧台酒具）→ **阳台递毒酒** → **阳台发作/结算**；致命须在 Balcony Mandate 下完成。  
_Avoid_: 大堂递酒即算胜利；用单一 macro 替代三 tool 却称「LLM 编排」

**Showcase Route（展示路线）**  
文档预设的可行计划样例，用于验收 demo（至少 3 条）。

**Mission Frame（任务框架）**  
本切片固定的叙事骨架：玩家身份、队友分工、目标动机、为何选择阳台事故；由固定文案（Brief/电台/骇入分析）传达，不由 LLM 每局生成。Brief **只强调阳台目标**，不罗列「禁止的死法」；其它想法由执行层（tool/break/电台）回应。  
_Avoid_: 与 DirectorPlan 或单条 Plan 混为一谈；在 Brief 里写死「不接受毒杀/枪杀」

**Victor Vale（维克多·韦尔）**  
本 demo 暗杀目标：借画廊晚宴洗画款、转手脏名录的中间人；玩家与 Field Agent 可见文案统一用此名。  
_Avoid_: 泛称「目标」与具名混用（实现层 `npc.id` 仍为 `target`）

**Balcony Mandate（阳台终局）**  
本切片要求 Victor **在阳台倒下/被处理**；栏杆事故与毒酒等路线均须先满足「人在阳台」再结算致命结果。  
**叙事双支柱（Mission Frame 真源）**：**阳台私密赏画单杯**（Victor 只在该情境接酒，行动线）+ **雇主要阳台事故画面**（合同动机，非室内毒杀新闻）。  
_Avoid_: 在室内其它区域毒倒仍算胜利；Brief 里罗列「禁止毒杀」

**Hacker Quick Action（Hacker 快捷操作）**  
玩家控制面板上的信息类操作入口；产生与自然语言 Plan 相同的 Player Tool 请求，并接受同一套 validate / execute 约束。  
_Avoid_: 绕过 Director / ToolResolver 的 UI 作弊按钮；把 Face/Runner 现场动作做成 Hacker 按钮

### 世界层

**WorldState**  
唯一真实世界状态；仅能通过 Tool 执行改变。  
_Avoid_: game state（太泛）

**Affordance**  
世界中对象/NPC/地点可被工具利用的能力边界（不是 UI 按钮）。  
_Avoid_: action, ability（易与 agent skill 混淆）

**Opportunity Chain（机会链）**  
玩家可推理的 affordance → Tool → Precondition → Ripple 串联关系；用于解释“为什么这个道具值得用”。  
_Avoid_: 作为新引擎层；恢复旧称 Opportunity Engine

**Tool**  
注册在 ToolRegistry 中的确定性动作；有 precondition、cost、effect、ripple。  
_Avoid_: skill（指 agent 属性时用 Skill）

**ToolChain**  
DirectorPlan 中有序 Tool 列表；**数组顺序即 full chain 执行顺序**（ADR-0005）。step 模式每 turn 仅执行第一项。

**Ripple（涟漪）**  
一次 Tool 结算触发的次级世界变化（NPC 任务、移动、警觉等）。Reactive NpcIntent 的**真源**；须登记 **Ripple Scope** 决定波及范围。  
_Avoid_: 与无来源的 Default 例行换区混为一谈

**Ripple Scope（涟漪范围）**  
| Scope | 含义 | 例 |
|-------|------|-----|
| **local** | 单对象/单区 | 洒酒、挪清洁车 |
| **zone** | 一连通区域 | 画廊灯光骤降 |
| **global** | 全场 | 配电破坏 → 停电、全场骚动 |

**Navigation Boundary（导航边界）**  
静态地图上的可行走语义层：Location 的可行走范围、区间门/门槛、移动通道与动作落点。用于表现层防穿墙，不替代规则层 `connectedTo`。  
_Avoid_: physics collision、完整寻路系统

**Portal（区间门 / 门槛）**  
两个 Location 之间可通行的连接点；角色跨区演出应经 Portal 进入相邻区。  
_Avoid_: 任意两个区域锚点直接直线插值

**Arrival Anchor（动作落点）**  
某个角色在某个 Location 或 Tool 结束时的语义落点。比 Location 粗锚点更具体。  
_Avoid_: 所有动作共用房间中心点

**Agent Clarification（干员追问）**  
Field Agent 在 Plan/DirectorPlan **信息不足或不可行**时不擅自行动，以**现场无线电口吻**向 Player 做引导性发问或给替代建议；与 NPC Reactive 并行。  
_Avoid_: 把干员当成无指令也会乱跑的 NPC；把校验错误原文贴给玩家

**Field Agent Radio（现场干员频道）**  
**Agent Clarification** 的呈现层：Face/Runner 台词进入「Hacker · 现场监听」式 UI（截获/耳机频道），可由 **固定对话模板** 或 **LLM 润色** 生成，但必须是角色内引导问句。  
_Avoid_: 系统 comms、plan-status 红字、unsupportedParts 裸文案

**Speech Bubble（场上气泡）**  
角色或现场对象在地图上的短时可见台词 / cue；3-5 秒消失，右侧 Feed 保留 transcript。  
_Avoid_: 用气泡承载长日志、debug JSON、规则解释全文

**NpcBehavior Runtime（场内行为运行时）**  
确定性「基础行为树」：Default NpcIntent + Reactive（Ripple Scope × 角色表）+ Turn 末 tickWorld；**不**每帧由 LLM 直接改 NPC。  
_Avoid_: 与 **Director**（语义编译层）混为同一颗「大脑」

**Director Override（导演接管）**  
LLM Director 通过 **DirectorPlan → Tool → Ripple/Belief/Bias/task** 与 **Field Agent toolChain** 介入世界，而非替代 NpcBehavior Runtime 逐步演算。  
_Avoid_: LLM 直接写 `npc.location`（违反 ADR-0002 / product-brief）

**Belief**  
NPC 对某命题的确信；影响行为倾向，不等于立即执行玩家意图。

**Route Bias（路线偏置）**  
NPC 前往某 Location 的累积倾向值；**仅**在 turn 末 `tickWorld()` 达阈值时触发 `npc_move`。Tool 不得直接改 NPC location。  
_Avoid_: pathfinding（本 demo 不做复杂寻路）

### 角色层

**Field Agent（field agent / 队友）**  
玩家指挥的场内行动者：**Face**、**Runner**。Director 主要为二者分配 social/physical tool。  
_Avoid_: 把 Player 算作第三个 agent

**Face / Runner**  
Field agent 具体职责不变（社交 vs 物理）。

**Player-as-Hacker**  
信息类 Tool 的执行者；`remote`，不在 map 上行走。见 ADR-0009。

~~**Agent（Hacker）**~~  
不再作为独立 world agent；Hacker 美术资源 = 玩家 comms UI。

**NPC**  
世界自主角色：Target、Guard、Waiter、Cleaner、Guest。

**Target**  
暗杀对象（Victor Vale）。

### 规则层

**Alert Level**  
场景全局警觉阶段：calm → curious → suspicious → searching → lockdown → alarm。

**Suspicion**  
全局或个体对玩家/agent 的怀疑数值。

**Trace Risk**  
数字操作（Hacker 工具）留下的可追溯风险。

**Precondition**  
Tool 执行前必须满足的世界条件。

**Field Agent Proximity（同区 near）**  
Field agent（Face、Runner）执行需贴近的 Tool 时，与目标须**同一 Location**，跨区 **blocked**。Social 白名单对 NpcId 可跨区（ADR-0004）。**Player** 信息类 Tool 不受 location 约束。

**Social Frame**  
Social tool 的 `params.frame`：week1 仅 `admin_issue` | `default`（ADR-0008）。

**tickWorld()**  
Turn 末规则 pass：汇总 Route Bias、routine、currentTask，决定是否生成 **npc_move** 及次级涟漪；见 ADR-0002。

**Play Idle（场内待机）**  
玩家未提交本 Turn Plan 的等待阶段。确定性 **NpcIntent** 可推进 attention/task；**`/play` 展示**下 `playIdle` **不更新 npc.location**（避免区锚点直线 lerp 穿墙）。Turn 末仍完整 `tickWorld`。  
_Avoid_: ambient burst（易误解为「背景随便动」）

**NpcIntent（场内意图）**  
NPC 在确定性沙盒中的行为取向：Motive + attention + currentTask + Belief/Route Bias；**不是** DirectorPlan 或 Tool 上的 `intent` 字段。  
_Avoid_: 与 Plan 编译「意图」混用

**Default NpcIntent（默认场内意图）**  
开局或平静时的慢节奏例行取向（如保安巡大堂、服务生守吧台）。Play Idle 在无外界扰动时推进。  
_Avoid_: random_patrol（无来源换区）

**Reactive NpcIntent（反应场内意图）**  
由玩家 Tool 涟漪、Alert、场面事件（洒酒、停电、骚动、伪造信息等）触发的取向；**优先于** Default，使 NPC 对「大闹宴会」有可见反应。  
_Avoid_: 把 Reactive 写死在开局 schedule 里（否则玩家行动后无人理会）

**Turn（回合）**  
玩家提交 Plan → Director 编译 → **执行 toolChain 的第一步** → timeline 播放 → **tickWorld()** → 等待下一次 Plan。  
_Avoid_: round（太泛）  
**Debug Run full chain**：测试模式下一次性跑完 toolChain；非玩家默认。见 ADR-0001。

### 表现层

**GameEvent**  
表现层唯一输入；Timeline 播放的基本单元（移动、气泡、警觉变化等）。

**Timeline**  
一次执行产生的 GameEvent 有序列表。

## Relationships

- 一个 **Plan** 经 **Director** 产生一个 **DirectorPlan**
- **DirectorPlan.toolChain** 中的每个 **Tool** 经 **ToolResolver** 改变 **WorldState** 并生成 **GameEvent**
- 每个 **Turn** 末 **tickWorld()** 驱动 **NPC** 移动（非 Tool 直接改 location）
- **NPC** 行为由 **Belief**、**Motive**、**Route Bias** 与 **Alert Level** 共同驱动，不直接服从 **Plan** 文本
- **Player** 执行信息 Tool；**Field Agent**（Face、Runner）执行 social/physical Tool  
- **Field Agent** 通过 Tool 行动；Player 不受 proximity 约束

## Example dialogue

> **Dev:** 玩家是谁？要单独规划 Hacker agent 吗？  
> **Domain expert:** **玩家就是幕后 Hacker**。Director 只给 Face、Runner 分 social/physical 活；伪造短信这类是 **player** 自己的 tool。

> **Dev:** 玩家说「让 Target 去阳台」…  
> **Domain expert:** Tool 只加 Belief/Route Bias；**tickWorld()** 才 npc_move。

## Flagged ambiguities

- **Turn** · **NPC** · **Proximity** · **ToolChain** · **Tools** · **Map** · **Frame** · **Player** · **Validate** · **命名** · **Inspector** · **Showcase turns** → ✅ ADR-0001–0012
