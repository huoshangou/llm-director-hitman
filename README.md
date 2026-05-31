# LLM Director Hitman Demo

**LLM Director over Deterministic Sandbox** — 玩家用自然语言描述暗杀计划；LLM 编译为工具链；确定性规则改变世界；2.5D 画面播放因果链。

作者：stevehong
仓库：https://github.com/huoshangou/llm-director-hitman

---

## 他人能否直接体验？

可以。克隆本仓库后，在 **macOS / Linux / Windows** 上安装 **Node.js 18+**，按下方「快速开始」即可本地运行，**无需自备 LLM API Key** 也能玩（内置 Plan Stub）。

| 能力 | 无 API Key | 配置 API Key 后 |
|------|------------|-----------------|
| 打开 `/play/` 沙盒、看地图与回合 | ✅ | ✅ |
| 自然语言 Plan → 确定性因果回放 | ✅（Stub 编译） | ✅ |
| 真实 LLM 编译复杂计划 | ❌ | ✅ |

---

## 环境要求

- **Node.js** ≥ 18（推荐 20 LTS）
- **npm**（随 Node 安装）
- 可用 **8747** 端口（本 demo 固定端口，避免与 3000 冲突）
- 浏览器访问请用 **http://127.0.0.1:8747**（与项目一致；若 `localhost` 解析异常请改 127.0.0.1）

---

## 快速开始（推荐路径）

在任意目录克隆并启动：

```bash
git clone https://github.com/huoshangou/llm-director-hitman.git
cd llm-director-hitman
npm install
npm run play
```

`npm run play` 会自动完成：

1. 构建 Canvas 沙盒核心（`build:sandbox`）
2. 发布到 `public/play/`（`sync:play`）
3. 启动 Next.js 开发服（端口 **8747**）
4. macOS 下尝试自动打开浏览器

终端保持运行；停止请 **Ctrl+C**。

### 打开地址

| 地址 | 说明 |
|------|------|
| http://127.0.0.1:8747/play/index.html | **推荐**：Canvas 导演沙盒（完整试玩） |
| http://127.0.0.1:8747/ | 主站：Plan 输入、Inspector、调试 |
| http://127.0.0.1:8747/gm | GM：LLM 连通性测试、手动用例 |

---

## 接入 LLM（可选，BYOK）

需要真实 LLM 编译计划时：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，**二选一**：

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

保存后 **重新执行** `npm run play`。也可在 `/gm` 页测试连通性。

> `.env.local` 已在 `.gitignore` 中，不会进入仓库。请勿将密钥提交到 Git。

---

## 怎么玩

1. 打开 **http://127.0.0.1:8747/play/index.html**，阅读任务简报。
2. 用中文写下暗杀计划（例：让目标去阳台、下毒、别触发安保、最好像意外）。
3. 提交后 **Director** 编译为 `DirectorPlan`（意图、约束、工具链）。
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

**红线**：LLM 不直接写 WorldState；只产出 DirectorPlan。

---

## 项目结构

```text
app/              Next.js 页面与 API（/api/director 等）
components/       React UI
lib/
  world/          WorldState、NPC tick、规则
  tools/          ToolRegistry、ToolResolver
  director/       LLM 编译、Plan 校验与 Stub
  timeline/       事件时间线
  beats/          关卡节拍
  bridge/         沙盒 bundle 入口（hitman-core.js）
sandbox-shell/    Canvas 沙盒 HTML/JS 源码
public/play/      沙盒构建产物（npm run play 时生成，不入库）
scripts/          dev-server、sync、测试脚本
docs/             设计文档与 ADR（公开子集）
```

---

## 常见问题

**`/play/` 空白或 404**  
先确认已执行 `npm run play`（会生成 `public/play/`）。不要只跑 `next dev` 而跳过 sync。

**端口被占用**  
```bash
lsof -ti :8747 | xargs kill -9   # macOS / Linux
npm run play
```

**只想重新构建沙盒、不重启服务**  
```bash
npm run build:sandbox && npm run sync:play
```

**Windows 下 `sprites` 符号链接异常**  
资源在 `public/sprites/`，一般不影响运行；若工具读不到可手动将 `sprites` 指向 `public/sprites`。

**`~/hitman` 与桌面启动器**  
为本机 macOS 开发便利脚本（`setup:home`），**克隆体验不需要**，按上文 `npm run play` 即可。

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

MIT
