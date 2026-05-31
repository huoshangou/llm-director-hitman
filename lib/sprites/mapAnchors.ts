/**
 * 地图像素锚点（1891×832，对齐 gallery_event_map.png 美术）。
 * 点击 / 绘制 / pick 共用；勿用区域中心 + 随意 offset。
 */
import type { LocationId, ObjectId } from "../world/worldTypes";

export type MapAnchor = { mapX: number; mapY: number };

/** NPC / Agent 默认锚点（无区域覆盖时） */
export const ENTITY_MAP_ANCHORS: Record<string, MapAnchor> = {
  cleaner: { mapX: 640, mapY: 520 },
  face: { mapX: 820, mapY: 500 },
  guard: { mapX: 940, mapY: 430 },
  guest: { mapX: 900, mapY: 560 },
  player: { mapX: 911, mapY: 780 },
  runner: { mapX: 210, mapY: 530 },
  target: { mapX: 1235, mapY: 495 },
  waiter: { mapX: 560, mapY: 460 },
};

/** 可交互物件热点（工具页人工校准 · 1891×832） */
export const OBJECT_MAP_ANCHORS: Record<ObjectId, MapAnchor> = {
  balcony_rail: { mapX: 1829, mapY: 416 },
  cleaning_cart: { mapX: 601, mapY: 542 },
  guest_list_terminal: { mapX: 948, mapY: 442 },
  hallway_camera: { mapX: 1440, mapY: 135 },
  kitchen_door: { mapX: 447, mapY: 614 },
  power_panel: { mapX: 329, mapY: 658 },
  target_phone: { mapX: 1235, mapY: 495 },
  waiter_uniform: { mapX: 172, mapY: 662 },
  wine_bottle: { mapX: 591, mapY: 271 },
  wine_glass: { mapX: 590, mapY: 319 },
};

/** 角色换区时，落点用区域锚点（比 id 锚点粗，但避免穿墙） */
export const LOCATION_FALLBACK_ANCHORS: Record<LocationId, MapAnchor> = {
  kitchen: { mapX: 235, mapY: 520 },
  bar: { mapX: 585, mapY: 480 },
  lobby: { mapX: 910, mapY: 480 },
  gallery: { mapX: 1260, mapY: 480 },
  balcony: { mapX: 1660, mapY: 500 },
};

/** NPC / 干员按区域的落点（工具页人工校准 · 1891×832） */
export const ENTITY_LOCATION_ANCHORS: Partial<
  Record<string, Partial<Record<LocationId, MapAnchor>>>
> = {
  cleaner: {
    bar: { mapX: 648, mapY: 515 },
    gallery: { mapX: 1280, mapY: 520 },
    kitchen: { mapX: 300, mapY: 540 },
  },
  face: {
    bar: { mapX: 540, mapY: 430 },
    gallery: { mapX: 1220, mapY: 460 },
    lobby: { mapX: 861, mapY: 415 },
  },
  guard: {
    bar: { mapX: 520, mapY: 400 },
    gallery: { mapX: 1180, mapY: 420 },
    kitchen: { mapX: 305, mapY: 636 },
    lobby: { mapX: 1011, mapY: 365 },
  },
  guest: {
    gallery: { mapX: 1150, mapY: 540 },
    lobby: { mapX: 951, mapY: 537 },
  },
  runner: {
    bar: { mapX: 548, mapY: 438 },
    kitchen: { mapX: 333, mapY: 500 },
  },
  target: {
    balcony: { mapX: 1660, mapY: 470 },
    bar: { mapX: 600, mapY: 450 },
    gallery: { mapX: 1223, mapY: 385 },
    kitchen: { mapX: 250, mapY: 500 },
    lobby: { mapX: 980, mapY: 500 },
  },
  waiter: {
    bar: { mapX: 516, mapY: 386 },
    kitchen: { mapX: 280, mapY: 480 },
  },
};

export function anchorForEntityAtLocation(
  entityId: string,
  locationId: LocationId,
): MapAnchor | null {
  const perLoc = ENTITY_LOCATION_ANCHORS[entityId]?.[locationId];
  if (perLoc) return perLoc;
  // 勿回退 ENTITY_MAP_ANCHORS：那是单点缺省，与当前房间无关会导致错区绘制
  if (LOCATION_FALLBACK_ANCHORS[locationId]) {
    return LOCATION_FALLBACK_ANCHORS[locationId];
  }
  return null;
}

export function anchorForEntityId(entityId: string): MapAnchor | null {
  return ENTITY_MAP_ANCHORS[entityId] ?? null;
}

export function anchorForObjectId(objectId: ObjectId): MapAnchor | null {
  return OBJECT_MAP_ANCHORS[objectId] ?? null;
}
