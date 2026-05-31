#!/bin/bash
# 放在桌面可双击：从用户主目录调用 node（不读 Documents 里的 bash 脚本）
set -euo pipefail
ROOT="$HOME/Documents/llm_director_hitman"
NODE="$ROOT/node_modules/.bin/tsx"
if [[ ! -x "$NODE" ]]; then
  osascript -e 'display alert "未找到 node_modules" message "请先在终端执行：\nln -sf ~/Documents/llm_director_hitman ~/hitman\ncd ~/hitman && npm install\n\n或把项目复制到 ~/hitman 再 npm install。"'
  exit 1
fi
cd "$HOME" || exit 1
exec "$NODE" "$ROOT/scripts/export-offline-demo.ts"
