# Deployment

This directory contains all deployment configurations and assets for the Kubernetes Admin UI project.

> **⚡ v2.0.0 Update**: Docker builds are now **90% faster** (25-30 seconds vs 4-5 minutes)! New hybrid deployment option available.

## 📁 Directory Structure

```
deployment/
├── docker/                         # 🐳 Docker deployment (90% faster!)
│   ├── Dockerfile*                 # Optimized BuildKit containers
│   ├── docker-compose.yml          # Standard compose configuration
│   ├── docker-compose.fast.yml     # ⚡ Optimized fast development
│   ├── build-fast.sh              # Interactive build script
│   ├── README.docker-optimization.md # Complete optimization guide
│   └── .dockerignore               # Build context optimization
│
├── kub/                           # ☸️ Kubernetes deployment manifests  
│   └── k8s-deployment.yaml        # Production Kubernetes deployment
│
├── monitoring/                    # 📊 Monitoring and observability
│   ├── prometheus.yml             # Prometheus configuration
│   └── k8s-monitoring.yaml        # Kubernetes monitoring stack
│
└── README.md                      # This file
```

## 🚀 Quick Start

### ⚡ **Optimized Options (v2.0.0)**

#### 🏁 **Hybrid Setup** (Fastest - Recommended)
```bash
# 1. Fast frontend build (25 seconds)
cd deployment/docker
export DOCKER_BUILDKIT=1
docker build --cache-from docker-frontend:latest --tag docker-frontend:latest --file Dockerfile.dev-frontend ../..

# 2. Start frontend container + backend on host
docker-compose -f docker-compose.fast.yml up frontend -d
cd ../.. && npm run dev:api
```
- ✅ **90% faster builds** (25s vs 4-5 min)
- ✅ Instant hot reload
- ✅ Perfect Kubernetes access
- ✅ No CORS issues

#### ⚡ **Fast Docker Build**
```bash
cd deployment/docker/
./build-fast.sh  # Interactive optimized build
```
- ✅ BuildKit optimizations
- ✅ Smart caching
- ✅ Interactive prompts

#### 🐳 **Traditional Docker** (Optimized)
```bash
cd deployment/docker/
docker compose -f docker-compose.fast.yml up
```
- ✅ Full Docker environment
- ✅ Optimized configurations
- ✅ Better performance than v1.x

#### ☸️ **Kubernetes Deployment** (Recommended for Production)
```bash
cd deployment/kub/
kubectl apply -f .

# Optional: Add monitoring stack
kubectl apply -f ../monitoring/k8s-monitoring.yaml
```
- ✅ Production-ready
- ✅ High availability
- ✅ Auto-scaling capabilities
- ✅ Native cluster integration
- ✅ Comprehensive monitoring

## 🏗️ Architecture Overview

### 🌐 **Frontend**
- **Technology**: React 18 + Vite
- **Port**: `5173` (development) / `80` (production)
- **Container**: Static files served via nginx
- **Features**: Hot reload, optimized builds

### ⚙️ **Backend** 
- **Technology**: Express.js + Kubernetes Client
- **Port**: `3001`
- **Container**: Node.js API server
- **Features**: Kubernetes API proxy, authentication

### 📊 **Monitoring** (Integrated)
- **Technology**: Prometheus + Grafana + Alertmanager
- **Ports**: `9090` (Prometheus), `3000` (Grafana)
- **Features**: Metrics collection, dashboards, alerting
- **Coverage**: Application, infrastructure, and security metrics

## 🎯 Deployment Scenarios

### Development
- **Method**: Docker Compose
- **Features**: Hot reload, debug logging
- **Command**: `./deployment/docker/dev-docker.sh`

### Testing/Staging  
- **Method**: Kubernetes
- **Features**: Multi-replica, resource limits
- **Command**: `kubectl apply -f deployment/kub/`

### Production
- **Method**: Kubernetes + Helm (recommended)
- **Features**: HA, monitoring, security policies
- **Command**: See production deployment guide

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `API_BASE_URL` | Backend API URL | `http://localhost:3001/api` | Yes |
| `KUBERNETES_NAMESPACE` | Target K8s namespace | `default` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### Volume Mounts
- **Kubeconfig**: `~/.kube/config:/app/.kube/config`
- **Source Code**: `./src:/app/src` (development only)
- **Node Modules**: Named volume for dependency caching

## 🔒 Security Considerations

### Container Security
- ✅ Non-root user execution
- ✅ Minimal base images (Alpine)
- ✅ Multi-stage builds
- ✅ Security scanning enabled

### Kubernetes Security
- ✅ RBAC with least-privilege access
- ✅ Network policies (production)
- ✅ Pod security standards
- ✅ Secret management

## 📊 Monitoring & Logging

### Available Metrics
- Application performance metrics
- Container resource usage
- Kubernetes cluster metrics
- Custom business metrics

### Log Aggregation
- Structured logging (JSON)
- Container log forwarding
- Centralized log management
- Error alerting

## 🛠️ Development Workflow

### Local Development
1. **Native Development**: `npm run dev:full`
2. **Docker Development**: `cd deployment/docker && ./dev-docker.sh`
3. **Kubernetes Development**: `cd deployment/kub && kubectl apply -f .`

### Testing
```bash
# Unit tests
npm test

# Integration tests with Docker
docker compose -f deployment/docker/docker-compose.yml up --build
npm run test:integration

# End-to-end tests
npm run test:e2e
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   - **Docker**: Use different ports in docker-compose.yml
   - **Kubernetes**: Check service configurations

2. **Permission Errors**  
   - **Docker**: Check volume mount permissions
   - **Kubernetes**: Verify RBAC configuration

3. **Image Build Failures**
   - Clear Docker cache: `docker system prune -f`
   - Check Dockerfile syntax and dependencies

4. **Kubernetes Connection Issues**
   - Verify kubeconfig: `kubectl cluster-info`
   - Check RBAC permissions: `kubectl auth can-i list pods`

### Debug Commands
```bash
# Docker debugging
docker compose logs -f
docker compose exec frontend sh
docker stats

# Kubernetes debugging  
kubectl get pods -o wide
kubectl logs deployment/yakui-frontend -f
kubectl describe pod <pod-name>
```

## 📚 Additional Resources

- **[Docker Deployment Guide](./docker/README.md)** - Detailed Docker setup
- **[Kubernetes Deployment Guide](./kub/README.md)** - K8s configuration details
- **[Monitoring Guide](./monitoring/README.md)** - Observability and alerting setup
- **[Production Deployment](../docs/deployment/PRODUCTION_DEPLOYMENT.md)** - Production best practices
- **[Security Guide](../docs/security/)** - Security hardening instructions

## 🤝 Contributing

When adding new deployment configurations:

1. **Update documentation** in the respective README files
2. **Test thoroughly** in both development and staging environments  
3. **Follow security best practices** for all configurations
4. **Update version tags** and changelog appropriately

For more details, see the [Git Workflow Guide](../docs/guides/GIT_WORKFLOW.md).