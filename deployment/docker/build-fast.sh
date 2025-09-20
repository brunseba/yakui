#!/bin/bash

# Fast Docker build script with optimizations
set -e

echo "🚀 Fast Docker Build Script"
echo "=========================="

# Enable Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build arguments for caching
BUILD_ARGS="--build-arg BUILDKIT_INLINE_CACHE=1"

# Build frontend image with cache
echo "📦 Building optimized frontend image..."
docker build $BUILD_ARGS \
  --cache-from docker-frontend:latest \
  --tag docker-frontend:latest \
  --file Dockerfile.dev-frontend \
  ../..

echo "✅ Frontend build complete"

# Ask if user wants to build backend too
read -p "🤔 Build backend image too? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Building optimized backend image..."
    docker build $BUILD_ARGS \
      --cache-from docker-backend:latest \
      --tag docker-backend:latest \
      --file Dockerfile.dev-backend \
      ../..
    echo "✅ Backend build complete"
fi

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "Quick start options:"
echo "1. Frontend only:  docker-compose -f docker-compose.fast.yml up frontend"
echo "2. Full stack:     docker-compose -f docker-compose.fast.yml --profile backend up"
echo "3. Regular mode:   docker-compose up"