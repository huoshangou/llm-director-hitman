# Social Tool 跨区例外

在 ADR-0003（同区 near）基础上，**白名单 Social Tool** 允许 Agent 与目标 NPC **不同 Location** 仍可执行，语义为「酒会场景内的隔空社交 / 搭话 / 远程话术」。**Physical Tool** 与 **需贴近 Object 的 Tool** 仍严格同区。

## 白名单（week1）

| toolId | 跨区条件 |
|--------|----------|
| `create_complaint` | 目标为 **NpcId**（或对 service 问题的 social  framing） |
| `lure_with_private_meeting` | 目标为 **NpcId**（通常 target） |
| `redirect_guard_attention` | 目标为 **NpcId**（通常 guard） |

不在白名单内 → 仍执行 ADR-0003 同区检查（含 Runner 全部 physical、`impersonate_staff` 需 near uniform、`spill_drink` near object/location 等）。

**Hacker** 信息类 Tool 继续按 `remote` 处理，不受 location 约束。

理由：Showcase A/B 依赖 Face 对 Gallery 中 Target 做 lure；酒会中跨区社交合理；Runner 物理行动仍绑定地图。

**Considered options**

- ① move_agent：规则统一但多 tool + turn  
- **②（采纳）**：social 白名单，physical 严格  
- ③ 改 Face 初始点：回避设计空间  

**Consequences**

- `checkPreconditions` 增加 `isSocialCrossZoneAllowed(toolId, request)`  
- validate / Director 文档注明 social 可跨区  
- Debug 区分 blocked reason：`cross_zone` vs `cross_zone_social_ok`  
- 不在白名单的跨区仍 blocked（Runner tamper 等）
