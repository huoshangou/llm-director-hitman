#!/bin/bash
# 在仓库根目录双击启动本地演示（macOS）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "需要 Node.js" message "请先安装 Node.js 18+：\nhttps://nodejs.org/"' 2>/dev/null || true
  echo "请先安装 Node.js 18+： https://nodejs.org/"
  read -r -p "按回车关闭…"
  exit 1
fi

if [[ ! -f package.json ]]; then
  osascript -e 'display alert "目录错误" message "请在 llm-director-hitman 仓库根目录运行此启动器。"' 2>/dev/null || true
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "首次运行：正在安装依赖（仅需一次）…"
  npm install
fi

echo "Hitman 演示启动中…"
echo "  玩家页面： http://127.0.0.1:8747/play/index.html"
echo "  请勿关闭本窗口（Ctrl+C 可停止服务）"
echo ""

if ! npm run play; then
  osascript -e 'display alert "启动失败" message "请查看本窗口中的报错信息。"' 2>/dev/null || true
  read -r -p "按回车关闭…"
  exit 1
fi
