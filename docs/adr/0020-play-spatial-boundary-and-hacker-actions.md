# ADR-0020: Play spatial boundary + Hacker action surface

status: accepted  
date: 2026-05-31

## Context

`/play` uses a 2.5D map image plus calibrated anchors. This is enough for a readable demo, but not enough to stop characters from crossing visible walls when playback interpolates between points. The same pass exposed three UX gaps:

- players do not see room names or teammate roles clearly enough in the first viewport;
- Player-as-Hacker information tools are still mostly triggered through natural language, even though the fantasy is direct remote operation;
- camera suppression and cleaning cart usage are too loose to form meaningful opportunity chains.

Existing accepted ADRs still hold: LLM produces `DirectorPlan`, deterministic tools change `WorldState`, and Player is Hacker.

## Decision

### Spatial boundary

Add a light **Navigation Boundary** layer over the static map:

- every Location may define a walkable polygon;
- adjacent Locations connect through named portals;
- movement playback follows lane polylines between portals and clamps sampled points to the current walkable polygon when needed;
- tool-specific arrival anchors override coarse Location anchors for high-risk beats such as disguise, bar prep, camera work, rail work, and balcony service.

This is not a full physics/collision system and not a general pathfinding engine. The rule graph (`connectedTo`) remains the gameplay source for reachability; the Navigation Boundary is presentation geometry plus safety constraints.

### Opportunity chains

Use **Opportunity Chain** as the design term for a player-readable chain of affordance → tool → precondition → ripple. It is not a new engine layer and must not revive the old `Opportunity Engine` product framing.

Initial chains to tighten:

- Power chain: `disable_power_panel` moves the hallway camera into degraded / backup mode.
- Camera chain: `suppress_camera_record` requires that degraded / backup mode, then suppresses recording.
- Cleaning cart chain: `move_cleaning_cart` creates a local service-lane obstruction / temporary cover window near a portal or threshold, rather than pretending a distant cart blocks the entire map.

### Hacker action surface

Add Player-as-Hacker quick actions for information tools. Quick actions produce the same deterministic request shape as text plans and must pass the same validation / execution rules.

After playtest feedback, quick actions are constrained as **atomic prep actions**: pressing a Hacker control must execute only the Player/Hacker tool it names. It may create world state, phone/terminal feedback, and agent prompts, but it must not silently append Face/Runner follow-up actions in the same turn. Field agents should ask for or wait for the next player command once the prep state is ready.

Week1 quick actions are limited to information tools:

- send fake message to target;
- suppress / disable hallway camera when preconditions are met;
- modify guest list / terminal records where relevant.

Face and Runner remain field agents commanded through plans, map references, and tool chains.

### Final commit gate

Lethal or terminal actions (`stage_accident`, `resolve_poison_on_balcony`) require explicit player intent in the current command, such as "动手", "结算", "毒发", "让他倒下", or equivalent direct confirmation. Preconditions becoming true is not enough to auto-complete the mission. When the window is ready, Face / Runner should surface the pending opportunity and ask for the next order.

### Speech bubble + feed

All character-facing dialogue should be visible in two channels:

- speech bubble on the map for 3-5 seconds;
- right-side Command Feed as the durable transcript.

World state summaries and system debug lines stay in Feed only unless represented by a concrete actor or world cue.

## Consequences

- `/play` must show room names and teammate roles without relying only on Brief text.
- Existing anchor calibration remains valid, but movement code must stop treating a single Location anchor as enough for every tool.
- Camera suppression can become blocked in worlds where power is still stable.
- The cleaning cart may need one or two specific target placements instead of a single broad "blockingSightline" state.
- Tests must cover geometry safety, camera preconditions, quick action request generation, and feed / bubble consistency.
- Tests must cover atomic Hacker actions and the final commit gate so prep actions cannot accidentally finish the mission.

## 实现记录

| 日期 | 内容 |
|------|------|
| 2026-05-31 | 文档决策：Navigation Boundary、Opportunity Chain、Hacker quick actions、speech bubble/feed 双通道 |
| 2026-05-31 | 验收反馈修订：Hacker quick actions 改为原子 prep；terminal action 加显式确认门槛 |
| 2026-05-31 | Round 2 实现：Runner 吧台落点、隐藏远程 Hacker 圆片、原子 quick action、动态镜头、Final Commit Gate、终局弹窗 |
