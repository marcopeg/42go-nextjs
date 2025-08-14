#!/usr/bin/env sh
# Simple security sanity check for production images/containers.
# Fails (exit 1) if any .env-like file is found inside container filesystem.

set -eu

APP_SERVICE="app"
COMPOSE_FILE="docker-compose.prod.yml"

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  echo "Compose project not running. Start with: make prod.start" >&2
  exit 1
fi

CID=$(docker compose -f "$COMPOSE_FILE" ps -q "$APP_SERVICE")
if [ -z "$CID" ]; then
  echo "App container not found." >&2
  exit 1
fi

# Search for .env files
FOUND=$(docker exec "$CID" sh -lc "find / -maxdepth 6 -type f -name '.env' -o -name '.env.*' 2>/dev/null | wc -l")
if [ "$FOUND" != "0" ]; then
  echo "❌ SECURITY RISK: Found $FOUND .env files inside container:" >&2
  docker exec "$CID" sh -lc "find / -maxdepth 6 -type f -name '.env' -o -name '.env.*' 2>/dev/null"
  exit 1
fi

echo "✅ No .env files found in container."
