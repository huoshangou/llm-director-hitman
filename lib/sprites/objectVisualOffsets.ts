import type { ObjectId } from "../world/worldTypes";

export const OBJECT_MAP_OFFSET: Record<string, { dx: number; dy: number }> = {
  wine_glass: { dx: 25, dy: 50 },
  wine_bottle: { dx: 55, dy: 48 },
  cleaning_cart: { dx: -35, dy: 65 },
  balcony_rail: { dx: 0, dy: 55 },
  hallway_camera: { dx: 60, dy: -25 },
};

export const OBJECT_LABELS: Record<ObjectId, string> = {
  guest_list_terminal: "宾客终端",
  wine_glass: "酒杯",
  wine_bottle: "酒瓶",
  waiter_uniform: "服务员制服",
  cleaning_cart: "清洁车",
  power_panel: "配电箱",
  balcony_rail: "阳台栏杆",
  hallway_camera: "走廊摄像头",
  target_phone: "目标手机",
  kitchen_door: "厨房门",
};
