# 技术栈

status: active  
source: archive/v0.2 §1

## 最小推荐

| 类别 | 选型 |
|------|------|
| 框架 | Next.js + React + TypeScript |
| 样式 | TailwindCSS |
| 校验 | Zod |
| LLM | OpenAI API 或兼容接口（env 配置模型名） |

## 地图渲染

**推荐**：React + SVG / absolute positioned div sprites  

备选：Canvas 2D · Pixi.js（熟悉再用）

动画：CSS transition；week1 不做重型引擎。

## 明确不用

Unity/Godot 等（文档未选）；复杂物理；真多 agent 编排框架。

## 可选资源目录

```text
public/sprites
public/sfx
```

week1 可选，非必。
