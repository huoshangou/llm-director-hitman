"use client";

import { useEffect, useRef } from "react";
import { runAmbientStep } from "@/lib/world/ambientWorld";
import type { WorldState } from "@/lib/world/worldTypes";

const AMBIENT_MS = 2400;

export function useAmbientWorld(
  world: WorldState,
  setWorld: (w: WorldState) => void,
  options: { enabled: boolean; paused: boolean; onAmbientTick?: () => void },
) {
  const worldRef = useRef(world);
  worldRef.current = world;

  useEffect(() => {
    if (!options.enabled || options.paused) return;

    const id = window.setInterval(() => {
      const { world: next } = runAmbientStep(worldRef.current);
      setWorld(next);
      options.onAmbientTick?.();
    }, AMBIENT_MS);

    return () => window.clearInterval(id);
  }, [options.enabled, options.paused, options.onAmbientTick, setWorld]);

  return {};
}
