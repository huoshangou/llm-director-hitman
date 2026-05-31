# Social Frame：admin_issue vs default

Week1 为 `redirect_guard_attention`（及同类 social framing）实现 **两档** `params.frame`：

| frame | 含义 | 规则效果（week1） |
|-------|------|-------------------|
| `admin_issue` | VIP/前台/服务行政问题 | alert 不涨或 +curious 以内；叠加 `admin_issue_belief` overlay |
| `default` | 未指定或其它 | 现有中性/略升 suspicion 逻辑 |

Zod：`params.frame: z.enum(["admin_issue", "default"]).optional()`，缺省 = `default`。

Director prompt：玩家约束「别当安保事件」→ 必须对 guard redirect 类 tool 填 `admin_issue`。

**Defer**：`security_issue`、`service_problem` 等细 enum → v0.3。

**Considered options**

- A 完整 enum：week1 过重  
- **B（采纳）**：两档够用 showcase  
- C defer：无法验收「别惊动保安」  

**Consequences**

- handler 读 `request.params?.frame ?? "default"`  
- validate warn：hard constraint 要求 subtle 但 frame=default  
- 美术：`admin_issue_belief.png` 绑定 frame=admin_issue
