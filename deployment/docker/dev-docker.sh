#!/bin/bash

# Kubernetes Admin UI - Docker Development Helper Script
# Usage: ./dev-docker.sh [command]

set -e

PROJECT_NAME="yakui"
COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}=================================${NC}"
    echo -e "${CYAN}  Kubernetes Admin UI - Docker${NC}"
    echo -e "${CYAN}=================================${NC}"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [[ ! -f ~/.kube/config ]]; then
        print_warning "Kubeconfig not found at ~/.kube/config. Backend may not connect to Kubernetes cluster."
    fi
    
    print_status "Prerequisites check complete."
}

# Function to show help
show_help() {
    print_header
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up              Start all services in detached mode"
    echo "  up-watch        Start all services with file watching"
    echo "  up-full         Start with optional services (cache, monitoring)"
    echo "  down            Stop all services"
    echo "  down-clean      Stop services and remove volumes"
    echo "  restart         Restart all services"
    echo "  build           Build all Docker images"
    echo "  rebuild         Force rebuild all Docker images"
    echo "  logs            Show logs for all services"
    echo "  logs-f          Follow logs for all services"
    echo "  logs-frontend   Show frontend logs"
    echo "  logs-backend    Show backend logs"
    echo "  status          Show service status"
    echo "  health          Check health of all services"
    echo "  shell-frontend  Open shell in frontend container"
    echo "  shell-backend   Open shell in backend container"
    echo "  test            Run tests in frontend container"
    echo "  deps-install    Install new dependencies (rebuilds containers)"
    echo "  deps-update     Update package-lock.json and rebuild"
    echo "  clean           Clean up stopped containers and unused images"
    echo "  reset           Reset entire environment (stop, clean, rebuild)"
    echo ""
    echo "Examples:"
    echo "  $0 up              # Start development environment"
    echo "  $0 logs-f          # Follow logs from all services"
    echo "  $0 shell-backend   # Debug backend container"
    echo ""
}

# Function to start services
start_services() {
    print_status "Starting Kubernetes Admin UI development environment..."
    # Ensure package-lock.json exists for consistent builds
    if [[ ! -f "package-lock.json" ]]; then
        print_warning "package-lock.json not found. Running npm install to generate it..."
        npm install --package-lock-only
    fi
    docker-compose up -d
    print_status "Services started. Access:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:3001"
    echo "  Health:   http://localhost:3001/api/health"
}

# Function to start with file watching
start_with_watch() {
    print_status "Starting with file watching (requires Docker Compose v2.22+)..."
    if docker-compose version | grep -q "v2\.2[2-9]\|v2\.[3-9]"; then
        docker-compose up --watch
    else
        print_warning "File watching requires Docker Compose v2.22+. Starting normally..."
        docker-compose up
    fi
}

# Function to start with all services
start_full() {
    print_status "Starting with all optional services (cache, monitoring)..."
    docker-compose --profile cache --profile monitoring up -d
    print_status "All services started. Access:"
    echo "  Frontend:    http://localhost:5173"
    echo "  Backend:     http://localhost:3001"
    echo "  Redis:       localhost:6379"
    echo "  Prometheus:  http://localhost:9090"
}

# Function to check health
check_health() {
    print_status "Checking service health..."
    
    echo -n "Frontend: "
    if curl -sf http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Unhealthy${NC}"
    fi
    
    echo -n "Backend:  "
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Unhealthy${NC}"
    fi
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker system prune -f
    print_status "Cleanup complete."
}

# Function to install dependencies and rebuild
install_dependencies() {
    print_status "Installing dependencies and rebuilding containers..."
    # Stop services first
    docker-compose down
    # Ensure package-lock.json is up to date
    npm install
    # Rebuild containers with updated dependencies
    docker-compose build --no-cache
    print_status "Dependencies installed. Use 'up' to start services."
}

# Function to update dependencies
update_dependencies() {
    print_status "Updating package-lock.json and rebuilding..."
    docker-compose down
    npm update
    docker-compose build --no-cache
    print_status "Dependencies updated. Use 'up' to start services."
}

# Function to reset environment
reset_environment() {
    print_warning "This will stop all services, remove volumes, and rebuild images."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting development environment..."
        docker-compose down -v
        docker-compose build --no-cache
        docker system prune -f
        print_status "Environment reset complete. Run 'up' to start fresh."
    else
        print_status "Reset cancelled."
    fi
}

# Main command processing
case "${1:-help}" in
    "up")
        check_prerequisites
        start_services
        ;;
    "up-watch")
        check_prerequisites
        start_with_watch
        ;;
    "up-full")
        check_prerequisites
        start_full
        ;;
    "down")
        print_status "Stopping services..."
        docker-compose down
        ;;
    "down-clean")
        print_status "Stopping services and removing volumes..."
        docker-compose down -v
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        ;;
    "build")
        print_status "Building Docker images..."
        docker-compose build
        ;;
    "rebuild")
        print_status "Force rebuilding Docker images..."
        docker-compose build --no-cache
        ;;
    "logs")
        docker-compose logs
        ;;
    "logs-f")
        docker-compose logs -f
        ;;
    "logs-frontend")
        docker-compose logs -f frontend
        ;;
    "logs-backend")
        docker-compose logs -f backend
        ;;
    "status")
        docker-compose ps
        ;;
    "health")
        check_health
        ;;
    "shell-frontend")
        print_status "Opening shell in frontend container..."
        docker-compose exec frontend /bin/sh
        ;;
    "shell-backend")
        print_status "Opening shell in backend container..."
        docker-compose exec backend /bin/sh
        ;;
    "test")
        print_status "Running tests in frontend container..."
        docker-compose exec frontend npm run test:run
        ;;
    "deps-install")
        install_dependencies
        ;;
    "deps-update")
        update_dependencies
        ;;
    "clean")
        cleanup
        ;;
    "reset")
        reset_environment
        ;;
    "help"|*)
        show_help
        ;;
esac