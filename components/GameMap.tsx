"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapViewport from "@/components/MapViewport";
import { ambientEntityOffset } from "@/lib/timeline/ambientMotion";
import { AGENT_LABELS, NPC_LABELS } from "@/lib/ui/labels";
import { assetFileForKey, loadSpriteManifest } from "@/lib/sprites/loadManifest";
import { GALLERY_MAP_SIZE, mapToPercent } from "@/lib/sprites/mapLayout";
import {
  isObjectAlwaysVisible,
  objectPickOffset,
  objectSpriteMaxHeight,
  shouldDrawObjectSprite,
} from "@/lib/sprites/mapObjectPresentation";
import { MAP_MOOD_OVERLAY, mapMoodFromWorld } from "@/lib/ui/mapMood";
import { pickOverlayPercent } from "@/lib/ui/mapHitTest";
import { OBJECT_LABELS, objectSpriteKey } from "@/lib/sprites/objectVisual";
import { agentMapCoord, npcMapCoord, objectMapCoord } from "@/lib/ui/mapCoords";
import type { SpriteManifest } from "@/lib/sprites/types";
import { overlayLabel, resolveMapVisuals } from "@/lib/timeline/eventTemplates";
import {
  entityPercentOverride,
  type PlaybackFrame,
} from "@/lib/timeline/playback";
import {
  mapPickablesFromWorld,
  type MapPickKind,
  type MapSelection,
} from "@/lib/ui/mapSelection";
import type { FieldAgentId, GameEvent, LocationId, NpcId, ObjectId, WorldState } from "@/lib/world/worldTypes";

const KEY_ENTITIES = new Set(["target", "guard", "face", "runner"]);

function entityInFocus(entId: string, focusEvent?: GameEvent | null): boolean {
  if (!focusEvent) return false;
  const ev = focusEvent as GameEvent & { actor?: string; object?: string };
  return ev.actor === entId || ev.object === entId;
}

function pickRing(active: boolean, kind: MapPickKind) {
  if (!active) return "";
  if (kind === "object") return "ring-2 ring-emerald-400/90 ring-offset-1 ring-offset-neutral-950";
  if (kind === "npc") return "ring-2 ring-sky-400/90 ring-offset-1 ring-offset-neutral-950";
  return "ring-2 ring-rose-400/90 ring-offset-1 ring-offset-neutral-950";
}

function toSelection(kind: MapPickKind, id: string): MapSelection {
  if (kind === "object") return { kind: "object", id: id as ObjectId };
  if (kind === "npc") return { kind: "npc", id: id as NpcId };
  return { kind: "agent", id: id as FieldAgentId };
}

