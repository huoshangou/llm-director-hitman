# Showcase 分 Turn 验收断言

status: active  
source: ADR-0001 step · ADR-0002 tick · ADR-0009 player/face/runner

实现前用本文档 + `lib/routes/showcaseRoutes.ts` fixture 验收。**默认 step 模式**；Debug full chain 仅作 resolver 冒烟。

断言写法：`turn N 执行 tool X 后` → `world` 字段期望（tick 后状态）。

---

## 路线 A — 私人邀约

**Player plan（示例，第一人称）**：

```text
我先伪造一条阳台私密交易短信。Face 去跟目标搭话，别让保安当安保事件——用前台 VIP 理由引开他。Runner 等目标上阳台再动手。
```

### 分 turn 脚本

| Turn | Plan 焦点 | 执行 tool（step[0]） | 执行后断言 | tick 后断言 |
|------|-----------|----------------------|------------|-------------|
| 1 | 伪造短信 | `player`: spoof_message | target.beliefs 含 private_meeting；traceRisk↑ | target.location 仍 **gallery** |
| 2 | Face 社交 | `face`: lure_with_private_meeting | route bias↑ 或 belief 加强 | target 仍 gallery 或 bias 达阈 → **balcony** |
| 3 | 引开 Guard | `face`: redirect_guard_attention + frame **admin_issue** | guard.attentionMode=handling_complaint；overlay admin_issue | guard 不 alarm |
| 4 | Runner 就位 | （多 turn plan 或下一条 plan）runner 需 **move 到 balcony 邻区** — 若 blocked，validation 提示 | runner.location **gallery** 或 **balcony** | — |
| 5 | 动栏杆 | `runner`: tamper_balcony_rail | balcony_rail.tampered=true | — |
| 6 | 终局 | `runner`: stage_accident | objective.targetHandled=true | — |

**Full chain 顺序（Debug）**：spoof_message → lure → redirect_guard（admin_issue）→ tamper_balcony_rail → stage_accident

---

## 路线 B — 配电停电

**Player plan（示例）**：

```text
先让 Runner 动厨房配电，把保安引去查电。我发短信把目标勾到阳台，Face 去引诱，Runner 再动手脚收束。
```

| Turn | tool | 执行后 | tick 后 |
|------|------|--------|---------|
| 1 | runner: disable_power_panel | powerStable=false；guard investigating @ kitchen；gallery light↓ | — |
| 2 | player: spoof_message | belief private_meeting | target 仍 gallery |
| 3 | face: lure_with_private_meeting | bias↑ | target → balcony |
| 4–5 | tamper → stage | 同 A | — |

**暂缓（第四条线）**：酒水伪装链（impersonate_staff + spill）见旧草案，可与 B 并行加 `route_d`，不挡 A/B/C 验收。

---

## 路线 C — 清洁车挡视线

| Turn | tool | 执行后 | tick 后 |
|------|------|--------|---------|
| 1 | runner: spill_drink @gallery | location spill tag；cleaner task | cleaner → gallery |
| 2 | runner: move_cleaning_cart @gallery | sightline_blocked；cart blocking | — |
| 3 | face: redirect_guard_attention + admin_issue | guard distracted | sightline 窗口 |
| 4 | face: lure 或等待 bias | target bias | target → balcony |
| 5–6 | tamper → stage | 同 A | — |

---

## 全局验收（每条 route）

1. Director JSON 合法；actor 仅 player / face / runner  
2. ADR-0010：executableChain 非空（或 partial 有清晰 rejected）  
3. step 每 turn timeline 非空  
4. **Turn1 后 target 不在 balcony**（除非仅 spoof，验证 ADR-0002）  
5. stage_accident 成功 → objective.targetHandled  
6. overlay：spoof → fake_message_icon；admin redirect → admin_issue_belief  

## 道具因果断言（play-prop-causality-v1）

### Target motivation

| 断言 | 期望 |
|------|------|
| 选中 `target` | 骇入分析先显示玩家向目标 dossier：`任务目标` / `目标手机` / `伪造或篡改邀约` |
| `spoof_message` 成功 | target belief `private_meeting_on_balcony`；routeBias.balcony↑ |
| Face 默认 `lure` | tier=improvising；routeBoost 约 14；cue/对话说明半信半疑 |
| `modify_guest_list` 后 Face `lure` | Face.coverIdentity=vip_liaison；credibility tier=partial（叠 phone belief 可达 strong） |

### Scene control

| 断言 | 期望 |
|------|------|
| `move_cleaning_cart` @gallery | cart.blockingSightline=true；`isSightlineClear(balcony)`=true |
| `disable_power_panel` | gallery/balcony lightLevel↓；camera visibilityReduced；guard investigating @ kitchen；`mapLightingFromWorld`=dimmed |
| 配电后 Runner 物理步 | `isObservedByGuard(runner)`=false（stealth 窗口） |

**路线分工**：A/B 偏 target motivation；C 偏 scene control（清洁车）+ motivation；B 偏配电 scene control + motivation。

---

## Fixture 结构（代码阶段）

```ts
export type TurnAssertion = {
  turn: number;
  toolId: string;
  actor: "player" | "face" | "runner";
  afterExecute: Partial<WorldStatePredicate>;
  afterTick?: Partial<WorldStatePredicate>;
};
```

见 `lib/routes/showcaseRoutes.ts`（与本文同步维护）。
