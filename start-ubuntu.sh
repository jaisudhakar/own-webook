#!/usr/bin/env bash
# Start WeBook on Ubuntu / Linux.
#   ./start-ubuntu.sh           -> desktop app if it is ready, otherwise the browser version (instant)
#   ./start-ubuntu.sh desktop   -> desktop app (downloads the ~100 MB Electron runtime once)
#   ./start-ubuntu.sh web       -> browser version at http://localhost:8080
#
# Slow download? Use a mirror, e.g.:
#   ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" ./start-ubuntu.sh desktop
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it with:  sudo apt install nodejs npm"
  echo "Or just open src/index.html in Firefox/Chrome."
  exit 1
fi

run_web() {
  exec node scripts/serve.js 8080 --open
}

# The Electron runtime is ready once node_modules/electron/path.txt exists.
desktop_ready() {
  [ -f node_modules/electron/path.txt ]
}

mode="${1:-auto}"

if [ "$mode" = "web" ]; then
  run_web
fi

if [ "$mode" = "auto" ] && ! desktop_ready; then
  echo "The desktop runtime isn't downloaded yet, so WeBook is opening in your browser now."
  echo "To get the desktop app later (one-time ~100 MB download), run:  ./start-ubuntu.sh desktop"
  echo
  run_web
fi

if [ ! -d node_modules/electron ]; then
  echo "Installing WeBook (first run only)..."
  npm install
fi
exec npx electron .
