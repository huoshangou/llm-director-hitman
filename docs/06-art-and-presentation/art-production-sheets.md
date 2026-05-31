# 美术生产 Sheet 方案（Week1）

status: active  
owner: agent  
source: 2026-05-26 asset production pass

## Review 结论

现有 `art-asset-manifest.md` 的方向正确：Week1 重点应是地图、角色状态、关键物件、overlay，而不是复杂动画或 UI 装饰。

本轮收敛为 **4 张大图 + 裁切**：

1. UI panel 不出图，用 CSS/Tailwind。
2. Hacker 不进地图，只保留为玩家 comms / HUD 概念，不进入本批 sheet。
3. 核心角色每人 4 个状态；Runner 保留 `disguised_waiter`。
4. Overlay 优先级高于角色动作细节。
5. 角色 / 物件 / icon sheet 使用纯 `#00ff00` chroma-key 背景，方便 asset cutter 导出透明 PNG。

## 统一 Art Direction

- Stylized 2.5D / slightly isometric。
- Elegant stealth sandbox，private gallery event at night。
- Premium indie look，不写实、不 pixel art、不 low-poly。
- Strong silhouette readability：小尺寸下先能读身份、状态、工具落点。
- Soft cinematic lighting：暗部用 dark navy / charcoal，重点用 warm gold，危险和社交紧张用 muted burgundy，信息 / 黑客 / 可用窗口用 cool cyan。
- 全部 sheet 保持同一镜头语言：轻微等距、微缩舞台、clean cutout、少纹理噪声。

## Sheet A — 主场景底图

| asset_id | category | recommended filename | required states / variants | priority | production |
|---|---|---|---|---|---|
| gallery_event_map | background / scene | `public/sprites/map/gallery_event_map.png` | single map: Lobby, Bar, Kitchen, Gallery, Balcony | S | standalone image from Sheet A |
| location_highlight_lobby | background / scene overlay | `public/sprites/map/location_highlight_lobby.png` | calm / active optional | A | crop or CSS/SVG mask |
| location_highlight_bar | background / scene overlay | `public/sprites/map/location_highlight_bar.png` | calm / active optional | A | crop or CSS/SVG mask |
| location_highlight_kitchen | background / scene overlay | `public/sprites/map/location_highlight_kitchen.png` | calm / active optional | A | crop or CSS/SVG mask |
| location_highlight_gallery | background / scene overlay | `public/sprites/map/location_highlight_gallery.png` | calm / active optional | A | crop or CSS/SVG mask |
| location_highlight_balcony | background / scene overlay | `public/sprites/map/location_highlight_balcony.png` | calm / active optional | A | crop or CSS/SVG mask |

### 更换主场景底图（换图后流程）

1. 新图覆盖 `public/sprites/map/gallery_event_map.png`（保持 **1823×863**；若尺寸变了，同步改 `manifest.json` → `map.sourceSize` 与 `lib/sprites/mapLayout.ts` 的 `GALLERY_MAP_SIZE`）。
2. `npm run build:sandbox && npm run sync:play`（或 `mirror:home` 后进 `~/hitman` 同样命令）。
3. 在 `/tools/map-anchors` 重新拖一遍锚点（底图几何变了就必须重校）。规则见 [map-anchor-calibration.md](../05-engineering/map-anchor-calibration.md)。
4. 阳台条带点击范围在 `lib/ui/mapHitTest.ts` 的 `BALCONY_RAIL_STRIP`，必要时随新图微调。

## Sheet B — 核心角色状态表

| asset_id | category | recommended filename | required states / variants | priority | production |
|---|---|---|---|---|---|
| face | core character | `public/sprites/characters/face_{state}.png` | idle, talking, confident, exposed | A | crop from Sheet B |
| runner | core character | `public/sprites/characters/runner_{state}.png` | idle, moving, disguised_waiter, interacting | S | crop from Sheet B |
| target | core character | `public/sprites/characters/target_{state}.png` | idle, checking_phone, holding_drink, moving_to_balcony | S | crop from Sheet B |
| guard | core character | `public/sprites/characters/guard_{state}.png` | watching, distracted, investigating, alarmed | S | crop from Sheet B |

## Sheet C — 辅助角色 + 关键物件

