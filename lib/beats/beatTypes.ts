import type { ToolUseResult } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";

export type BeatPhase = "setup" | "active" | "resolving" | "done";

export type BeatAct = {
  id: string;
  name: string;
  emoji: string;
  /** Inclusive step indices within the showcase route. */
  fromStep: number;
  toStep: number;
  modifiers: string[];
};

export type ModifierContext = {
  world: WorldState;
  act: BeatAct;
  routeId: string;
  result: ToolUseResult;
  stepIndex: number;
};

export type BeatModifier = {
  id: string;
  name: string;
  emoji: string;
  priority: number;
  condition: (ctx: ModifierContext) => boolean;
  narrative: (ctx: ModifierContext) => string[];
};

export type ActiveBeat = {
  act: BeatAct;
  phase: BeatPhase;
  modifier: BeatModifier | null;
  /** Turns spent in resolving phase. */
  resolvingTurns: number;
};

export type NarrativeLine = {
  text: string;
  type: "director" | "beat" | "modifier" | "tool" | "world" | "reaction" | "result";
};
