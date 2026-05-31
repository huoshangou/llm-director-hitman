/**
 * 一次性：把项目镜像到 ~/hitman，装依赖，写桌面启动器（不经过 Documents 里的 bash）。
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { URL_MAIN, homeDevRoot, repoRootFromScript } from "./lib/paths";
import { copyTree } from "./lib/mirror";

const SRC = repoRootFromScript();
const DEST = homeDevRoot();
const DESKTOP = path.join(os.homedir(), "Desktop", "启动 Hitman 演示.command");

function writeDesktopLauncher() {
  const body = `#!/bin/bash
# 自动维护 — 勿手改。生成: npm run setup:home
set -euo pipefail
ROOT="$HOME/hitman"
if [[ ! -f "$ROOT/package.json" ]]; then
  osascript -e 'display alert "尚未初始化 ~/hitman" message "在 Cursor 终端运行：\\ncd ~/Documents/llm_director_hitman\\nnpm run setup:home"'
  exit 1
fi
cd "$ROOT"
echo "Hitman 演示启动中… 请勿关闭本窗口（Ctrl+C 可停止服务）"
if ! "$ROOT/node_modules/.bin/tsx" "$ROOT/scripts/dev-server.ts"; then
  osascript -e 'display alert "启动失败" message "请看终端窗口里的报错；或先在 Cursor 运行 npm run demo:restart"'
  read -r -p "按回车关闭…"
  exit 1
fi
`;
  fs.writeFileSync(DESKTOP, body, { mode: 0o755 });
}

function writeBinShortcut() {
  const binDir = path.join(os.homedir(), "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const p = path.join(binDir, "hitman-play");
  fs.writeFileSync(
    p,
    `#!/bin/bash
exec "$HOME/hitman/node_modules/.bin/tsx" "$HOME/hitman/scripts/dev-server.ts"
`,
    { mode: 0o755 },
  );
}

function main() {
  console.log(`源: ${SRC}`);
  console.log(`→ ${DEST}`);

  if (fs.existsSync(DEST)) {
    console.log("（已存在，增量覆盖源码目录）");
  }
  fs.mkdirSync(DEST, { recursive: true });
  copyTree(SRC, DEST);

  console.log("→ npm install …");
  execSync("npm install", { cwd: DEST, stdio: "inherit" });

  writeDesktopLauncher();
  writeBinShortcut();

  console.log("");
  console.log("✓ 完成");
  console.log(`  开发副本: ${DEST}`);
  console.log(`  桌面启动: ${DESKTOP}`);
  console.log(`  终端命令: ~/bin/hitman-play`);
  console.log(`  浏览器:   ${URL_MAIN}`);
  console.log("");
  console.log("日常：双击桌面「启动 Hitman 演示」；在文稿里改代码后会自动同步到 ~/hitman。");
}

main();
