#!/usr/bin/env bash
# Builds the full site into ./site: landing pages at /, the web app at /app/.
set -euo pipefail
rm -rf dist site
npx expo export --platform web
mkdir -p site
cp -r website/. site/
cp -r dist site/app
cp dist/index.html site/404.html   # deep links into the app fall back to the app shell
echo "Site built in ./site"
