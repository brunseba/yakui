#!/bin/bash
set -e

# Kubernetes Admin UI - Multicluster Docker Startup Script

echo "🚀 Starting Kubernetes Admin UI - Multicluster Mode"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $2 in
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️ $1${NC}" ;;
        "info") echo -e "${BLUE}ℹ️ $1${NC}" ;;
        *) echo "🔸 $1" ;;
    esac
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_status "Docker is not running. Please start Docker first." "error"
    exit 1
fi

print_status "Docker is running" "success"

# Check for available kubeconfig contexts
echo ""
echo "🔍 Detecting Kubernetes contexts..."

if command -v kubectl >/dev/null 2>&1; then
    print_status "kubectl is available" "success"
    
    # Get available contexts
    if kubectl config get-contexts >/dev/null 2>&1; then
        echo ""
        echo "📋 Available kubeconfig contexts:"
        kubectl config get-contexts --output=name | while read context; do
            if [ "$context" = "$(kubectl config current-context 2>/dev/null)" ]; then
                echo "  🎯 $context (current)"
            else
                echo "  📂 $context"
            fi
        done
        echo ""
    else
        print_status "No kubeconfig contexts found" "warning"
        print_status "The application will start in multicluster mode without default cluster" "info"
    fi
else
    print_status "kubectl not found - will use Docker mounted kubeconfig" "warning"
fi

# Check for Docker Compose
COMPOSE_CMD=""
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    print_status "Docker Compose not found" "error"
    exit 1
fi

print_status "Using: $COMPOSE_CMD" "info"

# Determine compose file to use
COMPOSE_FILE="docker-compose.yml"
if [ "$1" = "multicluster" ] || [ "$1" = "mc" ]; then
    COMPOSE_FILE="docker-compose.multicluster.yml"
    print_status "Using multicluster-specific configuration" "info"
elif [ -f "docker-compose.multicluster.yml" ] && [ ! -f "docker-compose.override.yml" ]; then
    COMPOSE_FILE="docker-compose.multicluster.yml"
    print_status "Auto-detected multicluster configuration" "info"
fi

print_status "Using compose file: $COMPOSE_FILE" "info"

# Parse additional arguments
EXTRA_ARGS=""
PROFILES=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-proxy|--proxy)
            PROFILES="$PROFILES --profile proxy"
            print_status "Enabling Kubernetes proxy server" "info"
            shift
            ;;
        --with-cache|--cache)
            PROFILES="$PROFILES --profile cache"
            print_status "Enabling Redis cache" "info"
            shift
            ;;
        --with-monitoring|--monitoring)
            PROFILES="$PROFILES --profile monitoring"
            print_status "Enabling Prometheus monitoring" "info"
            shift
            ;;
        --build)
            EXTRA_ARGS="$EXTRA_ARGS --build"
            print_status "Forcing rebuild of images" "info"
            shift
            ;;
        --detach|-d)
            EXTRA_ARGS="$EXTRA_ARGS -d"
            shift
            ;;
        multicluster|mc)
            # Already handled above
            shift
            ;;
        *)
            print_status "Unknown option: $1" "warning"
            shift
            ;;
    esac
done

echo ""
echo "🐳 Starting Docker containers..."
echo "Configuration: $COMPOSE_FILE"
echo "Profiles: ${PROFILES:-none}"
echo "Extra args: ${EXTRA_ARGS:-none}"
echo ""

# Change to the script directory
cd "$(dirname "$0")"

# Start the containers
if $COMPOSE_CMD -f $COMPOSE_FILE up $PROFILES $EXTRA_ARGS; then
    echo ""
    print_status "Kubernetes Admin UI started successfully!" "success"
    echo ""
    echo "🌐 Application URLs:"
    echo "  📱 Frontend:  http://localhost:5173"
    echo "  🔧 Backend:   http://localhost:3001/api/health"
    if [[ $PROFILES == *"proxy"* ]]; then
        echo "  🔀 K8s Proxy: http://localhost:3002/api/health"
    fi
    if [[ $PROFILES == *"cache"* ]]; then
        echo "  📊 Redis:     redis://localhost:6379"
    fi
    if [[ $PROFILES == *"monitoring"* ]]; then
        echo "  📈 Metrics:   http://localhost:9090"
    fi
    echo ""
    echo "🎯 Cluster Integration Test: http://localhost:5173/cluster/integration-test"
    echo ""
    echo "To stop the application:"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE down"
    echo ""
    echo "To view logs:"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
    
else
    echo ""
    print_status "Failed to start containers" "error"
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "  • Check Docker is running: docker info"
    echo "  • Check available contexts: kubectl config get-contexts"
    echo "  • View logs: $COMPOSE_CMD -f $COMPOSE_FILE logs"
    echo "  • Clean up: $COMPOSE_CMD -f $COMPOSE_FILE down --volumes"
    exit 1
fi