import type { ObjectId } from "../world/worldTypes";

/** 底图已绘制且默认不叠 sprite（避免双图层）；悬停/高亮时仍可显示 */
export const BAKED_IN_MAP_SPRITES = new Set<ObjectId>([
  "guest_list_terminal",
  "power_panel",
  "kitchen_door",
]);

/** 始终绘制交互 sprite（叠在底图上） */
export const ALWAYS_VISIBLE_OBJECT_SPRITES = new Set<ObjectId>([
  "wine_glass",
  "wine_bottle",
  "cleaning_cart",
  "waiter_uniform",
  "hallway_camera",
  "balcony_rail",
]);

/** 永不显示地图漂浮名牌（仅 Inspector 提示） */
export const HIDE_MAP_LABELS = new Set<ObjectId>([
  "guest_list_terminal",
  "hallway_camera",
  "wine_glass",
  "wine_bottle",
  "waiter_uniform",
  "power_panel",
  "kitchen_door",
  "cleaning_cart",
  "balcony_rail",
]);

export function isObjectBakedInMap(objectId: ObjectId): boolean {
  return BAKED_IN_MAP_SPRITES.has(objectId);
}

export function isObjectAlwaysVisible(objectId: ObjectId): boolean {
  return ALWAYS_VISIBLE_OBJECT_SPRITES.has(objectId);
}

export function shouldDrawObjectSprite(
  objectId: ObjectId,
  opts: { highlighted: boolean; hover: boolean; focus: boolean },
): boolean {
  if (isObjectAlwaysVisible(objectId)) return true;
  if (!isObjectBakedInMap(objectId)) return true;
  return opts.highlighted || opts.hover || opts.focus;
}

export function shouldShowMapLabel(objectId: ObjectId): boolean {
  return !HIDE_MAP_LABELS.has(objectId);
}

/** 相对默认高度的缩放（主站 % 高度、Play canvas px 共用） */
const OBJECT_SPRITE_SCALE: Partial<Record<ObjectId, number>> = {
  waiter_uniform: 2,
  wine_glass: 0.5,
};

/** anchor 即 pick 点（不再叠 MAP_OFFSET + PICK_OFFSET） */
export const ANCHOR_IS_PICK_OBJECT = new Set<ObjectId>([
  "guest_list_terminal",
  "power_panel",
  "kitchen_door",
]);

/** 仅影响 sprite 绘制，不影响点击（相对 anchor/pick） */
export const OBJECT_DRAW_OFFSET: Partial<Record<ObjectId, { dx: number; dy: number }>> = {
  guest_list_terminal: { dx: 55, dy: -45 },
};

/**
 * 点击/高亮热点相对绘制锚点的偏移（map 像素）。
 * 绘制锚点多为贴地脚点；高大 sprite 的热点宜上移。
 */
const OBJECT_PICK_OFFSET: Partial<Record<ObjectId, { dx: number; dy: number }>> = {
  waiter_uniform: { dx: 0, dy: -56 },
};

export function objectDrawOffset(objectId: ObjectId): { dx: number; dy: number } {
  return OBJECT_DRAW_OFFSET[objectId] ?? { dx: 0, dy: 0 };
}

export function objectPickOffset(objectId: ObjectId): { dx: number; dy: number } {
  return OBJECT_PICK_OFFSET[objectId] ?? { dx: 0, dy: 0 };
}

function objectSpriteBaseHeight(objectId: ObjectId): number {
  if (objectId === "balcony_rail") return 32;
  if (objectId === "hallway_camera") return 40;
  if (objectId === "cleaning_cart") return 48;
  return 44;
}

/** 物件 sprite 绘制高度（canvas px，play shell；主站用同一数值作 height） */
export function objectSpriteMaxHeight(objectId: ObjectId): number {
  const scale = OBJECT_SPRITE_SCALE[objectId] ?? 1;
  return Math.round(objectSpriteBaseHeight(objectId) * scale);
}
