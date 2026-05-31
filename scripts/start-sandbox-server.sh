#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build:sandbox
if [[ ! -e sprites ]]; then
  ln -sf public/sprites sprites
fi
if lsof -i :8750 >/dev/null 2>&1; then
  echo "Port 8750 already in use — http://127.0.0.1:8750/sandbox-shell/"
  exit 0
fi
echo "Sandbox: http://127.0.0.1:8750/sandbox-shell/"
exec python3 -m http.server 8750
