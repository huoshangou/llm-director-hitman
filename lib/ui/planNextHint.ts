import { convergenceCheckpoints } from "../convergence/terminalState";
import type { ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";
import { isSightlineClear } from "../world/selectors";

export type RejectedStep = {
  request: ToolUseRequest;
  reasons: string[];
};

function reasonBlob(reasons: string[]): string {
  return reasons.join("; ").toLowerCase();
}

/** Player-readable next step when validate rejects or blocks a tool. */
export function planNextHint(
  world: WorldState,
  rejected: RejectedStep | null | undefined,
): string | null {
  if (!rejected) return null;
  const { request, reasons } = rejected;
  const r = reasonBlob(reasons);
  const toolId = request.toolId;

  if (toolId === "stage_accident") {
    const cps = convergenceCheckpoints(world);
    const missing = cps.filter(
      (cp) =>
        !cp.done &&
        ["target_balcony", "rail", "sightline", "guard_window"].includes(cp.id),
    );
    if (missing.length) {
      return `NEXT / 事故前置未满足：${missing.map((m) => m.label).join("、")}。典型顺序：伪造短信 → Face 引目标 → 引开保安 → 动栏杆。`;
    }
    return "NEXT / 阳台视线仍被保安覆盖；先 redirect_guard_attention 或 move_cleaning_cart。";
  }

  if (toolId === "disable_power_panel") {
    if (r.includes("observed")) {
      return "NEXT / Runner 正被保安直视；先用 Face 引开保安（admin_issue）或行政干扰。";
    }
    if (r.includes("not near")) {
      return "NEXT / Runner 需先进入配电区；写「让 Runner 断电」或选中配电箱。";
    }
    if (r.includes("alert")) {
      return "NEXT / 警觉过高；先降低场面张力或引开保安再动配电。";
    }
  }

  if (toolId === "spoof_message") {
    if (r.includes("permission") || r.includes("player lacks")) {
      return "NEXT / 需先拿到宾客终端权限：选中 guest_list_terminal，写「处理这个」改名单。";
    }
    if (r.includes("alert")) {
      return "NEXT / 场面过警觉；先 social 掩护或引开保安再发短信。";
    }
  }

  if (toolId === "suppress_camera_record") {
    if (r.includes("powermode") || r.includes("backup")) {
      return "NEXT / 摄像头仍在主供电；先让 Runner 干扰配电，让摄像头切到备用供电。";
    }
    if (r.includes("permission") || r.includes("player lacks")) {
      return "NEXT / 需要 security camera 权限后才能压制录像。";
    }
  }

  if (toolId === "tamper_balcony_rail") {
    if (r.includes("observed")) {
      return "NEXT / Runner 被保安盯住；先引开保安、断电或推清洁车再动栏杆。";
    }
    if (r.includes("not near")) {
      return "NEXT / Runner 需到阳台；写「动这个栏杆」前确保 Runner 能跨区到位。";
    }
  }

  if (toolId === "prepare_poisoned_drink") {
    if (r.includes("poisoned") && r.includes("false")) {
      return "NEXT / 酒已备毒；下一步引 Victor 上阳台或递杯。";
    }
    if (r.includes("observed")) {
      return "NEXT / 吧台被保安盯着；先引开保安再备毒。";
    }
  }

  if (toolId === "serve_poisoned_drink_on_balcony") {
    if (world.npcs.target.location === "balcony") {
      if (world.objects.wine_bottle.state.poison_served === true) {
        return "NEXT / 杯已递出；可 resolve_poison_on_balcony 结算。";
      }
      if (world.objects.wine_bottle.state.poisoned !== true) {
        return "NEXT / 酒具尚未下毒；先 Runner prepare_poisoned_drink。";
      }
      return "NEXT / Victor 已在阳台；下一轮让 Face 执行递杯（serve_poisoned_drink_on_balcony）。";
    }
    if (r.includes("target is not at balcony")) {
      return "NEXT / Victor 还没到阳台；先发短信 + Face 邀约，等 turn 结束后再递杯。";
    }
    if (r.includes("poisoned") && r.includes("false")) {
      return "NEXT / 酒具尚未下毒；先 Runner prepare_poisoned_drink。";
    }
    if (r.includes("poison_served")) {
      return "NEXT / 杯已递出；可 resolve_poison_on_balcony 结算。";
    }
  }

  if (toolId === "resolve_poison_on_balcony") {
    if (world.npcs.target.location === "balcony" && world.objects.wine_bottle.state.poison_served === true) {
      return "NEXT / Victor 已在阳台且已喝毒酒；下一轮 resolve_poison_on_balcony 结算。";
    }
    if (r.includes("poison_served")) {
      return "NEXT / 先 serve_poisoned_drink_on_balcony 让 Victor 在阳台喝下去。";
    }
    if (r.includes("target is not at balcony")) {
      return "NEXT / 结算须在阳台；先把 Victor 引上阳台。";
    }
  }

  if (r.includes("target is not at balcony")) {
    return "NEXT / 目标不在阳台；先 spoof_message + Face 私密邀约引过去。";
  }
  if (r.includes("tampered") && r.includes("balcony_rail")) {
    return "NEXT / 栏杆尚未 weaken；本 turn 提交 tamper_balcony_rail。";
  }
  if (r.includes("sightline")) {
    return "NEXT / 阳台视线未清空；引开保安或推清洁车挡视线。";
  }
  if (r.includes("not near")) {
    return `NEXT / ${request.actor} 与目标物件不在同区；先移动干员或换 actor。`;
  }
  if (r.includes("observed")) {
    return "NEXT / 干员暴露在保安视野；先引开保安或制造干扰。";
  }

  if (toolId === "eliminate_threat") {
    if (r.includes("co-located") || r.includes("not co")) {
      return "NEXT / 清威胁需与目标同区；让 Runner 换区或等保安进后厨/停电窗口。";
    }
    if (r.includes("guard still") || r.includes("watching")) {
      return "NEXT / 先 disable_power_panel 或 redirect_guard_attention，再 eliminate_threat。";
    }
    if (r.includes("contract target")) {
      return "NEXT / Victor 只能走阳台事故/毒酒；勿用 eliminate_threat。";
    }
  }

  if (toolId === "decline_with_guidance") {
    return "NEXT / 按电台引导铺阳台链：伪造短信 → 引阳台 → 栏杆/毒酒收尾。";
  }

  return null;
}

/** One-line blocker for Hacker Analysis (deterministic, no spoilers). */
export function selectionBlockerLine(world: WorldState, objectId: string): string | null {
  if (objectId === "balcony_rail") {
    if (world.objects.balcony_rail.state.tampered === true) return null;
    if (!isSightlineClear(world, "balcony")) {
      return "阻断：阳台仍在保安视线内，事故链需先清空视线或引开保安。";
    }
    if (world.npcs.target.location !== "balcony") {
      return "阻断：目标未在阳台，先完成引诱再动栏杆。";
    }
    return "可执行：Runner 跨区 tamper_balcony_rail（需未被保安观察）。";
  }
  if (objectId === "cleaning_cart") {
    if (world.objects.cleaning_cart.state.blockingSightline === true) {
      return "状态：清洁车已挡阳台视线（场景控制，非目标动机）。";
    }
    return "可执行：Runner move_cleaning_cart 挡 guard/camera 到阳台栏杆/门槛的视线。";
  }
  if (objectId === "power_panel") {
    if (world.objects.power_panel.state.powerStable === false) {
      return "状态：配电已干扰，保安可能被引往厨房。";
    }
    return "可执行：Runner disable_power_panel（避免在保安直视下操作）。";
  }
  if (objectId === "guest_list_terminal") {
    if (!world.player.permissions.includes("access_guest_terminal")) {
      return "阻断：尚未取得终端权限；本 turn 可 modify_guest_list 获取。";
    }
    return "可执行：Player 远程 modify_guest_list / 相关信息工具。";
  }
  return null;
}
