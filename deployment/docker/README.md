# Docker Deployment

This directory contains all Docker-related files for containerizing and deploying the Kubernetes Admin UI.

## 📁 Files Overview

### 🐳 Dockerfiles
- **`Dockerfile`** - Production multi-stage Docker build
- **`Dockerfile.dev-backend`** - Development backend container
- **`Dockerfile.dev-frontend`** - Development frontend container

### 🔧 Docker Compose
- **`docker-compose.yml`** - Main Docker Compose configuration
- **`docker-compose.override.yml`** - Local development overrides
- **`docker-compose.override.yml.backup`** - Backup of override configuration

### ⚙️ Configuration
- **`.dockerignore`** - Files excluded from Docker build context
- **`.env.docker`** - Environment variables for Docker containers
- **`dev-docker.sh`** - Development Docker automation script

## 🚀 Quick Start

### Production Deployment
```bash
# Build and start production containers
docker compose up --build -d

# View logs
docker compose logs -f

# Stop containers
docker compose down
```

### Development with Docker
```bash
# Start development environment
./dev-docker.sh

# Or manually:
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## 📋 Container Architecture

### 🌐 Frontend Container
- **Base**: `node:18-alpine`
- **Build**: Multi-stage with Vite production build
- **Port**: `5173` (development) / `80` (production)
- **Features**: Static file serving with nginx

### ⚙️ Backend Container  
- **Base**: `node:18-alpine`
- **Port**: `3001`
- **Features**: Express API server with Kubernetes client
- **Volumes**: Kubeconfig mounted for cluster access

### 🔄 Services
```yaml
services:
  frontend:     # React frontend
  backend:      # Express API server
  prometheus:   # Metrics collection (if monitoring enabled)
```

## 🛠️ Configuration

### Environment Variables
The `.env.docker` file contains:
```env
NODE_ENV=production
API_BASE_URL=http://backend:3001/api
KUBERNETES_NAMESPACE=default
LOG_LEVEL=info
```

### Port Mapping
- **Frontend**: `5173:5173` (dev) / `80:80` (prod)
- **Backend**: `3001:3001`
- **Monitoring**: `9090:9090` (if enabled)

## 📊 Monitoring Integration

Optional monitoring stack with:
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards (configured separately)
- **Node Exporter** - System metrics

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   docker compose down
   lsof -ti:5173,3001 | xargs kill
   ```

2. **Permission errors**:
   ```bash
   # Check kubeconfig permissions
   ls -la ~/.kube/config
   ```

3. **Build failures**:
   ```bash
   # Clean build
   docker compose down --volumes
   docker system prune -f
   docker compose up --build
   ```

### Debug Commands
```bash
# Check container status
docker compose ps

# View container logs
docker compose logs [service-name]

# Execute commands in container
docker compose exec frontend sh
docker compose exec backend sh

# Check resource usage
docker stats
```

## 🔒 Security Considerations

- Containers run as non-root users
- Secrets managed through Docker secrets (production)
- Network isolation between services
- Regular base image updates required

## 📝 Development Notes

- Hot reload enabled in development mode
- Source code mounted as volumes for live editing
- Separate containers for frontend/backend development
- Environment-specific configurations in override files

For production deployment, see the [Production Deployment Guide](../docs/deployment/PRODUCTION_DEPLOYMENT.md).