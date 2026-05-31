# 设计文档索引

> **从这里开始。** 本周协作以 `docs/` 分类文档为真源；GPT 原始全文在 [`archive/`](./archive/)。

## 阅读顺序（新人 / Agent）

0. **[08-alignment/agent-handoff.md](./08-alignment/agent-handoff.md)** — **发给新 agent 的单页交接**（先理解，等 Steve 指示再动手）
1. [01-vision/product-brief.md](./01-vision/product-brief.md) — 做什么、为什么需要 LLM
2. [02-game-design/scenario-balcony-job.md](./02-game-design/scenario-balcony-job.md) — 唯一关卡切片
3. [03-system-design/architecture-overview.md](./03-system-design/architecture-overview.md) — 三层架构
4. [03-system-design/play-turn-execution-spec.md](./03-system-design/play-turn-execution-spec.md) — **Play 单条指令执行真源**（编译→多 wave→Feed）
5. [08-alignment/open-conflicts.md](./08-alignment/open-conflicts.md) — **必须先对齐的冲突**
6. [07-planning/week-schedule.md](./07-planning/week-schedule.md) — 本周排期；续作见 [delivery-roadmap.md](./07-planning/delivery-roadmap.md) · 执行计划 [remaining-roadmap-execution-plan.md](./07-planning/remaining-roadmap-execution-plan.md) · 录 demo [demo-script.md](./07-planning/demo-script.md)

## 文档分类

| 目录 | 类型 | 回答的问题 |
|------|------|------------|
| [01-vision/](./01-vision/) | 产品愿景 | 为什么做、边界在哪 |
| [02-game-design/](./02-game-design/) | 游戏设计 | 玩什么、谁在哪、路线与 UX |
| [03-system-design/](./03-system-design/) | 系统设计 | 模块怎么拆、LLM 怎么接 |
| [04-domain/](./04-domain/) | 领域模型 | WorldState、Tool、规则、事件 |
| [05-engineering/](./05-engineering/) | 工程实现 | 技术栈、目录、API、调试 |
| [06-art-and-presentation/](./06-art-and-presentation/) | 美术与表现 | MVP 长什么样、换皮策略 |
| [07-planning/](./07-planning/) | 计划与验收 | 排期、DoD、砍 scope |
| [08-alignment/](./08-alignment/) | 对齐与决策 | 冲突、grill、**changelog**、决策记录 |
| [adr/](./adr/) | 架构决策 | 难逆转、需留痕的选择 |
| [archive/](./archive/) | 历史归档 | GPT v0.1 / v0.2 全文 |

## 文档状态约定

每篇文档文首可选 frontmatter：

```yaml
status: draft | active | superseded
source: archive/v0.1 §N, internal
owner: steve | agent
```

- **draft**：从 archive 抽取，可能含未决冲突
- **active**：已对齐，可作为实现依据
- **superseded**：被 ADR 或新文档取代

## 真源优先级

```text
1. docs/adr/（status: accepted）
2. docs/08-alignment/decision-log.md（grill 已确认项）
3. docs/ 各分类 active 文档
4. docs/archive/（仅作追溯，不覆盖已 accepted ADR）
5. CONTEXT.md（术语；与 ADR 冲突时以 ADR 为准）
```

## 维护约定

- **实现批次** → 先写 [08-alignment/changelog.md](./08-alignment/changelog.md)，再改代码（见 CLAUDE.md）
- 改体验 → `02-game-design/` + 必要时 ADR
- 改规则/数据结构 → `04-domain/` + CONTEXT.md
- 改技术方案 → `05-engineering/` + ADR
- 术语争议 → grill → CONTEXT.md → ADR（若难逆转）
- 不直接在 archive 里改字；修正写分类文档 + 在 archive/README 记变更说明

## 根目录

- [`../CLAUDE.md`](../CLAUDE.md) — 项目工程约定
- [`../CONTEXT.md`](../CONTEXT.md) — 术语表
