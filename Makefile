# MinIO Access Management System
# Makefile for easy deployment and development

.PHONY: help dev prod build start stop logs clean setup nginx ssl

# Default environment
ENV ?= development

help: ## Show this help message
	@echo "MinIO Access Management System"
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Setup environment and install dependencies
	@echo "Setting up MinIO Access Management System..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file from template"; fi
	@echo "Installing dependencies..."
	@cd admin-api && npm install
	@cd file-api && npm install
	@cd frontend && npm install
	@echo "Setup completed! Please configure your .env file."

dev: ## Start development environment
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up --build

dev-detached: ## Start development environment in detached mode
	@echo "Starting development environment (detached)..."
	docker-compose -f docker-compose.dev.yml up --build -d

prod: ## Start production environment
	@echo "Starting production environment..."
	docker-compose up --build -d

prod-nginx: ## Start production environment with Nginx
	@echo "Starting production environment with Nginx..."
	docker-compose -f nginx/docker-compose.nginx.yml up --build -d

build: ## Build all Docker images
	@echo "Building Docker images..."
	docker-compose build

start: ## Start services (already built)
	@echo "Starting services..."
	@if [ "$(ENV)" = "production" ]; then \
		docker-compose up -d; \
	else \
		docker-compose -f docker-compose.dev.yml up -d; \
	fi

stop: ## Stop all services
	@echo "Stopping services..."
	@docker-compose down
	@docker-compose -f docker-compose.dev.yml down
	@docker-compose -f nginx/docker-compose.nginx.yml down

restart: stop start ## Restart all services

logs: ## Show logs from all services
	@docker-compose logs -f

logs-admin: ## Show logs from admin API
	@docker-compose logs -f admin-api

logs-files: ## Show logs from file API
	@docker-compose logs -f file-api

logs-frontend: ## Show logs from frontend
	@docker-compose logs -f frontend

logs-nginx: ## Show logs from nginx (if using Docker nginx)
	@docker-compose -f nginx/docker-compose.nginx.yml logs -f nginx

status: ## Show service status
	@echo "Service Status:"
	@docker-compose ps

health: ## Check health of all services
	@echo "Health Check:"
	@curl -f http://localhost:3001/health 2>/dev/null && echo "✓ Admin API: OK" || echo "✗ Admin API: Failed"
	@curl -f http://localhost:3002/health 2>/dev/null && echo "✓ File API: OK" || echo "✗ File API: Failed"
	@curl -f http://localhost:3000/health 2>/dev/null && echo "✓ Frontend: OK" || echo "✗ Frontend: Failed"

clean: ## Clean up Docker resources
	@echo "Cleaning up..."
	@docker-compose down -v
	@docker-compose -f docker-compose.dev.yml down -v
	@docker-compose -f nginx/docker-compose.nginx.yml down -v
	@docker system prune -f
	@docker volume prune -f

clean-all: ## Clean up everything including images
	@echo "Cleaning up everything..."
	@docker-compose down -v --rmi all
	@docker-compose -f docker-compose.dev.yml down -v --rmi all
	@docker-compose -f nginx/docker-compose.nginx.yml down -v --rmi all
	@docker system prune -af
	@docker volume prune -f

backup-policies: ## Backup policy files
	@echo "Backing up policies..."
	@mkdir -p backups/policies-$(shell date +%Y%m%d-%H%M%S)
	@cp -r policies/ backups/policies-$(shell date +%Y%m%d-%H%M%S)/
	@echo "Policies backed up to backups/policies-$(shell date +%Y%m%d-%H%M%S)/"

test-connection: ## Test MinIO connection
	@echo "Testing MinIO connection..."
	@docker run --rm -it \
		-e MINIO_ENDPOINT=$${MINIO_ENDPOINT} \
		-e MINIO_ADMIN_ACCESS_KEY=$${MINIO_ADMIN_ACCESS_KEY} \
		-e MINIO_ADMIN_SECRET_KEY=$${MINIO_ADMIN_SECRET_KEY} \
		minio/mc:latest \
		sh -c "mc alias set test $${MINIO_ENDPOINT} $${MINIO_ADMIN_ACCESS_KEY} $${MINIO_ADMIN_SECRET_KEY} --api S3v4 && mc admin info test"

