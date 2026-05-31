import { isSightlineClear } from "../world/selectors";
import type { WorldState } from "../world/worldTypes";

export type TerminalStateId =
  | "in_progress"
  | "success_clean_accident"
  | "success_messy_accident"
  | "success_poison_balcony"
  | "failed_alarm"
  | "failed_final_exposed"
  | "failed_collateral"
  | "stalled_target";

export type TerminalState = {
  id: TerminalStateId;
  label: string;
  description: string;
};

export type ConvergenceCheckpoint = {
  id: string;
  label: string;
  done: boolean;
};

export function convergenceCheckpoints(world: WorldState): ConvergenceCheckpoint[] {
  return [
    {
      id: "target_balcony",
      label: "目标在阳台",
      done: world.npcs.target.location === "balcony",
    },
    {
      id: "guard_window",
      label: "保安视线被引开",
      done: ["handling_complaint", "distracted", "investigating", "panic"].includes(
        world.npcs.guard.attentionMode,
      ),
    },
    {
      id: "power_disrupted",
      label: "配电已干扰",
      done: world.objects.power_panel.state.powerStable === false,
    },
    {
      id: "sightline",
      label: "阳台视线窗口",
      done: isSightlineClear(world, "balcony"),
    },
    {
      id: "rail",
      label: "栏杆已动手脚",
      done: world.objects.balcony_rail.state.tampered === true,
    },
    {
      id: "final",
      label: "事故已 staged",
      done: world.objective.targetHandled,
    },
  ];
}

export function classifyTerminalState(world: WorldState): TerminalState {
  if (world.objective.targetHandled) {
    if (world.objective.style === "poison") {
      return {
        id: "success_poison_balcony",
        label: world.objective.cleanExit ? "成功 · 阳台毒杀" : "成功 · 阳台毒杀（有痕迹）",
        description: world.objective.cleanExit
          ? "Victor 在阳台倒下，场面像私密医疗意外。"
          : "Victor 在阳台倒下，但现场可能留痕。",
      };
    }
    if (world.objective.cleanExit && world.objective.style === "accident") {
      return {
        id: "success_clean_accident",
        label: "成功 · 干净事故",
        description: "目标已处理，痕迹相对可控。",
      };
    }
    return {
      id: "success_messy_accident",
      label: "成功 · 有痕迹",
      description: "目标已处理，但 evidence / trace 偏高。",
    };
  }

  if (
    !world.objective.targetHandled &&
    (world.objective.style === "collateral" || world.objective.style === "failed")
  ) {
    return {
      id: "failed_collateral",
      label: "失败 · 误伤暴露",
      description: "非合同目标伤亡引发警报，任务中止。",
    };
  }

  if (world.alertLevel === "alarm" || world.alertLevel === "lockdown") {
    return {
      id: "failed_alarm",
      label: "失败 · 警报",
      description: "警觉过高，任务暴露或中断。",
    };
  }

  if (world.objective.style === "failed" && world.objective.targetHandled) {
    return {
      id: "failed_final_exposed",
      label: "失败 · 终局暴露",
      description: "最后一步失手，未达成干净收场。",
    };
  }

  if (world.turn >= 8 && world.npcs.target.location !== "balcony") {
    return {
      id: "stalled_target",
      label: "卡住 · 目标未上阳台",
      description: "需要更多引诱或 bias 铺垫（spoof + lure）。",
    };
  }

  return {
    id: "in_progress",
    label: "进行中",
    description: "尚未收敛到终态，继续按步骤推进。",
  };
}
