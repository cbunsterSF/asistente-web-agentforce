#!/usr/bin/env bash
# Arranca la app (puerto 3001) en segundo plano dentro del Codespace.
cd "$(dirname "$0")/.."
pkill -f "node server/index.js" 2>/dev/null || true
setsid bash -lc 'npm start' > /tmp/asistente.log 2>&1 < /dev/null &
