import { NextResponse } from "next/server";
import {
  appendPlayLog,
  clearPlayLogs,
  getPlayLogs,
} from "@/lib/server/playLogBuffer";
import * as fs from "node:fs";
import * as path from "node:path";

const LOG_DIR = path.join(process.cwd(), ".logs");
const LOG_FILE = path.join(LOG_DIR, "play-session.log");

function appendFileLine(line: string) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch {
    /* dev-only convenience */
  }
}

/** GET：联调时拉取最近玩家端日志（内存 + .logs/play-session.log） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 120)));
  return NextResponse.json({
    ok: true,
    entries: getPlayLogs(limit),
    file: LOG_FILE,
    hint: "Agent 可读: curl -s 'http://127.0.0.1:8747/api/play-log?limit=80' 或 cat .logs/play-session.log",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; type?: string; ts?: number };
    const text = (body.text ?? "").trim();
    if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    const type = body.type ?? "world";
    const ts = body.ts ?? Date.now();
    appendPlayLog({ ts, type, text });
    const iso = new Date(ts).toISOString();
    appendFileLine(`[${iso}] [${type}] ${text}\n`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "log failed" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  clearPlayLogs();
  return NextResponse.json({ ok: true });
}
