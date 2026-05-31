# Architecture Decision Records

按 [ADR-FORMAT](~/.codex/skills/grill-with-docs/ADR-FORMAT.md)：`0001-slug.md` 递增编号。

## 何时写 ADR

同时满足：

1. 难逆转  
2. 无上下文会令人惊讶  
3. 真实权衡后的选择  

## 待 Grill 后可能产生的 ADR 主题

| 主题 | 对应冲突 |
|------|----------|
| ToolChain 执行顺序 | C4 | ✅ ADR-0005 |
| NPC 移动模型（bias + tick） | C2 | ✅ ADR-0002 |
| Agent location / proximity | C3 | ✅ ADR-0003 |
| ToolChain 执行顺序 | C4 |
| Week1 Tool Manifest | C5 | ✅ ADR-0006 |

## 索引

| ADR | 标题 | 状态 |
|-----|------|------|
| [0001](./0001-turn-model-replan-vs-full-chain.md) | Turn 模型：默认 Replan，Debug 全链 | accepted |
| [0002](./0002-npc-movement-bias-and-tick.md) | NPC 移动：Bias + tickWorld | accepted |
| [0003](./0003-agent-proximity-same-location.md) | Agent 同区 near，跨区 blocked | accepted |
| [0004](./0004-social-tools-cross-zone-whitelist.md) | Social Tool 跨区白名单 | accepted |
| [0005](./0005-toolchain-array-order.md) | ToolChain 数组顺序执行 | accepted |
| [0006](./0006-week1-tool-manifest.md) | Week1：12+final，无 loop_camera | accepted |
| [0007](./0007-graybox-map-then-art-swap.md) | 灰盒 Map → Day3 美术换皮 | accepted |
| [0008](./0008-social-frame-admin-vs-default.md) | frame: admin_issue \| default | accepted |
| [0009](./0009-player-is-hacker.md) | Player = Hacker；field = Face+Runner | accepted |
| [0010](./0010-validate-precondition-scan.md) | Precondition scan before execute | accepted |
| [0011](./0011-product-name-llm-director-hitman.md) | 对外产品名 | accepted |
| [0012](./0012-object-inspector-registered-affordances-only.md) | Inspector hint 范围 | accepted |
| [0013](./0013-runner-cross-zone-physical.md) | Runner 跨区 physical | accepted |
| [0014](./0014-play-idle-ripple-and-field-agent-radio.md) | Play Idle、Ripple Reactive、Field Agent Radio | accepted |
| [0015](./0015-parallel-operation-per-command.md) | 单条指令内并行 OperationSet | accepted |
| [0016](./0016-character-presence-and-reactive-hold.md) | 角色在场 + Reactive Hold | accepted |
| [0017](./0017-director-agent-loop-breaks-and-infiltrate-gallery.md) | Director agent 雏形 · Break · infiltrate_gallery | accepted |
| [0018](./0018-mission-frame-v1.md) | Mission Frame v1 | accepted |
| [0019](./0019-poison-balcony-executable-frontier.md) | Poison balcony chain + executable frontier | accepted |
| [0020](./0020-play-spatial-boundary-and-hacker-actions.md) | Play spatial boundary + Hacker action surface | accepted |
