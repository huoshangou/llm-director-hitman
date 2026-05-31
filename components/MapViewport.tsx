"use client";

import { useState } from "react";

const ZOOM_STEPS = [1, 1.25, 1.5, 1.75] as const;

export default function MapViewport({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  const [zoomIdx, setZoomIdx] = useState(1);
  const zoom = ZOOM_STEPS[zoomIdx] ?? 1.25;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <span>{hint ?? "滚轮可滚动 · 放大后更易点选小物件"}</span>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 p-0.5">
          <button
            type="button"
            className="rounded px-2 py-0.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
            disabled={zoomIdx <= 0}
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-neutral-200">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
            disabled={zoomIdx >= ZOOM_STEPS.length - 1}
            onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          >
            +
          </button>
        </div>
      </div>
      <div className="max-h-[min(78vh,920px)] overflow-auto rounded-2xl border border-neutral-700 bg-neutral-950/80 p-1">
        <div
          className="relative mx-auto min-w-full origin-top"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: zoom >= 1 ? `${100 / zoom}%` : "100%",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
