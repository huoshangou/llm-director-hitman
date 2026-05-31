import type { LocationId } from "../world/worldTypes";

export type SpriteAnchor = { x: number; y: number };

export type SpriteAssetEntry = {
  id: string;
  name: string;
  type: "map" | "character" | "object" | "overlay" | "highlight";
  state?: string;
  file: string;
  anchor?: SpriteAnchor;
  tags?: string[];
};

export type LocationHighlightEntry = {
  locationId: LocationId;
  x: number;
  y: number;
  w: number;
  h: number;
  path?: string;
  polygon?: [number, number][];
};

export type SpriteManifest = {
  version: number;
  sourceImage?: string;
  map?: {
    background?: string;
    sourceSize?: { width: number; height: number };
  };
  locationHighlights?: LocationHighlightEntry[];
  assets: SpriteAssetEntry[];
};
