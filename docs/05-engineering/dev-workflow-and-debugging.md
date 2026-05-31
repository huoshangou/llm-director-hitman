# 开发与调试

status: draft  
source: archive/v0.2 §23–§26

## 实现顺序

1. types + initialWorld + 静态 Map UI  
2. toolRegistry + resolveTool + 手写 DirectorPlan 按钮  
3. buildTimeline + EventLog  
4. director API + 全链路  
5. showcase 调通  
6. polish  

## 不要一上来调 prompt

排查顺序：world summary → registry → schema → validate → resolveTool → timeline → prompt

## Turn 模式（ADR-0001）

- **玩家路径**：`executePlan(world, plan, { mode: "step" })` — 每提交一次 plan 只跑一步  
- **测试路径**：Debug Panel「Run full chain」→ `mode: "full"` — 禁止作为默认 UI  

Showcase 调试可先用 full chain 通 resolver；**验收必须用 step 多 turn**，对照 [showcase-turn-assertions.md](../../02-game-design/showcase-turn-assertions.md)。

## 实现阶段 Skills（见 CLAUDE.md）

- Superpowers：`executing-plans` · `verification-before-completion` · `systematic-debugging` · `test-driven-development`  
- 改完跑 showcase 断言，不单测 happy path

## 手写 DirectorPlan 模板

接 LLM 前用 manual plan 验证 spoof → lure 等链。

## JSON 修复

safeParseJson 提取 `{...}`；失败返回 feasibility partial + 空 toolChain，前端不崩。

## 工程判断摘要

- week1：**单 Director 编排**多 agent，非多 planner  
- 确定性 score，非随机  
- MVP 时间不给动画系统  
- UI 承诺有限 affordance，非无限自由  

## simulate 位置

可 client-side 减 latency — 未 ADR。
