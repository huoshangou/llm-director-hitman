# MVP 视觉方向

status: draft  
source: archive/v0.1 §15, v0.2 §21, §24, §26.3

## 定位

**世界状态一眼可读** — 语义计划 → 状态变化 → overlay / 状态图（见 [art-asset-manifest.md](./art-asset-manifest.md)）。

## 视角

**2.5D 俯视角单张底图**（`gallery_event_map` + 区域高亮），风格：**桌面沙盘 / 微缩舞台**。  
不再以 archive 的纯 div 色块为 week1 目标（C10 待确认 Day1 placeholder 策略）。

## MVP 元素规范

| 区域 | Week1 | Polish |
|------|-------|--------|
| 区域 | 底图 + location_highlight | 动效高亮 |
| NPC | cutout 状态图（见 manifest） | 轻量 transition |
| Agent | 同上；Hacker 仅头像 | — |
| 物件 | 状态 sprite | — |
| 涟漪 | **overlay 优先** | — |
| 移动 | 状态切换 + 锚点 jump/CSS lerp | 路径动画（可选） |

## 音频

Day 6「简单动效、声音」— **可砍**（见 mvp-cut-order）。

## 资源

完整清单 → [art-asset-manifest.md](./art-asset-manifest.md)  
`public/sprites/` 子目录见 manifest §8

## 生产排期建议

| 1–2 | 灰盒：固定锚点 + div/SVG（ADR-0007） |
| 3–4 | P0 底图 + highlights + overlay + Target/Guard/Runner |
| 5–6 | P1 物件 + 其余角色 |
| 7 | P2 UI 装饰（可 CSS） |

## 最小可交付视觉

地图上 NPC/agent/object **状态变化** + timeline 文字 + HUD 数值 — 已够录 demo 证明核心。

## 禁止

week1 把时间耗在 TimelinePlayer 状态机或复杂 shader 上。
