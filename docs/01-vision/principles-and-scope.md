# 原则与范围

status: draft  
source: archive/v0.1 §1–§2, §20

## 第一性原则（实现必须遵守）

1. LLM 不能直接改世界  
2. 世界对象必须有 affordance  
3. Tool 必须有 precondition、cost、effect、ripple、failure、animation  
4. Plan → intent/constraint → toolChain  
5. toolChain 必须 validation  
6. 成败都要在画面表现  
7. 小地图、高 affordance 密度  
8. 不承诺无限自由，只承诺语义计划可映射  
9. 优先打通 showcase routes  
10. Debug 可视化优先于复杂 AI  

## 一周版本：The Balcony Job

**场景**：私人画廊酒会  
**目标**：Target 进入阳台，低警觉下制造「事故」或接近机会  

**地图（5 区）**：Lobby · Bar · Kitchen · Gallery · Balcony  

**玩家目标**

| 优先级 | 目标 |
|--------|------|
| Primary | 完成 Target 处理 |
| Optional | 不触发警报 |
| Optional | 不被识破伪装 |
| Optional | 死亡像事故 |
| Optional | 少留证据 |

## 不做（week1）

大地图、复杂潜行、多层建筑、完整背包、真多 agent 并发、动态任务、自由攻击所有 NPC、高精度物理、完整对话树、复杂战斗  

## 必做（week1）

- [ ] 2.5D 小地图可视化  
- [ ] NPC 移动 + 视线/注意力状态  
- [ ] 对象 affordance schema  
- [ ] ~12 个高质量 Tool（ADR-0006：12 常规 + stage_accident）  
- [ ] LLM Director 编译 toolChain  
- [ ] 确定性结算  
- [ ] Event Timeline 驱动演出  
- [ ] 失败/降级反馈  
- [ ] ≥3 条可行路线  

## Pitch 草案（对外）

```text
LLM Director Hitman — LLM-directed assassination sandbox demo.
玩家（幕后 Hacker）指挥 Face/Runner；自然语言 plan → 确定性 tool → 可见连锁反应。
```

（对外名 ADR-0011；不用 Opportunity Engine）
