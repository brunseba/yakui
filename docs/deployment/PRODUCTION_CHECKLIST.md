# Production Deployment Checklist

## Overview

This checklist ensures your Kubernetes Admin UI deployment is production-ready with all hardcoded values removed and proper configuration management in place.

## Pre-Deployment Requirements

### ℹ️ Kubernetes Context Behavior

The application has flexible Kubernetes context handling:

- **If CLUSTER_CONTEXT is NOT set**: Uses your current kubectl context (`kubectl config current-context`)
- **If CLUSTER_CONTEXT is SET**: Switches to and uses the specified context
- **Server environments**: Can run without setting CLUSTER_CONTEXT if kubectl is configured
- **Local development**: Can override context by setting CLUSTER_CONTEXT environment variable

### ✅ Environment Configuration

#### Backend Configuration (REQUIRED)
- [ ] **CLUSTER_CONTEXT** environment variable is set to your production Kubernetes context (OPTIONAL - uses current kubectl context if not set)
- [ ] Verify cluster connectivity: `kubectl get nodes` (or `kubectl config use-context $CLUSTER_CONTEXT && kubectl get nodes` if using explicit context)
- [ ] **API_PORT** is set (default: 3001)
- [ ] **API_TIMEOUT** is appropriate for your cluster (default: 30000ms)

#### Frontend Configuration (REQUIRED)  
- [ ] **VITE_API_BASE_URL** points to your production backend API
- [ ] **VITE_API_TIMEOUT** is set appropriately (default: 30000ms)
- [ ] **VITE_API_MAX_RETRIES** is configured (default: 3)
- [ ] **VITE_API_RETRY_DELAY** is set (default: 1000ms)

#### Performance Configuration (RECOMMENDED)
- [ ] **MAX_RESOURCES_PER_TYPE** set based on cluster size (recommended: 100-500)
- [ ] **MAX_NAMESPACES_TO_SCAN** configured for your namespace count (recommended: 10-50)
- [ ] **MAX_NODES_TO_INCLUDE** set based on node count (recommended: 50-200)
- [ ] **MAX_CRD_INSTANCES_PER_NS** configured (recommended: 5-20)
- [ ] **MAX_CRD_SAMPLE_INSTANCES** set (recommended: 10-50)

### ✅ Security Configuration

- [ ] **ENABLE_VERBOSE_LOGGING** set to `false` for production
- [ ] **NODE_ENV** set to `production`
- [ ] Remove any development-specific configurations
- [ ] Verify RBAC permissions for the cluster context
- [ ] Ensure API endpoints are properly secured
- [ ] Validate CORS configuration for production domains

### ✅ Resource Management

- [ ] Core resources configuration file exists: `/config/core-resources.json`
- [ ] Configuration file is properly formatted and complete
- [ ] Fallback resources are appropriate for your cluster
- [ ] Custom resource definitions are accessible

## Deployment Steps

### 1. Configuration Validation

```bash
# 1. Copy and configure environment variables
cp .env.example .env.production
# Edit .env.production with your values

# 2. Set cluster context (optional)
# If you want to use a specific context:
# export CLUSTER_CONTEXT=your-production-context
# Or let it use the current kubectl context

# 3. Validate cluster connectivity
kubectl get nodes
kubectl get namespaces
kubectl get crds

# 4. Test backend startup
node tools/dev-server.cjs
```

### 2. Frontend Build

```bash
# 1. Set production environment
cp .env.production .env.local

# 2. Build frontend with production config
npm run build

# 3. Verify build output
ls -la dist/
```

### 3. Backend Deployment

```bash
# 1. Set production environment variables (optional)
# export CLUSTER_CONTEXT=your-production-context  # Optional - uses current context if not set
export API_PORT=3001
export ENABLE_VERBOSE_LOGGING=false

# 2. Start backend server
npm run dev:api

# 3. Verify server startup logs for configuration validation
# Look for "Using current kubectl context" or "Using explicit cluster context"
```

### 4. Integration Testing

```bash
# Test critical endpoints
curl -f http://your-api-url/api/health
curl -f http://your-api-url/api/version
curl -f http://your-api-url/api/namespaces
curl -f http://your-api-url/api/dependencies/graph
```

## Post-Deployment Verification

### ✅ Functional Testing

- [ ] Application starts without configuration errors
- [ ] Dashboard loads and displays cluster information
- [ ] Resource management functions work properly
- [ ] Dependency browser displays resource relationships
- [ ] Navigation between components functions correctly
- [ ] Error handling works appropriately

