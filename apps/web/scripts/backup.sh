#!/bin/bash
set -e

# DevDigest Tracker - Database Backup Script
# Usage: ./scripts/backup.sh [--restore <backup_file>]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/postgres"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-devdigest}"
POSTGRES_DB="${POSTGRES_DB:-devdigest_db}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Parse arguments
RESTORE=false
RESTORE_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --restore)
            RESTORE=true
            RESTORE_FILE="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$RESTORE" = true ]; then
    # Restore backup
    if [ -z "$RESTORE_FILE" ] || [ ! -f "$RESTORE_FILE" ]; then
        log_error "Backup file not found: $RESTORE_FILE"
        exit 1
    fi

    log_warn "This will overwrite the current database. Are you sure? (yes/no)"
    read -r confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Restoring database from $RESTORE_FILE..."

    if [[ "$RESTORE_FILE" == *.gz ]]; then
        gunzip -c "$RESTORE_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        docker compose -f "$COMPOSE_FILE" exec -T postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$RESTORE_FILE"
    fi

    log_info "Database restored successfully!"
else
    # Create backup
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

    log_info "Creating database backup..."

    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | \
        gzip > "$BACKUP_FILE"

    # Get file size
    SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')

    log_info "Backup created: $BACKUP_FILE ($SIZE)"

    # Clean old backups (keep last 7 days)
    log_info "Cleaning old backups (keeping last 7 days)..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

    # List backups
    log_info "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
fi
