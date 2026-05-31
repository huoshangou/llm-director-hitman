# Navigation Boundary

status: active  
source: ADR-0020

## 目的

`/play` 的底图是静态 2.5D 图片，不存在真实碰撞体。Navigation Boundary 是覆盖在底图上的轻量语义层，用于防止角色移动演出穿墙，并让区域、门、动线、动作落点对玩家更可读。

它不替代 `WorldState.locations.connectedTo`。规则层仍用 Location graph 判断可达与 proximity；Navigation Boundary 只负责表现几何与安全采样。

## 概念

| 概念 | 含义 |
|------|------|
| `walkable polygon` | 某 Location 内角色可站立 / 可经过的地图像素多边形 |
| `portal` | 两个相邻 Location 的连接门槛或通道点 |
| `lane` | portal 到 portal 或 portal 到 anchor 的折线路径 |
| `arrival anchor` | 角色完成特定 Tool 后的语义落点 |

## Week1 范围

- 五个区域：Kitchen、Bar、Lobby、Gallery、Balcony。
- 四条连接：Kitchen↔Bar、Bar↔Lobby、Lobby↔Gallery、Gallery↔Balcony。
- 不做动态障碍物寻路；清洁车、保安等仍通过 Tool / precondition / sightline 影响规则。
- 不做像素级碰撞，只保证 sampled movement point 落在对应 walkable polygon 内，或被夹到最近安全点。

## 设计原则

1. **规则与表现分离**：`connectedTo` 决定能不能跨区；Navigation Boundary 决定怎么走得像在地图上。
2. **动作落点优先**：高频工具不用房间中心点，必须给 tool-specific arrival anchor。
3. **区域名可见**：玩家必须能在地图上看出 Kitchen / Bar / Lobby / Gallery / Balcony。
4. **调点可局部**：锚点漂移优先调 arrival anchor / portal / lane，不改 Tool 语义。

## 初始动作落点

| Tool / 场景 | 角色 | 落点语义 |
|-------------|------|----------|
| `impersonate_staff` | Runner | Kitchen 制服架旁 → Bar 内侧服务位 |
| `prepare_poisoned_drink` | Runner | Bar 酒具位 |
| `disable_power_panel` | Runner | Kitchen 配电箱旁 |
| `move_cleaning_cart` | Runner | 目标门槛 / 服务动线遮挡点 |
| `suppress_camera_record` | Player | 无地图行走；camera 物件 ping / FX |
| `serve_poisoned_drink_on_balcony` | Face/Runner | Balcony 私密赏画位 |
| `tamper_balcony_rail` | Runner | Balcony rail 内侧 |

## 验收

- movement sampling 不产生明显穿墙直线。
- Runner 换装后不落在墙体或不可行走区域。
- 地图上能读出区域名与主要队友职责。
- `test:corridor-path` / `test:play-diagnose` 继续通过；新增 geometry 测试覆盖 portal/lane/clamp。
