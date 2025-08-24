#!/bin/bash

# MinIO Access Management - Nginx Installation and Configuration Script

set -e

# Configuration
PROJECT_ROOT="/opt/minio-access"
NGINX_CONFIG_SOURCE="$PROJECT_ROOT/nginx"
BACKUP_DIR="/opt/nginx-backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

# Detect OS
if [[ -f /etc/debian_version ]]; then
    OS="debian"
    log "Detected Debian/Ubuntu system"
elif [[ -f /etc/redhat-release ]]; then
    OS="redhat"
    log "Detected Red Hat/CentOS system"
else
    error "Unsupported operating system"
fi

# Install nginx
install_nginx() {
    log "Installing nginx..."
    
    if [[ $OS == "debian" ]]; then
        apt-get update
        apt-get install -y nginx
    elif [[ $OS == "redhat" ]]; then
        yum install -y epel-release
        yum install -y nginx
    fi
    
    systemctl enable nginx
    log "Nginx installed successfully"
}

# Backup existing configuration
backup_config() {
    if [[ -d /etc/nginx ]]; then
        log "Backing up existing nginx configuration..."
        mkdir -p $BACKUP_DIR
        cp -r /etc/nginx $BACKUP_DIR/
        log "Backup created at $BACKUP_DIR"
    fi
}

# Install configuration files
install_config() {
    log "Installing nginx configuration..."
    
    # Main nginx.conf
    cp "$NGINX_CONFIG_SOURCE/nginx.conf" /etc/nginx/nginx.conf
    
    # Site configurations
    cp "$NGINX_CONFIG_SOURCE/conf.d/"* /etc/nginx/conf.d/
    
    # Create required directories
    mkdir -p /var/www/certbot
    mkdir -p /var/log/nginx
    
    # Set proper permissions
    chown -R www-data:www-data /var/www/certbot 2>/dev/null || chown -R nginx:nginx /var/www/certbot
    chown -R root:root /etc/nginx
    chmod 644 /etc/nginx/nginx.conf
    chmod 644 /etc/nginx/conf.d/*.conf
    
    log "Configuration files installed"
}

# Test configuration
test_config() {
    log "Testing nginx configuration..."
    
    if nginx -t; then
        log "Nginx configuration test passed"
    else
        error "Nginx configuration test failed"
    fi
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        ufw allow 80/tcp
        ufw allow 443/tcp
        log "UFW firewall rules added"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log "Firewalld rules added"
    else
        warn "No firewall detected. Please manually open ports 80 and 443"
    fi
}

# Start services
start_services() {
    log "Starting nginx..."
    systemctl start nginx
    systemctl reload nginx
    
    if systemctl is-active --quiet nginx; then
        log "Nginx is running successfully"
    else
        error "Failed to start nginx"
    fi
}

# Display status
show_status() {
    info "Nginx Installation Summary:"
    echo "  Status: $(systemctl is-active nginx)"
    echo "  Enabled: $(systemctl is-enabled nginx)"
    echo "  Configuration: /etc/nginx/nginx.conf"
    echo "  Sites: /etc/nginx/conf.d/"
    echo "  Logs: /var/log/nginx/"
    echo ""
    
    info "Next steps:"
    echo "  1. Update DNS records to point to this server:"
    echo "     admin.tunagu.app -> $(curl -s ifconfig.me)"
    echo "     files.tunagu.app -> $(curl -s ifconfig.me)"
    echo ""
    echo "  2. Start your application services:"
    echo "     cd $PROJECT_ROOT && make prod"
    echo ""
    echo "  3. Set up SSL certificates:"
    echo "     bash $PROJECT_ROOT/nginx/scripts/ssl-setup.sh"
    echo ""
    
    warn "Current configuration expects SSL certificates."
    warn "Sites will show SSL errors until certificates are installed."
}

# Main execution
main() {
    log "Starting nginx installation and configuration..."
    
    # Check if nginx is already installed
    if command -v nginx &> /dev/null; then
        warn "Nginx is already installed"
        backup_config
    else
        install_nginx
    fi
    
    install_config
    test_config
    configure_firewall
    start_services
    show_status
    
    log "Nginx installation and configuration completed!"
}

# Execute main function
main "$@"