# Docker Build Optimization

This directory contains optimized Docker configurations for faster development builds and better performance.

## 🚀 Fast Build Options

### Option 1: Hybrid Setup (Recommended)
- **Frontend**: Run in Docker container
- **Backend**: Run on host machine
- **Build time**: ~30 seconds
- **Hot reload**: Instant

```bash
# 1. Build and start frontend container
export DOCKER_BUILDKIT=1
docker build --build-arg BUILDKIT_INLINE_CACHE=1 \
  --cache-from docker-frontend:latest \
  --tag docker-frontend:latest \
  --file Dockerfile.dev-frontend ../..

docker-compose -f docker-compose.fast.yml up frontend -d

# 2. Start backend on host (much faster)
cd ../.. && npm run dev:api
```

### Option 2: Fast Build Script
```bash
# Interactive script with optimizations
./build-fast.sh

# Follow prompts to build frontend/backend
```

### Option 3: Full Docker with Cache
```bash
# Use optimized compose file
docker-compose -f docker-compose.fast.yml --profile backend up
```

## 🏗️ Optimizations Implemented

### 1. **Layer Caching**
- Dependencies installed before copying source code
- BuildKit cache mounts for npm installs
- Multi-stage approach for better caching

### 2. **BuildKit Features**
```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci && \
    npm cache clean --force
```

### 3. **Bind Mounts for Development**
- Source code mounted for instant hot reload
- Dependencies in named volumes (faster)
- Cached mount options for better performance

### 4. **Optimized Dockerfiles**
- Early user switching to avoid ownership issues
- Combined RUN commands to reduce layers
- Proper COPY ordering for better caching

### 5. **Smart .dockerignore**
- Excludes unnecessary files
- Reduces build context size
- Faster file transfers

## ⚡ Performance Comparison

| Setup | Build Time | Hot Reload | Kubernetes Access |
|-------|------------|------------|------------------|
| Original | ~4-5 minutes | Slow | ❌ CORS issues |
| Optimized Docker | ~30 seconds | Fast | ✅ Works |
| Hybrid (Frontend Docker) | ~25 seconds | Instant | ✅ Works |

## 🔧 Configuration Files

- `docker-compose.fast.yml` - Optimized compose configuration
- `Dockerfile.dev-frontend` - Optimized frontend image
- `Dockerfile.dev-backend` - Optimized backend image
- `build-fast.sh` - Interactive build script

## 📊 Current Setup Status

✅ **Frontend Container**:
- Vite dev server accessible on http://localhost:5173
- Hot reload with bind mounts
- BuildKit caching enabled

✅ **Backend Host**:
- Express API on http://localhost:3001
- Direct Kubernetes cluster access
- Instant restart and debugging

✅ **Authentication**:
- CORS properly configured
- Kubernetes API connectivity working
- Login endpoint returning 200 OK

## 🛠️ Troubleshooting

### Build Issues
```bash
# Clear Docker cache if needed
docker system prune -f

# Rebuild with no cache
docker build --no-cache --file Dockerfile.dev-frontend ../..
```

### Permission Issues
```bash
# Fix ownership if needed
sudo chown -R $(whoami) ../../app ../../config ../../tools
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3001
lsof -i :5173

# Kill processes if needed
pkill -f dev-server
pkill -f vite
```