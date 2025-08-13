#!/bin/bash

# Eventify Docker Management Script
# This script provides easy commands to manage your Docker containers

set -e

echo "🚀 Eventify Docker Manager"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Build and start all services
start_all() {
    log_info "Starting all Eventify services..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.docker ]; then
            log_warning "No .env file found. Copying from .env.docker"
            cp .env.docker .env
        else
            log_error "No environment file found. Please create .env file."
            exit 1
        fi
    fi
    
    docker-compose up --build -d
    log_success "All services started successfully!"
    
    # Show status
    show_status
}

# Stop all services
stop_all() {
    log_info "Stopping all Eventify services..."
    docker-compose down
    log_success "All services stopped successfully!"
}

# Restart all services
restart_all() {
    log_info "Restarting all Eventify services..."
    docker-compose restart
    log_success "All services restarted successfully!"
}

# Show service status
show_status() {
    log_info "Service Status:"
    docker-compose ps
    
    echo ""
    log_info "Service URLs:"
    echo "  🌐 Frontend: http://localhost:3000"
    echo "  🔧 Backend API: http://localhost:5000"
    echo "  🗄️  Database: localhost:5432"
    echo "  📊 PgAdmin: http://localhost:8080"
}

# Show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        log_info "Showing logs for all services..."
        docker-compose logs -f
    else
        log_info "Showing logs for $service..."
        docker-compose logs -f $service
    fi
}

# Run database migrations
migrate() {
    log_info "Running database migrations..."
    docker-compose exec backend npm run docker:migrate
    log_success "Database migrations completed!"
}

# Check database health
health_check() {
    log_info "Checking database health..."
    docker-compose exec backend npm run docker:health
}

# Access database shell
db_shell() {
    log_info "Opening database shell..."
    docker-compose exec postgres psql -U postgres -d event_management_db
}

# Backup database
backup_db() {
    local backup_name="eventify_backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating database backup: $backup_name"
    
    docker-compose exec postgres pg_dump -U postgres -d event_management_db > "./database/backups/$backup_name"
    log_success "Database backup created: $backup_name"
}

# Clean up Docker resources
cleanup() {
    log_warning "This will remove all containers and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Cleaning up Docker resources..."
        docker-compose down -v
        docker system prune -f
        log_success "Cleanup completed!"
    else
        log_info "Cleanup cancelled."
    fi
}

# Show help
show_help() {
    echo "Eventify Docker Management Commands:"
    echo ""
    echo "  start     - Build and start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  status    - Show service status and URLs"
    echo "  logs      - Show logs (add service name for specific service)"
    echo "  migrate   - Run database migrations"
    echo "  health    - Check database health"
    echo "  shell     - Access database shell"
    echo "  backup    - Create database backup"
    echo "  cleanup   - Remove all containers and volumes"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./docker-manage.sh start"
    echo "  ./docker-manage.sh logs backend"
    echo "  ./docker-manage.sh health"
}

# Main script logic
case "$1" in
    start)
        check_docker
        start_all
        ;;
    stop)
        check_docker
        stop_all
        ;;
    restart)
        check_docker
        restart_all
        ;;
    status)
        check_docker
        show_status
        ;;
    logs)
        check_docker
        show_logs $2
        ;;
    migrate)
        check_docker
        migrate
        ;;
    health)
        check_docker
        health_check
        ;;
    shell)
        check_docker
        db_shell
        ;;
    backup)
        check_docker
        backup_db
        ;;
    cleanup)
        check_docker
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
