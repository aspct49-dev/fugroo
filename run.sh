#!/bin/sh
# Rebuild, restart the preview server, screenshot.
#
# The wait loop is the important part: `next start` caches the build manifest
# at boot, so a server still holding the port after a rebuild serves HTML
# pointing at asset hashes that no longer exist, and every page renders
# unstyled. Kill, wait for the port to actually free, then start.
PORT=${PORT:-3480}
SHOT="C:/Users/ADMIN/AppData/Local/Temp/claude/c--Fugroo/9caf1e28-ca28-4c52-b549-a9d088e424e2/scratchpad"

npx next build 2>&1 | grep -E "Compiled|error|Error|✓ Gen" || exit 1

powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -like '*next*start*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }" 2>/dev/null
for i in $(seq 1 25); do
  netstat -ano | grep -qE ":$PORT .*LISTENING" || break
  sleep 0.4
done

nohup npx next start -p $PORT > /tmp/fugroo-server.log 2>&1 &
for i in $(seq 1 50); do curl -sf -o /dev/null "http://localhost:$PORT/" && break; sleep 0.4; done

CSS=$(curl -s "http://localhost:$PORT/" | grep -oE '/_next/static/css/[^"]+\.css' | head -1)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT$CSS")
[ "$CODE" = "200" ] || { echo "stylesheet $CSS returned $CODE — stale server"; exit 1; }

node ./shot.mjs "$SHOT" "$PORT"
