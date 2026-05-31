import { convergenceCheckpoints } from "../convergence/terminalState";
import { isSightlineClear } from "../world/selectors";
import { hintForObject } from "../ui/hintForObject";
import type { MapSelection } from "../ui/mapSelection";
import { OBJECT_LABELS } from "../sprites/objectVisualOffsets";
import { NPC_LABELS } from "../ui/labels";
import type { ObjectId, WorldState } from "../world/worldTypes";

export type HackerIntelTrigger = "boot" | "ambient" | "turn_end" | "select";

export type HackerIntelLine = {
  id: string;
  text: string;
  priority: number;
};

function candidatesForSelection(world: WorldState, selection: MapSelection): HackerIntelLine[] {
  const out: HackerIntelLine[] = [];
  if (selection.kind === "object") {
    const obj = world.objects[selection.id as ObjectId];
    if (!obj) return out;
    const label = OBJECT_LABELS[selection.id as ObjectId] ?? obj.name;
    const hints = hintForObject(obj);
    if (hints.length === 1) {
      out.push({
        id: `sel_obj_${selection.id}_${hints[0].toolId}`,
        text: `【监听·${label}】可尝试：${hints[0].label}。写进 plan 或点「插入选中」。`,
        priority: 12,
      });
    } else if (hints.length > 1) {
      out.push({
        id: `sel_obj_${selection.id}`,
        text: `【监听·${label}】有 ${hints.length} 种介入方式，先看右侧 Inspector。`,
        priority: 10,
      });
    }
    if (selection.id === "power_panel") {
      out.push({
        id: "sel_power_hint",
        text: "【配电】动静大，但能把保安引去厨房——适合路线 B 开局。",
        priority: 11,
      });
    }
    if (selection.id === "balcony_rail") {
      out.push({
        id: "sel_rail_hint",
        text: "【阳台栏杆】事故链的物理落点；先引开保安再动手。",
        priority: 11,
      });
    }
    if (selection.id === "guest_list_terminal") {
      out.push({
        id: "sel_terminal_hint",
        text: "【宾客终端】远程改名单需 Player 权限；Face 可配合行政话术引开保安。",
        priority: 10,
      });
    }
    if (selection.id === "wine_bottle" || selection.id === "wine_glass") {
      out.push({
        id: `sel_wine_mission_${selection.id}`,
        text: "【酒具·任务】香槟从吧台备酒送出，但 Victor 习惯在阳台独自接那一杯。",
        priority: 12,
      });
    }
    if (selection.id === "cleaning_cart") {
      out.push({
        id: "sel_cart_mission",
        text: "【清洁车·任务】可挡视线或配合服务员伪装推进画廊动线。",
        priority: 10,
      });
    }
  }
  if (selection.kind === "npc") {
    const npc = world.npcs[selection.id as keyof typeof world.npcs];
    const label = NPC_LABELS[selection.id as keyof typeof NPC_LABELS]?.short ?? selection.id;
    if (npc) {
      out.push({
        id: `sel_npc_${selection.id}_${npc.location}`,
        text: `【监听·${label}】当前在 ${npc.location}，状态 ${npc.attentionMode}。`,
        priority: 8,
      });
    }
    if (selection.id === "target") {
      out.push({
        id: "sel_target_hint",
        text: "【Victor Vale】合同要他在阳台倒下；短信 + Face 私密邀约把他勾到阳台。",
        priority: 11,
      });
    }
    if (selection.id === "guard") {
      out.push({
        id: "sel_guard_hint",
        text: "【保安】用行政投诉或配电故障引开；别在他在看阳台时硬上。",
        priority: 11,
      });
    }
  }
  if (selection.kind === "agent") {
    out.push({
      id: `sel_agent_${selection.id}_${world.agents[selection.id as keyof typeof world.agents]?.location}`,
      text: `【频道·${selection.id}】现场位置：${world.agents[selection.id as keyof typeof world.agents]?.location ?? "—"}。`,
      priority: 7,
    });
  }
  return out;
}

