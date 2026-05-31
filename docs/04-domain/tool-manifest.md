# Tool Manifest

status: **active** — ADR-0006  
source: archive v0.1 §8–§10（细节见 archive §10）

## Week1 锁定（12 常规 + 1 final）

### Social

| id | Actor | 摘要 |
|----|-------|------|
| create_complaint | face | 行政/服务投诉，转移注意力 |
| impersonate_staff | face, runner | 服务员伪装（需 near uniform，ADR-0003） |
| lure_with_private_meeting | face | route bias + belief（跨区对白名单 ADR-0004） |
| redirect_guard_attention | face | 非安保 frame 引开 Guard |

### Information

| id | Actor | 摘要 |
|----|-------|------|
| spoof_message | **player** | 伪造消息 → belief |
| modify_guest_list | **player** | 前台记录 |
| fake_schedule_conflict | **player** | 日程冲突引移动 |
| suppress_camera_record | **player** | 压录证；需摄像头已处于 degraded / backup |

### Physical

| id | Actor | 摘要 |
|----|-------|------|
| spill_drink | face, runner | 清洁事件、水渍 |
| move_cleaning_cart | runner | 局部门槛 / 服务动线遮挡窗口 |
| disable_power_panel | runner | 高风险干扰 |
| tamper_balcony_rail | runner | 事故前置（同区 near） |

### Final

| id | Actor | 摘要 |
|----|-------|------|
| stage_accident | runner | 终局；需 target@balcony + rail tampered |

## 不在 Week1

| id | 原因 |
|----|------|
| loop_camera | 与 suppress 重叠 → ADR-0006 defer |

## 数量口径

- **12** 常规 tool（social 4 + info 4 + physical 4）  
- **+1** final（stage_accident）  
- 注册表共 **13** 个 `ToolId`

## 详细规格

每个 tool 的 precondition / ripple / 动画 → [archive §10](../archive/llm_director_hitman_demo_spec_v_0_1.md)

## Affordance 注意

对象上未实现的 affordance（poison_drink 等）不得出现在 Inspector hint（C11）。

## 道具因果注册（play-prop-causality-v1）

| 节点 | 因果轴 | 说明 |
|------|--------|------|
| `target_phone` | 目标动机 | 选中 target 即暴露；`spoof_message` → belief + routeBias |
| `guest_list_terminal` | 身份可信度 | `modify_guest_list` → Face `vip_liaison` |
| `cleaning_cart` | 局部机会窗口 | `move_cleaning_cart` → 挡门槛 / 服务动线 / 阳台边观察；**非**目标动机 |
| `power_panel` | 全局环境 | `disable_power_panel` → 低光、摄像头、guard 查厨房、stealth 窗口 |
| `hallway_camera` | 证据/可见度 | 配电异常后进入 degraded / backup，Player 才能 suppress |

**Target motivation tools**：spoof_message, lure_with_private_meeting, fake_schedule_conflict（+ 服务链）  
**Scene control tools**：move_cleaning_cart, disable_power_panel, suppress_camera_record, redirect_guard_attention
