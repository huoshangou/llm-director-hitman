# GameEvent → 视觉映射（草案）

status: draft  
依赖: art-asset-manifest.md · ADR-0001/0002

| GameEvent / WorldState | /sprites | Overlay |
|------------------------|----------|---------|
| spoof_message success | target_checking_phone | fake_message_icon, private_meeting_belief |
| lure / bias ↑ | target_idle | route_arrow, private_meeting_belief |
| tickWorld npc_move → balcony | target_moving | route_arrow off |
| redirect_guard admin frame | guard_distracted | admin_issue_belief, attention_line |
| move_cleaning_cart | cleaner pushing_cart | sight_cone_blocked |
| spill_drink | wine_glass spilled | spill_overlay |
| tamper_balcony_rail | balcony_rail tampered | — |
| stage_accident ready | — | accident_ready |
| impersonate_staff | runner_disguised_waiter | disguise_icon |
| alert_change | guard_alarmed 等 | suspicion_alert |
| tool_failed social | face_exposed / guard_suspicious | suspicion_question |

完整表在实现 `lib/timeline/eventTemplates.ts` 时补全。
