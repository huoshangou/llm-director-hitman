# ADR-0019: Poison balcony chain + executable frontier (7b)

status: accepted  
date: 2026-05-28

## Context

Grill #8：毒酒须为三 tool 链，非单一 macro；#7：7b 多 actor 同 turn 执行链上全部当前可执行步；Balcony Mandate：致命须在阳台。

## Decision

### Tool chain

| Tool | Actor | 要点 |
|------|-------|------|
| `prepare_poisoned_drink` | runner | 吧台 `wine_bottle` → `poisoned` |
| `serve_poisoned_drink_on_balcony` | face（主）/ runner | `target@balcony` + 已 poisoned → `poison_served` |
| `resolve_poison_on_balcony` | face / runner | `poison_served` + `target@balcony` → `targetHandled`, `style: poison` |

备酒在 **bar**；喝与结算在 **balcony**（与 CONTEXT「Poison balcony chain」一致）。

### Execution (7b)

- `buildOperationSet(chain, …, world)`：按 **链顺序**，每 actor 取 **第一个** precondition 满足的步骤；不同 actor 可同 turn 并行。
- 无 `world` 参数时保留 legacy `pickBest`（单测兼容）。
- `executeOperationSet` 始终传 `world` 走 frontier。

### Intent

- `recognizeIntentOutcome`：毒酒意图 → **convertible**，引导 Director 编链，不再 `out_of_slice`。

### Terminal

- `classifyTerminalState`：`style === "poison"` 且 `targetHandled` → 阳台毒杀成功标签。

## Consequences

- `directorConstraints` 须列出三 tool 与阳台 mandate。
- 非阳台递毒不得 `targetHandled`。

## 实现记录

| 日期 | 内容 |
|------|------|
| 2026-05-28 | registry · resolveTool · buildOperationSet frontier · terminalState · tests |
