# Play Shell 布局契约

status: active  
owner: steve  
updated: 2026-05-28

## 产品要求（不可违反）

1. **主游戏视图**（canvas）占据「顶栏以下、右侧面板以左、骇入分析底栏以上」的全部剩余空间，**尽可能大**，比例不变形（`object-fit: contain`）。
2. **骇入分析底栏**高度 **恒定**（`--play-analysis-h: 148px`），不随点选/文案多少伸缩。
3. 点选只改 `#hacker-analysis-body` **内部滚动内容**，**禁止**用 `grid-template-rows: auto`、无底栏 `max-height` 无 `height` 等导致地图区被挤扁的写法。
4. 右侧面板宽度恒定（`--play-panel-w`），与地图区独立。

## Camera Viewport（play-camera-v1）

1. `#map-canvas-wrap` 仍只负责占据布局剩余空间；放大地图通过 **canvas 内部 camera transform** 完成，不通过改 DOM 高度完成。
2. `/play` 主视图可裁切显示地图局部，必须在 canvas 内绘制 **minimap**，显示全图与当前视口。
3. `render.js` 与 `map-pick.js` 必须共用 `lib/sprites/canvasLayout.ts` 的 camera transform；禁止各自写一套 map/canvas 换算。
4. minimap 点击只移动 camera，不触发物件/NPC 选中。
5. 点击链路：`canvasClientToBuffer` → buffer 坐标 → `canvasToMapAligned(..., shell.mapCamera)`。

## Map Anchor Calibration

- 地图锚点一律是 `GALLERY_MAP_SIZE` 的 map pixel 坐标，不是 screen/canvas 坐标。
- `/play` camera viewport 只改变 map→canvas 显示变换，不改变锚点坐标系。
- Steve 调点位走 `/tools/map-anchors`：拖点 → 复制导出 → 粘贴到 `lib/sprites/mapAnchors.ts`。
- 调完必须跑 `npm run build:sandbox && npm run sync:play`，再进 `/play` 肉眼验收。

详见 [map-anchor-calibration.md](./map-anchor-calibration.md)。

## World visual scale（play-anchor-scale-v1）

- camera 放大时，NPC/物件 sprite、halo、目标框随 `cameraVisualScaleForCanvas` 等比放大。
- minimap、pin 标签字号、底栏、右栏 **不** 随 world scale 放大。

## Mission Brief overlay（play-brief-command-radio-v1 · Batch A）

- `#mission-brief-overlay` 为 **fixed 全屏遮罩**，关闭后 `hidden` + 不挡 `#canvas` / `#plan-input` 点击。
- **禁止**为 Brief 调整 `--play-analysis-h`、`--play-panel-w`、`#map-stage` flex、`#hacker-canvas-wrap` 高度。
- Query：`?brief=1` 强制显示；`?brief=0` 跳过；默认首次 session 显示一次（`sessionStorage`）。
- 实现：`sandbox-shell/js/mission-brief.js` + `index.html` 内联样式；同步到 `public/play/`。

## Parallel Operation（play-parallel-operation-v1）

- Command Feed 在一条玩家指令成功执行时显示 `OPERATION / 本轮并行：…` 与多条 `EXEC /`（每 actor 一步）。
- 地图选中项仅当指令为空或含「这个/它/选中」时参与 Director 编译；见 ADR-0015。

## Batch B：Command Dock（planned，未实现）

- 有意将 `#hacker-analysis`（148px）升级为 Command Dock（约 `--play-command-dock-h: 190px`），属于**布局契约变更**，须在 B1 文档定稿后再改代码与 Playwright。Batch A **不得**提前迁移输入区到底栏。

## Operator Console Skin

- 操作台换皮只允许改变颜色、边框、字体层级、状态灯、非交互 overlay 与 feed 文案密度。
- 禁止通过换皮改变 `--play-analysis-h`、`--play-panel-w`、`#map-stage` flex 关系、`#map-canvas-wrap` 高度计算。
- `#map-canvas-wrap::before` / `::after` 可做 scanline、frame、sensor vignette，但必须 `pointer-events: none`，不得挡点击。
- 视觉增强要服务地图可读性：canvas 周边可更像监控画面，地图内部坐标、pick、minimap 不因 CSS 换皮改变。
- 主地图边缘悬停 pan 只能更新 `shell.mapCamera`，不得通过 CSS transform 移动 canvas；minimap 点击与物件 pick 仍走原有坐标链路。

## 文件职责（Codex / 评审入口）

| 文件 | 职责 |
|------|------|
| [`sandbox-shell/index.html`](../../sandbox-shell/index.html) | **唯一布局真源**：`:root` 尺寸 token、`#map-stage` / `#map-canvas-wrap` / `#hacker-analysis` CSS |
| [`sandbox-shell/js/map-pick.js`](../../sandbox-shell/js/map-pick.js) | 点选 → `renderHackerAnalysis()` 只写 `#hacker-analysis-body` innerHTML |
| [`sandbox-shell/js/render.js`](../../sandbox-shell/js/render.js) | canvas 绘制；勿改布局 |
| [`lib/sprites/canvasLayout.ts`](../../lib/sprites/canvasLayout.ts) | 点击坐标与 letterbox 对齐（`canvasClientToBuffer`） |
| [`lib/ui/hackerAnalysis.ts`](../../lib/ui/hackerAnalysis.ts) | 底栏文案结构（与布局无关） |
| [`docs/02-game-design/player-experience-and-ui.md`](../02-game-design/player-experience-and-ui.md) | UX 说明 |

**不要**在 `map-pick.js` 里用 JS 改 footer/canvas 的 height/width。

## 验收

- 连续点选「待机 / 物件 / NPC」：`getBoundingClientRect()` 的 `#hacker-analysis` height 不变；`#map-canvas-wrap` height 不变。
- 窗口 resize：地图区随窗口变，底栏仍 148px。
- build tag 与 `?v=` 脚本版本一致（见 `index.html` 底部 script 列表）。

## 曾犯错误（勿复发）

- `grid-template-rows: 1fr auto` + 底栏无固定 `height` → 内容多底栏变高、地图被压扁。
- canvas `width/height: 100%` 在无固定高度的 flex 子项里被拉扁。
- 点击映射未扣 letterbox → 误命中 `guest_list_terminal`（见 `canvasClientToBuffer`）。
