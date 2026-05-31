# Field Agent 与 Player

status: active  
source: ADR-0009 · archive §6–§7

## Player（你 = 幕后 Hacker）

- **视角**：监控/总览，看全场  
- **能力**：信息类 Tool（见 [tool-manifest](../04-domain/tool-manifest.md) Information 四件）  
- **状态**：traceRisk、network permissions（原 Hacker 字段）  
- **地图**：无 sprite；UI 用 hacker_portrait_* 作 comms 反馈  

## Field Agent（你指挥的队友）

| Agent | 职责 | Tool |
|-------|------|------|
| **Face** | 社交、伪装、引开保安 | create_complaint, impersonate_staff, lure_with_private_meeting, redirect_guard_attention |
| **Runner** | 物理、换装、终局 | impersonate_staff, spill_drink, move_cleaning_cart, disable_power_panel, tamper_balcony_rail, stage_accident |

Director **主要**为 Face/Runner 分配 social/physical；信息动作归 **player**。

### Face 可信度（非魔法引目标）

- **默认身份**：`coverIdentity = event_fixer`（艺术圈活动联络人 / event fixer）。可尝试 `lure_with_private_meeting`，但目标只会部分相信。  
- **更强背书**（可叠加）：
  - `modify_guest_list` 成功 → Face 升为 `vip_liaison`  
  - `fake_schedule_conflict` → `schedule_liaison`（私密观展/日程理由）  
  - `spoof_message` 已在目标手机植入匹配 belief → Face 社交链可引用同一叙事  
- **表现**：`lure_with_private_meeting` 的 route boost 与 cue/电台反馈必须解释「目标为何信/不信」，不得无 WorldState 依据地声称 VIP。

## 目标动机链 vs 场景控制链

**Target motivation routes**（改目标 belief / routeBias，引去阳台）：

| 链 | 道具/工具 | 作用 |
|----|-----------|------|
| Hacker 手机链 | `target_phone` + `spoof_message` | 伪造私密邀约 belief；选中 **target** 先显示玩家向目标 dossier，再说明目标手机可被伪造/篡改 |
| Face 社交链 | Face `coverIdentity` + guest DB / schedule / phone 背书 + `lure_with_private_meeting` | 可信社交诱导 |
| 服务借口链 | `waiter_uniform` + `wine_*` + `impersonate_staff` / `spill_drink` | 服务 pretext（非本批重点） |

**Scene control routes**（不改目标动机，改观察/环境/窗口）：

| 链 | 道具/工具 | 作用 |
|----|-----------|------|
| 清洁车挡视线 | `cleaning_cart` + `move_cleaning_cart` | 挡 guard/camera → balcony rail/threshold；`isSightlineClear(balcony)` |
| 配电低光窗口 | `power_panel` + `disable_power_panel` | 灯光↓、摄像头 visibility↓、guard 查厨房、stealth/low-light |
| 监控/证据 | `power_panel` + `hallway_camera` + `suppress_camera_record` | 先让摄像头进入 degraded / backup，再由 Player 压录证 |

**禁止混淆**：清洁车、配电箱 **不是**「另一种引目标去阳台」的动机道具；它们只服务事故链的观察与环境前置。

清洁车的价值应来自局部机会链：遮住门槛 / 服务动线 / 阳台边的观察窗口，并给 Runner 或 Face 制造一段可信移动理由；不应继续解释成远距离覆盖整张地图的万能挡线。

## NPC（世界侧）

（不变 — 见 archive §6）

### Target — Victor Vale

Motives：privacy、wine、business_deal。响应：可信私人邀约 → 倾向阳台；Verified staff 送酒 → 可能接受；警报/高怀疑 → 留人群。

### Guard / Waiter / Cleaner / Guest

（同前文档）

## 行为驱动

NPC 由 Belief、Route Bias、tickWorld 驱动（ADR-0002）。Field agent proximity（ADR-0003/0004）。Player 信息 tool 不受 location 约束。
