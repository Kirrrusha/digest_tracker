#!/bin/bash

# DevDigest Tracker - Logs Viewer Script
# Usage: ./scripts/logs.sh [service] [--follow]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

SERVICE=""
FOLLOW=""
TAIL=100

while [[ $# -gt 0 ]]; do
    case $1 in
        --follow|-f) FOLLOW="-f"; shift ;;
        --tail) TAIL="$2"; shift 2 ;;
        app|nginx|postgres|redis) SERVICE="$1"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

cd "$PROJECT_DIR"

if [ -n "$SERVICE" ]; then
    docker compose -f "$COMPOSE_FILE" logs --tail="$TAIL" $FOLLOW "$SERVICE"
else
    docker compose -f "$COMPOSE_FILE" logs --tail="$TAIL" $FOLLOW
fi
