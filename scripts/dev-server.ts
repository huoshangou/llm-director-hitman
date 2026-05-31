/**
 * 唯一演示入口：sync → next dev → 等端口就绪 → 打开浏览器。
 * 从 ~/hitman 运行可避开 macOS 对 Documents 的终端限制。
 */
import { execSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  HOST,
  PORT,
  URL_MAIN,
  URL_PLAY,
  documentsRepoRoot,
  homeDevRoot,
  resolvePlayRoot,
} from "./lib/paths";
import { mirrorRepo } from "./lib/mirror";
import { reuseExistingServer } from "./lib/port";

function openBrowser(url: string) {
  if (process.platform !== "darwin") return;
  try {
    execSync(`open "${url}"`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

async function waitReady(url: string, maxMs = 90_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status === 304) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

function maybeMirrorFromDocuments(playRoot: string) {
  const docs = documentsRepoRoot();
  if (!fs.existsSync(path.join(docs, "package.json"))) return;
  if (path.resolve(docs) === path.resolve(playRoot)) return;
  console.log("→ 同步文稿目录改动到 ~/hitman …");
  const n = mirrorRepo(docs, playRoot);
  console.log(n ? `  ${n} 个文件已更新` : "  已是最新");
}

function ensureDeps(playRoot: string) {
  const nextBin = path.join(playRoot, "node_modules", ".bin", "next");
  if (fs.existsSync(nextBin)) return;
  console.log("→ 首次安装依赖（~/hitman）…");
  execSync("npm install", { cwd: playRoot, stdio: "inherit", env: process.env });
}

async function main() {
  const playRoot = resolvePlayRoot();
  process.chdir(playRoot);
  process.env.HITMAN_ROOT = playRoot;

  console.log(`演示根目录: ${playRoot}`);
  console.log(`  首页→玩家  ${URL_MAIN} → /play/`);
  console.log(`  GM  ${URL_MAIN.replace(/\/$/, "")}/gm`);
  console.log(`  玩家  ${URL_PLAY}`);
  console.log("");

  if (await reuseExistingServer()) {
    console.log("→ 服务已在运行；仍同步最新 play 包（避免停在旧 build）…");
    maybeMirrorFromDocuments(playRoot);
    ensureDeps(playRoot);
    const tsx = path.join(playRoot, "node_modules", ".bin", "tsx");
    execSync(`"${tsx}" scripts/sync-sandbox-public.ts`, {
      cwd: playRoot,
      stdio: "inherit",
    });
    openBrowser(URL_PLAY);
    return;
  }

  maybeMirrorFromDocuments(playRoot);

  ensureDeps(playRoot);

  const tsx = path.join(playRoot, "node_modules", ".bin", "tsx");
  console.log("→ sync:play");
  execSync(`"${tsx}" scripts/sync-sandbox-public.ts`, {
    cwd: playRoot,
    stdio: "inherit",
  });

  const next = path.join(playRoot, "node_modules", ".bin", "next");
  console.log(`→ next dev :${PORT}`);
  console.log("  （看到 Ready 后浏览器会自动打开；停止请 Ctrl+C）\n");

  const openTimer = setTimeout(() => {
    void (async () => {
      const ok = await waitReady(URL_MAIN, 90_000);
      if (ok) {
        console.log("\n✓ 服务就绪，打开浏览器");
        openBrowser(URL_MAIN);
      } else {
        console.warn("\n⚠ 等待超时；请手动打开:", URL_MAIN);
      }
    })();
  }, 2500);

  const child = spawn(next, ["dev", "--turbopack", "-p", String(PORT), "-H", HOST], {
    cwd: playRoot,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    clearTimeout(openTimer);
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