export default function GameMap({
  world,
  focusEvent,
  selection,
  onSelect,
  playbackFrame,
  playbackActive,
}: {
  world: WorldState;
  focusEvent?: GameEvent | null;
  selection: MapSelection | null;
  onSelect: (sel: MapSelection | null) => void;
  playbackFrame?: PlaybackFrame | null;
  playbackActive?: boolean;
}) {
  const [manifest, setManifest] = useState<SpriteManifest | null>(null);
  const [bgOk, setBgOk] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [ambientT, setAmbientT] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    loadSpriteManifest().then(setManifest);
  }, []);

  useEffect(() => {
    if (playbackActive) return;
    const loop = () => {
      setAmbientT(performance.now() / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playbackActive]);

  const visuals = useMemo(
    () => resolveMapVisuals(world, { focusEvent: focusEvent ?? null }),
    [world, focusEvent],
  );

  const pickables = useMemo(() => mapPickablesFromWorld(world), [world]);
  const mapMood = useMemo(() => mapMoodFromWorld(world), [world]);
  const moodOverlay = MAP_MOOD_OVERLAY[mapMood];

  const isActive = (id: string, kind: MapPickKind) =>
    hoverId === id ||
    (selection?.kind === kind && selection.id === id);

  const bgPath = manifest?.map?.background ?? "/sprites/map/gallery_event_map.png";
  const mapW = manifest?.map?.sourceSize?.width ?? GALLERY_MAP_SIZE.width;
  const mapH = manifest?.map?.sourceSize?.height ?? GALLERY_MAP_SIZE.height;

  function entityPosPercent(entityId: string, locationId: LocationId) {
    const posOverride = entityPercentOverride(entityId, locationId, playbackFrame ?? null);
    if (posOverride) return posOverride;
    const npc = world.npcs[entityId as NpcId];
    const agent = world.agents[entityId as FieldAgentId];
    const coord = npc
      ? npcMapCoord(world, npc.id)
      : agent
        ? agentMapCoord(world, agent.id)
        : null;
    if (!coord) return mapToPercent(0, 0);
    const off = ambientEntityOffset(entityId, ambientT);
    return mapToPercent(coord.mapX + off.dx, coord.mapY + off.dy);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
        <span>
          地图：{bgOk ? "美术底图" : "加载中"}
          {playbackActive ? " · 演出中" : " · 环境运转中"}
        </span>
        {manifest && manifest.assets.length > 0 && (
          <span className="text-emerald-400/90">{manifest.assets.length} 个资产条目</span>
        )}
        <span className="text-neutral-500">悬停 / 选中时出现微光</span>
      </div>

      <MapViewport>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-neutral-950"
        style={{ aspectRatio: `${mapW} / ${mapH}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${bgPath}?v=${mapW}x${mapH}`}
          alt=""
          className={`absolute inset-0 h-full w-full object-contain transition ${
            bgOk ? "opacity-95 brightness-[0.88] saturate-[0.92]" : "opacity-0"
          }`}
          onLoad={() => setBgOk(true)}
          onError={() => setBgOk(false)}
        />
        {!bgOk && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-neutral-950/25 via-transparent to-neutral-950/35" />
        {moodOverlay && (
          <div className={moodOverlay.className} title={moodOverlay.label} aria-hidden />
        )}

        {manifest?.locationHighlights?.map((h) => {
          const left = (h.x / mapW) * 100;
          const top = (h.y / mapH) * 100;
          const w = (h.w / mapW) * 100;
          const height = (h.h / mapH) * 100;
          const active = world.locations[h.locationId].npcsPresent.length > 0;
          return (
            <div
              key={h.locationId}
              className="pointer-events-none absolute transition"
              style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${height}%` }}
            >
              {h.path && bgOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={h.path}
                  alt=""
                  className={`h-full w-full object-fill transition ${
                    active ? "opacity-35" : "opacity-15"
                  }`}
                />
              ) : (
                <div
                  className={`h-full w-full rounded-xl border-2 ${
                    active ? "border-amber-500/40 bg-amber-500/10" : "border-neutral-600/20 bg-neutral-800/10"
                  }`}
                />
              )}
            </div>
          );
        })}

        {visuals.overlays.map((o) => {
          const spriteFile = manifest ? assetFileForKey(manifest, o.id) : null;
          return (
            <div
              key={`${o.id}-${o.locationId}-${o.x}`}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${o.x}%`, top: `${o.y}%` }}
            >
              {spriteFile && bgOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spriteFile}
                  alt={overlayLabel(o.id)}
                  className={`h-10 w-10 object-contain ${o.ephemeral ? "animate-pulse" : ""}`}
                />
              ) : (
                <div
                  className={`max-w-[88px] rounded-md border px-1.5 py-0.5 text-center text-[9px] font-medium ${
                    o.ephemeral
                      ? "border-amber-400/80 bg-amber-950/90 text-amber-100"
                      : "border-violet-500/50 bg-violet-950/80 text-violet-100"
                  }`}
                >
                  {overlayLabel(o.id)}
                </div>
              )}
            </div>
          );
        })}

        {Object.values(world.objects)
          .filter((o) => o.visible && o.location !== "hidden" && o.location !== "target_inventory")
          .map((obj) => {
            const coord = objectMapCoord(world, obj.id as ObjectId);
            if (!coord) return null;
            const key = objectSpriteKey(obj.id as ObjectId, obj.state as Record<string, unknown>);
            const spriteFile = manifest ? assetFileForKey(manifest, key) : null;
            const label = OBJECT_LABELS[obj.id as ObjectId] ?? obj.name;
            const active = isActive(obj.id, "object");
            const highlighted =
              (obj.state as Record<string, unknown>).spilled === true ||
              (obj.state as Record<string, unknown>).tampered === true ||
              (obj.state as Record<string, unknown>).blockingSightline === true ||
              (obj.state as Record<string, unknown>).modified === true;
            const alwaysSprite = isObjectAlwaysVisible(obj.id as ObjectId);
            const showSprite =
              alwaysSprite ||
              shouldDrawObjectSprite(obj.id as ObjectId, {
                highlighted,
                hover: active || hoverId === obj.id,
                focus: active,
              });
            const bob = ambientEntityOffset(obj.id, ambientT);
            const pFoot = mapToPercent(coord.mapX + bob.dx, coord.mapY + bob.dy);
            const pickOff = objectPickOffset(obj.id as ObjectId);
            const hasPickShift = pickOff.dx !== 0 || pickOff.dy !== 0;
            const spriteH = objectSpriteMaxHeight(obj.id as ObjectId);
            return (
              <div
                key={obj.id}
                className={`absolute z-20 ${pickRing(active, "object")}`}
                style={{
                  left: `${pFoot.left}%`,
                  top: `${pFoot.top}%`,
                  transform: "translate(-50%, -100%)",
                }}
                title={label}
              >
                {(active || hoverId === obj.id) && (
                  <div
                    className={`pointer-events-none absolute left-1/2 h-3 w-10 -translate-x-1/2 rounded-full blur-sm ${
                      active ? "bg-amber-400/40 animate-pulse" : "bg-emerald-400/25"
                    }`}
                    style={{
                      bottom: hasPickShift ? `${Math.round(spriteH * 0.5)}px` : 0,
                    }}
                  />
                )}
                {showSprite && spriteFile && bgOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={spriteFile}
                    alt={label}
                    className="relative z-10 block w-auto object-contain object-bottom drop-shadow-lg"
                    style={{
                      height: `${objectSpriteMaxHeight(obj.id as ObjectId)}px`,
                      maxWidth: `${Math.round(objectSpriteMaxHeight(obj.id as ObjectId) * 1.8)}px`,
                    }}
                  />
                ) : null}
              </div>
            );
          })}

        {visuals.entities.map((ent) => {
          const label =
            ent.kind === "npc"
              ? NPC_LABELS[ent.entityId as keyof typeof NPC_LABELS]
              : AGENT_LABELS[ent.entityId as keyof typeof AGENT_LABELS];
          const spriteFile = manifest ? assetFileForKey(manifest, ent.spriteKey) : null;
          const isNpc = ent.kind === "npc";
          const kind: MapPickKind = isNpc ? "npc" : "agent";
          const active =
            isActive(ent.entityId, kind) ||
            playbackFrame?.pulseEntityId === ent.entityId;
          const npc = isNpc ? world.npcs[ent.entityId as keyof typeof world.npcs] : null;
          const agent = !isNpc ? world.agents[ent.entityId as keyof typeof world.agents] : null;
          const locId = npc?.location ?? agent?.location ?? "lobby";
          const pos = entityPosPercent(ent.entityId, locId);
          const left = pos.left;
          const top = pos.top;
          return (
            <div
              key={ent.entityId}
              className={`absolute z-30 flex -translate-x-1/2 flex-col items-center rounded-md ${pickRing(active, kind)} ${
                playbackActive ? "transition-[left,top] duration-75 ease-out" : ""
              }`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {spriteFile && bgOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spriteFile}
                  alt={ent.entityId}
                  className="h-16 w-auto max-w-[80px] object-contain object-bottom drop-shadow-lg"
                />
              ) : (
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[10px] font-medium ${
                    isNpc
                      ? "border-sky-400 bg-sky-950/90 text-sky-100"
                      : "border-rose-400 bg-rose-950/90 text-rose-100"
                  }`}
                  title={ent.spriteKey}
                >
                  {label?.short}
                </div>
              )}
              {(KEY_ENTITIES.has(ent.entityId) || entityInFocus(ent.entityId, focusEvent)) && (
                <span
                  className={`mt-0.5 text-[9px] ${
                    isNpc ? "text-sky-200/90" : "text-rose-200/90"
                  }`}
                >
                  {label?.short}
                </span>
              )}
            </div>
          );
        })}

        {!playbackActive &&
          pickables.map((p) => {
            const overlay = pickOverlayPercent(p.kind, p.id, p.left, p.top);
            const isStrip = p.hitZone === "balcony_rail_strip";
            return (
            <button
              key={`hit-${p.kind}-${p.id}`}
              type="button"
              aria-label={p.label}
              className="absolute z-50 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md bg-transparent hover:bg-white/5"
              style={{
                left: `${isStrip ? overlay.left : p.left}%`,
                top: `${isStrip ? overlay.top : p.top}%`,
                width: `${overlay.width}%`,
                height: `${overlay.height}%`,
              }}
              onMouseEnter={() => setHoverId(p.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => {
                const next = toSelection(p.kind, p.id);
                if (selection?.kind === next.kind && selection.id === next.id) {
                  onSelect(null);
                } else {
                  onSelect(next);
                }
              }}
            />
            );
          })}

        {playbackFrame?.bubbles.map((b) => (
          <div
            key={b.id}
            className="pointer-events-none absolute z-50 max-w-[140px] -translate-x-1/2 rounded-lg border border-amber-500/60 bg-neutral-950/90 px-2 py-1 text-center text-[10px] leading-snug text-amber-50 shadow-lg"
            style={{ left: `${b.left}%`, top: `${b.top}%` }}
          >
            {b.text}
          </div>
        ))}
      </div>
      </MapViewport>
    </div>
  );
}
