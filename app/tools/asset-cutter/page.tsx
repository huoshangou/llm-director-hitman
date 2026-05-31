"use client";

import {
  type ChangeEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildAssetManifest,
  defaultAnchorForType,
  makeAssetId,
  parseTags,
  rectFromPoints,
  sanitizeAssetFilename,
  type AssetAnchor,
  type AssetManifestItem,
  type AssetRect,
} from "@/lib/assets/assetCutter";

type ImageInfo = {
  fileName: string;
  url: string;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

type DragState = {
  start: Point;
  end: Point;
};

type DraftState = {
  name: string;
  type: string;
  state: string;
  tags: string;
  anchorX: number;
  anchorY: number;
};

const ASSET_TYPES = ["background", "character", "object", "overlay", "ui"];

const initialDraft: DraftState = {
  name: "",
  type: "character",
  state: "idle",
  tags: "",
  anchorX: 0.5,
  anchorY: 1,
};

export default function AssetCutterPage() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [assets, setAssets] = useState<AssetManifestItem[]>([]);
  const [selection, setSelection] = useState<AssetRect | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [removeChroma, setRemoveChroma] = useState(true);
  const [chromaColor, setChromaColor] = useState("#00ff00");
  const [chromaTolerance, setChromaTolerance] = useState(36);
  const [status, setStatus] = useState("上传一张 sheet 后拖拽框选裁切区域。");

  useEffect(() => {
    return () => {
      if (imageInfo?.url) {
        URL.revokeObjectURL(imageInfo.url);
      }
    };
  }, [imageInfo?.url]);

  const sourceSize = useMemo(
    () => ({
      width: imageInfo?.width ?? 0,
      height: imageInfo?.height ?? 0,
    }),
    [imageInfo],
  );

  const currentRect = useMemo(() => {
    if (drag && sourceSize.width > 0 && sourceSize.height > 0) {
      return rectFromPoints(drag.start, drag.end, sourceSize);
    }
    return selection;
  }, [drag, selection, sourceSize]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId],
  );

  const draftAsset = useMemo<AssetManifestItem | null>(() => {
    if (!currentRect || currentRect.w < 1 || currentRect.h < 1) return null;
    const name = draft.name.trim() || `asset_${assets.length + 1}`;
    return {
      id: selectedAsset?.id ?? makeUniqueId(makeAssetId(name, draft.state), assets),
      name,
      type: draft.type.trim() || "asset",
      state: draft.state.trim(),
      rect: currentRect,
      tags: parseTags(draft.tags),
      anchor: normalizeAnchor({ x: draft.anchorX, y: draft.anchorY }),
    };
  }, [assets, currentRect, draft, selectedAsset]);

  const handleImageUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageInfo({
      fileName: file.name,
      url: URL.createObjectURL(file),
      width: 0,
      height: 0,
    });
    setAssets([]);
    setSelection(null);
    setDrag(null);
    setDraft(initialDraft);
    setSelectedId(null);
    setStatus(`${file.name} 已载入，等待图片尺寸。`);
  }, []);

  const handleImageLoad = useCallback(() => {
    const image = imageRef.current;
    if (!image) return;
    setImageInfo((previous) =>
      previous
        ? {
            ...previous,
            width: image.naturalWidth,
            height: image.naturalHeight,
          }
        : previous,
    );
    setStatus("图片已载入。拖拽框选一个资产，然后填写 metadata。");
  }, []);

  const getSourcePoint = useCallback(
    (event: PointerEvent<HTMLDivElement>): Point | null => {
      const image = imageRef.current;
      if (!image || sourceSize.width <= 0 || sourceSize.height <= 0) return null;

      const bounds = image.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * sourceSize.width;
      const y = ((event.clientY - bounds.top) / bounds.height) * sourceSize.height;
      return {
        x: clamp(x, 0, sourceSize.width),
        y: clamp(y, 0, sourceSize.height),
      };
    },
    [sourceSize],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const point = getSourcePoint(event);
      if (!point) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ start: point, end: point });
      setSelection(null);
      setSelectedId(null);
    },
    [getSourcePoint],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const point = getSourcePoint(event);
      if (!point) return;
      setDrag((previous) => (previous ? { ...previous, end: point } : previous));
    },
    [drag, getSourcePoint],
  );

  const finishDrag = useCallback(() => {
    if (!drag) return;
    const rect = rectFromPoints(drag.start, drag.end, sourceSize);
    setDrag(null);
    if (rect.w < 4 || rect.h < 4) {
      setSelection(null);
      setStatus("选择区域太小，已忽略。");
      return;
    }
    setSelection(rect);
    setStatus(`已选择 ${rect.w} x ${rect.h}px 区域。`);
  }, [drag, sourceSize]);

  const updateDraft = useCallback((patch: Partial<DraftState>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  const handleTypeChange = useCallback(
    (type: string) => {
      const anchor = defaultAnchorForType(type);
      updateDraft({
        type,
        anchorX: anchor.x,
        anchorY: anchor.y,
      });
    },
    [updateDraft],
  );

  const saveCrop = useCallback(() => {
    if (!draftAsset) {
      setStatus("先拖拽选择一个有效区域。");
      return;
    }

    if (selectedAsset) {
      setAssets((previous) =>
        previous.map((asset) => (asset.id === selectedAsset.id ? { ...draftAsset, id: selectedAsset.id } : asset)),
      );
      setStatus(`${draftAsset.name} 已更新。`);
      return;
    }

    const asset = {
      ...draftAsset,
      id: makeUniqueId(draftAsset.id, assets),
    };
    setAssets((previous) => [...previous, asset]);
    setSelectedId(asset.id);
    setSelection(asset.rect);
    setStatus(`${asset.name} 已加入裁切列表。`);
  }, [assets, draftAsset, selectedAsset]);

  const selectAsset = useCallback((asset: AssetManifestItem) => {
    setSelectedId(asset.id);
    setSelection(asset.rect);
    setDraft({
      name: asset.name,
      type: asset.type,
      state: asset.state,
      tags: asset.tags.join(", "),
      anchorX: asset.anchor.x,
      anchorY: asset.anchor.y,
    });
    setStatus(`正在编辑 ${asset.id}。`);
  }, []);

  const removeSelectedAsset = useCallback(() => {
    if (!selectedAsset) return;
    setAssets((previous) => previous.filter((asset) => asset.id !== selectedAsset.id));
    setSelectedId(null);
    setSelection(null);
    setStatus(`${selectedAsset.name} 已从当前裁切列表移除。`);
  }, [selectedAsset]);

  const exportSinglePng = useCallback(async () => {
    const asset = selectedAsset ?? draftAsset;
    if (!asset) {
      setStatus("没有可导出的裁切结果。");
      return;
    }
    await downloadAssetPng(asset, imageRef.current, {
      removeChroma,
      chromaColor,
      chromaTolerance,
    });
    setStatus(`${asset.name} PNG 已导出。`);
  }, [chromaColor, chromaTolerance, draftAsset, removeChroma, selectedAsset]);

  const exportBatchPng = useCallback(async () => {
    if (assets.length === 0) {
      setStatus("裁切列表为空。");
      return;
    }
    for (const asset of assets) {
      await downloadAssetPng(asset, imageRef.current, {
        removeChroma,
        chromaColor,
        chromaTolerance,
      });
      await wait(120);
    }
    setStatus(`${assets.length} 个 PNG 已触发批量导出。`);
  }, [assets, chromaColor, chromaTolerance, removeChroma]);

  const exportManifest = useCallback(() => {
    if (!imageInfo || sourceSize.width <= 0 || sourceSize.height <= 0) {
      setStatus("先上传图片。");
      return;
    }

    const manifest = buildAssetManifest({
      sourceImage: imageInfo.fileName,
      sourceSize,
      assets,
    });

    downloadBlob(
      new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }),
      `${imageInfo.fileName.replace(/\.[^.]+$/, "") || "asset-sheet"}-manifest.json`,
    );
    setStatus("manifest JSON 已导出。");
  }, [assets, imageInfo, sourceSize]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 text-neutral-100">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">tools / asset cutter</div>
          <h1 className="mt-1 text-2xl font-semibold">AI Sheet Asset Cutter</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            本地上传 sheet，拖拽裁切角色、物件或 overlay，导出 PNG 与 manifest。
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-cyan-400">
          Upload sheet
          <input className="sr-only" type="file" accept="image/*" onChange={handleImageUpload} />
        </label>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <section className="min-h-[560px] rounded-lg border border-neutral-800 bg-neutral-950 p-3">
          {!imageInfo && (
            <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-neutral-700 text-sm text-neutral-500">
              上传 Sheet A / B / C / D 后在这里拖拽框选。
            </div>
          )}

          {imageInfo && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                <span>{imageInfo.fileName}</span>
                <span>
                  {sourceSize.width} x {sourceSize.height}px
                </span>
              </div>
              <div
                className="relative inline-block max-w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
              >
                <img
                  ref={imageRef}
                  src={imageInfo.url}
                  alt=""
                  className="block max-h-[72vh] max-w-full"
                  draggable={false}
                  onLoad={handleImageLoad}
                />

                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`absolute border ${
                      asset.id === selectedId ? "border-cyan-300 bg-cyan-300/10" : "border-amber-300/70 bg-amber-300/5"
                    }`}
                    style={rectStyle(asset.rect, sourceSize)}
                  />
                ))}

                {currentRect && (
                  <div
                    className="absolute border-2 border-cyan-300 bg-cyan-300/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.36)]"
                    style={rectStyle(currentRect, sourceSize)}
                  />
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Crop Metadata</h2>
              {currentRect && (
                <span className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300">
                  {currentRect.x}, {currentRect.y}, {currentRect.w} x {currentRect.h}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-neutral-400">
                Name
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                  value={draft.name}
                  placeholder="guard sight cone"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
              </label>

              <label className="block text-xs text-neutral-400">
                Type
                <select
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                  value={draft.type}
                  onChange={(event) => handleTypeChange(event.target.value)}
                >
                  {ASSET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs text-neutral-400">
                State
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                  value={draft.state}
                  placeholder="idle"
                  onChange={(event) => updateDraft({ state: event.target.value })}
                />
              </label>

              <label className="block text-xs text-neutral-400">
                Tags
                <input
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                  value={draft.tags}
                  placeholder="guard, sight, alert"
                  onChange={(event) => updateDraft({ tags: event.target.value })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-neutral-400">
                  Anchor X
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={draft.anchorX}
                    onChange={(event) => updateDraft({ anchorX: Number(event.target.value) })}
                  />
                </label>
                <label className="block text-xs text-neutral-400">
                  Anchor Y
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={draft.anchorY}
                    onChange={(event) => updateDraft({ anchorY: Number(event.target.value) })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!draftAsset}
                  onClick={saveCrop}
                >
                  {selectedAsset ? "Update crop" : "Add crop"}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!selectedAsset}
                  onClick={removeSelectedAsset}
                >
                  Remove
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="mb-3 font-semibold">Export</h2>
            <div className="mb-3 space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={removeChroma}
                  onChange={(event) => setRemoveChroma(event.target.checked)}
                />
                Remove chroma background
              </label>
              <div className="grid grid-cols-[1fr_88px] gap-2">
                <input
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                  value={chromaColor}
                  onChange={(event) => setChromaColor(event.target.value)}
                  aria-label="Chroma color"
                />
                <input
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                  type="number"
                  min={0}
                  max={255}
                  value={chromaTolerance}
                  onChange={(event) => setChromaTolerance(Number(event.target.value))}
                  aria-label="Chroma tolerance"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!draftAsset && !selectedAsset}
                onClick={exportSinglePng}
              >
                Export single PNG
              </button>
              <button
                type="button"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={assets.length === 0}
                onClick={exportBatchPng}
              >
                Export batch PNG
              </button>
              <button
                type="button"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!imageInfo || assets.length === 0}
                onClick={exportManifest}
              >
                Export manifest JSON
              </button>
            </div>
            <p className="mt-3 min-h-5 text-xs text-neutral-400">{status}</p>
          </section>

          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Crops</h2>
              <span className="text-xs text-neutral-500">{assets.length}</span>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
              {assets.length === 0 && <div className="text-sm text-neutral-500">还没有裁切结果。</div>}
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    asset.id === selectedId
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
                  }`}
                  onClick={() => selectAsset(asset)}
                >
                  <div className="font-medium text-neutral-100">{asset.name}</div>
                  <div className="mt-1 text-[11px] text-neutral-500">{asset.id}</div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                    <span className="rounded border border-neutral-700 px-1.5 py-0.5 text-neutral-300">
                      {asset.type}
                    </span>
                    {asset.state && (
                      <span className="rounded border border-neutral-700 px-1.5 py-0.5 text-neutral-300">
                        {asset.state}
                      </span>
                    )}
                    <span className="rounded border border-neutral-700 px-1.5 py-0.5 text-neutral-300">
                      {asset.rect.w} x {asset.rect.h}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function rectStyle(rect: AssetRect, sourceSize: { width: number; height: number }) {
  return {
    left: `${(rect.x / sourceSize.width) * 100}%`,
    top: `${(rect.y / sourceSize.height) * 100}%`,
    width: `${(rect.w / sourceSize.width) * 100}%`,
    height: `${(rect.h / sourceSize.height) * 100}%`,
  };
}

function normalizeAnchor(anchor: AssetAnchor): AssetAnchor {
  return {
    x: clamp(anchor.x, 0, 1),
    y: clamp(anchor.y, 0, 1),
  };
}

function makeUniqueId(baseId: string, assets: AssetManifestItem[]): string {
  const usedIds = new Set(assets.map((asset) => asset.id));
  if (!usedIds.has(baseId)) return baseId;

  let index = 2;
  while (usedIds.has(`${baseId}_${index}`)) {
    index += 1;
  }
  return `${baseId}_${index}`;
}

async function downloadAssetPng(
  asset: AssetManifestItem,
  image: HTMLImageElement | null,
  options: {
    removeChroma: boolean;
    chromaColor: string;
    chromaTolerance: number;
  },
) {
  if (!image) return;

  const canvas = document.createElement("canvas");
  canvas.width = asset.rect.w;
  canvas.height = asset.rect.h;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.drawImage(
    image,
    asset.rect.x,
    asset.rect.y,
    asset.rect.w,
    asset.rect.h,
    0,
    0,
    asset.rect.w,
    asset.rect.h,
  );

  if (options.removeChroma) {
    applyChromaKey(context, asset.rect.w, asset.rect.h, options.chromaColor, options.chromaTolerance);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  downloadBlob(blob, sanitizeAssetFilename(asset.name, asset.state));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyChromaKey(context: CanvasRenderingContext2D, width: number, height: number, color: string, tolerance: number) {
  const key = parseHexColor(color);
  if (!key) return;

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const threshold = clamp(tolerance, 0, 255);

  for (let index = 0; index < data.length; index += 4) {
    const distance = Math.max(
      Math.abs(data[index] - key.r),
      Math.abs(data[index + 1] - key.g),
      Math.abs(data[index + 2] - key.b),
    );
    if (distance <= threshold) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function parseHexColor(value: string): { r: number; g: number; b: number } | null {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
