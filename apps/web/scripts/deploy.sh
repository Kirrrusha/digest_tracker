#!/bin/bash
set -e

# DevDigest Tracker - Production Deployment Script
# Usage: ./scripts/deploy.sh [--build] [--migrate] [--ssl]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
BUILD=false
MIGRATE=false
SSL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build) BUILD=true; shift ;;
        --migrate) MIGRATE=true; shift ;;
        --ssl) SSL=true; shift ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
done

# Check .env file
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_error ".env file not found! Copy .env.production.example to .env and configure it."
    exit 1
fi

# Load environment
set -a
source "$PROJECT_DIR/.env"
set +a

# Validate required env vars
required_vars=("POSTGRES_PASSWORD" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

cd "$PROJECT_DIR"

# Build images if requested
if [ "$BUILD" = true ]; then
    log_info "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
fi

# Pull latest images
log_info "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull postgres redis nginx

# Start database first
log_info "Starting database services..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

# Wait for database
log_info "Waiting for database to be ready..."
sleep 10

# Run migrations if requested
if [ "$MIGRATE" = true ]; then
    log_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy
fi

# Start application
log_info "Starting application..."
if [ "$SSL" = true ]; then
    docker compose -f "$COMPOSE_FILE" --profile ssl up -d
else
    docker compose -f "$COMPOSE_FILE" up -d
fi

# Wait for app to be healthy
log_info "Waiting for application to be healthy..."
sleep 30

# Check health
if docker compose -f "$COMPOSE_FILE" exec -T app wget -q --spider http://localhost:3000/api/health; then
    log_info "Application is healthy!"
else
    log_warn "Health check failed, checking logs..."
    docker compose -f "$COMPOSE_FILE" logs --tail=50 app
fi

# Show status
log_info "Deployment complete! Services status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
log_info "Application URL: ${NEXTAUTH_URL}"
