# 场景：The Balcony Job

status: draft  
source: archive/v0.1 §5, v0.2 §7 initialWorld

## 地图拓扑

```text
Kitchen ---- Bar ---- Lobby ---- Gallery ---- Balcony
```

| Location | 要点 |
|----------|------|
| Lobby | Guest list terminal、Guard、Guest、Face 初始位置 |
| Bar | 酒杯、清洁车、Waiter、Cleaner |
| Kitchen | 服务员制服、配电板、Runner 初始位置 |
| Gallery | Target、走廊摄像头 |
| Balcony | 栏杆、私密、Guard 视线覆盖 |

## 初始对象（affordance 摘要）

| Object | Location | 关键 affordance |
|--------|----------|-----------------|
| guest_list_terminal | lobby | modify_guest_list, fake_schedule_conflict |
| wine_glass | bar | spill_drink |
| waiter_uniform | kitchen | impersonate_staff |
| cleaning_cart | bar | move_cleaning_cart |
| power_panel | kitchen | disable_power_panel |
| balcony_rail | balcony | tamper_balcony_rail, stage_accident |
| hallway_camera | gallery | suppress_camera_record |
| target_phone | target_inventory | spoof_message |

完整字段见 [../04-domain/world-state.md](../04-domain/world-state.md)。

## 坐标（MVP 平面布局）

Lobby ~(420,300) · Bar ~(260,300) · Kitchen ~(100,300) · Gallery ~(580,300) · Balcony ~(740,300)

→ NPC/Agent 详见 [npcs-and-agents.md](./npcs-and-agents.md)  
→ 验收路线见 [showcase-routes.md](./showcase-routes.md)
