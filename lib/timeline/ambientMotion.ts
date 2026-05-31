/** Sub-pixel idle motion so the scene feels alive between turns. */

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ambientEntityOffset(
  entityId: string,
  timeSec: number,
): { dx: number; dy: number } {
  const h = hash(entityId);
  const phase = h * 0.17;
  const dx = Math.sin(timeSec * 0.9 + phase) * 4.5;
  const dy = Math.cos(timeSec * 1.1 + phase * 1.3) * 3.2;
  return { dx, dy };
}
