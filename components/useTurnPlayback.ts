"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  computePlaybackFrame,
  totalPlaybackDurationMs,
  type PlaybackFrame,
} from "@/lib/timeline/playback";
import type { GameEvent, WorldState } from "@/lib/world/worldTypes";

export function useTurnPlayback() {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState<PlaybackFrame | null>(null);
  const [displayWorld, setDisplayWorld] = useState<WorldState | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const play = useCallback(
    (worldBefore: WorldState, timeline: GameEvent[]) =>
      new Promise<void>((resolve) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        const duration = totalPlaybackDurationMs(timeline);
        if (duration <= 0) {
          resolve();
          return;
        }

        setPlaying(true);
        setDisplayWorld(worldBefore);
        const start = performance.now();

        const tick = () => {
          const elapsed = performance.now() - start;
          setFrame(computePlaybackFrame(worldBefore, timeline, elapsed));
          if (elapsed < duration) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            setFrame(null);
            setDisplayWorld(null);
            setPlaying(false);
            resolve();
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      }),
    [],
  );

  const cancel = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setFrame(null);
    setDisplayWorld(null);
    setPlaying(false);
  }, []);

  return { playing, frame, displayWorld, play, cancel };
}
