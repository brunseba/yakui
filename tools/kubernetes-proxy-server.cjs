#!/usr/bin/env node

/**
 * Kubernetes Proxy Server
 * 
 * This server acts as a proxy between the frontend and Kubernetes clusters
 * to handle CORS, authentication, and provide secure API access.
 */

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.K8S_PROXY_PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Enable CORS for the frontend
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory cluster registry
const clusterRegistry = new Map();

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    clusters: clusterRegistry.size
  });
});

// Register a cluster
app.post('/api/clusters', (req, res) => {
  try {
    const { id, name, server, auth } = req.body;
    
    if (!id || !server || !auth) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, server, auth' 
      });
    }

    // Store cluster configuration securely
    clusterRegistry.set(id, {
      id,
      name,
      server,
      auth,
      registeredAt: new Date().toISOString(),
    });

    console.log(`Registered cluster: ${name} (${id})`);
    res.json({ registered: true, clusterId: id });
  } catch (error) {
    console.error('Error registering cluster:', error);
    res.status(500).json({ error: 'Failed to register cluster' });
  }
});

// Unregister a cluster
app.delete('/api/clusters/:clusterId', (req, res) => {
  try {
    const { clusterId } = req.params;
    
    if (clusterRegistry.has(clusterId)) {
      const cluster = clusterRegistry.get(clusterId);
      clusterRegistry.delete(clusterId);
      console.log(`Unregistered cluster: ${cluster.name} (${clusterId})`);
      res.json({ unregistered: true });
    } else {
      res.status(404).json({ error: 'Cluster not found' });
    }
  } catch (error) {
    console.error('Error unregistering cluster:', error);
    res.status(500).json({ error: 'Failed to unregister cluster' });
  }
});

// List registered clusters
app.get('/api/clusters', (req, res) => {
  try {
    const clusters = Array.from(clusterRegistry.values()).map(cluster => ({
      id: cluster.id,
      name: cluster.name,
      server: cluster.server,
      registeredAt: cluster.registeredAt,
    }));
    
    res.json({ clusters });
  } catch (error) {
    console.error('Error listing clusters:', error);
    res.status(500).json({ error: 'Failed to list clusters' });
  }
});

// Proxy requests to Kubernetes clusters
app.use('/api/proxy/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = clusterRegistry.get(clusterId);
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    // Extract the Kubernetes API path
    const kubernetesPath = req.originalUrl.replace(`/api/proxy/${clusterId}`, '') || '/';
    const targetUrl = `${cluster.server}${kubernetesPath}`;

    console.log(`Proxying to: ${targetUrl}`);

    // Prepare headers based on authentication method
    const headers = {
      'Content-Type': 'application/json',
    };

    // Handle different authentication methods
    switch (cluster.auth.type) {
      case 'token':
        if (cluster.auth.token) {
          headers['Authorization'] = `Bearer ${cluster.auth.token}`;
        }
        break;
      
      case 'kubeconfig':
        // Parse kubeconfig for authentication
        if (cluster.auth.kubeconfig) {
          const authInfo = parseKubeconfigAuth(cluster.auth.kubeconfig);
          if (authInfo.token) {
            headers['Authorization'] = `Bearer ${authInfo.token}`;
          }
        }
        break;
      
      case 'serviceaccount':
        if (cluster.auth.serviceAccount?.token) {
          headers['Authorization'] = `Bearer ${cluster.auth.serviceAccount.token}`;
        }
        break;
      
      case 'certificate':
        // For certificate auth, we would need to configure HTTPS agent
        // This is more complex and might require additional setup
        console.warn('Certificate authentication not fully implemented in proxy');
        break;
    }

    // Create HTTP/HTTPS request
    const isHttps = cluster.server.startsWith('https://');
    const requestModule = isHttps ? https : require('http');
    
    const options = {
      method: req.method,
      headers: {
        ...headers,
        ...req.headers,
        host: undefined, // Remove host header to avoid conflicts
      },
    };

    // For HTTPS, handle self-signed certificates
    if (isHttps) {
      options.rejectUnauthorized = false; // For development - be careful in production!
    }

    const proxyReq = requestModule.request(targetUrl, options, (proxyRes) => {
      // Set CORS headers
      res.set('Access-Control-Allow-Origin', FRONTEND_URL);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Copy response headers
      Object.keys(proxyRes.headers).forEach(key => {
        if (key.toLowerCase() !== 'set-cookie') {
          res.set(key, proxyRes.headers[key]);
        }
      });

      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      res.status(502).json({ 
        error: 'Bad Gateway', 
        message: error.message,
        cluster: cluster.name 
      });
    });

    // Forward request body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      proxyReq.write(JSON.stringify(req.body));
    }

    proxyReq.end();

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal proxy error' });
  }
});

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', FRONTEND_URL);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }
  next();
});

// Simple kubeconfig parser for authentication extraction
function parseKubeconfigAuth(kubeconfig) {
  try {
    const lines = kubeconfig.split('\n');
    let token = null;
    
    // Look for token in kubeconfig
    for (const line of lines) {
      if (line.trim().startsWith('token:')) {
        token = line.split('token:')[1]?.trim().replace(/['"]/g, '');
        break;
      }
    }
    
    return { token };
  } catch (error) {
    console.error('Error parsing kubeconfig:', error);
    return {};
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Kubernetes Proxy Server Started');
  console.log('=====================================');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  POST   /api/clusters           - Register cluster');
  console.log('  DELETE /api/clusters/:id       - Unregister cluster');
  console.log('  GET    /api/clusters           - List clusters');
  console.log('  *      /api/proxy/:id/*        - Proxy to cluster');
  console.log('');
  console.log('💡 Usage:');
  console.log('  1. Start this proxy server');
  console.log('  2. Configure clusters in the application');
  console.log('  3. All API requests will be proxied through this server');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down proxy server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down proxy server...');
  process.exit(0);
});