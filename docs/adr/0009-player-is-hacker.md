# 玩家即 Hacker（幕后指挥）

**玩家身份 = 幕后 Hacker**：通过场景摄像头/情报总览观察全场，用自然语言 **指挥两名 field agent**（Face、Runner）执行社交与物理行动。信息类 Tool（spoof、guest list、camera 等）由 **玩家直接执行**，不是第三个 AI 队友。

## 场上有谁

| 角色 | 性质 | 地图实体 |
|------|------|----------|
| **Player（玩家）** | 人类；Hacker 能力持有者 | 无 sprite；UI 为 POV / 监控视角 + Plan 输入 |
| **Face** | 玩家指挥的队友 | 有 sprite |
| **Runner** | 玩家指挥的队友 | 有 sprite |
| ~~Hacker agent~~ | **取消** 为独立 agent | 头像仅作 **玩家 comms UI**（typing/success/warning） |

## Director 简化

- **编排对象**：仅 Face、Runner 的 social/physical tool  
- **信息 tool**：actor 固定为 `player`（或 schema 别名 `hacker` = player）；Director **不必**「给 Hacker 分工」  
- 玩家 Plan 示例：「我先伪造一条阳台邀约短信，Face 去跟目标搭话，Runner 别露面直到目标上阳台。」

## 代入感

- 玩家知道自己是谁：监控室里的策划者  
- Agent comms：Face/Runner 回话像队友；「Player voice」= 信息操作反馈（终端/UI）  
- 减少「四个意志」混乱（玩家 + 3 agent 各算各的）

## Tool allowedActors 调整

Information tools → `allowedActors: ["player"]`  
Social/Physical → `face` | `runner`（不变）  
`impersonate_staff` → face, runner

WorldState：移除 `agents.hacker` 独立条目；玩家侧字段可并入 `world.player` 或保留 `agents.hacker` 作 **player 别名**（实现二选一，推荐 `player` 顶层 + 迁移 trace/permissions）。

**Considered options**

- 三 agent + 抽象玩家：代入感弱，Director 三分工  
- **玩家 = Hacker（采纳）**：field 2 人 + 玩家信息层  

**Consequences**

- UI：Crew 面板 2 卡 + Player/Hacker 状态条（trace、suspicion、access）  
- 美术：Hacker portrait = 玩家 comms，不出现在 map 锚点  
- Director prompt 重写「agents」段  
- showcase 文案改为第一人称指挥口吻  
- **Open**：step 模式下一 turn 一步 — 玩家 plan 含「先 spoof 再 face」需 **多 turn** 或 Director 每 turn 只输出一步（已有 ADR-0001）
