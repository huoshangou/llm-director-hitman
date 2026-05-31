import type { LocationId, WorldState } from "./worldTypes";

/** Cleaning cart blocks guard/camera view toward balcony rail / threshold. */
export function isCleaningCartBlockingBalconySightline(world: WorldState): boolean {
  const cart = world.objects.cleaning_cart;
  if (cart.state.blockingSightline !== true) return false;
  const loc = cart.location;
  return loc === "gallery" || loc === "balcony";
}

export function isPowerStealthWindow(world: WorldState): boolean {
  return (
    world.objects.power_panel.state.powerStable === false &&
    world.npcs.guard.attentionMode === "investigating"
  );
}

export function effectiveLightLevel(world: WorldState, location: LocationId): number {
  return world.locations[location].lightLevel;
}