install-local: ## Install dependencies locally (for development)
	@echo "Installing local dependencies..."
	@cd admin-api && npm install
	@cd file-api && npm install
	@cd frontend && npm install
	@echo "Local dependencies installed"

dev-local: ## Run development servers locally (no Docker)
	@echo "Starting local development..."
	@echo "Starting Admin API on port 3001..."
	@cd admin-api && npm run dev &
	@echo "Starting File API on port 3002..."
	@cd file-api && npm run dev &
	@echo "Starting Frontend on port 3000..."
	@cd frontend && npm run dev &
	@echo "All services started locally. Press Ctrl+C to stop."

# Nginx and SSL commands
nginx-install: ## Install and configure Nginx (requires sudo)
	@echo "Installing Nginx..."
	@sudo bash nginx/scripts/nginx-install.sh

ssl-setup: ## Set up SSL certificates with Let's Encrypt (requires sudo)
	@echo "Setting up SSL certificates..."
	@sudo bash nginx/scripts/ssl-setup.sh

nginx-test: ## Test Nginx configuration
	@echo "Testing Nginx configuration..."
	@sudo nginx -t

nginx-reload: ## Reload Nginx configuration
	@echo "Reloading Nginx..."
	@sudo systemctl reload nginx

nginx-status: ## Show Nginx status
	@echo "Nginx Status:"
	@sudo systemctl status nginx

nginx-logs: ## Show Nginx logs
	@echo "Nginx Access Logs (last 50 lines):"
	@sudo tail -50 /var/log/nginx/access.log
	@echo ""
	@echo "Nginx Error Logs (last 20 lines):"
	@sudo tail -20 /var/log/nginx/error.log

# SSL certificate management
ssl-status: ## Show SSL certificate status
	@echo "SSL Certificate Status:"
	@sudo certbot certificates

ssl-renew: ## Manually renew SSL certificates
	@echo "Renewing SSL certificates..."
	@sudo certbot renew

ssl-test-renew: ## Test SSL certificate renewal (dry run)
	@echo "Testing SSL certificate renewal..."
	@sudo certbot renew --dry-run

# Environment specific commands
dev-up: ## Start development environment
	ENV=development $(MAKE) start

prod-up: ## Start production environment
	ENV=production $(MAKE) start

# Full deployment commands
deploy-local: nginx-install prod ssl-setup ## Full local deployment (nginx + app + ssl)
	@echo "Full deployment completed!"
	@echo "Your applications should be available at:"
	@echo "  https://admin.tunagu.app"
	@echo "  https://files.tunagu.app"

deploy-docker: prod-nginx ssl-setup-docker ## Full Docker deployment with Nginx
	@echo "Docker deployment completed!"

ssl-setup-docker: ## Set up SSL certificates for Docker deployment
	@echo "Setting up SSL certificates for Docker..."
	@docker-compose -f nginx/docker-compose.nginx.yml exec certbot \
		certbot certonly --webroot --webroot-path=/var/www/certbot \
		--email admin@tunagu.tech --agree-tos --no-eff-email \
		-d admin.tunagu.app -d files.tunagu.app

# Monitoring and troubleshooting
monitor: ## Monitor all logs in real-time
	@echo "Monitoring all services (Ctrl+C to stop)..."
	@if docker-compose ps | grep -q "minio-nginx"; then \
		docker-compose -f nginx/docker-compose.nginx.yml logs -f; \
	else \
		docker-compose logs -f; \
	fi

debug-nginx: ## Debug Nginx configuration and connections
	@echo "Nginx Debug Information:"
	@echo "======================="
	@echo "1. Configuration test:"
	@sudo nginx -t || true
	@echo ""
	@echo "2. Active connections:"
	@ss -tlnp | grep :80 || true
	@ss -tlnp | grep :443 || true
	@echo ""
	@echo "3. Recent error logs:"
	@sudo tail -10 /var/log/nginx/error.log || true

# Quick shortcuts
up: dev ## Alias for dev
down: stop ## Alias for stop
build-all: build ## Alias for build