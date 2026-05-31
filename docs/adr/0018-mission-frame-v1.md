# ADR-0018: Play Mission Frame v1

status: accepted  
date: 2026-05-28

## Context

玩家开局 10s 内须能回答：目标是谁、为何阳台、队友分工。此前 Brief 泛称「目标」，与 grill 决议（Victor Vale、C+A 叙事、Brief 不做法案式禁止清单）不一致。

## Decision

1. **具名目标**：全 Play 可见文案统一 **Victor Vale（维克多·韦尔）**（`npc.id` 仍为 `target`）。
2. **Mission Frame 真源**：`lib/mission/missionFrame.ts` 导出 `MISSION_BRIEF_LINES`、`MISSION_OPS_LINE`；Brief / Command Feed / 测试共用。
3. **Brief 原则**：只强调阳台意外与「阳台单杯」时机；不写「禁止毒杀/枪杀」清单。
4. **开局电台**：`openingRadioLines()` 与 Brief 同一 fiction，3–5 句。
5. **骇入分析**：点选 target / wine / rail / power / cleaning_cart 各有一句任务关系（`hackerIntel`）。
6. **Feed**：`resetPlayerGame` 首条 `MISSION /`（非 LLM）。

## Consequences

- 新 fiction 改 `missionFrame.ts` + `hackerIntro` / `hackerIntel` + 测试。
- DirectorPlan / LLM 不负责生成任务提要。

## 实现记录

| 日期 | 内容 |
|------|------|
| 2026-05-28 | `missionFrame.ts` · `mission-brief.js` · `hackerIntro` · `hackerIntel` · `labels` · `test-play-mission-brief-ui` · `test-mission-frame` |