| asset_id | category | recommended filename | required states / variants | priority | production |
|---|---|---|---|---|---|
| waiter | supporting character | `public/sprites/characters/waiter_{state}.png` | idle, moving, confused | A | crop from Sheet C |
| cleaner | supporting character | `public/sprites/characters/cleaner_{state}.png` | idle, cleaning, pushing_cart | A | crop from Sheet C |
| guest_cluster | supporting character | `public/sprites/characters/guest_cluster_{state}.png` | idle, watching, startled | B | crop from Sheet C |
| guest_list_terminal | key object | `public/sprites/objects/guest_list_terminal_{state}.png` | normal, modified, error | S | crop from Sheet C |
| wine_glass | key object | `public/sprites/objects/wine_glass_{state}.png` | clean, served, spilled | S | crop from Sheet C |
| wine_bottle | key object | `public/sprites/objects/wine_bottle_normal.png` | normal | B | crop from Sheet C |
| waiter_uniform | key object | `public/sprites/objects/waiter_uniform_{state}.png` | available, taken | S | crop from Sheet C |
| cleaning_cart | key object | `public/sprites/objects/cleaning_cart_{state}.png` | idle, blocking | S | crop from Sheet C |
| power_panel | key object | `public/sprites/objects/power_panel_{state}.png` | normal, tampered | A | crop from Sheet C |
| hallway_camera | key object | `public/sprites/objects/hallway_camera_{state}.png` | active, looped, disabled | A | crop from Sheet C |
| balcony_rail | key object | `public/sprites/objects/balcony_rail_{state}.png` | normal, tampered | S | crop from Sheet C |
| target_phone | key object | `public/sprites/objects/target_phone_{state}.png` | idle, message_received | S | crop from Sheet C |

## Sheet D — 状态 Overlay / UI Icons

| asset_id | category | recommended filename | required states / variants | priority | production |
|---|---|---|---|---|---|
| guard_sight_cone | state overlay | `public/sprites/overlays/guard_sight_cone.png` | visible | S | crop from Sheet D |
| blocked_sight_cone | state overlay | `public/sprites/overlays/blocked_sight_cone.png` | blocked | S | crop from Sheet D |
| attention_arrow | state overlay | `public/sprites/overlays/attention_arrow.png` | normal | S | crop from Sheet D |
| suspicion_icon | state overlay | `public/sprites/overlays/suspicion_icon.png` | question | S | crop from Sheet D |
| alert_icon | state overlay | `public/sprites/overlays/alert_icon.png` | alert | S | crop from Sheet D |
| hacked_icon | state overlay | `public/sprites/overlays/hacked_icon.png` | success | S | crop from Sheet D |
| fake_message_icon | state overlay | `public/sprites/overlays/fake_message_icon.png` | active | S | crop from Sheet D |
| disguise_icon | state overlay | `public/sprites/overlays/disguise_icon.png` | active | S | crop from Sheet D |
| route_arrow | state overlay | `public/sprites/overlays/route_arrow.png` | bias | S | crop from Sheet D |
| opportunity_window | state overlay | `public/sprites/overlays/opportunity_window.png` | open | S | crop from Sheet D |
| accident_ready | state overlay | `public/sprites/overlays/accident_ready.png` | ready | S | crop from Sheet D |
| spill_overlay | state overlay | `public/sprites/overlays/spill_overlay.png` | spilled | S | crop from Sheet D |
| noise_pulse | state overlay | `public/sprites/overlays/noise_pulse.png` | pulse | B | crop from Sheet D |
| private_meeting_belief | state overlay | `public/sprites/overlays/private_meeting_belief.png` | belief | S | crop from Sheet D |
| admin_service_issue_icon | state overlay | `public/sprites/overlays/admin_service_issue_icon.png` | issue | A | crop from Sheet D |
| camera_loop | state overlay | `public/sprites/overlays/camera_loop.png` | looped | A | crop from Sheet D |
| evidence_risk | state overlay | `public/sprites/overlays/evidence_risk.png` | risk | A | crop from Sheet D |

## UI Panels

| asset_id | category | recommended filename | required states / variants | priority | production |
|---|---|---|---|---|---|
| objective_panel | UI panel | none | normal | A | CSS/Tailwind |
| alert_meter | UI panel | none | calm, curious, suspicious, alarm | S | CSS/Tailwind |
| suspicion_meter | UI panel | none | numeric | S | CSS/Tailwind |
| tool_chip | UI panel | none | social, info, physical | A | CSS/Tailwind |
| timeline_event_frame | UI panel | none | normal, blocked, success | A | CSS/Tailwind |
| plan_input_panel | UI panel | none | normal, busy, error | S | CSS/Tailwind |

