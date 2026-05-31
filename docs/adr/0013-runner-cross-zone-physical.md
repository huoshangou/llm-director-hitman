# Runner 跨区执行 Physical Tool

**Face** 仍遵守 ADR-0003/0004（同区 + social 白名单）。  
**Runner** 执行 **physical** 类 tool（及为执行该 tool 所需的 `impersonate_staff`）时，**不要求**事先与目标同 Location。

结算时 resolver **隐式更新** `runner.location` 到 tool 目标所在 Location（视为移动时间已计入 tool `time` cost），并生成 `agent_move` GameEvent。

理由：Steve 2026-05-25 — showcase 需要 Runner 从 kitchen 动到 balcony/gallery 做 tamper，不宜多 turn 纯 blocked。

**Player** 信息 tool 仍 remote；**Face** 不获得跨区 physical 豁免。
