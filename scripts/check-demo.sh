#!/usr/bin/env bash
ROOT="${HITMAN_ROOT:-$HOME/hitman}"
if [[ -x "$ROOT/node_modules/.bin/tsx" ]]; then
  exec "$ROOT/node_modules/.bin/tsx" "$ROOT/scripts/open-demo.ts"
fi
exec "$(dirname "$0")/../node_modules/.bin/tsx" "$(dirname "$0")/open-demo.ts"
