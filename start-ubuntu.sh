#!/usr/bin/env bash
# Start WeBook on Ubuntu / Linux.
#   ./start-ubuntu.sh        -> desktop app (Electron)
#   ./start-ubuntu.sh web    -> open in your browser instead
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it with:  sudo apt install nodejs npm"
  echo "Or just open src/index.html in Firefox/Chrome."
  exit 1
fi

if [ "$1" = "web" ]; then
  (sleep 1 && xdg-open "http://localhost:8080" >/dev/null 2>&1 || true) &
  exec node scripts/serve.js 8080
fi

if [ ! -d node_modules/electron ]; then
  echo "Installing WeBook (first run only)..."
  npm install
fi
exec npx electron .
