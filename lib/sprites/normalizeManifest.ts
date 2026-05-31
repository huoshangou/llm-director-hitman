import { GALLERY_MAP_SIZE, polygonBBox } from "./mapLayout";
import { defaultSpriteManifest } from "./defaultManifest";
import type { LocationHighlightEntry, SpriteAssetEntry, SpriteManifest } from "./types";

type RawHighlight = {
  locationId: LocationHighlightEntry["locationId"];
  path?: string;
  polygon?: [number, number][];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type RawAsset = {
  id: string;
  name: string;
  type: SpriteAssetEntry["type"];
  state?: string;
  path?: string;
  file?: string;
  anchor?: SpriteAssetEntry["anchor"];
  tags?: string[];
};

type RawManifest = {
  version?: number;
  map?: { background?: string; sourceSize?: { width: number; height: number } };
  locationHighlights?: RawHighlight[];
  assets?: RawAsset[];
};

function normalizeHighlight(raw: RawHighlight): LocationHighlightEntry {
  if (raw.polygon?.length) {
    const box = polygonBBox(raw.polygon);
    return {
      locationId: raw.locationId,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      path: raw.path,
      polygon: raw.polygon,
    };
  }
  return {
    locationId: raw.locationId,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    w: raw.w ?? 80,
    h: raw.h ?? 80,
    path: raw.path,
  };
}

function normalizeAsset(raw: RawAsset): SpriteAssetEntry {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    state: raw.state,
    file: raw.path ?? raw.file ?? "",
    anchor: raw.anchor,
    tags: raw.tags,
  };
}

export function normalizeSpriteManifest(data: RawManifest): SpriteManifest {
  const mapSize = data.map?.sourceSize ?? GALLERY_MAP_SIZE;
  return {
    version: data.version ?? 2,
    map: {
      background: data.map?.background ?? defaultSpriteManifest.map?.background,
      sourceSize: mapSize,
    },
    locationHighlights: (data.locationHighlights ?? defaultSpriteManifest.locationHighlights ?? []).map(
      normalizeHighlight,
    ),
    assets: (data.assets ?? []).map(normalizeAsset),
  };
}