## Image Generation Prompts

## Generated Sheet Outputs

| sheet | saved path | size |
|---|---|---|
| Sheet A | `public/sprites/sheets/sheet-a-gallery-map.png` | 1823 x 863 |
| Sheet B | `public/sprites/sheets/sheet-b-core-characters.png` | 1254 x 1254 |
| Sheet C | `public/sprites/sheets/sheet-c-support-objects.png` | 1536 x 1024 |
| Sheet D | `public/sprites/sheets/sheet-d-overlays-icons.png` | 1536 x 1024 |

## Archived Runtime Assets

Runtime asset archive:

```text
public/sprites/
  README.md
  manifest.json
  sheets/
    sheet-a-gallery-map.png
    sheet-b-core-characters.png
    sheet-c-support-objects.png
    sheet-d-overlays-icons.png
    crop-manifest.json
  map/
    gallery_event_map.png
    location_highlight_{kitchen,bar,lobby,gallery,balcony}.png
  characters/  # 25 transparent cutouts
  objects/     # 20 transparent cutouts
  overlays/    # 17 transparent overlays/icons
```

`scripts/archive-sprite-assets.py` is the reproducible cutter/archive pass. It uses the same rect + metadata structure as `/tools/asset-cutter`, applies chroma-key transparency for Sheets B/C/D, writes cropped files, and regenerates `public/sprites/manifest.json`.

### Shared negative constraints

No text labels, no watermark, no logo, no photorealism, no pixel art, no low-poly look, no thick black outlines, no random extra rooms, no extra character variants beyond requested cells.

### Sheet A prompt

Create one complete stylized 2.5D slightly isometric private gallery heist map at night, premium indie game look, soft cinematic lighting. The map is a compact connected diorama with five readable areas in a left-to-right topology: Kitchen, Bar, Lobby, Gallery, Balcony. Include key landmarks without labels: guest list terminal in Lobby, bar counter with wine glass in Bar, waiter uniform and power panel in Kitchen, art display and hallway camera in Gallery, balcony rail on Balcony. Use dark navy, charcoal, warm gold, muted burgundy, and cool cyan accents. No characters. No text. Single coherent top-down-ish game background suitable for cropping and Web sprite placement.

### Sheet B prompt

Create a 4 by 4 character sprite sheet on a perfectly flat solid #00ff00 chroma-key background. Stylized 2.5D slightly isometric cutout characters, premium indie stealth sandbox look, same lighting and palette as the private gallery map. Columns: Face, Runner, Target, Guard. Rows: state 1, state 2, state 3, state 4. Face states: idle, talking, confident, exposed. Runner states: idle, moving, disguised as waiter, interacting with object. Target states: idle, checking phone, holding drink, moving toward balcony. Guard states: watching, distracted, investigating, alarmed. Keep each cell isolated with generous padding, strong silhouettes, no text, no shadows touching other cells, no UI labels.

### Sheet C prompt

Create a clean production asset sheet on a perfectly flat solid #00ff00 chroma-key background. Stylized 2.5D slightly isometric cutout assets, premium indie stealth gallery event at night, same palette and lighting as the map. Include supporting characters: waiter idle/moving/confused, cleaner idle/cleaning/pushing cart, guest cluster idle/watching/startled. Include key objects with readable state variants: guest list terminal normal/modified/error, wine glass clean/served/spilled, wine bottle normal, waiter uniform available/taken, cleaning cart idle/blocking, power panel normal/tampered, hallway camera active/looped/disabled, balcony rail normal/tampered, target phone idle/message received. Arrange in clear grid-like spacing, no text labels, no watermark, no extra objects.

### Sheet D prompt

Create a clean icon and overlay sheet on a perfectly flat solid #00ff00 chroma-key background. Stylized premium indie stealth UI overlays matching a dark navy gallery heist game with warm gold, muted burgundy, and cool cyan accents. Include isolated readable symbols: guard sight cone, blocked sight cone, attention arrow, suspicion question icon, alert icon, hacked icon, fake message icon, disguise icon, route arrow, opportunity window, accident ready, spill overlay, noise pulse, private meeting belief, admin/service issue icon, camera loop, evidence risk. Use simple bold silhouettes and semi-transparent-looking shapes, no text, no labels, no watermark, generous padding for cropping.
