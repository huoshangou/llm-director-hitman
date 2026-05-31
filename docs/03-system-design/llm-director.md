# LLM Director

status: draft  
source: archive/v0.1 §12, v0.2 §16–§19

## 输入

- playerPlan  
- worldSummary（压缩 WorldState，非全文）  
- **player** 能力（trace、permissions、信息 tool）  
- **field agents**：face、runner  
- npcs / objects / tools 摘要  

## 编排规则（ADR-0009）

- Information tool → `actor: "player"`  
- Social / physical → `actor: "face" | "runner"`  
- 不必单独规划 Hacker 队友  

## 输出 — DirectorPlan

| 字段 | 用途 |
|------|------|
| recognizedIntent | 语义目标 |
| planStyle | low_profile, social_engineering, … |
| constraints | hard / soft |
| assumptions | Director 假设 |
| feasibility | high … impossible |
| toolChain | ToolUseRequest[] |
| unsupportedParts | 不可执行片段 + reason |
| fallbackSuggestions | 降级 toolChain |
| riskSummary | 风险列表 |
| playerFacingSummary | 玩家可读摘要 |
| agentComms | 角色通讯文本 |

## 禁止输出

- 直接 `target.location = …`  
- 直接 objective.complete  
- 未注册 tool / 不存在 object  
- 仅自由文本、无 JSON  

## Prompt 要点

- JSON only  
-  subtlety → social/information tools  
-  avoid alarm → 避免 disable_power_panel（除非无替代）  
-  stage_accident 需 plausibly 已有 setup  
-  params.message（spoof）、params.frame（admin_issue / service_problem / …）  

**frame 在 Zod schema 与 handler 中尚未贯通** → open-conflicts

## 校验

1. toolId ∈ manifest（ADR-0006）  
2. actor ∈ { player, face, runner }（ADR-0009）  
3. target 存在且类型对  
4. **precondition scan**（ADR-0010）  
5. hard constraint / frame warning（ADR-0008）  
6. 无矛盾循环  

实现：`validateDirectorPlan.ts` + `checkPreconditions`

## 调试顺序（v0.2 §23）

1. world summary affordance  
2. tool registry 描述  
3. director schema / params  
4. validate 误杀  
5. resolveTool precondition  
6. timeline 显示  
7. **最后**调 prompt  

接 LLM 前先用手写 DirectorPlan 跑通 pipeline。

## 金句回归（2026-05-28）

真源：`lib/director/routeGoldenPlans.ts` · `npm run test:director-golden`（含 `test-plan-stub-golden`）。

| 玩家输入 | 选中 | 期望第一步 |
|----------|------|------------|
| 伪造阳台私密短信 | — | `spoof_message` |
| 让 Face 引开保安 | — | `redirect_guard_attention` |
| 让 Runner 断电 | — | `disable_power_panel` |
| 把目标引到阳台 | — | `lure_with_private_meeting` |
| 处理这个 | `guest_list_terminal` | `modify_guest_list` |
| 动这个栏杆 | `balcony_rail` | `tamper_balcony_rail` |

- **无 API key**：`compilePlanFromText` stub 全绿（CI 硬门槛）。
- **有 key**：同表跑 `compileDirectorPlan`，控制台打印对齐率，**不**在无 key 环境 fail。
- 默认模型：见 `.env` / BYOK `llm-settings`（OpenRouter 或 OpenAI 兼容）。
- 失败样例与 prompt 调整：先查 `validateDirectorPlan` / precondition，再改 prompt（见上方调试顺序）。

## ToolChain 顺序（ADR-0005）

- `toolChain` **数组顺序即执行顺序**（full chain）  
- step 模式每 turn 跑 **OperationSet**（每 actor 至多一步，多 actor 并行；ADR-0015）  
- `priority` 可选，仅用于摘要/Debug，**不参与排序**  
- 终局 tool（`stage_accident`）应排在 setup 之后
