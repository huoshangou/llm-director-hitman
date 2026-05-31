# 架构总览

status: draft  
source: archive/v0.1 §3, v0.2 §0

## 模块

```text
Frontend / Game View
  ├─ 2.5D Map Renderer
  ├─ NPC Sprite Controller
  ├─ Event Timeline Player
  ├─ HUD / World State UI
  ├─ Plan Input UI
  └─ Debug Inspector

Backend / Game Runtime
  ├─ World State Store
  ├─ World Rule Runtime
  ├─ Tool Registry
  ├─ Tool Resolver
  ├─ LLM Director Adapter
  ├─ Plan Compiler / Validator
  ├─ Event Timeline Builder
  └─ Save/Replay Logger（可选 week1）
```

## 工程原则

1. 先 deterministic sandbox  
2. 再接 LLM Director  
3. LLM 只产出 DirectorPlan  
4. 世界变化只经 ToolResolver  
5. 画面变化只经 GameEvent timeline  

## 分层（必须严格）

| 层 | 负责 | 不负责 |
|----|------|--------|
| **语义层** | LLM：intent, constraints, toolChain, 降级解释 | 改 WorldState |
| **规则层** | 代码：precondition, 结算, suspicion, NPC/object 更新 | 自由叙事结局 |
| **表现层** | 前端：移动、气泡、动画、HUD | 业务规则 |

→ 数据流 [layers-and-data-flow.md](./layers-and-data-flow.md)  
→ Director [llm-director.md](./llm-director.md)
