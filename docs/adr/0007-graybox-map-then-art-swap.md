# 底图：灰盒先行，Day3 换皮

Week1 **Day1–2** 使用灰盒 Map（色块 / 简易 SVG + 固定锚点 + 文字标签）跑通 WorldState、Tool、Timeline。  
**Day3 起** 将 `gallery_event_map` + `location_highlight_*` 替换 placeholder，**不改** layout 坐标与 resolver 逻辑。

锚点坐标以 [scenario-balcony-job.md](../02-game-design/scenario-balcony-job.md) / `initialWorld` 为准；美术底图按同一 layout 绘制。

理由：工程与美术可并行；Steve 清单的沙盘底图仍是 week1 目标，但不阻塞 deterministic sandbox；overlay P0 可在灰盒上先接 GameEvent。

**Considered options**

- B 等底图再写 Map：工程晚启动  
- C 永久灰盒：与美术清单冲突  
- **A（采纳）**：placeholder → 换皮  

**Consequences**

- `GameMap` 抽象：底图层 + highlight 层 + entity 锚点层  
- Day1 DoD：灰盒可见即可  
- Day6 polish 验收：正式底图 + P0 overlay  
- 禁止 `Math.random()` 摆位；用 deterministic offset map
