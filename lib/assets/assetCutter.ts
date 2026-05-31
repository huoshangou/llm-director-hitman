export type AssetRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AssetAnchor = {
  x: number;
  y: number;
};

export type AssetManifestItem = {
  id: string;
  name: string;
  type: string;
  state: string;
  rect: AssetRect;
  tags: string[];
  anchor: AssetAnchor;
};

export type AssetManifest = {
  sourceImage: string;
  sourceSize: {
    width: number;
    height: number;
  };
  assets: AssetManifestItem[];
};

type Point = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function makeAssetId(name: string, state: string): string {
  const base = slugify([name, state].filter(Boolean).join("_"));
  return base || "asset";
}

export function sanitizeAssetFilename(name: string, state: string): string {
  return `${makeAssetId(name, state)}.png`;
}

export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of value.split(",")) {
    const tag = slugify(rawTag);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function rectFromPoints(start: Point, end: Point, bounds: Size): AssetRect {
  const x1 = clamp(Math.min(start.x, end.x), 0, bounds.width);
  const y1 = clamp(Math.min(start.y, end.y), 0, bounds.height);
  const x2 = clamp(Math.max(start.x, end.x), 0, bounds.width);
  const y2 = clamp(Math.max(start.y, end.y), 0, bounds.height);

  return {
    x: Math.round(x1),
    y: Math.round(y1),
    w: Math.round(x2 - x1),
    h: Math.round(y2 - y1),
  };
}

export function buildAssetManifest(manifest: AssetManifest): AssetManifest {
  return {
    sourceImage: manifest.sourceImage,
    sourceSize: {
      width: Math.round(manifest.sourceSize.width),
      height: Math.round(manifest.sourceSize.height),
    },
    assets: manifest.assets.map((asset) => ({
      id: asset.id || makeAssetId(asset.name, asset.state),
      name: asset.name.trim(),
      type: asset.type.trim(),
      state: asset.state.trim(),
      rect: {
        x: Math.round(asset.rect.x),
        y: Math.round(asset.rect.y),
        w: Math.round(asset.rect.w),
        h: Math.round(asset.rect.h),
      },
      tags: asset.tags,
      anchor: {
        x: clamp(Number(asset.anchor.x), 0, 1),
        y: clamp(Number(asset.anchor.y), 0, 1),
      },
    })),
  };
}

export function defaultAnchorForType(type: string): AssetAnchor {
  const normalizedType = slugify(type);
  if (normalizedType === "character" || normalizedType === "object") {
    return { x: 0.5, y: 1 };
  }
  return { x: 0.5, y: 0.5 };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
