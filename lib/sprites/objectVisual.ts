import { objectMapCoord } from "../ui/mapCoords";
import type { LocationId, ObjectId, WorldState } from "../world/worldTypes";
import { OBJECT_LABELS } from "./objectVisualOffsets";

export { OBJECT_MAP_OFFSET, OBJECT_LABELS } from "./objectVisualOffsets";

export function objectSpriteKey(
  objId: ObjectId,
  state: Record<string, unknown>,
): string {
  if (objId === "wine_glass") return state.spilled ? "wine_glass_spilled" : "wine_glass_clean";
  if (objId === "balcony_rail") return state.tampered ? "balcony_rail_tampered" : "balcony_rail_normal";
  if (objId === "cleaning_cart") {
    return state.blockingSightline ? "cleaning_cart_blocking" : "cleaning_cart_idle";
  }
  if (objId === "guest_list_terminal") {
    return state.modified ? "guest_list_terminal_modified" : "guest_list_terminal_normal";
  }
  if (objId === "wine_bottle") return "wine_bottle_normal";
  if (objId === "waiter_uniform") {
    return state.available === false ? "waiter_uniform_taken" : "waiter_uniform_available";
  }
  if (objId === "power_panel") {
    return state.powerStable === false ? "power_panel_tampered" : "power_panel_normal";
  }
  if (objId === "hallway_camera") {
    if (state.active === false) return "hallway_camera_disabled";
    if (state.recordingSuppressed) return "hallway_camera_looped";
    return "hallway_camera_active";
  }
  return objId;
}

export type SceneObject = {
  id: ObjectId;
  name: string;
  short: string;
  spriteKey: string;
  locationId: LocationId;
  mapX: number;
  mapY: number;
  highlighted: boolean;
};

export function objectsFromWorld(world: WorldState): SceneObject[] {
  const out: SceneObject[] = [];
  for (const obj of Object.values(world.objects)) {
    const coord = objectMapCoord(world, obj.id);
    if (!coord) continue;
    const state = obj.state as Record<string, unknown>;
    out.push({
      id: obj.id,
      name: obj.name,
      short: OBJECT_LABELS[obj.id] ?? obj.name,
      spriteKey: objectSpriteKey(obj.id, state),
      locationId: obj.location as LocationId,
      mapX: coord.mapX,
      mapY: coord.mapY,
      highlighted:
        state.spilled === true ||
        state.tampered === true ||
        state.blockingSightline === true ||
        state.modified === true,
    });
  }
  return out;
}