### ✅ Performance Verification

- [ ] Initial page load time is acceptable (< 5 seconds)
- [ ] Resource queries complete within timeout limits
- [ ] Dependency graph renders for your cluster size
- [ ] Memory usage remains stable during operation
- [ ] API response times are within acceptable ranges

### ✅ Security Verification

- [ ] No hardcoded credentials or contexts in logs
- [ ] Verbose logging is disabled
- [ ] API endpoints require proper authentication
- [ ] CORS is configured for production domains only
- [ ] No development-specific debugging information exposed

## Monitoring and Maintenance

### Recommended Monitoring

```bash
# Backend health monitoring
curl -f http://your-api-url/api/health

# Check configuration status
grep "Configuration validation" server-logs.txt

# Monitor resource usage
ps aux | grep node
free -h
```

### Performance Tuning

If you encounter performance issues, consider adjusting these values:

```bash
# For large clusters (>500 resources)
MAX_RESOURCES_PER_TYPE=50
MAX_NAMESPACES_TO_SCAN=5
MAX_NODES_TO_INCLUDE=25

# For small clusters (<100 resources)  
MAX_RESOURCES_PER_TYPE=200
MAX_NAMESPACES_TO_SCAN=20
MAX_NODES_TO_INCLUDE=100

# For high-latency networks
API_TIMEOUT=60000
VITE_API_TIMEOUT=60000
```

## Troubleshooting

### Common Issues

**❌ "Specified CLUSTER_CONTEXT 'xxx' not found in kubeconfig"**
```bash
# Solution: Check available contexts and set a valid one
kubectl config get-contexts
export CLUSTER_CONTEXT=your-valid-context-name
# Or remove CLUSTER_CONTEXT to use current context
unset CLUSTER_CONTEXT
```

**❌ "Failed to connect to Kubernetes cluster"**
```bash
# Solution: Verify cluster connectivity
kubectl config use-context $CLUSTER_CONTEXT
kubectl get nodes
# Check if cluster is accessible and credentials are valid
```

**❌ "VITE_API_BASE_URL not set, using localhost fallback"**
```bash
# Solution: Set production API URL
export VITE_API_BASE_URL=https://your-api-domain.com/api
# Rebuild frontend
npm run build
```

**❌ Dependency graph shows no resources**
```bash
# Check backend logs for dependency analysis errors
# Verify RBAC permissions
kubectl auth can-i get pods --all-namespaces
kubectl auth can-i get services --all-namespaces
kubectl auth can-i get deployments --all-namespaces
```

### Performance Issues

**🐌 Slow initial load**
- Reduce `MAX_RESOURCES_PER_TYPE`
- Decrease `MAX_NAMESPACES_TO_SCAN`
- Increase `API_TIMEOUT` for high-latency networks

**🐌 Dependency graph takes too long**
- Lower `MAX_NODES_TO_INCLUDE`
- Reduce `MAX_CRD_SAMPLE_INSTANCES`
- Consider namespace-scoped queries instead of cluster-wide

**💾 High memory usage**
- Decrease resource limits
- Enable resource pagination (future enhancement)
- Monitor for memory leaks in long-running sessions

## Success Criteria

Your deployment is successful when:

✅ **No Configuration Errors**: Application starts without any configuration validation errors  
✅ **Proper Resource Discovery**: All expected resources are visible and accessible  
✅ **Functional Dependency Analysis**: Resource relationships are correctly identified and visualized  
✅ **Stable Performance**: Response times are consistent and within acceptable ranges  
✅ **Secure Operation**: No sensitive information is exposed in logs or client-side code  
✅ **Production Monitoring**: Health checks and basic monitoring are functional

## Rollback Plan

If deployment issues occur:

1. **Immediate**: Revert to previous working configuration
2. **Investigate**: Check logs for specific error messages
3. **Fix**: Address configuration issues using this checklist
4. **Test**: Verify fixes in staging environment first
5. **Redeploy**: Apply fixes to production with validation

## Support Resources

- Configuration Reference: `.env.example`
- Development Documentation: `/docs/development/`
- Troubleshooting Guide: This document's troubleshooting section
- Issue Tracker: Report bugs and configuration issues

---

**Note**: This checklist represents the production readiness achieved by the remediation plan. All hardcoded values have been removed and replaced with configurable alternatives.