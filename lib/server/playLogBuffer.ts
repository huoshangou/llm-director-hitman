export type PlayLogEntry = {
  ts: number;
  type: string;
  text: string;
};

const MAX = 500;
const buffer: PlayLogEntry[] = [];

export function appendPlayLog(entry: Omit<PlayLogEntry, "ts"> & { ts?: number }) {
  buffer.push({
    ts: entry.ts ?? Date.now(),
    type: entry.type,
    text: entry.text.slice(0, 2000),
  });
  while (buffer.length > MAX) buffer.shift();
}

export function getPlayLogs(limit = 200): PlayLogEntry[] {
  return buffer.slice(-Math.min(limit, buffer.length));
}

export function clearPlayLogs() {
  buffer.length = 0;
}
