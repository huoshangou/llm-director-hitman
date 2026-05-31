# 仓库目录

status: draft  
source: archive/v0.1 §3.1, v0.2 §2

## 目标结构（代码阶段）

```text
app/
  page.tsx
  tools/asset-cutter/page.tsx   # 本地 sheet 裁切工具；只处理浏览器本地文件
  api/director/route.ts
  api/simulate/route.ts
components/
  AgentPanel.tsx
  DebugPanel.tsx
  EventLog.tsx
  GameMap.tsx
  Hud.tsx
  ObjectInspector.tsx
  PlanInput.tsx
  TimelinePlayer.tsx
sandbox-shell/  Canvas 导演沙盒 H0+（dist/hitman-core.js 由 build:sandbox 生成）
lib/
  beats/        routeActs、modifiers（幕与修饰器）
  director/     injectRules、beatDirector（注入队列与会话导演）
  bridge/       sandboxApi、sandboxSession、worldToScene（浏览器 bundle）
  assets/       asset cutter manifest / filename / rect helpers
  director/     callDirector, directorPrompt, directorSchema, validateDirectorPlan, summarizeWorldForDirector
  timeline/     buildTimeline, eventTemplates
  tools/        toolRegistry, resolveTool, checkPreconditions, applyWorldDelta, executePlan, toolTypes
  world/        initialWorld, worldTypes, selectors, worldRules, tickWorld.ts
  routes/       showcaseRoutes.ts
  utils/        id, clamp, deepClone
public/
  sprites/
    sheets/     AI 生成原始大图；经 asset cutter 裁切后再进入 map/characters/objects/overlays
  sfx/          可选
docs/           设计文档（本仓库）
```

archive v0.1 曾用 `/api/resolve-turn`；v0.2 统一为 `/api/simulate`。

## 实现任务拆分

见 archive v0.2 §25（Task 1–7）；摘要在 [../07-planning/week-schedule.md](../07-planning/week-schedule.md)
