# LLM Director Hitman Demo

**LLM Director over Deterministic Sandbox** — 玩家用自然语言描述暗杀计划；**LLM** 编译为工具链；确定性规则改变世界；2.5D 画面播放因果链。

**作者：** stevehong  
**仓库：** https://github.com/huoshangou/llm-director-hitman

本 demo 的核心体验依赖 **LLM Director**：请自备 API Key 后再运行。

---

## 环境要求

- **Node.js** ≥ 18（推荐 20 LTS）
- **npm**
- **LLM API Key**（见下方配置；推荐 OpenRouter + DeepSeek V4 Pro）
- 可用 **8747** 端口
- 浏览器请用 **http://127.0.0.1:8747**（项目统一用 127.0.0.1，避免 `localhost` 解析异常）

---

## 快速开始

### 1. 克隆与安装

```bash
git clone https://github.com/huoshangou/llm-director-hitman.git
cd llm-director-hitman
npm install
```

### 2. 配置 LLM（必做）

```bash
cp .env.example .env.local
```

编辑 `.env.local`，**推荐**通过 [OpenRouter](https://openrouter.ai/) 使用 **DeepSeek V4 Pro**（维护者本地即用此组合）：

```env
OPENROUTER_API_KEY=你的_OpenRouter_密钥
OPENROUTER_MODEL=deepseek/deepseek-v4-pro
```

在 OpenRouter 创建 Key：https://openrouter.ai/keys  

模型页（确认 slug 与定价）：https://openrouter.ai/deepseek/deepseek-v4-pro

**备选：DeepSeek 官方 API**

```env
OPENAI_API_KEY=你的_DeepSeek_密钥
OPENAI_MODEL=deepseek-v4-pro
OPENAI_BASE_URL=https://api.deepseek.com/v1
```

Key 在 https://platform.deepseek.com/ 创建。

> `.env.local` 已在 `.gitignore` 中，**请勿将密钥提交到 Git**。修改后需重启服务。

### 3. 启动

```bash
npm run play
```

`npm run play` 会自动：构建沙盒核心 → 发布到 `public/play/` → 启动 Next.js（端口 **8747**）。终端保持运行，停止请 **Ctrl+C**。

### 4. 打开浏览器

| 地址 | 说明 |
|------|------|
| http://127.0.0.1:8747/play/index.html | **推荐**：Canvas 导演沙盒（完整体验） |
| http://127.0.0.1:8747/ | 主站：Plan、Inspector |
| http://127.0.0.1:8747/gm | GM：LLM 连通性测试 |

首次启动前可在 `/gm` 确认 LLM 已连通。

---

## 怎么玩

1. 打开 **http://127.0.0.1:8747/play/index.html**，阅读任务简报。
2. 用中文写下暗杀计划（例：让目标去阳台、下毒、别触发安保、最好像意外）。
3. 提交后 **LLM Director** 将计划编译为 `DirectorPlan`（意图、约束、工具链）。
4. 每回合引擎 **确定性执行** 工具链前沿一步；地图、NPC、电台、Inspector 反馈因果。
5. 根据结果继续补充或修改计划，直到任务成功或失败。

核心体验：玩家想到的计划，被转译成世界里的**可见因果链**——不是和文本框聊天。

---

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

---

## 项目结构

```text
app/              Next.js 页面与 API（/api/director 等）
components/       React UI
lib/
  world/          WorldState、NPC tick、规则
  tools/          ToolRegistry、ToolResolver
  director/       LLM 编译、DirectorPlan 校验
  timeline/       事件时间线
  beats/          关卡节拍
  bridge/         沙盒 bundle 入口（hitman-core.js）
sandbox-shell/    Canvas 沙盒 HTML/JS 源码
public/play/      沙盒构建产物（npm run play 时生成，不入库）
scripts/          dev-server、sync、测试脚本
docs/             设计文档与 ADR
```

---

## 常见问题

**LLM 无响应 / Plan 无法编译**  
检查 `.env.local` 是否已填 Key、`OPENROUTER_MODEL` 是否为 `deepseek/deepseek-v4-pro`，并重启 `npm run play`。在 `/gm` 页测试连通性。

**`/play/` 空白或 404**  
须先执行 `npm run play`（会生成 `public/play/`），不要只跑 `next dev`。

**端口被占用**

```bash
lsof -ti :8747 | xargs kill -9   # macOS / Linux
npm run play
```

**只想重新构建沙盒**

```bash
npm run build:sandbox && npm run sync:play
```

---

## 开发验证

```bash
npm run lint
npm run build
npm run test:tools
npm run test:timeline
npm run test:sandbox
```

---

## 文档

- 术语：[CONTEXT.md](./CONTEXT.md)
- 产品定义：[docs/01-vision/product-brief.md](./docs/01-vision/product-brief.md)
- 分层数据流：[docs/03-system-design/layers-and-data-flow.md](./docs/03-system-design/layers-and-data-flow.md)

---

## License

MIT · Copyright stevehong
