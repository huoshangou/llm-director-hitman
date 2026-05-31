"use client";

import type { HackerIntelLine } from "@/lib/hacker/hackerIntel";

export type HackerFeedItem = HackerIntelLine & { at: number };

export default function HackerCommsPanel({
  items,
  live,
}: {
  items: HackerFeedItem[];
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-3">
      <div className="mb-2 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-cyan-200">
            FIELD COMMS · 电台 / 环境音
          </span>
        {live && (
          <span className="animate-pulse rounded-full bg-cyan-500/30 px-2 py-0.5 text-[10px] text-cyan-100">
            LIVE
          </span>
        )}
        </div>
        <p className="text-[10px] leading-snug text-cyan-200/45">
          物件/NPC 详报在右侧 Inspector（= /play 骇入分析），本频道不承接物件卡。
        </p>
      </div>
      <div className="max-h-44 space-y-2 overflow-y-auto text-xs leading-relaxed">
        {items.length === 0 ? (
          <p className="text-cyan-200/50">
            开局电台、turn 结束与场地环境音会出现在这里；点选情报请读右侧 Inspector。
          </p>
        ) : (
          items.map((item) => (
            <div
              key={`${item.id}-${item.at}`}
              className="relative rounded-lg border border-cyan-800/40 bg-neutral-950/70 px-2.5 py-2 text-cyan-50/90"
            >
              <span className="absolute -left-1 top-3 h-2 w-2 rounded-full bg-cyan-400/80" aria-hidden />
              <p className="pl-1">{item.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
