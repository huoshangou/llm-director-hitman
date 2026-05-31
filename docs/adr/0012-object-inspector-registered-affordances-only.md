# Object Inspector Affordance Hint

Object Inspector **只显示**当前已在 [tool-manifest](../04-domain/tool-manifest.md)（ADR-0006）注册的 tool 所对应的 affordance。

**禁止**展示 archive 对象上存在但未实现的能力（如 `poison_drink`、`swap_drink`、`loop_camera`）。

实现：`hintForObject(object, toolRegistry)` — 交集 `(object.affordances ∩ registeredToolIds)`，再映射人类可读文案。

未注册 affordance 从 `initialWorld` 数据里可保留（未来扩展），但 **UI 不 hint**。
