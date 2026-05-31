/**
 * 导出可双击运行的离线演示到桌面（不依赖 Documents 下的 npm / bash）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "sandbox-shell");
const SPRITES = path.join(ROOT, "public", "sprites");
const OUT = path.join(process.env.HOME ?? "/tmp", "Desktop", "Hitman-导演沙盒");

function copyDir(src: string, dest: string, skip = new Set<string>()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (skip.has(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

function rewriteManifestPaths(manifestPath: string) {
  const raw = fs.readFileSync(manifestPath, "utf8");
  const next = raw.replaceAll('"/sprites/', '"sprites/');
  fs.writeFileSync(manifestPath, next);
}

function patchSpriteLoader(jsPath: string) {
  let js = fs.readFileSync(jsPath, "utf8");
  js = js.replace(
    'const res = await fetch("/sprites/manifest.json");',
    'const res = await fetch("sprites/manifest.json");',
  );
  js = js.replace(
    'mapBackground: raw.map?.background ?? "/sprites/map/gallery_event_map.png",',
    'mapBackground: raw.map?.background ?? "sprites/map/gallery_event_map.png",',
  );
  fs.writeFileSync(jsPath, js);
}

function writeIndexHtml(outDir: string) {
  const srcHtml = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
  const html = srcHtml
    .replaceAll('src="/play/dist/hitman-core.js"', 'src="dist/hitman-core.js"')
    .replaceAll('src="/play/js/', 'src="js/');
  fs.writeFileSync(path.join(outDir, "index.html"), html);
}

function writeLauncher(outDir: string) {
  const cmd = `#!/bin/bash
cd "$(dirname "$0")"
PORT=8765
URL="http://127.0.0.1:\${PORT}/"
if lsof -ti :\${PORT} >/dev/null 2>&1; then
  open "\${URL}"
  echo "已在运行，已打开浏览器：\${URL}"
  read -r -p "按回车关闭本窗口…"
  exit 0
fi
echo "启动本地演示（仅本文件夹，不访问文稿）…"
echo "  \${URL}"
(sleep 1 && open "\${URL}") &
python3 -m http.server \${PORT} --bind 127.0.0.1
`;
  const p = path.join(outDir, "打开演示.command");
  fs.writeFileSync(p, cmd, { mode: 0o755 });
}

function writeReadme(outDir: string) {
  const text = `Hitman · Balcony Job 导演沙盒（离线包）

【推荐】双击「打开演示.command」
  → 自动开浏览器，地址 http://127.0.0.1:8765/
  → 不需要在「文稿」里跑 npm，也不依赖全局 bash 脚本

若双击 .command 提示无法打开：
  右键 → 打开 → 确认打开一次即可。

备用：用 Safari 直接打开 index.html（部分浏览器会拦截本地资源）。

本文件夹可整个复制到 U 盘或其它 Mac。

主站（探索 + 自然语言 Plan）仍需开发服务器；
本包是 Canvas 沙盒完整玩法（路线、执行本步、环境 tick、地图点击）。

生成命令（在可访问仓库的机器上）：
  npm run export:offline
`;
  fs.writeFileSync(path.join(outDir, "请先读我.txt"), text);
}

async function main() {
  if (!fs.existsSync(SPRITES)) {
    console.error("缺少 public/sprites，请先 npm install 并确保资源存在。");
    process.exit(1);
  }

  execSync("npm run build:sandbox", { cwd: ROOT, stdio: "inherit" });

  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  copyDir(SRC, OUT, new Set(["README.md", "index.html"]));
  copyDir(SPRITES, path.join(OUT, "sprites"));

  writeIndexHtml(OUT);
  patchSpriteLoader(path.join(OUT, "js", "sprite-loader.js"));
  rewriteManifestPaths(path.join(OUT, "sprites", "manifest.json"));
  writeLauncher(OUT);
  writeReadme(OUT);

  console.log("");
  console.log("已导出到:");
  console.log(`  ${OUT}`);
  console.log("");
  console.log("请在本机 Finder 打开桌面文件夹，双击「打开演示.command」");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
