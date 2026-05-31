import { GALLERY_MAP_SIZE } from "./mapLayout";

export type MapCameraMode = "overview" | "camera";

export type MapCamera = {
  mode: MapCameraMode;
  centerMapX: number;
  centerMapY: number;
  zoom: number;
};

export type MapViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_PLAY_CAMERA: MapCamera = {
  mode: "camera",
  centerMapX: 1260,
  centerMapY: 416,
  zoom: 1,
};

export const PLAY_CAMERA_LIMITS = {
  minZoom: 1,
  maxZoom: 1.75,
} as const;

export type MapCanvasTransform = {
  scale: number;
  ox: number;
  oy: number;
  dw: number;
  dh: number;
  viewport: MapViewport;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function cameraViewportForCanvas(
  camera: MapCamera | null | undefined,
  canvasW: number,
  canvasH: number,
  mapW = GALLERY_MAP_SIZE.width,
  mapH = GALLERY_MAP_SIZE.height,
): MapViewport {
  if (!camera || camera.mode === "overview") {
    return { x: 0, y: 0, width: mapW, height: mapH };
  }

  const aspect = canvasW / canvasH;
  const zoom = clamp(camera.zoom || 1, PLAY_CAMERA_LIMITS.minZoom, PLAY_CAMERA_LIMITS.maxZoom);

  const baseHeight = mapH;
  const baseWidth = baseHeight * aspect;
  let width = baseWidth / zoom;
  let height = baseHeight / zoom;

  if (width > mapW) {
    width = mapW;
    height = width / aspect;
  }
  if (height > mapH) {
    height = mapH;
    width = height * aspect;
  }

  const x = clamp(camera.centerMapX - width / 2, 0, mapW - width);
  const y = clamp(camera.centerMapY - height / 2, 0, mapH - height);
  return { x, y, width, height };
}

export function minimapRectForCanvas(
  canvasW: number,
  canvasH: number,
): { x: number; y: number; width: number; height: number } {
  const width = Math.min(180, Math.max(124, canvasW * 0.16));
  const height = width * (GALLERY_MAP_SIZE.height / GALLERY_MAP_SIZE.width);
  return {
    x: canvasW - width - 16,
    y: canvasH - height - 16,
    width,
    height,
  };
}

export function mapCameraFromMinimapPoint(
  clientMapX: number,
  clientMapY: number,
  current: MapCamera = DEFAULT_PLAY_CAMERA,
): MapCamera {
  return {
    ...current,
    mode: "camera",
    centerMapX: clamp(clientMapX, 0, GALLERY_MAP_SIZE.width),
    centerMapY: clamp(clientMapY, 0, GALLERY_MAP_SIZE.height),
  };
}

/** World sprite/halo scale vs overview letterbox (camera zoom only; UI unchanged). */
export function cameraVisualScaleForCanvas(
  camera: MapCamera | null | undefined,
  canvasW: number,
  canvasH: number,
  mapW = GALLERY_MAP_SIZE.width,
  mapH = GALLERY_MAP_SIZE.height,
): number {
  const overview = getMapCanvasTransform(canvasW, canvasH, mapW, mapH, {
    mode: "overview",
    centerMapX: mapW / 2,
    centerMapY: mapH / 2,
    zoom: 1,
  }).scale;
  const current = getMapCanvasTransform(canvasW, canvasH, mapW, mapH, camera).scale;
  if (!overview) return 1;
  return Math.max(1, Math.min(PLAY_CAMERA_LIMITS.maxZoom, current / overview));
}

export function getMapCanvasTransform(
  canvasW: number,
  canvasH: number,
  mapW = GALLERY_MAP_SIZE.width,
  mapH = GALLERY_MAP_SIZE.height,
  camera?: MapCamera | null,
): MapCanvasTransform {
  const viewport = cameraViewportForCanvas(camera, canvasW, canvasH, mapW, mapH);
  const scale =
    camera && camera.mode === "camera"
      ? Math.min(canvasW / viewport.width, canvasH / viewport.height)
      : Math.min(canvasW / mapW, canvasH / mapH);
  const dw = viewport.width * scale;
  const dh = viewport.height * scale;
  return {
    scale,
    ox: (canvasW - dw) / 2,
    oy: (canvasH - dh) / 2,
    dw,
    dh,
    viewport,
  };
}

/** Map pixel coords → canvas coords (matches letterboxed / camera viewport draw). */
export function mapToCanvasAligned(
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  mapW = GALLERY_MAP_SIZE.width,
  mapH = GALLERY_MAP_SIZE.height,
  camera?: MapCamera | null,
): { x: number; y: number } {
  const t = getMapCanvasTransform(canvasW, canvasH, mapW, mapH, camera);
  return {
    x: t.ox + ((x - t.viewport.x) / t.viewport.width) * t.dw,
    y: t.oy + ((y - t.viewport.y) / t.viewport.height) * t.dh,
  };
}

/**
 * 指针在 canvas 元素上的 client 坐标 → buffer 坐标（与 object-fit: contain / 等比留白一致）。
 * 点在留白外返回 null。
 */
export function canvasClientToBuffer(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasW: number,
  canvasH: number,
): { x: number; y: number } | null {
  if (!rect.width || !rect.height) return null;
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const scale = Math.min(rect.width / canvasW, rect.height / canvasH);
  const displayW = canvasW * scale;
  const displayH = canvasH * scale;
  const offsetX = (rect.width - displayW) / 2;
  const offsetY = (rect.height - displayH) / 2;
  if (
    localX < offsetX ||
    localX > offsetX + displayW ||
    localY < offsetY ||
    localY > offsetY + displayH
  ) {
    return null;
  }
  return {
    x: ((localX - offsetX) / displayW) * canvasW,
    y: ((localY - offsetY) / displayH) * canvasH,
  };
}

/** Buffer coords → client coords (inverse of canvasClientToBuffer). */
export function bufferToCanvasClient(
  bufferX: number,
  bufferY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasW: number,
  canvasH: number,
): { clientX: number; clientY: number } | null {
  if (!rect.width || !rect.height) return null;
  const scale = Math.min(rect.width / canvasW, rect.height / canvasH);
  const displayW = canvasW * scale;
  const displayH = canvasH * scale;
  const offsetX = (rect.width - displayW) / 2;
  const offsetY = (rect.height - displayH) / 2;
  return {
    clientX: rect.left + offsetX + (bufferX / canvasW) * displayW,
    clientY: rect.top + offsetY + (bufferY / canvasH) * displayH,
  };
}

/** Canvas coords → map pixels (inverse of mapToCanvasAligned). */
export function canvasToMapAligned(
  canvasX: number,
  canvasY: number,
  canvasW: number,
  canvasH: number,
  mapW = GALLERY_MAP_SIZE.width,
  mapH = GALLERY_MAP_SIZE.height,
  camera?: MapCamera | null,
): { mapX: number; mapY: number } {
  const t = getMapCanvasTransform(canvasW, canvasH, mapW, mapH, camera);
  const mapX = t.viewport.x + ((canvasX - t.ox) / t.dw) * t.viewport.width;
  const mapY = t.viewport.y + ((canvasY - t.oy) / t.dh) * t.viewport.height;
  return {
    mapX: Math.round(Math.min(mapW, Math.max(0, mapX))),
    mapY: Math.round(Math.min(mapH, Math.max(0, mapY))),
  };
}
