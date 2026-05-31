import { execSync } from "node:child_process";
import { PORT, URL_MAIN } from "./paths";

export function portPids(): string[] {
  try {
    const out = execSync(`lsof -ti :${PORT}`, { encoding: "utf8" }).trim();
    if (!out) return [];
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function killPort(): void {
  const pids = portPids();
  if (!pids.length) return;
  console.log(`→ 结束占用 ${PORT} 的进程: ${pids.join(", ")}`);
  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
  }
}

export async function isServerHealthy(timeoutMs = 2500): Promise<boolean> {
  try {
    const res = await fetch(URL_MAIN, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

/** 端口占用且健康 → 复用；占用但不健康 → 杀进程后返回 false */
export async function reuseExistingServer(): Promise<boolean> {
  if (!portPids().length) return false;
  if (await isServerHealthy()) {
    console.log(`✓ 端口 ${PORT} 服务正常`);
    return true;
  }
  console.warn(`⚠ 端口 ${PORT} 被占用但无响应（会导致浏览器白屏），正在清理…`);
  killPort();
  await new Promise((r) => setTimeout(r, 400));
  return false;
}
