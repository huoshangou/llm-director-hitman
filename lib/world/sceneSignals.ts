import type { LocationId, WorldState } from "./worldTypes";

/** 由 WorldState 推导的场面信号（ADR-0014 · 方案 2） */
export type SceneSignals = {
  powerOutage: boolean;
  spillAt: LocationId | null;
  alertElevated: boolean;
};

export function getSceneSignals(world: WorldState): SceneSignals {
  const spillAt =
    (Object.entries(world.locations).find(([, loc]) =>
      loc.tags.includes("spill"),
    )?.[0] as LocationId | undefined) ?? null;

  return {
    powerOutage: world.objects.power_panel.state.powerStable === false,
    spillAt,
    alertElevated: ["searching", "lockdown", "alarm"].includes(world.alertLevel),
  };
}
