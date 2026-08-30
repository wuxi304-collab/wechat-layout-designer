#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

npx vite build --config vite.pages.config.ts
touch dist-pages/.nojekyll

test -f dist-pages/index.html
test -f dist-pages/.nojekyll
test -n "$(find dist-pages/assets -maxdepth 1 -type f -name '*.js' -print -quit)"
test -n "$(find dist-pages/assets -maxdepth 1 -type f -name '*.css' -print -quit)"