/** 根据世界态生成可播报的黑客监听条目（确定性，不调用 LLM）。 */
export function collectHackerIntel(
  world: WorldState,
  trigger: HackerIntelTrigger,
  selection: MapSelection | null = null,
): HackerIntelLine[] {
  const lines: HackerIntelLine[] = [];

  if (trigger === "boot") {
    lines.push({
      id: "boot_layout",
      text: "任务：Victor Vale · 须在阳台收场。传感器：配电 · 吧台酒具 · 画廊 · 阳台栏杆。",
      priority: 90,
    });
    return lines;
  }

  if (trigger === "select" && selection) {
    return candidatesForSelection(world, selection);
  }

  const target = world.npcs.target;
  const guard = world.npcs.guard;
  const cps = convergenceCheckpoints(world);

  if (target.location === "gallery" && !cps.find((c) => c.id === "final")?.done) {
    lines.push({
      id: `target_gallery_t${world.turn}`,
      text: "【画廊】目标仍在主厅社交，阳台窗口未开。",
      priority: 6,
    });
  }
  if (target.location === "balcony") {
    lines.push({
      id: `target_balcony_t${world.turn}`,
      text: "【阳台】目标已就位——检查栏杆与视线再收束。",
      priority: 14,
    });
  }

  if (guard.attentionMode === "investigating") {
    lines.push({
      id: `guard_power_t${world.turn}`,
      text: "【厨房】保安在查配电，画廊监控变暗——窗口不错。",
      priority: 13,
    });
  }
  if (guard.attentionMode === "handling_complaint") {
    lines.push({
      id: `guard_admin_t${world.turn}`,
      text: "【大堂】保安被前台事务钉住，视线从阳台移开。",
      priority: 12,
    });
  }
  if (
    (guard.attentionMode === "watching_security" || guard.attentionMode === "watching_area") &&
    target.location !== "balcony"
  ) {
    lines.push({
      id: `guard_watch_t${world.turn}`,
      text: "【警戒】保安仍在巡视，阳台方向可能被盯着。",
      priority: 7,
    });
  }

  if (world.objects.power_panel.state.powerStable === false) {
    lines.push({
      id: "power_down",
      text: "【配电】区域供电异常，监控反馈减弱。",
      priority: 10,
    });
  }

  if (world.objects.balcony_rail.state.tampered === true) {
    lines.push({
      id: "rail_tampered",
      text: "【结构】阳台栏杆参数异常——事故条件接近就绪。",
      priority: 12,
    });
  }

  if (!isSightlineClear(world, "balcony") && !cps.find((c) => c.id === "final")?.done) {
    lines.push({
      id: `sight_blocked_t${world.turn}`,
      text: "【视线】阳台仍被观察或遮挡，先引开保安或挡线。",
      priority: 11,
    });
  }

  if (world.suspicion >= 35) {
    lines.push({
      id: `suspicion_${Math.floor(world.suspicion / 10)}`,
      text: `【风险】怀疑度 ${world.suspicion}，痕迹偏高，后续动作宜收敛。`,
      priority: 9,
    });
  }

  if (world.alertLevel === "alarm" || world.alertLevel === "lockdown") {
    lines.push({
      id: `alert_${world.alertLevel}`,
      text: "【警报】场面失控，本路线可能已失败。",
      priority: 20,
    });
  }

  if (trigger === "turn_end" && world.turn <= 2) {
    lines.push({
      id: `turn_early_${world.turn}`,
      text: "【提示】多 turn 收束：引开 → 引诱上阳台 → 栏杆 → 事故。",
      priority: 5,
    });
  }

  if (trigger === "ambient" && lines.length === 0) {
    lines.push({
      id: `ambient_pulse_${world.timeSeconds}`,
      text: "【静噪】现场运转中… 可点配电箱、终端或目标听更多细节。",
      priority: 3,
    });
  }

  return lines;
}

export function pickHackerIntel(
  world: WorldState,
  trigger: HackerIntelTrigger,
  seenIds: Set<string>,
  selection: MapSelection | null = null,
): HackerIntelLine | null {
  const candidates = collectHackerIntel(world, trigger, selection)
    .filter((c) => !seenIds.has(c.id))
    .sort((a, b) => b.priority - a.priority);
  return candidates[0] ?? null;
}
