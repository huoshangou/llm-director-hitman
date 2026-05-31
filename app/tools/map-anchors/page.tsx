"use client";

import {
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  canvasToMapAligned,
  getMapCanvasTransform,
  mapToCanvasAligned,
} from "@/lib/sprites/canvasLayout";
import { GALLERY_MAP_SIZE } from "@/lib/sprites/mapLayout";
import {
  buildAnchorEditorItems,
  createAnchorEditorState,
  formatMapAnchorsExport,
  resolveObjectPlayCoords,
  setAnchorForItem,
  type AnchorEditorItem,
  type AnchorEditorState,
} from "@/lib/tools/mapAnchorEditor";

const MAP_BG = "/sprites/map/gallery_event_map.png";

const KIND_COLOR: Record<AnchorEditorItem["kind"], string> = {
  object: "#34d399",
  npc: "#38bdf8",
  agent: "#fb7185",
};

function drawCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  lineWidth: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

export default function MapAnchorsPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);

  const [state, setState] = useState<AnchorEditorState>(() => createAnchorEditorState());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [size, setSize] = useState({ w: 1120, h: 800 });
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const items = useMemo(() => buildAnchorEditorItems(state), [state]);
  const selected = items.find((i) => i.key === selectedKey) ?? items[0] ?? null;

  const objectCoords = useMemo(() => {
    if (!selected || selected.kind !== "object") return null;
    return resolveObjectPlayCoords(state, selected.id as import("@/lib/world/worldTypes").ObjectId);
  }, [selected, state]);

  useEffect(() => {
    if (!selectedKey && items[0]) setSelectedKey(items[0].key);
  }, [items, selectedKey]);

  useEffect(() => {
    const img = new Image();
    img.src = MAP_BG;
    img.onload = () => {
      mapImgRef.current = img;
      redraw();
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.round((w * GALLERY_MAP_SIZE.height) / GALLERY_MAP_SIZE.width);
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = mapImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = size;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    const t = getMapCanvasTransform(w, h);
    ctx.drawImage(img, t.ox, t.oy, t.dw, t.dh);

    const visible = showAll ? items : selected ? [selected] : [];
    for (const item of visible) {
      const isSel = item.key === selected?.key;

      if (item.kind === "object") {
        const coords = resolveObjectPlayCoords(
          state,
          item.id as import("@/lib/world/worldTypes").ObjectId,
        );
        const drawC = mapToCanvasAligned(coords.draw.mapX, coords.draw.mapY, w, h);
        const pickC = mapToCanvasAligned(coords.pick.mapX, coords.pick.mapY, w, h);
        const anchorC = mapToCanvasAligned(coords.anchor.mapX, coords.anchor.mapY, w, h);

        ctx.beginPath();
        ctx.arc(drawC.x, drawC.y, isSel ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "rgba(148, 163, 184, 0.95)" : "rgba(148, 163, 184, 0.55)";
        ctx.fill();

        drawCross(ctx, pickC.x, pickC.y, isSel ? 7 : 5, "#22d3ee", isSel ? 2 : 1.25);

        ctx.beginPath();
        ctx.arc(anchorC.x, anchorC.y, isSel ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = KIND_COLOR.object + (isSel ? "ee" : "99");
        ctx.fill();
        ctx.strokeStyle = isSel ? "#fbbf24" : "#fff";
        ctx.lineWidth = isSel ? 2.5 : 1;
        ctx.stroke();
      } else {
        const c = mapToCanvasAligned(item.mapX, item.mapY, w, h);
        ctx.beginPath();
        ctx.arc(c.x, c.y, isSel ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = KIND_COLOR[item.kind] + (isSel ? "ee" : "99");
        ctx.fill();
        ctx.strokeStyle = isSel ? "#fbbf24" : "#fff";
        ctx.lineWidth = isSel ? 2.5 : 1;
        ctx.stroke();
      }

      if (isSel || showAll) {
        const labelC = mapToCanvasAligned(item.mapX, item.mapY, w, h);
        ctx.font = "11px system-ui,sans-serif";
        ctx.fillStyle = "#f5f5f5";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        const text = `${item.label}`;
        ctx.strokeText(text, labelC.x + 12, labelC.y - 6);
        ctx.fillText(text, labelC.x + 12, labelC.y - 6);
      }
    }
  }, [items, selected, showAll, size, state]);

  useEffect(() => {
    redraw();
  }, [redraw, state]);

  const pointerToCanvas = useCallback((ev: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
      y: ((ev.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const hitItem = useCallback(
    (canvasX: number, canvasY: number): AnchorEditorItem | null => {
      const { w, h } = size;
      let best: AnchorEditorItem | null = null;
      let bestD = 22;
      for (const item of items) {
        const coords =
          item.kind === "object"
            ? resolveObjectPlayCoords(
                state,
                item.id as import("@/lib/world/worldTypes").ObjectId,
              ).anchor
            : { mapX: item.mapX, mapY: item.mapY };
        const c = mapToCanvasAligned(coords.mapX, coords.mapY, w, h);
        const d = Math.hypot(canvasX - c.x, canvasY - c.y);
        if (d < bestD) {
          bestD = d;
          best = item;
        }
      }
      return best;
    },
    [items, size, state],
  );

  const onPointerDown = (ev: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerToCanvas(ev);
    const hit = hitItem(x, y);
    if (hit) {
      setSelectedKey(hit.key);
      setDragKey(hit.key);
      ev.currentTarget.setPointerCapture(ev.pointerId);
      return;
    }
    if (selected) {
      const { mapX, mapY } = canvasToMapAligned(x, y, size.w, size.h);
      setState((s) => setAnchorForItem(s, selected, mapX, mapY));
      setDragKey(selected.key);
      ev.currentTarget.setPointerCapture(ev.pointerId);
    }
  };

  const onPointerMove = (ev: PointerEvent<HTMLCanvasElement>) => {
    if (!dragKey) return;
    const item = items.find((i) => i.key === dragKey);
    if (!item) return;
    const { x, y } = pointerToCanvas(ev);
    const { mapX, mapY } = canvasToMapAligned(x, y, size.w, size.h);
    setState((s) => setAnchorForItem(s, item, mapX, mapY));
  };

  const onPointerUp = (ev: PointerEvent<HTMLCanvasElement>) => {
    if (dragKey) {
      try {
        ev.currentTarget.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
    }
    setDragKey(null);
  };

  const exportText = useMemo(() => formatMapAnchorsExport(state), [state]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-4 px-4 py-6 text-neutral-100">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">地图锚点校准</h1>
        <p className="text-sm text-neutral-400 leading-relaxed">
          坐标存于底图像素（{GALLERY_MAP_SIZE.width}×{GALLERY_MAP_SIZE.height}），与 play 共用
          letterbox 变换。拖拽<strong className="text-emerald-300">绿点（anchor）</strong>→ 复制代码到{" "}
          <code className="text-emerald-300">lib/sprites/mapAnchors.ts</code>。
        </p>
        <p className="text-xs text-amber-200/80">
          物件：<span className="text-emerald-300">绿圆=anchor</span> ·{" "}
          <span className="text-cyan-300">青十字=pick（/play 点击）</span> ·{" "}
          <span className="text-neutral-400">灰点=draw（sprite 脚点）</span>。NPC/干员仍只显示单锚点。
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="max-h-[70vh] overflow-auto rounded-xl border border-neutral-700 bg-neutral-900/80 p-2 text-sm">
          <label className="mb-2 flex items-center gap-2 px-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            显示全部锚点
          </label>
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-2 py-1.5 text-left ${
                    item.key === selected?.key
                      ? "bg-amber-950/60 text-amber-100"
                      : "hover:bg-neutral-800"
                  }`}
                  onClick={() => setSelectedKey(item.key)}
                >
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ background: KIND_COLOR[item.kind] }}
                  />
                  {item.label}
                  <span className="block text-[10px] text-neutral-500">
                    {item.id}
                    {item.location ? ` · ${item.location}` : ""} · {item.mapX},{item.mapY}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div ref={wrapRef} className="w-full">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair rounded-xl border border-neutral-600 touch-none"
            style={{ height: size.h }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {selected && (
            <div className="mt-2 space-y-1 text-xs text-neutral-400">
              <p>
                选中：<strong className="text-neutral-200">{selected.label}</strong>
                {selected.source === "entity_location" && "（按当前区域落点表）"}
              </p>
              {objectCoords ? (
                <pre className="rounded-lg bg-neutral-950/80 p-2 font-mono text-[11px] text-neutral-300">
                  {`anchor ${objectCoords.anchor.mapX},${objectCoords.anchor.mapY}\ndraw   ${objectCoords.draw.mapX},${objectCoords.draw.mapY}\npick   ${objectCoords.pick.mapX},${objectCoords.pick.mapY}`}
                </pre>
              ) : (
                <p>
                  mapX={selected.mapX} mapY={selected.mapY}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-600"
            onClick={() => {
              void navigator.clipboard.writeText(exportText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "已复制" : "复制 mapAnchors.ts 片段"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
            onClick={() => setState(createAnchorEditorState())}
          >
            重置为文件默认值
          </button>
        </div>
        <textarea
          readOnly
          className="h-48 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 font-mono text-xs text-emerald-100/90"
          value={exportText}
        />
      </section>
    </main>
  );
}
