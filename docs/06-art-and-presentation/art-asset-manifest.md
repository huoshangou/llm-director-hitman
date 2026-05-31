# 美术资产清单（Week1）

status: active  
owner: steve  
source: 2026-05-25 设计输入

**目标不是「资产很多」，而是「世界状态一眼可读」。**

原则：语义计划 → 确定性状态变化 → **overlay / 状态图** 让玩家看见涟漪（对齐 ADR-0001/0002）。

---

## 1. 主场景

| 资产 | 数量 | 说明 |
|------|------|------|
| `gallery_event_map` | 1 | 完整 2.5D / 俯视角画廊酒会**底图**（一次性，不拼 tile） |
| `location_highlight_lobby` | 1 | Lobby 半透明高亮 |
| `location_highlight_bar` | 1 | Bar |
| `location_highlight_kitchen` | 1 | Kitchen |
| `location_highlight_gallery` | 1 | Gallery |
| `location_highlight_balcony` | 1 | Balcony |

**风格**：高级桌面沙盘 / 微缩舞台（Maquette diorama）。少量动画也不廉价。

**与 archive MVP 差异**：原蓝图为 div 色块；本文档升级为**单张底图 + 区域高亮** → 见 [../08-alignment/open-conflicts.md](../08-alignment/open-conflicts.md) C10。

**工程**：五区高亮可 SVG mask 或 PNG overlay；坐标锚点见 [../02-game-design/scenario-balcony-job.md](../02-game-design/scenario-balcony-job.md)。

---

## 2. 核心角色（Cutout 状态图，非逐帧）

### Face

| 状态 | 文件 |
|------|------|
| idle | `face_idle.png` |
| talking | `face_talking.png` |
| confident | `face_confident.png` |
| exposed | `face_exposed.png` |

### Runner

| 状态 | 文件 |
|------|------|
| idle | `runner_idle.png` |
| moving | `runner_moving.png` |
| disguised_waiter | `runner_disguised_waiter.png` |
| interacting | `runner_interacting.png` |
| hidden | `runner_hidden.png` |
| exposed | `runner_exposed.png` |

### Hacker（= Player UI；ADR-0009，不在 map 上）

| 状态 | 文件 |
|------|------|
| portrait_idle | `hacker_portrait_idle.png` |
| typing | `hacker_typing.png` |
| success | `hacker_success.png` |
| warning | `hacker_warning.png` |

### Target

| 状态 | 文件 |
|------|------|
| idle | `target_idle.png` |
| checking_phone | `target_checking_phone.png` |
| holding_drink | `target_holding_drink.png` |
| moving | `target_moving.png` |
| suspicious | `target_suspicious.png` |

### Guard

| 状态 | 文件 |
|------|------|
| watching | `guard_watching.png` |
| distracted | `guard_distracted.png` |
| investigating | `guard_investigating.png` |
| suspicious | `guard_suspicious.png` |
| alarmed | `guard_alarmed.png` |

### Waiter / Cleaner / Guest

| 角色 | 状态 |
|------|------|
| waiter | idle, moving, confused |
| cleaner | idle, cleaning, pushing_cart |
| guest_cluster | idle, watching, startled |

**命名**：`{role}_{state}.png`，放 `public/sprites/characters/`。

---

## 3. 关键物件（Tool 落点，必须可读）

| 物件 | 状态 |
|------|------|
| guest_list_terminal | normal, modified, error |
| wine_glass | clean, spilled, served |
| wine_bottle | normal |
| waiter_uniform | available, taken |
| cleaning_cart | idle, blocking |
| power_panel | normal, tampered |
| hallway_camera | active, disabled | （`looped` 视觉 defer，无 loop_camera tool）
| balcony_rail | normal, tampered |
| target_phone | message_received |
| kitchen_door | normal |

**命名**：`public/sprites/objects/{object}_{state}.png`。

---

## 4. 状态 Overlay（涟漪可视化 — **最高优先级**）

| Overlay | 用途 | 典型触发 |
|---------|------|----------|
| `attention_line.png` | NPC 注意力指向 | attention_shift |
| `sight_cone_guard.png` | 保安视线 | guard watching_security |
| `sight_cone_blocked.png` | 视线被挡 | move_cleaning_cart, sightline_blocked |
| `suspicion_question.png` | NPC 怀疑 | tool partial/failed |
| `suspicion_alert.png` | 警觉上升 | alert_change |
| `hacked_icon.png` | 信息工具生效 | modify_guest_list 等 |
| `fake_message_icon.png` | 伪造消息 | spoof_message |
| `disguise_icon.png` | 伪装生效 | impersonate_staff |
| `route_arrow.png` | 路线改变 | route bias ↑（tick 前） |
| `opportunity_window.png` | 可行动窗口 | guard distracted + sightline clear |
| `accident_ready.png` | 事故条件成立 | rail tampered + target balcony |
| `spill_overlay.png` | 水渍 / 酒渍 | spill_drink |
| `noise_pulse.png` | 人群 / 噪音 | crowd noiseLevel |
| `private_meeting_belief.png` | 目标信私人会面 | belief + spoof/lure |
| `admin_issue_belief.png` | 保安当行政问题 | redirect + frame admin |

**命名**：`public/sprites/overlays/`。

**与 GameEvent 映射**：实现阶段维护 `eventTemplates.ts` → overlay id；见 [../04-domain/event-timeline.md](../04-domain/event-timeline.md)。

**与 ADR-0002**：`route_arrow` / `private_meeting_belief` 在 **bias 变化时**显示，**npc_move** 时切 `target_moving` + 可选隐藏 arrow。

---

## 5. UI 资产

| UI | 用途 | Week1 实现 |
|----|------|------------|
| crew_card_frame | Agent 卡片 | PNG 或 Tailwind |
| objective_panel | 目标面板 | 可 CSS |
| alert_meter | 警戒条 | 可 CSS |
| suspicion_meter | 怀疑条 | 可 CSS |
| tool_chip_social / info / physical | 工具标签 | 可 CSS |
| timeline_event_frame | 事件链卡片 | 可 CSS |
| plan_input_panel | 输入框背景 | 可 CSS |

**不必全部出图**；优先 overlay + 角色状态 + 主场景底图。

---

## 6. 生产优先级（Week1）

| 优先级 | 内容 | 理由 |
|--------|------|------|
| P0 | `gallery_event_map` + 5 高亮 | 可读地图 |
| P0 | Target / Guard / Runner 核心状态 + overlay（belief、sight、spill、accident_ready） | 因果链可见 |
| P1 | Face + Hacker 头像 + 物件 state（terminal, rail, cart, camera） |
| P2 | Waiter/Cleaner/Guest + 其余 UI 装饰 PNG |
| P3 | noise_pulse、多余 UI frame |

---

## 7. 待 Grill / ADR

| 话题 | 说明 |
|------|------|
| **C10 2.5D** | ✅ ADR-0007 — Day1–2 灰盒；Day3+ 正式底图 |
| Face 跨区 social | ✅ ADR-0004 白名单 |
| **Overlay ↔ WorldState** | 谁负责：GameEvent 驱动 vs 直接读 state（建议 Event + 持久 state 双驱动） |
| **move_agent 美术** | 若后续 ADR 允许 Runner 跨区移动，需 `runner_moving` + location 插值 |

---

## 8. 目录结构（代码阶段）

```text
public/sprites/
  map/gallery_event_map.png
  map/location_highlight_{lobby,bar,kitchen,gallery,balcony}.png
  characters/
  objects/
  overlays/
  ui/          # 可选
```
