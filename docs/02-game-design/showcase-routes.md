# Showcase 路线

status: active  
source: archive §16 · ADR-0001/0009

三条验收 plan。**分 turn 断言** → [showcase-turn-assertions.md](./showcase-turn-assertions.md)（实现前必读）。

## 路线 A — 私人邀约

**Tool 链（数组顺序 / Debug full）**：spoof_message → lure_with_private_meeting → redirect_guard_attention → tamper_balcony_rail → stage_accident

Player 第一人称；actor 为 player / face / runner。

## 路线 B — 酒水服务伪装

create_complaint | spill_drink → impersonate_staff → lure → tamper → stage_accident

## 路线 C — 清洁车挡视线

spill_drink → move_cleaning_cart → redirect_guard_attention → lure → tamper → stage_accident

## 验收

见 [showcase-turn-assertions.md](./showcase-turn-assertions.md) 与 [definition-of-done](../07-planning/definition-of-done.md)

## Fixture

`lib/routes/showcaseRoutes.ts` — 与 turn 断言同步
