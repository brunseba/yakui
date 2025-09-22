# Kubernetes Admin UI - Multicluster Docker Setup

This directory contains Docker configurations for running the Kubernetes Admin UI with full multicluster support.

## 🚀 Quick Start

### Option 1: Automatic Detection (Recommended)
```bash
# Let the system auto-detect your kubeconfig contexts
./start-multicluster.sh
```

### Option 2: Manual Docker Compose
```bash
# Start with the default configuration
docker compose -f docker-compose.yml up

# Or use the multicluster-specific configuration
docker compose -f docker-compose.multicluster.yml up
```

## 📋 Prerequisites

### Required
- **Docker** (with Docker Compose)
- **kubectl** (recommended for context detection)

### Optional
- Multiple Kubernetes clusters configured in your kubeconfig
- Minikube, k3s, or other local Kubernetes setups

## 🎯 Multicluster Features

### Backend Auto-Detection
- Automatically detects available kubeconfig contexts
- Gracefully handles missing or invalid contexts
- Supports dynamic cluster switching through the UI
- Works with various cluster types (minikube, k3s, kind, etc.)

### Frontend Integration
- Dynamic cluster selector in the UI
- Real-time cluster switching without page refresh
- Integration testing dashboard at `/cluster/integration-test`
- Comprehensive multicluster workflow validation

### Enhanced Security
- All cluster authentication handled by the backend
- No client-side credential storage
- Secure kubeconfig handling with proper permissions
- TLS verification handling for development clusters

## 🐳 Docker Configurations

### 1. Standard Configuration (`docker-compose.yml`)
- Updated to use the multicluster backend
- Backward compatible with single-cluster setups
- Auto-detection enabled by default

### 2. Multicluster Configuration (`docker-compose.multicluster.yml`)
- Optimized for multicluster scenarios
- Additional volume mounts for various kubeconfig locations
- Performance tuning for multiple clusters
- Optional services (proxy, cache, monitoring)

### 3. Enhanced Backend (`Dockerfile.multicluster-backend`)
- Includes kubectl for context detection
- Startup script with cluster validation
- Graceful error handling for missing contexts
- Environment variable configuration

## 🎮 Usage Examples

### Basic Startup
```bash
# Start with auto-detection
./start-multicluster.sh

# Start in background
./start-multicluster.sh -d

# Force rebuild
./start-multicluster.sh --build
```

### With Optional Services
```bash
# Enable Kubernetes proxy server
./start-multicluster.sh --with-proxy

# Enable Redis caching
./start-multicluster.sh --with-cache

# Enable Prometheus monitoring
./start-multicluster.sh --with-monitoring

# Enable all optional services
./start-multicluster.sh --with-proxy --with-cache --with-monitoring
```

### Direct Docker Compose
```bash
# Standard startup
docker compose up

# With specific profiles
docker compose --profile proxy --profile cache up

# Background with build
docker compose up -d --build

# View logs
docker compose logs -f backend
```

## 🔧 Configuration

### Environment Variables

#### Backend Configuration
```bash
# Multicluster settings
ENABLE_MULTICLUSTER=true          # Enable multicluster support
KUBECONFIG_AUTO_DETECT=true       # Auto-detect available contexts
CLUSTER_CONTEXT=                  # Specific context (empty = auto-detect)

# Performance tuning
MAX_RESOURCES_PER_TYPE=50         # Limit resources per type
MAX_NAMESPACES_TO_SCAN=5          # Limit namespace scanning
MAX_NODES_TO_INCLUDE=25           # Limit node count
MAX_CRD_INSTANCES_PER_NS=3        # Limit CRD instances per namespace
```

#### Frontend Configuration
```bash
# Multicluster UI settings
VITE_MULTICLUSTER_MODE=true       # Enable multicluster UI features
VITE_CLUSTER_CONTEXT=             # Empty for backend-managed contexts
```

### Volume Mounts

The multicluster configuration includes multiple kubeconfig locations:

```yaml
volumes:
  - ~/.kube:/home/node/.kube:ro           # Standard kubeconfig
  - ~/.minikube:/home/node/.minikube:ro   # Minikube configs
  - ~/.k3s:/home/node/.k3s:ro             # k3s configs
```

