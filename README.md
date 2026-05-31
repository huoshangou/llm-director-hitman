# LLM Director Hitman Demo

**LLM Director over Deterministic Sandbox** — 玩家用自然语言描述暗杀计划；**LLM** 编译为工具链；确定性规则改变世界；2.5D 画面播放因果链。

**作者：** stevehong  
**仓库：** https://github.com/huoshangou/llm-director-hitman

本 demo 由 **LLM Director** 驱动：请在游戏内配置 API Key 后再提交计划（Key 只保存在本机浏览器，不会写入仓库）。

---

## 推荐怎么开始（不用记终端命令）

### 方式一：把仓库交给 Claude Code / Codex

把下面整段复制给你的 coding agent（需已安装 [Node.js 18+](https://nodejs.org/)）：

```text
请克隆并在本机运行这个 LLM 游戏 demo：
https://github.com/huoshangou/llm-director-hitman

要求：
1. git clone 后进入仓库根目录
2. 若未安装依赖则 npm install
3. 启动本地服务（npm run play；macOS 双击「启动 Hitman 演示.command」；Windows 双击「启动 Hitman 演示.bat」）
4. 在浏览器打开 http://127.0.0.1:8747/play/index.html
5. 告诉我如何在游戏内「AI 接入」面板配置 OpenRouter Key，模型用 deepseek/deepseek-v4-pro
6. 不要让我手改 .env；API Key 应在游戏 UI 里配置
```

Agent 会代为完成下载、安装与启动；你只需在打开的页面里填 Key。

### 方式二：一键启动（本仓库自带）

1. [Download ZIP](https://github.com/huoshangou/llm-director-hitman/archive/refs/heads/main.zip) 或 `git clone` 到本机任意目录。  
   macOS 用户请勿放在 iCloud「文稿」同步目录里，避免权限问题。
2. 安装 [Node.js 18+](https://nodejs.org/)（仅需一次）。
3. 在仓库根目录 **双击** 对应启动器：

   | 系统 | 文件 |
   |------|------|
   | **macOS** | `启动 Hitman 演示.command` |
   | **Windows** | `启动 Hitman 演示.bat` |

   - 首次会自动 `npm install`（稍等片刻）  
   - 随后启动本地服务；**不要关闭弹出的命令行窗口**  
   - 浏览器一般会打开；若没有，请手动访问下方地址  

4. **macOS** 若提示「无法打开」：右键 `.command` → **打开** → 确认一次。  
   **Windows** 若 SmartScreen 拦截：点「更多信息」→ **仍要运行**（脚本仅在本仓库内启动本地服务）。

---

## 打开哪个页面

| 地址 | 说明 |
|------|------|
| http://127.0.0.1:8747/play/index.html | **玩家入口**（推荐） |
| http://127.0.0.1:8747/gm | GM / LLM 连通性测试 |

请使用 **127.0.0.1**，不要用 `localhost`（与项目约定一致）。

---

## 在游戏内配置 LLM（必做）

启动后进入 **`/play/`**，左侧面板展开 **「AI 接入」**：

1. **供应商**：选 **OpenRouter**（推荐；一个 Key 可用多家模型）。
2. **模型 ID**：填 **`deepseek/deepseek-v4-pro`**（DeepSeek V4 Pro，维护者本地使用此模型）。  
   - 模型说明：https://openrouter.ai/deepseek/deepseek-v4-pro
3. **API Key**：在 https://openrouter.ai/keys 创建并粘贴（**仅存本机浏览器**，不会上传 GitHub）。
4. 点 **「测试连通」** → 成功后再点 **「保存」**。
5. 阅读任务简报，在 **「输入指令」** 用中文写下暗杀计划并 **发送指令**。

**备选供应商**

| 供应商 | 模型 ID 示例 | Key 获取 |
|--------|----------------|----------|
| DeepSeek 官方 | `deepseek-v4-pro` | https://platform.deepseek.com/ |
| OpenAI | `gpt-4o-mini` | https://platform.openai.com/ |

配置完成前，Director 无法按设计编译你的自然语言计划。

---

## 怎么玩

1. 地图点选目标 / 物件，底部 **骇入分析** 查看情报。
2. 用自然语言写计划（例：让目标去阳台、下毒、别惊动安保、最好像意外）。
3. **LLM Director** 编译为工具链；每回合引擎 **确定性执行** 一步，地图与 **Command Feed** 反馈因果。
4. 根据结果继续补充计划，直到成功或失败。

---

## 设计框架

```text
自然语言 Plan
  → LLM Director（语义编译）
  → 校验 DirectorPlan
  → ToolResolver（确定性改 WorldState）
  → Timeline / 2.5D 表现
  → 玩家 Replan
```

LLM 不直接改世界状态，只产出 `DirectorPlan`。

---

## 项目结构

```text
app/                    Next.js API
lib/director/           LLM 编译与校验
lib/tools/              确定性规则
sandbox-shell/          /play 页面源码
启动 Hitman 演示.command   macOS 一键启动
启动 Hitman 演示.bat       Windows 一键启动
```

---

## 常见问题

**双击启动器没反应**  
确认已装 Node.js。macOS：右键 `.command` → 打开。Windows：用 `.bat` 启动。查看命令行窗口里的报错。

**`/play/` 空白**  
须通过 `npm run play` 或双击启动器启动，不要单独开静态 HTML。

**LLM 测试失败**  
检查 Key 是否有效、模型 ID 是否为 `deepseek/deepseek-v4-pro`、本机能否访问对应 API。

**端口 8747 被占用**  
关闭旧终端里的演示进程，或重启电脑后再双击启动器。

---

## 开发者（可选）

```bash
git clone https://github.com/huoshangou/llm-director-hitman.git
cd llm-director-hitman
npm install
npm run play
```

`npm run play` 会自动构建沙盒并同步到 `public/play/`。  
服务端 `.env.local` 仅作开发兜底，**玩家体验以游戏内「AI 接入」为准**。

```bash
npm run lint && npm run test:tools && npm run test:sandbox
```

---

## 文档

- [CONTEXT.md](./CONTEXT.md) · [product-brief](./docs/01-vision/product-brief.md) · [layers-and-data-flow](./docs/03-system-design/layers-and-data-flow.md)

## License

MIT · Copyright stevehong
