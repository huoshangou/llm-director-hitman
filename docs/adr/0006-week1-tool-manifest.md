# Week1 Tool Manifest

Week1 锁定 **12 个常规 Tool + 1 个终局 Tool**；**不含** `loop_camera`。

## 12 常规 Tool

**Social（4）**  
`create_complaint` · `impersonate_staff` · `lure_with_private_meeting` · `redirect_guard_attention`

**Information（4）**  
`spoof_message` · `modify_guest_list` · `fake_schedule_conflict` · `suppress_camera_record`

**Physical（4）**  
`spill_drink` · `move_cleaning_cart` · `disable_power_panel` · `tamper_balcony_rail`

## 终局（final category）

`stage_accident` — 不计入「12 常规」，单独 precondition 与 UI 标注。

## 明确不做（week1）

`loop_camera` — 与 `suppress_camera_record` 重叠；defer 至 v0.3+。  
对象 `hallway_camera` 状态仍可保留 `looped` 字段供美术/未来扩展，但无对应 Tool。

## 数量口径

对外可说「12 个工具 + 终局动作」或「13 个注册 tool（含 final）」。

**Considered options**

- B 14 含 loop_camera：LLM 误选面大  
- C 砍 fake_schedule_conflict：损失 staff 调度玩法  
- **A（采纳）**：12+final，无 loop_camera  

**Consequences**

- `toolRegistry` / Hacker `availableTools` 移除 `loop_camera`  
- Director prompt / summarizeWorld 只列 manifest 内 id  
- validate 拒绝未知 tool（含 loop_camera）  
- archive v0.2 registry 中 loop_camera 作废