## 🔍 Troubleshooting

### Common Issues

#### 1. No Contexts Found
```bash
# Check available contexts
kubectl config get-contexts

# Set a default context
kubectl config use-context your-context-name
```

#### 2. Context Not Found Error
```
❌ Failed to load kubeconfig: Context 'kind-krateo-quickstart' not found. 
Available contexts: admin@talos-default
```

**Solution:** The system will automatically detect available contexts. Clear the `CLUSTER_CONTEXT` environment variable:

```bash
# In docker-compose.yml
environment:
  - CLUSTER_CONTEXT=  # Leave empty for auto-detection
```

#### 3. Backend Health Check Fails
```bash
# Check backend logs
docker compose logs backend

# Test health endpoint directly
curl http://localhost:3001/api/health

# Check if kubeconfig is mounted correctly
docker compose exec backend ls -la /home/node/.kube/
```

#### 4. Permission Issues
```bash
# Fix kubeconfig permissions
chmod 600 ~/.kube/config

# Restart containers
docker compose restart backend
```

### Debug Commands

```bash
# View all logs
docker compose logs -f

# Check backend startup
docker compose logs backend | grep "Starting"

# Test cluster connectivity
curl http://localhost:3001/api/cluster/current

# Check available contexts from container
docker compose exec backend kubectl config get-contexts
```

## 🧪 Testing

### Integration Testing Dashboard
Visit `http://localhost:5173/cluster/integration-test` to run comprehensive tests:

1. **Backend Authentication Tests**
   - Current cluster retrieval
   - Cluster switching functionality
   - Connectivity testing

2. **Frontend Integration Tests**
   - Cluster loading from service
   - Frontend cluster switching
   - Backend-frontend synchronization

3. **API Routing Tests**
   - Cluster context verification
   - Kubernetes API access
   - Resource retrieval

4. **Multicluster Workflow Tests**
   - Multiple cluster access
   - Cross-cluster switching
   - Context isolation

### Manual Testing Steps

1. **Start the application:**
   ```bash
   ./start-multicluster.sh
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Check cluster detection:**
   ```bash
   curl http://localhost:3001/api/cluster/current
   ```

4. **Access frontend:**
   Open `http://localhost:5173` in your browser

5. **Test cluster switching:**
   - Go to cluster management page
   - Try switching between available contexts
   - Verify resources update correctly

## 📊 Monitoring

### Health Checks
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:5173`
- K8s Proxy: `http://localhost:3002/api/health` (if enabled)

### Optional Services
- **Redis Cache:** `redis://localhost:6379`
- **Prometheus:** `http://localhost:9090`

### Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Follow startup logs
docker compose logs -f backend | grep -E "(Starting|Available|Error)"
```

## 🔄 Updates and Maintenance

### Updating Images
```bash
# Rebuild with latest code
./start-multicluster.sh --build

# Or manually
docker compose build --no-cache
docker compose up
```

### Cleanup
```bash
# Stop and remove containers
docker compose down

# Remove volumes (careful - this removes cached data)
docker compose down --volumes

# Clean up images
docker system prune -f
```

### Backup Configuration
```bash
# Backup your kubeconfig
cp ~/.kube/config ~/.kube/config.backup

# Export Docker environment
docker compose config > docker-compose.resolved.yml
```

## 🤝 Contributing

When making changes to the multicluster configuration:

1. Test with multiple cluster types (minikube, k3s, kind)
2. Verify graceful degradation when no contexts are available
3. Update documentation for new environment variables
4. Test the integration dashboard thoroughly
5. Ensure backward compatibility with single-cluster setups

## 📚 Additional Resources

- [Multicluster Integration Documentation](../../docs/MULTICLUSTER_INTEGRATION.md)
- [Backend API Documentation](../../tools/dev-server.cjs)
- [Frontend Integration Guide](../../app/src/services/backendClusterService.ts)
- [Docker Compose Reference](https://docs.docker.com/compose/)

---

**Need help?** Check the troubleshooting section above or review the application logs for detailed error messages.