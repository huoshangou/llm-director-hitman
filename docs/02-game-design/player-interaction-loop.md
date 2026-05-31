# 玩家交互循环

status: active  
source: Steve 2026-05-26 · ADR-0009 · ADR-0012 · ADR-0001  
owner: steve

## 一句话

**监控室 Hacker**：鼠标探图发现可供性 → 脑内串联方案 → 自然语言（含选中引用）下令 → 看一条因果演出 → 再探图、再 plan。

## 循环

```text
悬停高亮 → 点击物件/NPC → Inspector（只读）
       ↓
Plan 输入（可选插入 [配电箱] 等引用）
       ↓
Validate → 执行本 turn 第一步 tool
       ↓
Timeline 播放 → 世界更新
       ↓
Replan（下一 turn）
```

## 分层职责

| 层 | 玩家做什么 | 系统做什么 |
|----|------------|------------|
| 探索 | 移动鼠标、点击 | 高亮、Inspector、affordance hint（已注册 tool only） |
| 构思 | 自由思考、写自然语言 | 不自动推荐「下一步」 |
| 指挥 | 提交 plan | Director 编译 toolChain；step 只跑一步 |
| 观察 | 看地图与 Log | TimelinePlayer + 状态变化 |

## 不是什么

- **不是**在地图上点「断电/下药」直接结算（行为树 UI）。  
- **不是** Showcase「执行本步」作为默认玩法（那是验收路径）。  
- **不是** LLM 直接拖 NPC 或改 object（违反分层）。

## 与队友 / 黑客动作

- **Player**：`spoof_message`, `modify_guest_list`, `fake_schedule_conflict`, `suppress_camera_record` 等（见 ADR-0009）。  
- **Face / Runner**：写在同一条 plan 里，由 Director 排进 toolChain；玩家通过 Inspector 理解「谁能碰什么」，而非系统自动代劳。

## UI 默认布局

见 [player-experience-and-ui.md](./player-experience-and-ui.md)。Inspector 在选中时出现；Plan 在底部常驻。

## 实现顺序

见 [../07-planning/delivery-roadmap.md](../07-planning/delivery-roadmap.md) **P1 → P2 → P3**。
