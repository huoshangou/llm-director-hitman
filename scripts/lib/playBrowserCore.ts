/** Minimal HitmanCore surface for Playwright page.evaluate (avoids TS build errors). */
export type PlayBrowserCore = {
  mapPickablesFromWorld: (world: unknown) => { id: string; kind: string }[];
  objectPickCoord: (world: unknown, id: string) => { mapX: number; mapY: number } | null;
  npcMapCoord: (world: unknown, id: string) => { mapX: number; mapY: number } | null;
  agentMapCoord: (world: unknown, id: string) => { mapX: number; mapY: number } | null;
  mapToCanvasAligned: (
    mapX: number,
    mapY: number,
    canvasW: number,
    canvasH: number,
    mapW?: number,
    mapH?: number,
    camera?: unknown,
  ) => { x: number; y: number };
  bufferToCanvasClient: (
    bufferX: number,
    bufferY: number,
    rect: DOMRect,
    canvasW: number,
    canvasH: number,
  ) => { clientX: number; clientY: number } | null;
  minimapRectForCanvas: (
    canvasW: number,
    canvasH: number,
  ) => { x: number; y: number; width: number; height: number };
  GALLERY_MAP_SIZE: { width: number; height: number };
};

export function playBrowserCore(): PlayBrowserCore | undefined {
  return (window as unknown as { HitmanCore?: PlayBrowserCore }).HitmanCore;
}
