/** Drives HitmanCore.computePlaybackFrame during a turn (gameLoop renders each frame). */
async function playTurnTimeline(worldBefore, timeline, onFrame) {
  const duration = HitmanCore.totalPlaybackDurationMs(timeline);
  if (!duration) return;

  const start = performance.now();
  return new Promise((resolve) => {
    function tick() {
      const elapsed = performance.now() - start;
      const frame = HitmanCore.computePlaybackFrame(worldBefore, timeline, elapsed);
      onFrame(frame);
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        onFrame(null);
        resolve();
      }
    }
    tick();
  });
}
