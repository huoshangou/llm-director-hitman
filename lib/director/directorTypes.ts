import type { ActiveBeat } from "../beats/beatTypes";

export type InjectEntry = {
  beatId: string;
  priority: number;
  ttlTurns: number;
  injectedAtTurn: number;
  reason: string;
};

export type DirectorState = {
  tension: number;
  injectQueue: InjectEntry[];
  activeBeat: ActiveBeat | null;
  actIndex: number;
  lastModifierId: string | null;
};

export function createDirectorState(): DirectorState {
  return {
    tension: 15,
    injectQueue: [],
    activeBeat: null,
    actIndex: 0,
    lastModifierId: null,
  };
}
