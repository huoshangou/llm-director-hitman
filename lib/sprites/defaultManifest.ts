import type { SpriteManifest } from "./types";

/** Graybox-era defaults; Codex cutter exports can replace via public/sprites/manifest.json */
export const defaultSpriteManifest: SpriteManifest = {
  version: 1,
  map: {
    background: "/sprites/map/gallery_event_map.png",
  },
  locationHighlights: [
    { locationId: "lobby", x: 348, y: 260, w: 144, h: 80 },
    { locationId: "bar", x: 188, y: 260, w: 144, h: 80 },
    { locationId: "kitchen", x: 28, y: 260, w: 144, h: 80 },
    { locationId: "gallery", x: 508, y: 260, w: 144, h: 80 },
    { locationId: "balcony", x: 668, y: 260, w: 144, h: 80 },
  ],
  assets: [],
};
