#!/bin/bash
set -e

# DevDigest Tracker - SSL Certificate Setup Script
# Usage: ./scripts/setup-ssl.sh <domain> <email>

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

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <domain> <email>"
    echo "Example: $0 devdigest.example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

cd "$PROJECT_DIR"

# Create directories
mkdir -p certbot/conf certbot/www

# Check if certificate already exists
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    log_warn "Certificate for $DOMAIN already exists."
    read -p "Do you want to renew it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Make sure nginx is running
log_info "Starting nginx..."
docker compose -f "$COMPOSE_FILE" up -d nginx

# Wait for nginx
sleep 5

# Get certificate
log_info "Obtaining SSL certificate for $DOMAIN..."

docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Check if certificate was obtained
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    log_info "SSL certificate obtained successfully!"

    # Update nginx config
    log_info "Updating nginx configuration..."

    NGINX_CONF="$PROJECT_DIR/nginx/conf.d/default.conf"

    # Create SSL-enabled config
    cat > "$NGINX_CONF" << EOF
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Health check endpoint
    location /api/health {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Static files
    location /_next/static/ {
        proxy_pass http://nextjs;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # All other requests
    location / {
        limit_req zone=general burst=50 nodelay;

        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Reload nginx
    log_info "Reloading nginx..."
    docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

    log_info "SSL setup complete!"
    log_info "Your site is now available at: https://$DOMAIN"

    # Enable auto-renewal
    log_info "Starting certbot auto-renewal..."
    docker compose -f "$COMPOSE_FILE" --profile ssl up -d certbot

else
    log_error "Failed to obtain SSL certificate"
    exit 1
fi
