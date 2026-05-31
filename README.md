# LLM Director Hitman Demo

**LLM Director over Deterministic Sandbox** — 玩家用自然语言描述暗杀计划；LLM 编译为工具链；确定性规则改变世界；2.5D 画面播放因果链。

作者：洪祥健 · 笔试作品

## 快速开始

需要 **Node.js 18+**。

```bash
git clone https://github.com/huoshangou/llm-director-hitman.git
cd llm-director-hitman
npm install

cp .env.example .env.local
# 编辑 .env.local，填入 OPENROUTER_API_KEY（或 OPENAI_API_KEY）

npm run build:sandbox
npm run sync:play
npm run play
```

浏览器打开：

| 地址 | 说明 |
|------|------|
| http://127.0.0.1:8747/ | 主站：输入 Plan、查看 Inspector |
| http://127.0.0.1:8747/play/index.html | Canvas 导演沙盒（推荐试玩） |

## 接入 LLM（BYOK）

复制 `.env.example` → `.env.local`，二选一：

**OpenRouter（推荐）**

```env
OPENROUTER_API_KEY=你的密钥
OPENROUTER_MODEL=deepseek/deepseek-chat
```

**OpenAI 兼容**

```env
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-4o-mini
```

修改后重启 `npm run play`。无 Key 时可用内置 Plan Stub 体验确定性沙盒。

主站 GM 页可测试 LLM 连通性：`/gm`。

## 怎么玩

1. 打开 `/play/`，阅读任务简报。
2. 用自然语言写下暗杀计划（例：让目标去阳台、下毒、别触发安保）。
3. 提交后 **Director** 将计划编译为 `DirectorPlan`（意图、约束、工具链）。
4. 每回合引擎 **确定性执行** 工具链前沿一步；地图、NPC、电台反馈因果。
5. 根据结果继续补充或修改计划，直到任务成功或失败。

核心体验：玩家想到的计划，被转译成世界里的**可见因果链**——不是和文本框聊天。

## 设计框架

```text
自然语言 Plan
  → LLM Director（语义编译：意图 / 约束 / toolChain）
  → 校验 DirectorPlan（Zod）
  → ToolResolver（确定性规则改 WorldState）
  → Timeline / 2.5D 表现
  → 玩家 Replan
```

**红线**：LLM 不直接写 WorldState；只产出 DirectorPlan。开放感来自自然语言入口，可信度来自游戏规则。

## 项目结构

```text
app/              Next.js 页面与 API（/api/director、/api/simulate 等）
components/       React UI
lib/
  world/          WorldState、NPC tick、规则
  tools/          ToolRegistry、ToolResolver、executePlan
  director/       LLM 编译、Plan 校验与降级
  timeline/       事件时间线
  beats/          关卡节拍
  bridge/         前端与引擎桥接
sandbox-shell/    Canvas 沙盒源码
public/play/      沙盒构建产物（npm run sync:play 生成，不入库）
scripts/          开发、测试、同步脚本
docs/             愿景 / 系统设计 / ADR（公开子集）
```

## 验证

```bash
npm run lint
npm run build
npm run test:tools
npm run test:timeline
npm run test:sandbox
```

## 文档

- 术语：[CONTEXT.md](./CONTEXT.md)
- 产品定义：[docs/01-vision/product-brief.md](./docs/01-vision/product-brief.md)
- 分层数据流：[docs/03-system-design/layers-and-data-flow.md](./docs/03-system-design/layers-and-data-flow.md)

## License

MIT
