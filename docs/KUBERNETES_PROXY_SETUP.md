# Kubernetes API Proxy Setup - Application Evolution

## Overview

This application now includes a **built-in proxy server** to solve CORS issues when connecting to Kubernetes clusters. Instead of relying on external tools, the application provides an integrated solution that automatically handles:

- ✅ CORS headers and cross-origin requests
- ✅ Secure authentication handling
- ✅ Automatic fallback between proxy and direct connections
- ✅ Cluster registration and management
- ✅ Real-time connection testing and logging

## The CORS Issue

The error you're seeing:
```
Health check failed: NetworkError when attempting to fetch resource.
```

This happens because:
1. **CORS Policy**: Kubernetes API servers don't allow cross-origin requests from browsers
2. **Security**: This is intentional security behavior to prevent malicious websites from accessing your clusters
3. **Browser Restrictions**: Modern browsers enforce CORS policies strictly

## Integrated Solution (Recommended)

### New: Built-in Proxy Server

The application now includes an integrated proxy server that automatically handles CORS and authentication:

```bash
# Start both the proxy server and frontend application
npm run dev:with-proxy
```

This single command:
1. ✅ Starts the Kubernetes proxy server (port 3001)
2. ✅ Starts the frontend application (port 5173)
3. ✅ Configures automatic CORS handling
4. ✅ Enables smart connection fallbacks

### How It Works

1. **Automatic Detection**: The app detects if the proxy server is available
2. **Smart Routing**: Tries proxy first, falls back to direct connection if needed
3. **Secure Registration**: Clusters are registered with the proxy securely
4. **Real-time Logging**: See exactly what's happening during connection tests

### Option 2: kubectl port-forward

Forward specific services through kubectl:

```bash
# Forward the Kubernetes API server
kubectl port-forward --namespace kube-system svc/kubernetes 8443:443

# Then use: https://localhost:8443
```

### Option 3: Development Proxy Server

Create a custom proxy server for development:

```javascript
// dev-proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

app.use('/api', createProxyMiddleware({
  target: 'https://your-k8s-cluster.com',
  changeOrigin: true,
  secure: false, // Set to true for production
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
}));

app.listen(3001, () => {
  console.log('Proxy server running on http://localhost:3001');
});
```

### Option 4: Configure API Server CORS (Not Recommended)

For testing only, you can configure your API server with CORS headers:

```yaml
# In your API server configuration
apiServer:
  extraArgs:
    cors-allowed-origins: "http://localhost:5173,http://localhost:3000"
```

⚠️ **Warning**: Never enable CORS on production clusters!

## Recommended Development Workflow

### 1. Using kubectl proxy (Easiest)

```bash
# Terminal 1: Start kubectl proxy
kubectl proxy --port=8001

# Terminal 2: Start your dev server
npm run dev
```

In your application, add a cluster with:
- **Name**: `local-proxy`
- **Server URL**: `http://localhost:8001`
- **Authentication**: Select "Token" but leave token empty (proxy handles auth)

### 2. Using a real cluster (with proper setup)

For production-like testing, use a cluster that supports CORS or set up a proper proxy.

## Environment Variables for Development

Create a `.env.development` file:

```env
VITE_K8S_PROXY_URL=http://localhost:8001
VITE_K8S_DEFAULT_NAMESPACE=default
VITE_ENABLE_CORS_WARNINGS=true
```

## Testing Your Setup

1. Start kubectl proxy: `kubectl proxy`
2. Test the proxy: `curl http://localhost:8001/api/v1/namespaces`
3. Add the proxy URL as a cluster in the application
4. Test the connection - it should work without CORS errors

## Production Considerations

For production deployments:

1. **Use a backend proxy**: Never make direct API calls from browsers
2. **Implement authentication**: Use proper OAuth/OIDC flows
3. **API Gateway**: Route requests through a controlled API gateway
4. **Service Mesh**: Use service mesh for internal cluster communication

## Common Issues and Solutions

### Issue: "NetworkError when attempting to fetch"
**Solution**: Use kubectl proxy or a development proxy server

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solution**: This is expected behavior. Use a proxy solution.

### Issue: "Failed to fetch"
**Solution**: Check if the cluster URL is correct and accessible

### Issue: Authentication errors with proxy
**Solution**: Ensure kubectl is configured with proper credentials

## Alternative Testing Approaches

If you can't set up a proxy, you can:

1. **Mock the API responses** for UI development
2. **Use postman/curl** for API testing
3. **Create integration tests** that run in Node.js (no CORS restrictions)
4. **Use browser extensions** that disable CORS (for development only)

Remember: CORS restrictions exist for security reasons. In production, always use proper backend services to communicate with Kubernetes APIs.