#!/bin/bash

# Kubernetes Proxy Setup Script for Development
# This script helps set up kubectl proxy for local development

set -e

echo "🚀 Kubernetes Proxy Setup for Development"
echo "=========================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    echo "Please install kubectl first: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cannot connect to cluster"
    echo "Please configure kubectl to connect to your Kubernetes cluster first"
    echo "Run: kubectl config get-contexts"
    exit 1
fi

# Show current context
CURRENT_CONTEXT=$(kubectl config current-context)
echo "✅ kubectl is configured"
echo "📍 Current context: $CURRENT_CONTEXT"

# Default port
PROXY_PORT=${1:-8001}

echo ""
echo "🔧 Starting kubectl proxy on port $PROXY_PORT..."
echo "This will create a local proxy to your Kubernetes cluster that handles:"
echo "  • Authentication"
echo "  • CORS headers"
echo "  • TLS termination"
echo ""

# Check if port is already in use
if lsof -Pi :$PROXY_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port $PROXY_PORT is already in use"
    echo "Either stop the existing service or use a different port:"
    echo "  $0 8002"
    exit 1
fi

echo "🌐 Proxy will be available at: http://localhost:$PROXY_PORT"
echo ""
echo "📋 To use in the application:"
echo "  1. Add a new cluster"
echo "  2. Set Server URL: http://localhost:$PROXY_PORT"
echo "  3. Set Authentication: Token (leave empty - proxy handles auth)"
echo "  4. Test connection"
echo ""
echo "💡 Tip: Keep this terminal open while developing"
echo "Press Ctrl+C to stop the proxy"
echo ""

# Start the proxy
echo "Starting proxy..."
kubectl proxy --port=$PROXY_PORT --accept-hosts='^localhost$,^127\.0\.0\.1$,^\[::1\]$'