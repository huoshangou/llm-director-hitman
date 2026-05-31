# Validate：Precondition Scan

DirectorPlan 进入 `executePlan` **之前**，对 `toolChain` 每一项用**当前 WorldState** 跑 `checkPreconditions`（及 actor 合法性、tool 在 ADR-0006 manifest 内）。

| 结果 | 处理 |
|------|------|
| 通过 | 进入可执行链 |
| 失败 | 移入 `unsupportedParts` / validation.errors；**不** silent execute |

**step 模式**：可执行链非空则执行 `[0]`；若首项 blocked，返回 partial + 降级建议。  
**full chain（Debug）**：只跑通过项，或整链 partial 并列出 rejected（实现二选一，推荐 **跳过 blocked 继续** 并 log warnings）。

Hard constraint（ADR-0008）：玩家要求 subtle 但 `redirect_guard` 缺 `admin_issue` frame → **warning**，不自动改 frame。

**Considered options**

- B 仅 Debug：玩家-facing 体验差  
- C defer：与 ADR-0003/0009 同区规则冲突  
- **A（采纳）**：validate + precondition scan  

**Consequences**

- 扩展 `validateDirectorPlan.ts` → 调用 `checkPreconditions`  
- API `/api/director` 返回 `{ plan, validation: { errors, warnings, executableChain } }`  
- UI：Plan 提交后先展示「可执行 / 被世界拒绝」再 simulate  
- Director prompt：强调不要输出当前 world 下必 blocked 的 tool
