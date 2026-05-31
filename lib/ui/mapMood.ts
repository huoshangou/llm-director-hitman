import { classifyTerminalState } from "../convergence/terminalState";
import type { WorldState } from "../world/worldTypes";

export type MapMood = "calm" | "tense" | "failed";

export function mapMoodFromWorld(world: WorldState): MapMood {
  const terminal = classifyTerminalState(world);
  if (terminal.id.startsWith("failed_")) return "failed";
  if (world.alertLevel === "alarm" || world.alertLevel === "lockdown") return "failed";
  if (terminal.id === "stalled_target") return "tense";
  if (world.suspicion >= 45 || world.player.traceRisk >= 50) return "tense";
  if (world.alertLevel === "suspicious" || world.alertLevel === "searching") return "tense";
  return "calm";
}

/** Persistent low-light overlay when power panel is disrupted. */
export function mapLightingFromWorld(world: WorldState): "normal" | "dimmed" {
  if (world.objects.power_panel.state.powerStable === false) return "dimmed";
  return "normal";
}

export const MAP_MOOD_OVERLAY: Record<
  MapMood,
  { className: string; label: string } | null
> = {
  calm: null,
  tense: {
    className:
      "pointer-events-none absolute inset-0 z-[35] rounded-xl bg-amber-950/25 ring-2 ring-inset ring-amber-600/35",
    label: "场面收紧",
  },
  failed: {
    className:
      "pointer-events-none absolute inset-0 z-[35] rounded-xl bg-red-950/40 ring-2 ring-inset ring-red-600/55",
    label: "局势失控",
  },
};
