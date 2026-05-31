# 产品简报

status: draft  
source: archive/v0.1 §0–§1

## 定义

**LLM Director over Deterministic Sandbox** 的一周 demo 切片。

玩家用自然语言描述暗杀计划（例：让 Target 自己去阳台、别让保安当安保事件、Face 投诉名单、Hacker 伪造邀约、Runner 借清洁车挡视线）。

系统须：

1. 理解语义目标  
2. 抽取意图、约束、优先级、风险偏好  
3. Agent 基于场景 affordance 选工具链  
4. 工具经确定性规则改变世界  
5. 2.5D 动画、NPC 移动、状态 UI、通讯文本表现结果  
6. 不可执行时诚实说明，并给可执行降级  

## 核心体验（非「AI 能说话」）

> 玩家想到的计划，被转译成世界里的**可见因果链**。

## 为什么需要 LLM

若只能点选「断电 / 下药 / 换装 / 引开 / 推落」，则行为树/GOAP 足够。LLM 的价值在于：

- 开放计划解析  
- 隐含意图（像事故、别像入侵）  
- 约束与优先级  
- 映射到已有 affordance（不发明新能力）  
- 失败时维持意图、找替代路径  
- 解释世界为何拒绝计划  

## LLM 不负责

- 直接改 NPC 位置、物品状态、成败判定  
- 创造地图不存在的物体  
- 让 NPC 相信违反规则的信息  

## 核心公式

```text
Open Language Plan
→ Intent & Constraint Extraction
→ Agent Tool Selection
→ Deterministic Tool Resolution
→ World State Ripple
→ Animation/Event Playback
→ Player Replanning
```

→ 详见 [principles-and-scope.md](./principles-and-scope.md)、[../03-system-design/layers-and-data-flow.md](../03-system-design/layers-and-data-flow.md)
