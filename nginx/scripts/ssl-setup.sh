#!/bin/bash

# MinIO Access Management - SSL Certificate Setup Script
# This script sets up SSL certificates using Let's Encrypt

set -e

# Configuration
DOMAINS="admin.tunagu.app files.tunagu.app"
EMAIL="admin@tunagu.tech"
WEBROOT="/var/www/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    log "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create webroot directory
log "Creating webroot directory..."
mkdir -p $WEBROOT
chown -R www-data:www-data $WEBROOT

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    log "Installing nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Stop nginx temporarily for certificate generation
log "Stopping nginx temporarily..."
systemctl stop nginx

# Generate certificates for each domain
for domain in $DOMAINS; do
    log "Generating certificate for $domain..."
    
    if certbot certonly \
        --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domain $domain; then
        log "Certificate generated successfully for $domain"
    else
        error "Failed to generate certificate for $domain"
    fi
done

# Start nginx
log "Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Test nginx configuration
log "Testing nginx configuration..."
nginx -t

# Reload nginx
log "Reloading nginx..."
systemctl reload nginx

# Set up automatic renewal
log "Setting up automatic certificate renewal..."
CRON_JOB="0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log "Automatic renewal cron job added"
else
    warn "Automatic renewal cron job already exists"
fi

# Test certificate renewal
log "Testing certificate renewal..."
certbot renew --dry-run

# Display certificate information
log "Certificate information:"
for domain in $DOMAINS; do
    if [[ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]]; then
        echo "✓ $domain: Certificate installed"
        openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -text -noout | grep -A2 "Validity"
    else
        echo "✗ $domain: Certificate NOT found"
    fi
done

log "SSL setup completed successfully!"
log "Your sites should now be accessible via HTTPS:"
for domain in $DOMAINS; do
    log "  https://$domain"
done