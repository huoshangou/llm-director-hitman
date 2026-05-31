"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collectHackerIntel,
  pickHackerIntel,
  type HackerIntelTrigger,
} from "@/lib/hacker/hackerIntel";
import type { HackerFeedItem } from "@/components/HackerCommsPanel";
import type { MapSelection } from "@/lib/ui/mapSelection";
import type { WorldState } from "@/lib/world/worldTypes";

const MAX_ITEMS = 8;

function bootItems(world: WorldState): HackerFeedItem[] {
  const seen = new Set<string>();
  const lines = collectHackerIntel(world, "boot");
  for (const line of lines) seen.add(line.id);
  return lines.map((line) => ({ ...line, at: Date.now() }));
}

export function useHackerIntelFeed(
  world: WorldState,
  options: { paused: boolean; selection: MapSelection | null; intelOnSelect?: boolean },
) {
  const intelOnSelect = options.intelOnSelect !== false;
  const [items, setItems] = useState<HackerFeedItem[]>(() => bootItems(world));
  const seenRef = useRef(new Set(items.map((i) => i.id)));
  const prevTurnRef = useRef(world.turn);

  const push = useCallback(
    (trigger: HackerIntelTrigger, selection: MapSelection | null = null) => {
      const line = pickHackerIntel(world, trigger, seenRef.current, selection);
      if (!line) return;
      seenRef.current.add(line.id);
      setItems((prev) => [...prev, { ...line, at: Date.now() }].slice(-MAX_ITEMS));
    },
    [world],
  );

  useEffect(() => {
    if (!intelOnSelect || options.paused || !options.selection) return;
    push("select", options.selection);
  }, [intelOnSelect, options.selection, options.paused, push]);

  useEffect(() => {
    if (world.turn > prevTurnRef.current) {
      push("turn_end");
      prevTurnRef.current = world.turn;
    }
  }, [world.turn, push]);

  const onAmbientPulse = useCallback(() => {
    if (options.paused) return;
    push("ambient");
  }, [options.paused, push]);

  const resetFeed = useCallback(() => {
    const boot = bootItems(world);
    seenRef.current = new Set(boot.map((i) => i.id));
    prevTurnRef.current = 0;
    setItems(boot);
  }, [world]);

  return { items, onAmbientPulse, resetFeed };
}
