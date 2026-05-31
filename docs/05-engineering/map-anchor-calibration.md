# Map Anchor Calibration

status: active  
owner: steve  
updated: 2026-05-27

## 规则

- 地图锚点一律是 `GALLERY_MAP_SIZE` 的 **map pixel** 坐标，不是 screen/canvas 坐标。
- `/play` camera viewport 只改变 map→canvas 显示变换，**不改变**锚点坐标系。
- Steve 调点位走 [`/tools/map-anchors`](/tools/map-anchors)：拖点 → 复制导出 → 粘贴到 [`lib/sprites/mapAnchors.ts`](../../lib/sprites/mapAnchors.ts)。
- 调完必须跑 `npm run build:sandbox && npm run sync:play`，再进 `/play` 肉眼验收。

## 三类坐标（物件）

| 名称 | 含义 | 真源 |
|------|------|------|
| **anchor** | 工具里拖动的绿点；对 `guest_list_terminal` / `power_panel` / `kitchen_door` 即最终 **pick** | `OBJECT_MAP_ANCHORS` |
| **pick** | `/play` 骇入 pin / 点击命中 | `objectPickCoord()` |
| **draw** | sprite 绘制脚点（可与 pick 分离） | `objectMapCoord()` · `OBJECT_DRAW_OFFSET` |

已手工校准的 baked-in 物件（`ANCHOR_IS_PICK_OBJECT`）**不再**叠 `OBJECT_MAP_OFFSET` + `OBJECT_PICK_OFFSET` 双重偏移；`OBJECT_MAP_ANCHORS` 即 pick，绘制偏移仅走 `OBJECT_DRAW_OFFSET`。

## 工具页图例

- 绿实心圆 = 当前编辑的 anchor
- 青色十字 = `/play` pick 点
- 灰色小点 = `/play` draw 点

## 相关文件

| 文件 | 职责 |
|------|------|
| [`lib/sprites/mapAnchors.ts`](../../lib/sprites/mapAnchors.ts) | 锚点常量（粘贴目标） |
| [`lib/tools/mapAnchorEditor.ts`](../../lib/tools/mapAnchorEditor.ts) | 工具状态与 draw/pick 预览 |
| [`app/tools/map-anchors/page.tsx`](../../app/tools/map-anchors/page.tsx) | 拖拽 UI |
| [`lib/ui/mapCoords.ts`](../../lib/ui/mapCoords.ts) | pick / draw 换算 |
| [`docs/05-engineering/play-shell-layout.md`](./play-shell-layout.md) | Play 布局（高度不变） |
