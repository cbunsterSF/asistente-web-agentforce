#!/usr/bin/env bash
# Compila la landing y la publica en la rama gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
tmp=$(mktemp -d)
cp -R dist/. "$tmp"
touch "$tmp/.nojekyll"
cd "$tmp"
git init -q -b gh-pages
git add -A
git commit -qm "Publicar landing $(date -u +%Y-%m-%dT%H:%MZ)"
git -c 'credential.https://github.com/.helper=' -c 'credential.https://github.com/.helper=!gh auth git-credential' \
  push -q -f https://github.com/cbunsterSF/asistente-web-agentforce.git gh-pages
rm -rf "$tmp"
echo "Publicado en https://cbunstersf.github.io/asistente-web-agentforce/"
