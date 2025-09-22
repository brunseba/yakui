const express = require('express');
const cors = require('cors');
const { KubeconfigManager } = require('./kubeconfig-manager.cjs');
let k8s; // Will be loaded dynamically

const app = express();
const port = process.env.API_PORT || 3001;
const nodeEnv = process.env.NODE_ENV || 'development';
const enableVerboseLogging = nodeEnv === 'development';
const apiTimeout = parseInt(process.env.API_TIMEOUT || '30000');
// Get cluster context - use environment variable or fall back to current context
let clusterContext = process.env.CLUSTER_CONTEXT;
const enableAutoDetect = process.env.KUBECONFIG_AUTO_DETECT === 'true';
const enableMulticluster = process.env.ENABLE_MULTICLUSTER === 'true';

if (!clusterContext && enableAutoDetect) {
  console.log('🔍 CLUSTER_CONTEXT not set, auto-detecting available contexts...');
  console.log('   Multicluster mode enabled, will use first available context');
} else if (!clusterContext) {
  console.log('ℹ️  CLUSTER_CONTEXT not set, will use current kubectl context');
  console.log('   You can explicitly set CLUSTER_CONTEXT to override this behavior');
}

// Configurable performance limits
const MAX_RESOURCES_PER_TYPE = parseInt(process.env.MAX_RESOURCES_PER_TYPE || '100');
const MAX_NAMESPACES_TO_SCAN = parseInt(process.env.MAX_NAMESPACES_TO_SCAN || '10');
const MAX_NODES_TO_INCLUDE = parseInt(process.env.MAX_NODES_TO_INCLUDE || '50');
const MAX_CRD_INSTANCES_PER_NS = parseInt(process.env.MAX_CRD_INSTANCES_PER_NS || '5');
const MAX_CRD_SAMPLE_INSTANCES = parseInt(process.env.MAX_CRD_SAMPLE_INSTANCES || '10');

// Enable CORS for frontend - allow any localhost port and Docker containers for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow Docker container origins for development
    if (origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow host.docker.internal for development
    if (origin.match(/^http:\/\/host\.docker\.internal:\d+$/)) {
      return callback(null, true);
    }
    
    // For production, you would be more restrictive here
    log('CORS rejected origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin) {
    log(`Request from origin: ${origin} to ${req.method} ${req.path}`);
  }
  next();
});

// Initialize Kubernetes client and kubeconfig manager
let kc, coreV1Api, appsV1Api, rbacV1Api, apiExtensionsV1Api, metricsV1Api, customObjectsApi;
let kubeconfigManager;
let currentApis = null;

// Configurable logging
const log = (message, data = '') => {
  if (enableVerboseLogging) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [K8s Dev Server] ${message}`, data);
  }
};

// Load core resources configuration
let coreResourcesConfig = [];
try {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '../config/core-resources.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  coreResourcesConfig = JSON.parse(configData).coreResources;
  log('Loaded core resources configuration:', `${coreResourcesConfig.length} resources`);
} catch (error) {
  console.warn('Warning: Failed to load core resources config, using fallback:', error.message);
  coreResourcesConfig = []; // Will use dynamic API discovery as fallback
}

const logAlways = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [K8s Dev Server] ${message}`, data);
};

// Initialize Kubernetes APIs
const initializeK8sApis = async (kubeconfigOptions = null) => {
  try {
    // Dynamic import of the ES module
    if (!k8s) {
      log('Loading Kubernetes client module...');
      k8s = await import('@kubernetes/client-node');
    }
    
    // Initialize kubeconfig manager if not already done
    if (!kubeconfigManager) {
      kubeconfigManager = new KubeconfigManager();
      await kubeconfigManager.initialize(k8s);
    }
    
    // Auto-detect available contexts if enabled
    if (enableAutoDetect && !clusterContext && !kubeconfigOptions) {
      console.log('🔍 Auto-detecting available kubeconfig contexts...');
      const availableContexts = kubeconfigManager.getAvailableContexts();
      if (availableContexts.contexts.length > 0) {
        clusterContext = availableContexts.currentContext || availableContexts.contexts[0].name;
        console.log(`✨ Auto-selected context: ${clusterContext}`);
        console.log(`📝 Available contexts: ${availableContexts.contexts.map(c => c.name).join(', ')}`);
      } else {
        console.log('⚠️ No kubeconfig contexts found');
      }
    }
    
    // Load kubeconfig based on provided options or use default
    const options = kubeconfigOptions || { 
      type: 'default',
      context: clusterContext 
    };
    
    log('Loading kubeconfig with options:', options.type);
    const apis = await kubeconfigManager.loadKubeconfig(options);
    
    // Update global variables for backward compatibility
    kc = apis.kc;
    coreV1Api = apis.coreV1Api;
    appsV1Api = apis.appsV1Api;
    rbacV1Api = apis.rbacV1Api;
    apiExtensionsV1Api = apis.apiExtensionsV1Api;
    customObjectsApi = apis.customObjectsApi;
    metricsV1Api = apis.metricsV1Api;
    
    // Store current APIs
    currentApis = apis;
    
    const configInfo = kubeconfigManager.getCurrentConfigInfo();
    if (configInfo) {
      log('Active context:', configInfo.context);
      log('Current user:', configInfo.user?.name || 'unknown');
      log('Current cluster server:', configInfo.cluster?.server || 'unknown');
    }
    
    log('All Kubernetes APIs initialized successfully');
    return true;
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('not found') && errorMessage.includes('Available contexts:')) {
      // Parse available contexts from error message
      const contextMatch = errorMessage.match(/Available contexts: (.+)/);
      const availableContexts = contextMatch ? contextMatch[1] : 'none';
      
      logAlways('❌ Failed to load kubeconfig:', errorMessage);
      logAlways('💡 Available contexts:', availableContexts);
      
      if (enableMulticluster) {
        logAlways('🔧 Multicluster mode enabled - you can add clusters dynamically through the UI');
        logAlways('   The backend will start without a default cluster and wait for cluster configuration');
      }
    } else {
      logAlways('ERROR: Failed to initialize Kubernetes APIs:', errorMessage);
    }
    
    return false;
  }
};

// Test cluster connection
const testConnection = async () => {
  try {
    log('Testing cluster connection...');
    log('Using cluster server:', kc.getCurrentCluster()?.server);
    log('Using context:', kc.getCurrentContext());
    
    // Try a simple API call first
    const response = await coreV1Api.getAPIResources();
    log('Cluster connection test successful');
    return true;
  } catch (error) {
    log('ERROR: Cluster connection test failed:', error.message);
    log('ERROR: Full error details:', {
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    
    // Try alternative connection test
    try {
      log('Attempting alternative connection test...');
      const versionApi = kc.makeApiClient(k8s.VersionApi);
      const versionResponse = await versionApi.getCode();
      log('Alternative connection test successful via version API');
      return true;
    } catch (altError) {
      log('ERROR: Alternative connection test also failed:', altError.message);
      return false;
    }
  }
};

// Get Kubernetes cluster version
const getClusterVersion = async () => {
  try {
    log('Fetching cluster version...');
    const versionApi = kc.makeApiClient(k8s.VersionApi);
    const response = await versionApi.getCode();
    const version = response.body || response;
    log('Cluster version retrieved:', version);
    return {
      major: version.major || 'unknown',
      minor: version.minor || 'unknown',
      gitVersion: version.gitVersion || 'unknown',
      buildDate: version.buildDate || 'unknown',
      platform: version.platform || 'unknown'
    };
  } catch (error) {
    log('ERROR: Failed to get cluster version:', error.message);
    return {
      major: 'unknown',
      minor: 'unknown', 
      gitVersion: 'unknown',
      buildDate: 'unknown',
      platform: 'unknown'
    };
  }
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), test: 'modified-version' });
});

// Get cluster version
app.get('/api/version', async (req, res) => {
  log('Version request received');
  
  try {
    const version = await getClusterVersion();
    log('Cluster version retrieved successfully');
    res.json(version);
  } catch (error) {
    log('ERROR: Failed to get cluster version:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Switch active cluster context
app.post('/api/cluster/switch', async (req, res) => {
  log('Cluster switch request received');
  
  try {
    const { clusterId, kubeconfig, token, server, context } = req.body;
    log('Switch request details:', {
      clusterId,
      hasKubeconfig: !!kubeconfig,
      hasToken: !!token,
      hasServer: !!server,
      context
    });
    
    // Determine kubeconfig options based on request
    let kubeconfigOptions;
    
    if (kubeconfig) {
      log('🔧 Switching to custom kubeconfig');
      kubeconfigOptions = {
        type: 'custom',
        content: kubeconfig,
        context: context
      };
    } else if (token && server) {
      log('🔑 Switching to token-based authentication');
      kubeconfigOptions = {
        type: 'token',
        token: token,
        server: server
      };
    } else if (context) {
      log('🎯 Switching to specific context:', context);
      kubeconfigOptions = {
        type: 'default',
        context: context
      };
    } else {
      log('📂 Switching to default kubeconfig');
      kubeconfigOptions = {
        type: 'default',
        context: clusterContext
      };
    }
    
    // Reinitialize with new kubeconfig
    log('🔄 Switching cluster context in backend...');
    const initSuccess = await initializeK8sApis(kubeconfigOptions);
    if (!initSuccess) {
      throw new Error('Failed to initialize Kubernetes APIs with cluster configuration');
    }
    
    // Get cluster info for response
    const configInfo = kubeconfigManager.getCurrentConfigInfo();
    const clusterVersion = await kubeconfigManager.getClusterVersion(coreV1Api);
    const nodesResponse = await coreV1Api.listNode();
    const namespacesResponse = await coreV1Api.listNamespace();
    
    const switchResult = {
      success: true,
      clusterId: clusterId || configInfo?.context,
      context: configInfo?.context,
      server: configInfo?.cluster?.server,
      user: configInfo?.user?.name,
      version: clusterVersion.gitVersion,
      nodes: nodesResponse.items?.length || 0,
      namespaces: namespacesResponse.items?.length || 0,
      timestamp: new Date().toISOString()
    };
    
    log('✅ Cluster switch successful:', {
      context: switchResult.context,
      server: switchResult.server,
      nodes: switchResult.nodes,
      namespaces: switchResult.namespaces
    });
    
    res.json(switchResult);
  } catch (error) {
    log('❌ Cluster switch failed:', error.message);
    res.status(500).json({ 
      error: error.message,
      clusterId: req.body.clusterId
    });
  }
});

// Test cluster connectivity without switching
app.post('/api/cluster/test', async (req, res) => {
  log('Cluster test request received');
  
  try {
    const { kubeconfig, token, server, context } = req.body;
    
    // Create temporary kubeconfig manager for testing
    const testManager = new KubeconfigManager();
    await testManager.initialize(k8s);
    
    let kubeconfigOptions;
    
    if (kubeconfig) {
      kubeconfigOptions = {
        type: 'custom',
        content: kubeconfig,
        context: context
      };
    } else if (token && server) {
      kubeconfigOptions = {
        type: 'token',
        token: token,
        server: server
      };
    } else {
      kubeconfigOptions = {
        type: 'default',
        context: context
      };
    }
    
    // Test connection without changing active context
    const apis = await testManager.loadKubeconfig(kubeconfigOptions);
    const configInfo = testManager.getCurrentConfigInfo();
    const version = await testManager.getClusterVersion(apis.coreV1Api);
    
    const testResult = {
      success: true,
      context: configInfo?.context,
      server: configInfo?.cluster?.server,
      user: configInfo?.user?.name,
      version: version.gitVersion,
      timestamp: new Date().toISOString()
    };
    
    log('✅ Cluster test successful:', testResult);
    res.json(testResult);
  } catch (error) {
    log('❌ Cluster test failed:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Connection test failed'
    });
  }
});

// Get current cluster info
app.get('/api/cluster/current', async (req, res) => {
  log('Current cluster info request received');
  
  try {
    if (!kubeconfigManager) {
      return res.status(503).json({ error: 'Cluster context not initialized' });
    }
    
    const configInfo = kubeconfigManager.getCurrentConfigInfo();
    const version = await kubeconfigManager.getClusterVersion(coreV1Api);
    const nodesResponse = await coreV1Api.listNode();
    const namespacesResponse = await coreV1Api.listNamespace();
    
    const clusterInfo = {
      context: configInfo?.context,
      server: configInfo?.cluster?.server,
      user: configInfo?.user?.name,
      version: version.gitVersion,
      versionDetails: version,
      nodes: nodesResponse.items?.length || 0,
      namespaces: namespacesResponse.items?.length || 0,
      availableContexts: configInfo?.contexts || [],
      timestamp: new Date().toISOString()
    };
    
    log('Current cluster info retrieved:', {
      context: clusterInfo.context,
      server: clusterInfo.server,
      nodes: clusterInfo.nodes,
      namespaces: clusterInfo.namespaces
    });
    
    res.json(clusterInfo);
  } catch (error) {
    log('ERROR: Failed to get current cluster info:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Initialize and authenticate with dynamic kubeconfig support
app.post('/api/auth/login', async (req, res) => {
  log('Login request received');
  
  try {
    const { token, kubeconfig, context, server } = req.body;
    log('Auth request details:', {
      hasToken: !!token,
      hasKubeconfig: !!kubeconfig,
      hasContext: !!context,
      hasServer: !!server
    });
    
    // Determine kubeconfig options based on request
    let kubeconfigOptions;
    
    if (kubeconfig) {
      // Custom kubeconfig provided
      log('🔧 Using custom kubeconfig from request');
      kubeconfigOptions = {
        type: 'custom',
        content: kubeconfig,
        context: context
      };
    } else if (token && server) {
      // Token-based authentication
      log('🔑 Using token-based authentication');
      kubeconfigOptions = {
        type: 'token',
        token: token,
        server: server
      };
    } else if (context) {
      // Specific context from default kubeconfig
      log('🎯 Using specific context from default kubeconfig:', context);
      kubeconfigOptions = {
        type: 'default',
        context: context
      };
    } else {
      // Use default kubeconfig
      log('📂 Using default kubeconfig');
      kubeconfigOptions = {
        type: 'default',
        context: clusterContext
      };
    }
    
    // Reinitialize with new kubeconfig
    log('🔄 Reinitializing Kubernetes APIs with new configuration...');
    const initSuccess = await initializeK8sApis(kubeconfigOptions);
    if (!initSuccess) {
      throw new Error('Failed to initialize Kubernetes APIs with provided configuration');
    }
    
    // Test the connection with detailed logging
    log('🔍 Starting connection test...');
    const connectionOk = await testConnection();
    if (!connectionOk) {
      const errorMessage = 'Failed to connect to Kubernetes cluster. Check if the cluster is running and accessible.';
      log('❌ Connection test failed, returning error to client');
      return res.status(500).json({ 
        error: errorMessage,
        details: {
          cluster: kc.getCurrentCluster()?.server,
          context: kc.getCurrentContext(),
          suggestion: 'Verify cluster connectivity and authentication credentials'
        }
      });
    }
    log('✅ Connection test passed, proceeding with cluster info retrieval...');
    
    // Get cluster info with detailed logging
    log('📊 Fetching cluster version...');
    const clusterVersion = await kubeconfigManager.getClusterVersion(coreV1Api);
    
    log('🖥️ Fetching nodes...');
    const nodesResponse = await coreV1Api.listNode();
    
    log('📁 Fetching namespaces...');
    const namespacesResponse = await coreV1Api.listNamespace();
    
    const configInfo = kubeconfigManager.getCurrentConfigInfo();
    
    log('Kubeconfig details:', {
      context: configInfo?.context,
      user: configInfo?.user?.name,
      server: configInfo?.cluster?.server
    });
    
    const authState = {
      isAuthenticated: true,
      user: {
        username: configInfo?.user?.name || 'unknown',
        email: null,
        groups: [],
        permissions: ['*']
      },
      token: token || 'kubeconfig-based-auth',
      cluster: {
        name: configInfo?.context || 'cluster',
        server: configInfo?.cluster?.server || 'unknown',
        version: clusterVersion.gitVersion || 'unknown',
        versionDetails: clusterVersion,
        nodes: nodesResponse.items?.length || 0,
        namespaces: namespacesResponse.items?.length || 0
      }
    };
    
    log('✅ Login successful', { 
      cluster: authState.cluster.name,
      nodes: authState.cluster.nodes,
      namespaces: authState.cluster.namespaces,
      server: authState.cluster.server 
    });
    
    res.json(authState);
  } catch (error) {
    log('❌ Login failed:', error.message);
    log('ERROR: Full error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get nodes
app.get('/api/nodes', async (req, res) => {
  log('Nodes request received');
  
  try {
    const response = await coreV1Api.listNode();
    log(`Retrieved ${response.items?.length || 0} nodes`);
    res.json(response.items || []);
  } catch (error) {
    log('ERROR: Failed to get nodes:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get pods running on a specific node
app.get('/api/nodes/:nodeName/pods', async (req, res) => {
  const nodeName = req.params.nodeName;
  log(`Pods for node request received: ${nodeName}`);
  
  try {
    // List all pods across all namespaces and filter by node
    const response = await coreV1Api.listPodForAllNamespaces();
    const allPods = response.items || [];
    
    // Filter pods that are running on the specified node
    const nodePods = allPods.filter(pod => pod.spec?.nodeName === nodeName);
    
    log(`Retrieved ${nodePods.length} pods for node ${nodeName}`);
    res.json(nodePods);
  } catch (error) {
    log(`ERROR: Failed to get pods for node ${nodeName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get namespaces
app.get('/api/namespaces', async (req, res) => {
  log('Namespaces request received');
  
  try {
    const response = await coreV1Api.listNamespace();
    const namespaces = response.items || [];
    
    // Add metrics for each namespace
    const namespacesWithMetrics = await Promise.all(
      namespaces.map(async (namespace) => {
        try {
          const namespaceName = namespace.metadata?.name;
          if (!namespaceName) {
            return {
              ...namespace,
              metrics: {
                podCount: 0,
                cpuUsage: '0m',
                memoryUsage: '0Mi',
                resourceQuotas: []
              }
            };
          }
          const podsResponse = await coreV1Api.listNamespacedPod({ namespace: namespaceName });
          
          return {
            ...namespace,
            metrics: {
              podCount: podsResponse.items?.length || 0,
              cpuUsage: '0m', // Would need metrics server
              memoryUsage: '0Mi', // Would need metrics server
              resourceQuotas: [] // Would need to fetch resource quotas
            }
          };
        } catch (err) {
          log(`Warning: Could not get metrics for namespace ${namespace.metadata.name}:`, err.message);
          return {
            ...namespace,
            metrics: {
              podCount: 0,
              cpuUsage: '0m',
              memoryUsage: '0Mi',
              resourceQuotas: []
            }
          };
        }
      })
    );
    
    log(`Retrieved ${namespacesWithMetrics.length} namespaces`);
    res.json(namespacesWithMetrics);
  } catch (error) {
    log('ERROR: Failed to get namespaces:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed namespace information
app.get('/api/namespaces/:name', async (req, res) => {
  const namespaceName = decodeURIComponent(req.params.name);
  log(`Detailed namespace request received for: ${namespaceName}`);
  log(`Decoded namespace name: "${namespaceName}", type: ${typeof namespaceName}, length: ${namespaceName?.length}`);
  
  try {
    // Validate that we have a name
    if (!namespaceName || namespaceName.trim() === '') {
      throw new Error('Namespace name is required');
    }
    
    // Get namespace details
    log(`Calling readNamespace with: "${namespaceName}"`);
    log(`namespaceName type: ${typeof namespaceName}, value: ${JSON.stringify(namespaceName)}`);
    log(`coreV1Api.readNamespace method exists: ${typeof coreV1Api.readNamespace}`);
    
    // Try object parameter format as some Kubernetes client methods require this
    const namespaceResponse = await coreV1Api.readNamespace({ name: namespaceName });
    const namespace = namespaceResponse.body || namespaceResponse;
    
    // Get pods in namespace
    const podsResponse = await coreV1Api.listNamespacedPod({ namespace: namespaceName });
    const pods = podsResponse.items || [];
    
    // Get services in namespace
    let services = [];
    try {
      const servicesResponse = await coreV1Api.listNamespacedService({ namespace: namespaceName });
      services = servicesResponse.items || [];
    } catch (err) {
      log(`Warning: Could not get services for namespace ${namespaceName}:`, err.message);
    }
    
    // Get config maps
    let configMaps = [];
    try {
      const configMapsResponse = await coreV1Api.listNamespacedConfigMap({ namespace: namespaceName });
      configMaps = configMapsResponse.items || [];
    } catch (err) {
      log(`Warning: Could not get configmaps for namespace ${namespaceName}:`, err.message);
    }
    
    // Get secrets
    let secrets = [];
    try {
      const secretsResponse = await coreV1Api.listNamespacedSecret({ namespace: namespaceName });
      secrets = secretsResponse.items || [];
    } catch (err) {
      log(`Warning: Could not get secrets for namespace ${namespaceName}:`, err.message);
    }
    
    // Get resource quotas
    let resourceQuotas = [];
    try {
      const quotasResponse = await coreV1Api.listNamespacedResourceQuota({ namespace: namespaceName });
      resourceQuotas = quotasResponse.items || [];
    } catch (err) {
      log(`Warning: Could not get resource quotas for namespace ${namespaceName}:`, err.message);
    }
    
    // Get limit ranges
    let limitRanges = [];
    try {
      const limitRangesResponse = await coreV1Api.listNamespacedLimitRange({ namespace: namespaceName });
      limitRanges = limitRangesResponse.items || [];
    } catch (err) {
      log(`Warning: Could not get limit ranges for namespace ${namespaceName}:`, err.message);
    }
    
    // Get events for namespace
    let events = [];
    try {
      const eventsResponse = await coreV1Api.listNamespacedEvent({ namespace: namespaceName });
      events = (eventsResponse.items || []).slice(0, 20); // Limit to recent 20 events
    } catch (err) {
      log(`Warning: Could not get events for namespace ${namespaceName}:`, err.message);
    }
    
    const namespaceDetails = {
      ...namespace,
      resources: {
        pods: pods.length,
        services: services.length,
        configMaps: configMaps.length,
        secrets: secrets.length,
        resourceQuotas: resourceQuotas.length,
        limitRanges: limitRanges.length
      },
      details: {
        pods: pods.map(pod => ({
          name: pod.metadata?.name,
          status: pod.status?.phase,
          ready: pod.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True',
          restarts: pod.status?.containerStatuses?.reduce((acc, container) => acc + (container.restartCount || 0), 0) || 0,
          age: pod.metadata?.creationTimestamp,
          node: pod.spec?.nodeName
        })),
        services: services.map(service => ({
          name: service.metadata?.name,
          type: service.spec?.type,
          clusterIP: service.spec?.clusterIP,
          ports: service.spec?.ports?.map(port => `${port.port}${port.protocol ? `/${port.protocol}` : ''}`).join(', '),
          age: service.metadata?.creationTimestamp
        })),
        configMaps: configMaps.map(cm => ({
          name: cm.metadata?.name,
          dataKeys: Object.keys(cm.data || {}).length,
          age: cm.metadata?.creationTimestamp
        })),
        secrets: secrets.map(secret => ({
          name: secret.metadata?.name,
          type: secret.type,
          dataKeys: Object.keys(secret.data || {}).length,
          age: secret.metadata?.creationTimestamp
        })),
        resourceQuotas,
        limitRanges,
        events: events.map(event => ({
          type: event.type,
          reason: event.reason,
          message: event.message,
          object: `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
          age: event.lastTimestamp || event.firstTimestamp
        }))
      }
    };
    
    log(`Retrieved detailed information for namespace: ${namespaceName}`);
    res.json(namespaceDetails);
  } catch (error) {
    log(`ERROR: Failed to get namespace details for ${namespaceName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get CRDs
app.get('/api/crds', async (req, res) => {
  log('CRDs request received');
  
  try {
    const response = await apiExtensionsV1Api.listCustomResourceDefinition();
    const crds = (response.items || []).map(crd => ({
      ...crd,
      instances: 0, // Would need to query each CRD
      scope: crd.spec.scope
    }));
    
    log(`Retrieved ${crds.length} CRDs`);
    res.json(crds);
  } catch (error) {
    log('ERROR: Failed to get CRDs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test route for debugging
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route works' });
});

// Get pods by namespace
app.get('/api/resources/pods', async (req, res) => {
  const namespace = req.query.namespace;
  log(`Pods request received for namespace: ${namespace}`);
  
  try {
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedPod({ namespace });
    } else {
      response = await coreV1Api.listPodForAllNamespaces();
    }
    
    const pods = response.items || [];
    log(`Retrieved ${pods.length} pods`);
    res.json(pods);
  } catch (error) {
    log('ERROR: Failed to get pods:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get services by namespace
app.get('/api/resources/services', async (req, res) => {
  const namespace = req.query.namespace;
  log(`Services request received for namespace: ${namespace}`);
  
  try {
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedService({ namespace });
    } else {
      response = await coreV1Api.listServiceForAllNamespaces();
    }
    
    const services = response.items || [];
    log(`Retrieved ${services.length} services`);
    res.json(services);
  } catch (error) {
    log('ERROR: Failed to get services:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get deployments by namespace
app.get('/api/resources/deployments', async (req, res) => {
  const namespace = req.query.namespace;
  log(`Deployments request received for namespace: ${namespace}`);
  
  try {
    let response;
    if (namespace) {
      response = await appsV1Api.listNamespacedDeployment({ namespace });
    } else {
      response = await appsV1Api.listDeploymentForAllNamespaces();
    }
    
    const deployments = response.items || [];
    log(`Retrieved ${deployments.length} deployments`);
    res.json(deployments);
  } catch (error) {
    log('ERROR: Failed to get deployments:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get configmaps by namespace
app.get('/api/resources/configmaps', async (req, res) => {
  const namespace = req.query.namespace;
  log(`ConfigMaps request received for namespace: ${namespace}`);
  
  try {
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedConfigMap({ namespace });
    } else {
      response = await coreV1Api.listConfigMapForAllNamespaces();
    }
    
    const configmaps = response.items || [];
    log(`Retrieved ${configmaps.length} configmaps`);
    res.json(configmaps);
  } catch (error) {
    log('ERROR: Failed to get configmaps:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get secrets by namespace
app.get('/api/resources/secrets', async (req, res) => {
  const namespace = req.query.namespace;
  log(`Secrets request received for namespace: ${namespace}`);
  
  try {
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedSecret({ namespace });
    } else {
      response = await coreV1Api.listSecretForAllNamespaces();
    }
    
    const secrets = response.items || [];
    log(`Retrieved ${secrets.length} secrets`);
    res.json(secrets);
  } catch (error) {
    log('ERROR: Failed to get secrets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed resource information
app.get('/api/resources/:type/:namespace/:name', async (req, res) => {
  const { type, namespace, name } = req.params;
  log(`Resource details request received for: ${type}/${namespace}/${name}`);
  
  try {
    let resource;
    
    switch (type.toLowerCase()) {
      case 'pod':
        const podResponse = await coreV1Api.readNamespacedPod({ name, namespace });
        resource = podResponse.body || podResponse;
        break;
      case 'service':
        const serviceResponse = await coreV1Api.readNamespacedService({ name, namespace });
        resource = serviceResponse.body || serviceResponse;
        break;
      case 'deployment':
        const deploymentResponse = await appsV1Api.readNamespacedDeployment({ name, namespace });
        resource = deploymentResponse.body || deploymentResponse;
        break;
      case 'configmap':
        const configMapResponse = await coreV1Api.readNamespacedConfigMap({ name, namespace });
        resource = configMapResponse.body || configMapResponse;
        break;
      case 'secret':
        const secretResponse = await coreV1Api.readNamespacedSecret({ name, namespace });
        resource = secretResponse.body || secretResponse;
        break;
      default:
        throw new Error(`Resource type '${type}' not supported`);
    }
    
    log(`Retrieved details for ${type}: ${name}`);
    res.json(resource);
  } catch (error) {
    log(`ERROR: Failed to get ${type} details for ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get resource events
app.get('/api/resources/:type/:namespace/:name/events', async (req, res) => {
  const { type, namespace, name } = req.params;
  log(`Resource events request received for: ${type}/${namespace}/${name}`);
  
  try {
    const eventsResponse = await coreV1Api.listNamespacedEvent({ namespace });
    const allEvents = eventsResponse.items || [];
    
    // Filter events related to this specific resource
    const resourceEvents = allEvents.filter(event => 
      event.involvedObject?.name === name &&
      event.involvedObject?.kind?.toLowerCase() === type.toLowerCase()
    ).map(event => ({
      type: event.type,
      reason: event.reason,
      message: event.message,
      count: event.count,
      age: event.lastTimestamp || event.firstTimestamp
    }));
    
    log(`Retrieved ${resourceEvents.length} events for ${type}: ${name}`);
    res.json(resourceEvents);
  } catch (error) {
    log(`ERROR: Failed to get events for ${type} ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get related resources
app.get('/api/resources/:type/:namespace/:name/related', async (req, res) => {
  const { type, namespace, name } = req.params;
  log(`Related resources request received for: ${type}/${namespace}/${name}`);
  
  try {
    const relatedResources = [];
    
    // Logic to find related resources based on type and labels/selectors
    // This is simplified - in practice, you'd use label selectors, owner references, etc.
    
    if (type.toLowerCase() === 'deployment') {
      // Find pods created by this deployment
      const podsResponse = await coreV1Api.listNamespacedPod({ namespace });
      const deploymentPods = (podsResponse.items || []).filter(pod => 
        pod.metadata?.ownerReferences?.some(ref => ref.name === name && ref.kind === 'ReplicaSet')
      ).map(pod => ({
        type: 'Pod',
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        age: pod.metadata?.creationTimestamp
      }));
      relatedResources.push(...deploymentPods);
    }
    
    log(`Retrieved ${relatedResources.length} related resources for ${type}: ${name}`);
    res.json(relatedResources);
  } catch (error) {
    log(`ERROR: Failed to get related resources for ${type} ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get pod logs
app.get('/api/resources/pod/:namespace/:name/logs', async (req, res) => {
  const { namespace, name } = req.params;
  const { container, tailLines = '100' } = req.query;
  log(`Pod logs request received for: ${namespace}/${name}`);
  
  try {
    const logResponse = await coreV1Api.readNamespacedPodLog({
      name,
      namespace,
      container: container,
      tailLines: parseInt(tailLines),
      timestamps: true
    });
    
    const logs = logResponse.body || logResponse || '';
    log(`Retrieved logs for pod: ${name}`);
    res.json({ logs });
  } catch (error) {
    log(`ERROR: Failed to get logs for pod ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create or apply resource from YAML
app.post('/api/resources/:type', async (req, res) => {
  const { type } = req.params;
  const { namespace, manifest } = req.body || {};
  log(`Resource creation request received for type: ${type} in namespace: ${namespace}`);

  try {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest payload. Expected parsed YAML object.');
    }

    // Determine namespace from manifest if not provided
    const ns = namespace || manifest.metadata?.namespace || 'default';

    // Basic safety: ensure type matches manifest.kind
    const manifestKind = (manifest.kind || '').toLowerCase();
    const typeNorm = (type || '').toLowerCase();
    if (manifestKind && !manifestKind.includes(typeNorm)) {
      log(`Warning: manifest.kind (${manifest.kind}) does not match type param (${type})`);
    }

    // Route to appropriate API based on kind
    let created;
    switch (typeNorm) {
      case 'deployment': {
        const resp = await appsV1Api.createNamespacedDeployment({ namespace: ns, body: manifest });
        created = resp.body || resp;
        break;
      }
      case 'service': {
        const resp = await coreV1Api.createNamespacedService({ namespace: ns, body: manifest });
        created = resp.body || resp;
        break;
      }
      case 'configmap': {
        const resp = await coreV1Api.createNamespacedConfigMap({ namespace: ns, body: manifest });
        created = resp.body || resp;
        break;
      }
      case 'secret': {
        const resp = await coreV1Api.createNamespacedSecret({ namespace: ns, body: manifest });
        created = resp.body || resp;
        break;
      }
      case 'pod': {
        const resp = await coreV1Api.createNamespacedPod({ namespace: ns, body: manifest });
        created = resp.body || resp;
        break;
      }
      default:
        throw new Error(`Create not implemented for resource type '${type}'`);
    }

    log(`Successfully created ${type} ${created?.metadata?.name || ''} in ${ns}`);
    res.json({ success: true, resource: created });
  } catch (error) {
    log(`ERROR: Failed to create ${type}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete resource
app.delete('/api/resources/:type/:namespace/:name', async (req, res) => {
  const { type, namespace, name } = req.params;
  log(`Resource deletion request received for: ${type}/${namespace}/${name}`);
  
  try {
    switch (type.toLowerCase()) {
      case 'pod':
        await coreV1Api.deleteNamespacedPod({ name, namespace });
        break;
      case 'service':
        await coreV1Api.deleteNamespacedService({ name, namespace });
        break;
      case 'deployment':
        await appsV1Api.deleteNamespacedDeployment({ name, namespace });
        break;
      case 'configmap':
        await coreV1Api.deleteNamespacedConfigMap({ name, namespace });
        break;
      case 'secret':
        await coreV1Api.deleteNamespacedSecret({ name, namespace });
        break;
      default:
        throw new Error(`Resource type '${type}' not supported`);
    }
    
    log(`Successfully deleted ${type}: ${name}`);
    res.json({ success: true, message: `${type} ${name} deleted successfully` });
  } catch (error) {
    log(`ERROR: Failed to delete ${type} ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed CRD information
app.get('/api/crds/:name', async (req, res) => {
  const crdName = decodeURIComponent(req.params.name);
  log(`Detailed CRD request received for: ${crdName}`);
  
  try {
    // Validate that we have a name
    if (!crdName || crdName.trim() === '') {
      throw new Error('CRD name is required');
    }
    
    // Get CRD details
    log(`Calling readCustomResourceDefinition with: "${crdName}"`);
    // The Kubernetes JavaScript client requires the name to be passed as an object parameter
    const crdResponse = await apiExtensionsV1Api.readCustomResourceDefinition({ name: crdName });
    const crd = crdResponse;
    
    // Try to get instances of this CRD
    let instances = [];
    let instanceCount = 0;
    
    try {
      if (crd.spec && crd.spec.group && crd.spec.names) {
        const group = crd.spec.group;
        const version = crd.spec.versions?.[0]?.name || 'v1';
        const plural = crd.spec.names.plural;
        
        if (crd.spec.scope === 'Namespaced') {
          // Get instances from all namespaces
          const namespacesResponse = await coreV1Api.listNamespace();
          const namespaces = namespacesResponse.items || [];
          
          for (const namespace of namespaces.slice(0, MAX_NAMESPACES_TO_SCAN)) { // Configurable namespace limit for performance
            try {
              const customResponse = await customObjectsApi.listNamespacedCustomObject(
                group,
                version,
                namespace.metadata?.name || '',
                plural
              );
              const namespaceInstances = customResponse.body?.items || [];
              instanceCount += namespaceInstances.length;
              
              // Add sample instances (limit to avoid large responses)
              instances.push(...namespaceInstances.slice(0, MAX_CRD_INSTANCES_PER_NS).map(instance => ({
                name: instance.metadata?.name,
                namespace: instance.metadata?.namespace,
                age: instance.metadata?.creationTimestamp,
                status: instance.status || 'Unknown'
              })));
            } catch (err) {
              // Ignore namespace-specific errors
            }
          }
        } else {
          // Cluster-scoped resources
          try {
            const customResponse = await customObjectsApi.listClusterCustomObject(
              group,
              version,
              plural
            );
            const clusterInstances = customResponse.body?.items || [];
            instanceCount = clusterInstances.length;
            
            instances = clusterInstances.slice(0, MAX_CRD_SAMPLE_INSTANCES).map(instance => ({
              name: instance.metadata?.name,
              namespace: null,
              age: instance.metadata?.creationTimestamp,
              status: instance.status || 'Unknown'
            }));
          } catch (err) {
            log(`Warning: Could not get cluster instances for CRD ${crdName}:`, err.message);
          }
        }
      }
    } catch (err) {
      log(`Warning: Could not get instances for CRD ${crdName}:`, err.message);
    }
    
    // Parse schema information
    const schema = crd.spec?.versions?.[0]?.schema?.openAPIV3Schema;
    const properties = schema?.properties?.spec?.properties || {};
    
    const crdDetails = {
      ...crd,
      instances: instanceCount,
      sampleInstances: instances,
      schema: {
        version: crd.spec?.versions?.[0]?.name,
        served: crd.spec?.versions?.[0]?.served,
        storage: crd.spec?.versions?.[0]?.storage,
        properties: Object.keys(properties).slice(0, 10).map(key => ({
          name: key,
          type: properties[key]?.type || 'object',
          description: properties[key]?.description || '',
          required: schema?.required?.includes(key) || false
        })),
        additionalProperties: schema?.additionalProperties
      },
      conditions: crd.status?.conditions || []
    };
    
    log(`Retrieved detailed information for CRD: ${crdName}`);
    res.json(crdDetails);
  } catch (error) {
    log(`ERROR: Failed to get CRD details for ${crdName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});


// Get all Kubernetes resources (core + custom)
app.get('/api/resources', async (req, res) => {
  log('Kubernetes resources request received');
  
  try {
    // Get API groups and resources
    const apiGroupsResponse = await coreV1Api.getAPIResources();
    log('Core API groups response received');
    
    // Use configurable core resources or discover dynamically
    let coreResources = coreResourcesConfig.length > 0 ? coreResourcesConfig : [];
    
    // If no config available, use minimal fallback set
    if (coreResources.length === 0) {
      log('Using minimal core resources fallback');
      coreResources = [
        { group: 'core', version: 'v1', kind: 'Pod', plural: 'pods', namespaced: true, description: 'A Pod is a collection of containers' },
        { group: 'core', version: 'v1', kind: 'Service', plural: 'services', namespaced: true, description: 'A Service is network access to pods' },
        { group: 'apps', version: 'v1', kind: 'Deployment', plural: 'deployments', namespaced: true, description: 'Deployment manages pod replicas' }
      ];
    }
    
    // Get CRDs to merge with core resources
    const crdsResponse = await apiExtensionsV1Api.listCustomResourceDefinition();
    const crds = (crdsResponse.items || []).map(crd => ({
      group: crd.spec?.group || 'custom',
      version: crd.spec?.versions?.[0]?.name || 'v1',
      kind: crd.spec?.names?.kind || 'Unknown',
      plural: crd.spec?.names?.plural || 'unknown',
      namespaced: crd.spec?.scope === 'Namespaced',
      description: `Custom Resource: ${crd.spec?.names?.kind}`,
      isCustom: true,
      crdName: crd.metadata?.name
    }));
    
    // Combine core resources and CRDs
    const allResources = [
      ...coreResources.map(resource => ({ ...resource, isCustom: false })),
      ...crds
    ];
    
    log(`Retrieved ${allResources.length} total resources (${coreResources.length} core + ${crds.length} custom)`);
    res.json(allResources);
  } catch (error) {
    log('ERROR: Failed to get Kubernetes resources:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get events
app.get('/api/events', async (req, res) => {
  log('Events request received');
  
  try {
    const response = await coreV1Api.listEventForAllNamespaces();
    const events = (response.items || []).map(event => ({
      type: event.type,
      reason: event.reason || '',
      message: event.message || '',
      source: event.source?.component || '',
      object: `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
      firstTimestamp: event.firstTimestamp || '',
      lastTimestamp: event.lastTimestamp || '',
      count: event.count || 1
    }));
    
    log(`Retrieved ${events.length} events`);
    res.json(events);
  } catch (error) {
    log('ERROR: Failed to get events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === HELM API ENDPOINTS ===

// Execute Helm command helper
const execHelm = async (args, options = {}) => {
  const { spawn } = require('child_process');
  const { timeout = 30000 } = options;
  
  return new Promise((resolve, reject) => {
    const helm = spawn('helm', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    helm.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    helm.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    helm.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Helm command failed (exit code ${code}): ${stderr}`));
      }
    });
    
    helm.on('error', (error) => {
      reject(new Error(`Failed to execute helm command: ${error.message}`));
    });
    
    // Handle timeout
    setTimeout(() => {
      helm.kill('SIGKILL');
      reject(new Error('Helm command timed out'));
    }, timeout);
  });
};

// Get Helm repositories
app.get('/api/helm/repositories', async (req, res) => {
  log('Helm repositories request received');
  
  try {
    const output = await execHelm(['repo', 'list', '-o', 'json']);
    const repositories = JSON.parse(output || '[]');
    
    log(`Retrieved ${repositories.length} Helm repositories`);
    res.json(repositories);
  } catch (error) {
    log('ERROR: Failed to get Helm repositories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Add Helm repository
app.post('/api/helm/repositories', async (req, res) => {
  const { name, url } = req.body;
  log(`Adding Helm repository: ${name} -> ${url}`);
  
  try {
    if (!name || !url) {
      throw new Error('Repository name and URL are required');
    }
    
    await execHelm(['repo', 'add', name, url]);
    await execHelm(['repo', 'update']);
    
    log(`Successfully added Helm repository: ${name}`);
    res.json({ success: true, message: `Repository ${name} added successfully` });
  } catch (error) {
    log(`ERROR: Failed to add Helm repository ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Remove Helm repository
app.delete('/api/helm/repositories/:name', async (req, res) => {
  const { name } = req.params;
  log(`Removing Helm repository: ${name}`);
  
  try {
    await execHelm(['repo', 'remove', name]);
    
    log(`Successfully removed Helm repository: ${name}`);
    res.json({ success: true, message: `Repository ${name} removed successfully` });
  } catch (error) {
    log(`ERROR: Failed to remove Helm repository ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search Helm charts
app.get('/api/helm/charts/search', async (req, res) => {
  const { query = '', repo } = req.query;
  log(`Searching Helm charts: query="${query}", repo="${repo}"`);
  
  try {
    const args = ['search', 'repo'];
    if (repo) {
      args.push(`${repo}/${query || ''}`);
    } else {
      args.push(query || '');
    }
    args.push('-o', 'json');
    
    const output = await execHelm(args);
    const charts = JSON.parse(output || '[]');
    
    log(`Found ${charts.length} Helm charts`);
    res.json(charts);
  } catch (error) {
    log('ERROR: Failed to search Helm charts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get chart information
app.get('/api/helm/charts/:repo/:chart', async (req, res) => {
  const { repo, chart } = req.params;
  log(`Getting Helm chart info: ${repo}/${chart}`);
  
  try {
    // Get chart info
    const infoOutput = await execHelm(['show', 'chart', `${repo}/${chart}`]);
    
    // Get chart values
    const valuesOutput = await execHelm(['show', 'values', `${repo}/${chart}`]);
    
    // Get chart readme (optional)
    let readme = '';
    try {
      readme = await execHelm(['show', 'readme', `${repo}/${chart}`]);
    } catch (err) {
      log(`Warning: Could not get readme for ${repo}/${chart}`);
    }
    
    const chartInfo = {
      info: infoOutput,
      values: valuesOutput,
      readme: readme
    };
    
    log(`Retrieved info for chart: ${repo}/${chart}`);
    res.json(chartInfo);
  } catch (error) {
    log(`ERROR: Failed to get chart info for ${repo}/${chart}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Helm releases
app.get('/api/helm/releases', async (req, res) => {
  const { namespace } = req.query;
  log(`Getting Helm releases${namespace ? ` in namespace: ${namespace}` : ' (all namespaces)'}`);
  
  try {
    const args = ['list', '-o', 'json'];
    if (namespace) {
      args.push('-n', namespace);
    } else {
      args.push('-A'); // All namespaces
    }
    
    const output = await execHelm(args);
    const releases = JSON.parse(output || '[]');
    
    log(`Retrieved ${releases.length} Helm releases`);
    res.json(releases);
  } catch (error) {
    log('ERROR: Failed to get Helm releases:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get release details
app.get('/api/helm/releases/:namespace/:name', async (req, res) => {
  const { namespace, name } = req.params;
  log(`Getting Helm release details: ${namespace}/${name}`);
  
  try {
    // Get release status
    const statusOutput = await execHelm(['status', name, '-n', namespace, '-o', 'json']);
    const status = JSON.parse(statusOutput);
    
    // Get release history
    const historyOutput = await execHelm(['history', name, '-n', namespace, '-o', 'json']);
    const history = JSON.parse(historyOutput || '[]');
    
    // Get release values
    const valuesOutput = await execHelm(['get', 'values', name, '-n', namespace, '-o', 'json']);
    const values = JSON.parse(valuesOutput || '{}');
    
    const releaseDetails = {
      status,
      history,
      values
    };
    
    log(`Retrieved details for release: ${namespace}/${name}`);
    res.json(releaseDetails);
  } catch (error) {
    log(`ERROR: Failed to get release details for ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Install Helm chart
app.post('/api/helm/releases', async (req, res) => {
  const { name, chart, namespace, values, version } = req.body;
  log(`Installing Helm chart: ${chart} as ${name} in ${namespace}`);
  
  try {
    if (!name || !chart || !namespace) {
      throw new Error('Release name, chart, and namespace are required');
    }
    
    const args = ['install', name, chart, '-n', namespace, '--create-namespace'];
    
    if (version) {
      args.push('--version', version);
    }
    
    if (values) {
      // Create a temporary values file
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      
      const tempValuesFile = path.join(os.tmpdir(), `helm-values-${Date.now()}.yaml`);
      fs.writeFileSync(tempValuesFile, values);
      
      args.push('-f', tempValuesFile);
      
      try {
        const output = await execHelm(args, { timeout: 120000 }); // 2 minute timeout
        
        // Clean up temp file
        fs.unlinkSync(tempValuesFile);
        
        log(`Successfully installed chart: ${chart} as ${name}`);
        res.json({ success: true, output, message: `Chart ${chart} installed as ${name}` });
      } catch (error) {
        // Clean up temp file on error
        fs.unlinkSync(tempValuesFile);
        throw error;
      }
    } else {
      const output = await execHelm(args, { timeout: 120000 });
      log(`Successfully installed chart: ${chart} as ${name}`);
      res.json({ success: true, output, message: `Chart ${chart} installed as ${name}` });
    }
  } catch (error) {
    log(`ERROR: Failed to install chart ${chart}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Upgrade Helm release
app.put('/api/helm/releases/:namespace/:name', async (req, res) => {
  const { namespace, name } = req.params;
  const { chart, values, version } = req.body;
  log(`Upgrading Helm release: ${namespace}/${name}`);
  
  try {
    const args = ['upgrade', name, chart || name, '-n', namespace];
    
    if (version) {
      args.push('--version', version);
    }
    
    if (values) {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      
      const tempValuesFile = path.join(os.tmpdir(), `helm-values-${Date.now()}.yaml`);
      fs.writeFileSync(tempValuesFile, values);
      
      args.push('-f', tempValuesFile);
      
      try {
        const output = await execHelm(args, { timeout: 120000 });
        fs.unlinkSync(tempValuesFile);
        
        log(`Successfully upgraded release: ${namespace}/${name}`);
        res.json({ success: true, output, message: `Release ${name} upgraded successfully` });
      } catch (error) {
        fs.unlinkSync(tempValuesFile);
        throw error;
      }
    } else {
      const output = await execHelm(args, { timeout: 120000 });
      log(`Successfully upgraded release: ${namespace}/${name}`);
      res.json({ success: true, output, message: `Release ${name} upgraded successfully` });
    }
  } catch (error) {
    log(`ERROR: Failed to upgrade release ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Uninstall Helm release
app.delete('/api/helm/releases/:namespace/:name', async (req, res) => {
  const { namespace, name } = req.params;
  log(`Uninstalling Helm release: ${namespace}/${name}`);
  
  try {
    const output = await execHelm(['uninstall', name, '-n', namespace]);
    
    log(`Successfully uninstalled release: ${namespace}/${name}`);
    res.json({ success: true, output, message: `Release ${name} uninstalled successfully` });
  } catch (error) {
    log(`ERROR: Failed to uninstall release ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Rollback Helm release
app.post('/api/helm/releases/:namespace/:name/rollback', async (req, res) => {
  const { namespace, name } = req.params;
  const { revision } = req.body;
  log(`Rolling back Helm release: ${namespace}/${name} to revision ${revision}`);
  
  try {
    const args = ['rollback', name];
    if (revision) {
      args.push(revision.toString());
    }
    args.push('-n', namespace);
    
    const output = await execHelm(args);
    
    log(`Successfully rolled back release: ${namespace}/${name}`);
    res.json({ success: true, output, message: `Release ${name} rolled back successfully` });
  } catch (error) {
    log(`ERROR: Failed to rollback release ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// === RESOURCE DEPENDENCY ENDPOINTS ===

// Cache for workloads to avoid repeated API calls
const workloadCache = new Map();
const clearWorkloadCache = () => {
  workloadCache.clear();
};

// Helper function to get workloads for a namespace (cached)
const getNamespaceWorkloads = async (namespace) => {
  const cacheKey = namespace || 'cluster';
  
  if (workloadCache.has(cacheKey)) {
    return workloadCache.get(cacheKey);
  }
  
  try {
    log(`Fetching workloads for namespace: ${namespace || 'all'}`);
    
    const [pods, deployments, statefulSets, daemonSets] = await Promise.all([
      namespace 
        ? coreV1Api.listNamespacedPod({ namespace })
        : coreV1Api.listPodForAllNamespaces(),
      namespace 
        ? appsV1Api.listNamespacedDeployment({ namespace })
        : appsV1Api.listDeploymentForAllNamespaces(),
      namespace 
        ? appsV1Api.listNamespacedStatefulSet({ namespace })
        : appsV1Api.listStatefulSetForAllNamespaces(),
      namespace 
        ? appsV1Api.listNamespacedDaemonSet({ namespace })
        : appsV1Api.listDaemonSetForAllNamespaces()
    ]);
    
    const workloads = [
      ...(pods.items || []).map(pod => ({ ...pod, kind: 'Pod' })),
      ...(deployments.items || []).map(deployment => ({ ...deployment, kind: 'Deployment' })),
      ...(statefulSets.items || []).map(statefulSet => ({ ...statefulSet, kind: 'StatefulSet' })),
      ...(daemonSets.items || []).map(daemonSet => ({ ...daemonSet, kind: 'DaemonSet' }))
    ];
    
    log(`Cached ${workloads.length} workloads for namespace: ${namespace || 'all'}`);
    workloadCache.set(cacheKey, workloads);
    return workloads;
  } catch (error) {
    log(`Warning: Failed to fetch workloads for namespace ${namespace}:`, error.message);
    return [];
  }
};

// Helper function to analyze resource dependencies
const analyzeResourceDependencies = async (resource, allResources = null) => {
  const dependencies = {
    outgoing: [], // Resources this resource depends on
    incoming: [], // Resources that depend on this resource
    related: []   // Related resources (weak relationships)
  };

  if (!resource || !resource.metadata) {
    return dependencies;
  }

  const resourceId = `${resource.kind}/${resource.metadata.name}${resource.metadata.namespace ? `@${resource.metadata.namespace}` : ''}`;
  const resourceLabels = resource.metadata.labels || {};

  try {
    // 1. Analyze owner references (outgoing dependencies)
    if (resource.metadata.ownerReferences) {
      for (const owner of resource.metadata.ownerReferences) {
        dependencies.outgoing.push({
          type: 'owner',
          target: `${owner.kind}/${owner.name}${resource.metadata.namespace ? `@${resource.metadata.namespace}` : ''}`,
          strength: 'strong',
          metadata: {
            field: 'metadata.ownerReferences',
            reason: `Owned by ${owner.kind} ${owner.name}`,
            controller: owner.controller || false
          }
        });
      }
    }

    // 2. Analyze volume dependencies (for Pods)
    if (resource.kind === 'Pod' && resource.spec && resource.spec.volumes) {
      for (const volume of resource.spec.volumes) {
        if (volume.configMap) {
          dependencies.outgoing.push({
            type: 'configMap',
            target: `ConfigMap/${volume.configMap.name}@${resource.metadata.namespace}`,
            strength: 'strong',
            metadata: {
              field: 'spec.volumes',
              reason: `Mounts ConfigMap ${volume.configMap.name} as volume`
            }
          });
        }
        if (volume.secret) {
          dependencies.outgoing.push({
            type: 'secret',
            target: `Secret/${volume.secret.secretName}@${resource.metadata.namespace}`,
            strength: 'strong',
            metadata: {
              field: 'spec.volumes',
              reason: `Mounts Secret ${volume.secret.secretName} as volume`
            }
          });
        }
        if (volume.persistentVolumeClaim) {
          dependencies.outgoing.push({
            type: 'volume',
            target: `PersistentVolumeClaim/${volume.persistentVolumeClaim.claimName}@${resource.metadata.namespace}`,
            strength: 'strong',
            metadata: {
              field: 'spec.volumes',
              reason: `Mounts PVC ${volume.persistentVolumeClaim.claimName}`
            }
          });
        }
      }
    }

    // 3. Analyze service account dependencies
    if (resource.spec && resource.spec.serviceAccountName) {
      dependencies.outgoing.push({
        type: 'serviceAccount',
        target: `ServiceAccount/${resource.spec.serviceAccountName}@${resource.metadata.namespace}`,
        strength: 'strong',
        metadata: {
          field: 'spec.serviceAccountName',
          reason: `Uses ServiceAccount ${resource.spec.serviceAccountName}`
        }
      });
    }

    // 4. Analyze selector dependencies (for Services, NetworkPolicies, etc.)
    if (resource.spec && resource.spec.selector) {
      const selector = resource.spec.selector;
      let selectorType = 'selector';
      let reason = '';
      
      if (resource.kind === 'Service') {
        selectorType = 'service';
        reason = `Service targets pods with matching labels`;
      } else if (resource.kind === 'NetworkPolicy') {
        selectorType = 'network';
        reason = `NetworkPolicy applies to pods matching labels`;
      }
      
      // Store selector info for later matching with actual pods
      // This will be used in the graph generation to find actual pod targets
      if (selector && (selector.matchLabels || selector.matchExpressions || (typeof selector === 'object' && Object.keys(selector).length > 0))) {
        dependencies.related.push({
          type: selectorType,
          target: `*selector-match*`,
          strength: resource.kind === 'Service' ? 'strong' : 'weak',
          metadata: {
            field: 'spec.selector',
            reason: reason,
            selector: selector,
            selectorLabels: selector.matchLabels || selector || {}
          }
        });
      }
    }

    // 5. Special handling for PVC -> PV relationships
    if (resource.kind === 'PersistentVolumeClaim' && resource.spec && resource.spec.volumeName) {
      dependencies.outgoing.push({
        type: 'volume',
        target: `PersistentVolume/${resource.spec.volumeName}`,
        strength: 'strong',
        metadata: {
          field: 'spec.volumeName',
          reason: `Claims PersistentVolume ${resource.spec.volumeName}`
        }
      });
    }

    // 6. PVC -> StorageClass relationships
    if (resource.kind === 'PersistentVolumeClaim' && resource.spec && resource.spec.storageClassName) {
      dependencies.outgoing.push({
        type: 'volume',
        target: `StorageClass/${resource.spec.storageClassName}`,
        strength: 'strong',
        metadata: {
          field: 'spec.storageClassName',
          reason: `Uses StorageClass ${resource.spec.storageClassName}`
        }
      });
    }

    // 7. Ingress -> Service relationships
    if (resource.kind === 'Ingress' && resource.spec && resource.spec.rules) {
      for (const rule of resource.spec.rules) {
        if (rule.http && rule.http.paths) {
          for (const path of rule.http.paths) {
            if (path.backend && path.backend.service && path.backend.service.name) {
              dependencies.outgoing.push({
                type: 'service',
                target: `Service/${path.backend.service.name}@${resource.metadata.namespace}`,
                strength: 'strong',
                metadata: {
                  field: 'spec.rules[].http.paths[].backend.service',
                  reason: `Routes traffic to Service ${path.backend.service.name}`
                }
              });
            }
          }
        }
      }
    }

    // 8. ReplicaSet -> Deployment relationships (via ownerReferences - already covered above)
    // This is handled by the general ownerReferences logic

    // 9. Pod -> Node relationships
    if (resource.kind === 'Pod' && resource.spec && resource.spec.nodeName) {
      dependencies.outgoing.push({
        type: 'scheduling',
        target: `Node/${resource.spec.nodeName}`,
        strength: 'strong',
        metadata: {
          field: 'spec.nodeName',
          reason: `Scheduled on Node ${resource.spec.nodeName}`
        }
      });
    }

    // 10. Enhanced environment variable dependencies for Pod-like resources
    const analyzePodSpec = (podSpec, pathPrefix = 'spec') => {
      if (!podSpec || !podSpec.containers) return;
      
      // Analyze each container
      podSpec.containers.forEach((container, containerIndex) => {
        if (container.env) {
          container.env.forEach((envVar, envIndex) => {
            // ConfigMap environment variable references
            if (envVar.valueFrom && envVar.valueFrom.configMapKeyRef) {
              dependencies.outgoing.push({
                type: 'environment',
                target: `ConfigMap/${envVar.valueFrom.configMapKeyRef.name}@${resource.metadata.namespace}`,
                strength: 'strong',
                metadata: {
                  field: `${pathPrefix}.containers[${containerIndex}].env[${envIndex}].valueFrom.configMapKeyRef`,
                  reason: `Environment variable '${envVar.name}' references ConfigMap ${envVar.valueFrom.configMapKeyRef.name}`
                }
              });
            }
            
            // Secret environment variable references
            if (envVar.valueFrom && envVar.valueFrom.secretKeyRef) {
              dependencies.outgoing.push({
                type: 'environment',
                target: `Secret/${envVar.valueFrom.secretKeyRef.name}@${resource.metadata.namespace}`,
                strength: 'strong',
                metadata: {
                  field: `${pathPrefix}.containers[${containerIndex}].env[${envIndex}].valueFrom.secretKeyRef`,
                  reason: `Environment variable '${envVar.name}' references Secret ${envVar.valueFrom.secretKeyRef.name}`
                }
              });
            }
          });
        }
        
        // Analyze envFrom (bulk environment variable loading)
        if (container.envFrom) {
          container.envFrom.forEach((envFrom, envFromIndex) => {
            if (envFrom.configMapRef) {
              dependencies.outgoing.push({
                type: 'environment',
                target: `ConfigMap/${envFrom.configMapRef.name}@${resource.metadata.namespace}`,
                strength: 'strong',
                metadata: {
                  field: `${pathPrefix}.containers[${containerIndex}].envFrom[${envFromIndex}].configMapRef`,
                  reason: `Container '${container.name}' loads all environment variables from ConfigMap ${envFrom.configMapRef.name}`
                }
              });
            }
            
            if (envFrom.secretRef) {
              dependencies.outgoing.push({
                type: 'environment',
                target: `Secret/${envFrom.secretRef.name}@${resource.metadata.namespace}`,
                strength: 'strong',
                metadata: {
                  field: `${pathPrefix}.containers[${containerIndex}].envFrom[${envFromIndex}].secretRef`,
                  reason: `Container '${container.name}' loads all environment variables from Secret ${envFrom.secretRef.name}`
                }
              });
            }
          });
        }
      });
      
      // Analyze imagePullSecrets
      if (podSpec.imagePullSecrets) {
        podSpec.imagePullSecrets.forEach((imagePullSecret, index) => {
          dependencies.outgoing.push({
            type: 'imagePullSecret',
            target: `Secret/${imagePullSecret.name}@${resource.metadata.namespace}`,
            strength: 'strong',
            metadata: {
              field: `${pathPrefix}.imagePullSecrets[${index}]`,
              reason: `Uses Secret ${imagePullSecret.name} for image pull authentication`
            }
          });
        });
      }
    };
    
    // Apply Pod spec analysis to Pods and Pod templates
    if (resource.kind === 'Pod' && resource.spec) {
      analyzePodSpec(resource.spec, 'spec');
    } else if ((resource.kind === 'Deployment' || resource.kind === 'StatefulSet' || resource.kind === 'DaemonSet' || resource.kind === 'Job') 
               && resource.spec && resource.spec.template && resource.spec.template.spec) {
      analyzePodSpec(resource.spec.template.spec, 'spec.template.spec');
    } else if (resource.kind === 'CronJob' && resource.spec && resource.spec.jobTemplate && resource.spec.jobTemplate.spec && resource.spec.jobTemplate.spec.template && resource.spec.jobTemplate.spec.template.spec) {
      analyzePodSpec(resource.spec.jobTemplate.spec.template.spec, 'spec.jobTemplate.spec.template.spec');
    }

    // 11. Enhanced service account relationships for all pod-like resources
    if ((resource.kind === 'Pod' || resource.kind === 'Deployment' || resource.kind === 'StatefulSet' || resource.kind === 'DaemonSet') 
        && resource.spec) {
      let serviceAccountName = null;
      
      if (resource.kind === 'Pod' && resource.spec.serviceAccountName) {
        serviceAccountName = resource.spec.serviceAccountName;
      } else if (resource.spec.template && resource.spec.template.spec && resource.spec.template.spec.serviceAccountName) {
        serviceAccountName = resource.spec.template.spec.serviceAccountName;
      }
      
      if (serviceAccountName && serviceAccountName !== 'default') {
        dependencies.outgoing.push({
          type: 'serviceAccount',
          target: `ServiceAccount/${serviceAccountName}@${resource.metadata.namespace}`,
          strength: 'strong',
          metadata: {
            field: resource.kind === 'Pod' ? 'spec.serviceAccountName' : 'spec.template.spec.serviceAccountName',
            reason: `Uses ServiceAccount ${serviceAccountName}`
          }
        });
      }
    }

    // 12. DISABLED: Reverse dependency analysis (performance optimization)
    // This was causing exponential performance issues with nested loops
    // Forward dependencies (resources this resource depends on) are still analyzed above
    // Reverse dependencies can be calculated more efficiently in the graph generation phase
    if (false && (resource.kind === 'ConfigMap' || resource.kind === 'Secret' || resource.kind === 'ServiceAccount')) {
      try {
        // Use cached workloads to avoid repeated API calls
        const allWorkloads = await getNamespaceWorkloads(resource.metadata.namespace);
        
        // Limit workloads analyzed to prevent infinite loops
        const MAX_WORKLOADS_TO_ANALYZE = 20; // Reduced limit
        
        for (const workload of workloadsToAnalyze) {
          const workloadId = `${workload.kind}/${workload.metadata.name}@${workload.metadata.namespace}`;
          const podSpec = workload.kind === 'Pod' ? workload.spec : workload.spec?.template?.spec;
          
          if (!podSpec) continue;
          
          // Check volume references
          if (podSpec.volumes) {
            for (const volume of podSpec.volumes) {
              if (resource.kind === 'ConfigMap' && volume.configMap && volume.configMap.name === resource.metadata.name) {
                dependencies.incoming.push({
                  type: 'configMap',
                  target: workloadId,
                  strength: 'strong',
                  metadata: {
                    field: workload.kind === 'Pod' ? 'spec.volumes' : 'spec.template.spec.volumes',
                    reason: `${workload.kind} ${workload.metadata.name} mounts this ConfigMap as volume`,
                    volumeName: volume.name
                  }
                });
              }
              if (resource.kind === 'Secret' && volume.secret && volume.secret.secretName === resource.metadata.name) {
                dependencies.incoming.push({
                  type: 'secret',
                  target: workloadId,
                  strength: 'strong',
                  metadata: {
                    field: workload.kind === 'Pod' ? 'spec.volumes' : 'spec.template.spec.volumes',
                    reason: `${workload.kind} ${workload.metadata.name} mounts this Secret as volume`,
                    volumeName: volume.name
                  }
                });
              }
            }
          }
          
          // Check environment variable references
          if (podSpec.containers) {
            podSpec.containers.forEach((container, containerIndex) => {
              // Check individual environment variables
              if (container.env) {
                container.env.forEach((envVar, envIndex) => {
                  if (resource.kind === 'ConfigMap' && envVar.valueFrom && envVar.valueFrom.configMapKeyRef && 
                      envVar.valueFrom.configMapKeyRef.name === resource.metadata.name) {
                    dependencies.incoming.push({
                      type: 'environment',
                      target: workloadId,
                      strength: 'strong',
                      metadata: {
                        field: `${workload.kind === 'Pod' ? 'spec' : 'spec.template.spec'}.containers[${containerIndex}].env[${envIndex}]`,
                        reason: `${workload.kind} ${workload.metadata.name} uses environment variable '${envVar.name}' from this ConfigMap`,
                        envVarName: envVar.name,
                        containerName: container.name
                      }
                    });
                  }
                  if (resource.kind === 'Secret' && envVar.valueFrom && envVar.valueFrom.secretKeyRef && 
                      envVar.valueFrom.secretKeyRef.name === resource.metadata.name) {
                    dependencies.incoming.push({
                      type: 'environment',
                      target: workloadId,
                      strength: 'strong',
                      metadata: {
                        field: `${workload.kind === 'Pod' ? 'spec' : 'spec.template.spec'}.containers[${containerIndex}].env[${envIndex}]`,
                        reason: `${workload.kind} ${workload.metadata.name} uses environment variable '${envVar.name}' from this Secret`,
                        envVarName: envVar.name,
                        containerName: container.name
                      }
                    });
                  }
                });
              }
              
              // Check envFrom (bulk environment variable loading)
              if (container.envFrom) {
                container.envFrom.forEach((envFrom, envFromIndex) => {
                  if (resource.kind === 'ConfigMap' && envFrom.configMapRef && 
                      envFrom.configMapRef.name === resource.metadata.name) {
                    dependencies.incoming.push({
                      type: 'environment',
                      target: workloadId,
                      strength: 'strong',
                      metadata: {
                        field: `${workload.kind === 'Pod' ? 'spec' : 'spec.template.spec'}.containers[${containerIndex}].envFrom[${envFromIndex}]`,
                        reason: `${workload.kind} ${workload.metadata.name} loads all environment variables from this ConfigMap`,
                        containerName: container.name
                      }
                    });
                  }
                  if (resource.kind === 'Secret' && envFrom.secretRef && 
                      envFrom.secretRef.name === resource.metadata.name) {
                    dependencies.incoming.push({
                      type: 'environment',
                      target: workloadId,
                      strength: 'strong',
                      metadata: {
                        field: `${workload.kind === 'Pod' ? 'spec' : 'spec.template.spec'}.containers[${containerIndex}].envFrom[${envFromIndex}]`,
                        reason: `${workload.kind} ${workload.metadata.name} loads all environment variables from this Secret`,
                        containerName: container.name
                      }
                    });
                  }
                });
              }
            });
          }
          
          // Check imagePullSecrets (only for Secrets)
          if (resource.kind === 'Secret' && podSpec.imagePullSecrets) {
            for (const imagePullSecret of podSpec.imagePullSecrets) {
              if (imagePullSecret.name === resource.metadata.name) {
                dependencies.incoming.push({
                  type: 'imagePullSecret',
                  target: workloadId,
                  strength: 'strong',
                  metadata: {
                    field: workload.kind === 'Pod' ? 'spec.imagePullSecrets' : 'spec.template.spec.imagePullSecrets',
                    reason: `${workload.kind} ${workload.metadata.name} uses this Secret for image pull authentication`
                  }
                });
              }
            }
          }
          
          // Check serviceAccountName references (only for ServiceAccounts)
          if (resource.kind === 'ServiceAccount') {
            const serviceAccountName = podSpec.serviceAccountName || 'default';
            if (serviceAccountName === resource.metadata.name) {
              dependencies.incoming.push({
                type: 'serviceAccount',
                target: workloadId,
                strength: 'strong',
                metadata: {
                  field: workload.kind === 'Pod' ? 'spec.serviceAccountName' : 'spec.template.spec.serviceAccountName',
                  reason: `${workload.kind} ${workload.metadata.name} uses this ServiceAccount for pod identity and permissions`,
                  isDefault: serviceAccountName === 'default'
                }
              });
            }
          }
        }
      } catch (error) {
        log(`Warning: Failed to analyze reverse dependencies for ${resource.kind} ${resource.metadata.name}:`, error.message);
      }
    }

  } catch (error) {
    log(`Warning: Error analyzing dependencies for ${resourceId}:`, error.message);
  }

  return dependencies;
};

// Get available API groups for CRD filtering (moved before generic route)
app.get('/api/dependencies/crd/apigroups', async (req, res) => {
  log('API groups request for CRD filtering');
  
  try {
    const crdResponse = await apiExtensionsV1Api.listCustomResourceDefinition();
    const crds = crdResponse.items || [];
    
    const apiGroups = new Map();
    crds.forEach(crd => {
      const group = crd.spec.group;
      if (!apiGroups.has(group)) {
        apiGroups.set(group, {
          group: group,
          crdCount: 0,
          crds: [],
          versions: new Set()
        });
      }
      
      const groupInfo = apiGroups.get(group);
      groupInfo.crdCount++;
      groupInfo.crds.push({
        name: crd.metadata.name,
        kind: crd.spec.names.kind,
        scope: crd.spec.scope
      });
      
      // Collect available versions
      crd.spec.versions?.forEach(version => {
        groupInfo.versions.add(version.name);
      });
    });
    
    // Convert sets to arrays for JSON serialization
    const response = Array.from(apiGroups.values()).map(group => ({
      ...group,
      versions: Array.from(group.versions)
    }));
    
    log(`Found ${response.length} API groups with ${crds.length} total CRDs`);
    res.json(response);
  } catch (error) {
    log('ERROR: Failed to get API groups:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced CRD dictionary dependencies graph with multi-API group support (moved before generic route)
app.get('/api/dependencies/crd/enhanced', async (req, res) => {
  const apiGroups = req.query.apiGroups ? req.query.apiGroups.split(',') : [];
  const maxCRDs = parseInt(req.query.maxCRDs || '100');
  const includeNativeResources = req.query.includeNative !== 'false';
  const analysisDepth = req.query.depth || 'deep';
  
  log(`Enhanced CRD dictionary analysis request - API groups: ${apiGroups.length > 0 ? apiGroups.join(', ') : 'all'}, maxCRDs: ${maxCRDs}`);
  
  try {
    const options = {
      apiGroups,
      maxCRDs,
      includeNativeResources,
      analysisDepth
    };
    
    const dictionaryGraph = await analyzeCRDSchemasEnhanced(options);
    res.json(dictionaryGraph);
  } catch (error) {
    log('ERROR: Failed to generate enhanced CRD dictionary graph:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get CRD dictionary dependencies graph (legacy endpoint, moved before generic route)
app.get('/api/dependencies/dictionary', async (req, res) => {
  log('CRD dictionary analysis request (legacy)');
  
  try {
    const dictionaryGraph = await analyzeCRDSchemas();
    res.json(dictionaryGraph);
  } catch (error) {
    log('ERROR: Failed to generate CRD dictionary graph:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Export dependency graph results in various formats matching UI visualization
app.get('/api/dependencies/graph/export', async (req, res) => {
  const format = req.query.format || 'json';
  
  // Parse UI filters from query parameters (same as UI component)
  const namespace = req.query.namespace;
  const includeCustomResources = req.query.includeCustom !== 'false';
  const maxNodes = parseInt(req.query.maxNodes) || 50;
  const search = req.query.search;
  const resourceTypes = req.query.resourceTypes ? req.query.resourceTypes.split(',').map(t => t.trim()).filter(Boolean) : [];
  const dependencyTypes = req.query.dependencyTypes ? req.query.dependencyTypes.split(',').map(t => t.trim()).filter(Boolean) : [];
  const showWeakDependencies = req.query.showWeakDependencies !== 'false';
  
  // New parameter: CRD-focused analysis
  const focusOnCRDs = req.query.focusOnCRDs === 'true';
  const apiGroups = req.query.apiGroups ? req.query.apiGroups.split(',').map(g => g.trim()).filter(Boolean) : [];
  
  log(`UI Graph Export request: format=${format}, namespace=${namespace || 'all'}, maxNodes=${maxNodes}, focusOnCRDs=${focusOnCRDs}, apiGroups=${apiGroups.join(',')}, filters=${JSON.stringify({search, resourceTypes, dependencyTypes, showWeakDependencies})}`);
  
  try {
    let graphData;
    
    if (focusOnCRDs && apiGroups.length > 0) {
      // Use CRD schema analysis for CRD-focused exports
      log('Using CRD-focused analysis for export...');
      const analysisOptions = {
        apiGroups,
        maxCRDs: 9999,
        includeNativeResources: true,
        analysisDepth: 'deep'
      };
      
      const crdAnalysis = await analyzeCRDSchemasEnhanced(analysisOptions);
      
      graphData = {
        metadata: {
          namespace: namespace || 'cluster',
          nodeCount: crdAnalysis.nodes.length,
          edgeCount: crdAnalysis.edges.length,
          timestamp: crdAnalysis.metadata.timestamp,
          analysisType: 'crd-focused',
          apiGroups: crdAnalysis.metadata.apiGroups
        },
        nodes: crdAnalysis.nodes,
        edges: crdAnalysis.edges
      };
    } else {
      // Use runtime resource analysis for standard exports
      log('Using runtime resource analysis for export...');
      const nodes = [];
      const edges = [];
      const resourceMap = new Map();
      const edgeMap = new Map();
    
    // Helper function to add an edge safely (avoiding duplicates) - same as UI graph endpoint
    const addEdge = (edgeId, source, target, type, strength, metadata) => {
      if (edgeMap.has(edgeId)) return;
      
      const edge = {
        id: edgeId,
        source,
        target,
        type,
        strength,
        metadata
      };
      
      edges.push(edge);
      edgeMap.set(edgeId, edge);
    };
    
    // Helper function to add a resource as a node - same as UI graph endpoint
    const addResourceNode = (resource) => {
      if (!resource || !resource.metadata) return;
      
      const kind = resource.kind || 'Unknown';
      const nodeId = `${kind}/${resource.metadata.name}${resource.metadata.namespace ? `@${resource.metadata.namespace}` : ''}`;
      
      if (resourceMap.has(nodeId)) return nodeId;
      
      const node = {
        id: nodeId,
        kind: kind,
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        labels: resource.metadata.labels || {},
        creationTimestamp: resource.metadata.creationTimestamp,
        status: resource.status || {}
      };
      
      nodes.push(node);
      resourceMap.set(nodeId, resource);
      return nodeId;
    };
    
    // Fetch core resources - same logic as UI graph endpoint
    const resourceTypes = [
      { kind: 'Pod', api: coreV1Api, method: 'listNamespacedPod', clusterMethod: 'listPodForAllNamespaces' },
      { kind: 'Service', api: coreV1Api, method: 'listNamespacedService', clusterMethod: 'listServiceForAllNamespaces' },
      { kind: 'ConfigMap', api: coreV1Api, method: 'listNamespacedConfigMap', clusterMethod: 'listConfigMapForAllNamespaces' },
      { kind: 'Secret', api: coreV1Api, method: 'listNamespacedSecret', clusterMethod: 'listSecretForAllNamespaces' },
      { kind: 'ServiceAccount', api: coreV1Api, method: 'listNamespacedServiceAccount', clusterMethod: 'listServiceAccountForAllNamespaces' },
      { kind: 'Deployment', api: appsV1Api, method: 'listNamespacedDeployment', clusterMethod: 'listDeploymentForAllNamespaces' },
      { kind: 'ReplicaSet', api: appsV1Api, method: 'listNamespacedReplicaSet', clusterMethod: 'listReplicaSetForAllNamespaces' },
      { kind: 'DaemonSet', api: appsV1Api, method: 'listNamespacedDaemonSet', clusterMethod: 'listDaemonSetForAllNamespaces' }
    ];
    
    for (const resourceType of resourceTypes) {
      try {
        let resources = [];
        if (namespace) {
          const response = await resourceType.api[resourceType.method]({ namespace });
          resources = response.items || [];
        } else {
          const response = await resourceType.api[resourceType.clusterMethod]();
          resources = response.items || [];
        }
        
        // Add nodes and analyze dependencies
        for (const resource of resources.slice(0, maxNodes)) {
          if (!resource.kind) {
            resource.kind = resourceType.kind;
          }
          const nodeId = addResourceNode(resource);
          const dependencies = await analyzeResourceDependencies(resource);
          
          // Add dependency edges - same logic as UI graph endpoint
          for (const dep of dependencies.outgoing) {
            if (dep.target && dep.target !== '*pods-matching-selector*') {
              const edgeId = `${nodeId}-->${dep.target}`;
              addEdge(edgeId, nodeId, dep.target, dep.type, dep.strength, dep.metadata);
            }
          }
          
          for (const dep of dependencies.incoming) {
            if (dep.target && dep.target !== '*pods-matching-selector*') {
              const edgeId = `${dep.target}-->${nodeId}`;
              addEdge(edgeId, dep.target, nodeId, dep.type, dep.strength, dep.metadata);
            }
          }
          
          for (const dep of dependencies.related) {
            if (dep.target && dep.target !== '*pods-matching-selector*') {
              const edgeId = `${nodeId}<-->${dep.target}`;
              addEdge(edgeId, nodeId, dep.target, dep.type, dep.strength, dep.metadata);
            }
          }
        }
      } catch (error) {
        log(`Warning: Failed to fetch ${resourceType.kind} resources:`, error.message);
      }
    }
    
    // Add cluster-scoped resources if not filtering by namespace
    if (!namespace) {
      try {
        const nodesResponse = await coreV1Api.listNode();
        const nodes_k8s = nodesResponse.items || [];
        for (const node of nodes_k8s.slice(0, MAX_NODES_TO_INCLUDE)) {
          if (!node.kind) {
            node.kind = 'Node';
          }
          addResourceNode(node);
        }
      } catch (error) {
        log('Warning: Failed to fetch nodes:', error.message);
      }
    }
    
    // Helper function to check if pod labels match a selector - same as UI graph endpoint
    const podMatchesSelector = (podLabels, selectorLabels) => {
      if (!podLabels || !selectorLabels) return false;
      
      for (const [key, value] of Object.entries(selectorLabels)) {
        if (podLabels[key] !== value) {
          return false;
        }
      }
      return true;
    };
    
    // Second pass: resolve selector matches - same as UI graph endpoint
    const servicePods = nodes.filter(node => node.kind === 'Service');
    const pods = nodes.filter(node => node.kind === 'Pod');
    
    for (const serviceNode of servicePods) {
      const service = resourceMap.get(serviceNode.id);
      if (service && service.spec && service.spec.selector) {
        const selectorLabels = service.spec.selector;
        
        for (const podNode of pods) {
          const pod = resourceMap.get(podNode.id);
          if (pod && pod.metadata && pod.metadata.labels && 
              pod.metadata.namespace === service.metadata.namespace) {
            if (podMatchesSelector(pod.metadata.labels, selectorLabels)) {
              const edgeId = `${serviceNode.id}-->${podNode.id}`;
              addEdge(edgeId, serviceNode.id, podNode.id, 'service', 'strong', {
                field: 'spec.selector',
                reason: `Service ${service.metadata.name} targets Pod ${pod.metadata.name} via label selector`,
                selector: selectorLabels
              });
            }
          }
        }
      }
    }
    
      // Clean up selector placeholder edges
      const filteredEdges = edges.filter(edge => edge.target !== '*selector-match*');
      
      graphData = {
        metadata: {
          namespace: namespace || 'cluster',
          nodeCount: nodes.length,
          edgeCount: filteredEdges.length,
          timestamp: new Date().toISOString(),
          analysisType: 'runtime-resources'
        },
        nodes,
        edges: filteredEdges
      };
    }
    
    // Set appropriate headers based on format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const baseFilename = `dependency-graph-${timestamp}`;
    
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.json"`);
        res.json(graphData);
        break;
        
      case 'csv':
        const csvLines = [];
        csvLines.push('=== NODES (RESOURCES) ===');
        csvLines.push('ID,Kind,Name,Namespace,Labels Count,Creation Time');
        
        nodes.forEach(node => {
          const labelsCount = Object.keys(node.labels || {}).length;
          csvLines.push(`"${node.id}","${node.kind}","${node.name}","${node.namespace || ''}",${labelsCount},"${node.creationTimestamp || ''}"`); 
        });
        
        csvLines.push('');
        csvLines.push('=== EDGES (DEPENDENCIES) ===');
        csvLines.push('Source,Target,Type,Strength,Reason');
        
        filteredEdges.forEach(edge => {
          const reason = (edge.metadata?.reason || '').replace(/"/g, '""');
          csvLines.push(`"${edge.source}","${edge.target}","${edge.type}","${edge.strength}","${reason}"`);
        });
        
        const csvData = csvLines.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.csv"`);
        res.send(csvData);
        break;
        
      case 'markdown':
        const lines = [];
        
        lines.push('# Kubernetes Resource Dependency Graph Export');
        lines.push('');
        lines.push(`**Generated:** ${new Date().toISOString()}`);
        lines.push(`**Cluster Scope:** ${namespace || 'All namespaces'}`);
        lines.push(`**Total Resources:** ${nodes.length}`);
        lines.push(`**Total Dependencies:** ${filteredEdges.length}`);
        lines.push('');
        
        // Add the Mermaid diagram matching the UI
        lines.push('## Dependency Visualization');
        lines.push('');
        lines.push('This diagram shows the same dependency graph as displayed in the UI:');
        lines.push('');
        
        // Apply the same filters as the UI would
        const filters = {
          search,
          resourceTypes,
          dependencyTypes,
          showWeakDependencies,
          maxNodes
        };
        
        const mermaidLines = generateMermaidGraphFromUI(graphData, filters);
        lines.push(...mermaidLines);
        lines.push('');
        
        // Add statistics
        lines.push('## Summary');
        lines.push('');
        const nodesByKind = {};
        nodes.forEach(node => {
          nodesByKind[node.kind] = (nodesByKind[node.kind] || 0) + 1;
        });
        
        lines.push('### Resources by Type');
        Object.entries(nodesByKind).forEach(([kind, count]) => {
          lines.push(`- **${kind}:** ${count}`);
        });
        lines.push('');
        
        const edgesByType = {};
        filteredEdges.forEach(edge => {
          edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
        });
        
        lines.push('### Dependencies by Type');
        Object.entries(edgesByType).forEach(([type, count]) => {
          lines.push(`- **${type}:** ${count}`);
        });
        lines.push('');
        
        // Add detailed tables if requested
        lines.push('## Resource Details');
        lines.push('');
        lines.push('| Kind | Name | Namespace | Labels | Created |');
        lines.push('|------|------|-----------|--------|---------|');
        
        nodes.slice(0, 100).forEach(node => {
          const labelsCount = Object.keys(node.labels || {}).length;
          const created = node.creationTimestamp ? new Date(node.creationTimestamp).toLocaleDateString() : 'Unknown';
          lines.push(`| ${node.kind} | ${node.name} | ${node.namespace || 'cluster'} | ${labelsCount} | ${created} |`);
        });
        
        if (nodes.length > 100) {
          lines.push('');
          lines.push(`*Showing first 100 of ${nodes.length} resources*`);
        }
        
        lines.push('');
        lines.push('## Dependency Details');
        lines.push('');
        lines.push('| Source | Target | Type | Strength | Description |');
        lines.push('|--------|--------|------|----------|-------------|');
        
        filteredEdges.slice(0, 100).forEach(edge => {
          const reason = (edge.metadata?.reason || 'No description').replace(/\|/g, '\\|');
          lines.push(`| ${edge.source} | ${edge.target} | ${edge.type} | ${edge.strength} | ${reason} |`);
        });
        
        if (filteredEdges.length > 100) {
          lines.push('');
          lines.push(`*Showing first 100 of ${filteredEdges.length} dependencies*`);
        }
        
        const markdownData = lines.join('\n');
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.md"`);
        res.send(markdownData);
        break;
        
      default:
        res.setHeader('Content-Type', 'application/json');
        res.json(graphData);
    }
    
    log(`UI Graph Export complete: ${format} format, ${nodes.length} nodes, ${filteredEdges.length} edges`);
    
  } catch (error) {
    log('ERROR: Failed to export UI dependency graph:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Export CRD analysis results in various formats (must be before generic route)
app.get('/api/dependencies/crd/export', async (req, res) => {
  const format = req.query.format || 'json';
  const includeRawGraph = req.query.includeRawGraph === 'true';
  const includeSchemaDetails = req.query.includeSchemaDetails === 'true';
  const includeDependencyMetadata = req.query.includeDependencyMetadata === 'true';
  
  log(`Export request: format=${format}, includeRawGraph=${includeRawGraph}, includeSchemaDetails=${includeSchemaDetails}`);
  
  try {
    // Get the analysis options from query parameters (same as enhanced analysis)
    const apiGroups = req.query.apiGroups ? req.query.apiGroups.split(',').map(g => g.trim()).filter(Boolean) : [];
    const crds = req.query.crds ? req.query.crds.split(',').map(c => c.trim()).filter(Boolean) : [];
    const maxCRDs = parseInt(req.query.maxCRDs) || 9999; // Remove limit for export
    const includeNativeResources = req.query.includeNative !== 'false';
    const analysisDepth = req.query.depth || 'deep';
    
    // Perform the analysis to get data for export
    const analysisOptions = {
      apiGroups: apiGroups.length > 0 ? apiGroups : undefined,
      crds: crds.length > 0 ? crds : undefined,
      maxCRDs,
      includeNativeResources,
      analysisDepth
    };
    
    const analysisResult = await analyzeCRDSchemasEnhanced(analysisOptions);
    
    // Transform analysis result into export format
    const exportData = await generateExportData(analysisResult, analysisOptions, {
      format,
      includeRawGraph,
      includeSchemaDetails,
      includeDependencyMetadata
    });
    
    // Set appropriate headers based on format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const baseFilename = `crd-analysis-${timestamp}`;
    
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.json"`);
        res.json(exportData);
        break;
        
      case 'csv':
        const csvData = await generateCSVExport(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.csv"`);
        res.send(csvData);
        break;
        
      case 'markdown':
        const markdownData = await generateMarkdownExport(exportData);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.md"`);
        res.send(markdownData);
        break;
        
      default:
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
    }
    
    log(`Export complete: ${format} format, ${exportData.crdSchemas?.length || 0} CRDs, ${exportData.dependencies?.length || 0} dependencies`);
    
  } catch (error) {
    log('ERROR: Failed to export CRD analysis:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get resource dependencies for a specific resource
app.get('/api/dependencies/:kind/:name', async (req, res) => {
  const { kind, name } = req.params;
  const namespace = req.query.namespace;
  log(`Resource dependencies request for ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ''}`);

  try {
    let resource = null;
    
    // Fetch the specific resource based on kind and name
    switch (kind.toLowerCase()) {
      case 'pod':
        if (!namespace) throw new Error('Namespace required for Pod');
        resource = await coreV1Api.readNamespacedPod({ name, namespace });
        break;
      case 'service':
        if (!namespace) throw new Error('Namespace required for Service');
        resource = await coreV1Api.readNamespacedService({ name, namespace });
        break;
      case 'deployment':
        if (!namespace) throw new Error('Namespace required for Deployment');
        resource = await appsV1Api.readNamespacedDeployment({ name, namespace });
        break;
      case 'configmap':
        if (!namespace) throw new Error('Namespace required for ConfigMap');
        resource = await coreV1Api.readNamespacedConfigMap({ name, namespace });
        break;
      case 'secret':
        if (!namespace) throw new Error('Namespace required for Secret');
        resource = await coreV1Api.readNamespacedSecret({ name, namespace });
        break;
      case 'node':
        resource = await coreV1Api.readNode({ name });
        break;
      case 'namespace':
        resource = await coreV1Api.readNamespace({ name });
        break;
      case 'serviceaccount':
      case 'ServiceAccount':
        if (!namespace) throw new Error('Namespace required for ServiceAccount');
        resource = await coreV1Api.readNamespacedServiceAccount({ name, namespace });
        break;
      default:
        throw new Error(`Resource kind '${kind}' not supported yet`);
    }

    if (!resource) {
      return res.status(404).json({ error: `Resource ${kind}/${name} not found` });
    }
    
    // Ensure resource has kind property set
    if (!resource.kind) {
      resource.kind = kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();
      // Handle special cases
      if (kind.toLowerCase() === 'serviceaccount') {
        resource.kind = 'ServiceAccount';
      }
    }

    // Analyze dependencies
    const dependencies = await analyzeResourceDependencies(resource);
    
    const response = {
      resource: {
        kind: resource.kind,
        name: resource.metadata?.name,
        namespace: resource.metadata?.namespace,
        uid: resource.metadata?.uid,
        labels: resource.metadata?.labels,
        creationTimestamp: resource.metadata?.creationTimestamp
      },
      dependencies
    };
    
    log(`Found ${dependencies.outgoing.length + dependencies.incoming.length + dependencies.related.length} dependencies for ${kind}/${name}`);
    res.json(response);
  } catch (error) {
    log(`ERROR: Failed to get dependencies for ${kind}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced CRD Dictionary Analysis with multi-API group support and efficient OpenAPI schema analysis
const analyzeCRDSchemasEnhanced = async (options = {}) => {
  try {
    const { 
      apiGroups = [], 
      maxCRDs = parseInt(process.env.MAX_CRD_ANALYSIS || '100'),
      includeNativeResources = true,
      analysisDepth = 'deep'
    } = options;
    
    log(`Analyzing CRD schemas for dictionary relationships... (API groups: ${apiGroups.length > 0 ? apiGroups.join(', ') : 'all'}, maxCRDs: ${maxCRDs})`);
    const nodes = [];
    const edges = [];
    const edgeMap = new Map();
    const apiGroupStats = new Map();
    
    // Helper function to add an edge safely (avoiding duplicates)
    const addEdge = (edgeId, source, target, type, strength, metadata) => {
      if (edgeMap.has(edgeId)) return;
      
      const edge = {
        id: edgeId,
        source,
        target,
        type,
        strength,
        metadata
      };
      
      edges.push(edge);
      edgeMap.set(edgeId, edge);
    };
    
    // Get all CRDs
    const crdResponse = await apiExtensionsV1Api.listCustomResourceDefinition();
    let crds = crdResponse.items || [];
    log(`Found ${crds.length} CRDs to analyze`);
    
    // Filter by API groups if specified
    if (apiGroups.length > 0) {
      crds = crds.filter(crd => apiGroups.includes(crd.spec.group));
      log(`Filtered to ${crds.length} CRDs matching API groups: ${apiGroups.join(', ')}`);
    }
    
    // Build API group statistics
    crds.forEach(crd => {
      const group = crd.spec.group;
      if (!apiGroupStats.has(group)) {
        apiGroupStats.set(group, { count: 0, crds: [] });
      }
      const groupStats = apiGroupStats.get(group);
      groupStats.count++;
      groupStats.crds.push(crd.metadata.name);
    });
    
    // Enhanced core Kubernetes resource types with API group information
    const coreResourceTypes = [
      { name: 'Pod', group: 'core', version: 'v1' },
      { name: 'Service', group: 'core', version: 'v1' },
      { name: 'ConfigMap', group: 'core', version: 'v1' },
      { name: 'Secret', group: 'core', version: 'v1' },
      { name: 'PersistentVolumeClaim', group: 'core', version: 'v1' },
      { name: 'ServiceAccount', group: 'core', version: 'v1' },
      { name: 'Deployment', group: 'apps', version: 'v1' },
      { name: 'ReplicaSet', group: 'apps', version: 'v1' },
      { name: 'DaemonSet', group: 'apps', version: 'v1' },
      { name: 'StatefulSet', group: 'apps', version: 'v1' },
      { name: 'Job', group: 'batch', version: 'v1' },
      { name: 'CronJob', group: 'batch', version: 'v1' },
      { name: 'Role', group: 'rbac.authorization.k8s.io', version: 'v1' },
      { name: 'ClusterRole', group: 'rbac.authorization.k8s.io', version: 'v1' },
      { name: 'RoleBinding', group: 'rbac.authorization.k8s.io', version: 'v1' },
      { name: 'ClusterRoleBinding', group: 'rbac.authorization.k8s.io', version: 'v1' },
      { name: 'Ingress', group: 'networking.k8s.io', version: 'v1' },
      { name: 'NetworkPolicy', group: 'networking.k8s.io', version: 'v1' },
      { name: 'HorizontalPodAutoscaler', group: 'autoscaling', version: 'v2' },
      { name: 'VerticalPodAutoscaler', group: 'autoscaling.k8s.io', version: 'v1' }
    ];
    
    // Add core resource type nodes (if including native resources)
    if (includeNativeResources) {
      coreResourceTypes.forEach(resourceType => {
        const nodeId = `core-${resourceType.name}`;
        nodes.push({
          id: nodeId,
          kind: resourceType.name,
          name: resourceType.name,
          namespace: undefined,
          labels: { 
            'dictionary.type': 'core-resource-type',
            'api.group': resourceType.group,
            'api.version': resourceType.version
          },
          creationTimestamp: undefined,
          status: { phase: 'Available' }
        });
      });
    }
    
    // Enhanced schema analysis with better efficiency
    const analyzeSchemaPropertiesEfficient = (schema, path = '', depth = 0, maxDepth = 10) => {
      const references = [];
      
      if (!schema || typeof schema !== 'object' || depth > maxDepth) return references;
      
      // Check for direct $ref references
      if (schema.$ref) {
        references.push({
          type: 'ref',
          path: path,
          ref: schema.$ref,
          strength: 'strong'
        });
      }
      
      // Check properties object
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propSchema && typeof propSchema === 'object') {
            const currentPath = path ? `${path}.${propName}` : propName;
            
            // Check for resource type references in field names and descriptions
            const description = propSchema.description || '';
            const fieldName = propName.toLowerCase();
            
            coreResourceTypes.forEach(resourceType => {
              const resourceTypeLower = resourceType.name.toLowerCase();
              
              // More sophisticated matching patterns
              const patterns = [
                resourceTypeLower,
                `${resourceTypeLower}ref`,
                `${resourceTypeLower}name`,
                `${resourceTypeLower}selector`,
                `${resourceTypeLower}template`,
                `${resourceTypeLower}spec`
              ];
              
              const matchesField = patterns.some(pattern => fieldName.includes(pattern));
              const matchesDescription = description.toLowerCase().includes(resourceTypeLower);
              
              if (matchesField || matchesDescription) {
                references.push({
                  type: 'schema-field',
                  path: currentPath,
                  resourceType: resourceType.name,
                  strength: matchesField ? 'strong' : 'weak',
                  reason: matchesField ? 
                    `Field name '${propName}' references ${resourceType.name}` :
                    `Description mentions ${resourceType.name}`
                });
              }
            });
            
            // Recursively analyze nested properties
            const nestedRefs = analyzeSchemaPropertiesEfficient(propSchema, currentPath, depth + 1, maxDepth);
            references.push(...nestedRefs);
          }
        }
      }
      
      // Handle array items
      if (schema.items) {
        const arrayRefs = analyzeSchemaPropertiesEfficient(schema.items, `${path}[]`, depth + 1, maxDepth);
        references.push(...arrayRefs);
      }
      
      // Handle oneOf, anyOf, allOf
      ['oneOf', 'anyOf', 'allOf'].forEach(keyword => {
        if (schema[keyword] && Array.isArray(schema[keyword])) {
          schema[keyword].forEach((subSchema, index) => {
            const subRefs = analyzeSchemaPropertiesEfficient(subSchema, `${path}.${keyword}[${index}]`, depth + 1, maxDepth);
            references.push(...subRefs);
          });
        }
      });
      
      return references;
    };
    
    // Analyze each CRD with enhanced efficiency
    const crdsToAnalyze = crds.slice(0, maxCRDs);
    for (const crd of crdsToAnalyze) {
      try {
        const crdName = crd.metadata.name;
        const crdGroup = crd.spec.group;
        const crdNodeId = `crd-${crdName}`;
        
        // Add CRD definition node with enhanced metadata
        nodes.push({
          id: crdNodeId,
          kind: 'CustomResourceDefinition',
          name: crdName,
          namespace: undefined,
          labels: { 
            'dictionary.type': 'crd-definition',
            'api.group': crdGroup,
            'crd.kind': crd.spec.names.kind,
            'crd.scope': crd.spec.scope,
            ...crd.metadata.labels
          },
          creationTimestamp: crd.metadata.creationTimestamp,
          status: { phase: 'Available' }
        });
        
        // Enhanced CRD schema analysis for resource references
        const versions = crd.spec.versions || [];
        for (const version of versions) {
          if (version.schema?.openAPIV3Schema) {
            const schema = version.schema.openAPIV3Schema;
            
            // Use enhanced schema analysis
            const references = analyzeSchemaPropertiesEfficient(schema, 'spec');
            
            // Process found references
            references.forEach(ref => {
              if (ref.type === 'schema-field' && ref.resourceType) {
                const edgeId = `${crdNodeId}-refs-${ref.resourceType}-${ref.path}`;
                addEdge(
                  edgeId,
                  crdNodeId,
                  `core-${ref.resourceType}`,
                  'custom',
                  ref.strength,
                  {
                    field: ref.path,
                    reason: ref.reason,
                    schemaVersion: version.name,
                    referenceType: 'schema-field',
                    analysisType: 'enhanced'
                  }
                );
              } else if (ref.type === 'ref') {
                // Handle direct $ref references
                const edgeId = `${crdNodeId}-ref-${ref.path}`;
                addEdge(
                  edgeId,
                  crdNodeId,
                  `ref-${ref.ref}`,
                  'custom',
                  'strong',
                  {
                    field: ref.path,
                    reason: `Direct $ref reference: ${ref.ref}`,
                    schemaVersion: version.name,
                    referenceType: 'direct-ref'
                  }
                );
              }
            });
          }
        }
        
        // Enhanced CRD-to-CRD reference detection
        for (const otherCrd of crdsToAnalyze) {
          if (otherCrd.metadata.name === crdName) continue;
          
          const otherCrdName = otherCrd.metadata.name;
          const otherCrdNodeId = `crd-${otherCrdName}`;
          const otherCrdKind = otherCrd.spec.names.kind;
          const otherCrdGroup = otherCrd.spec.group;
          
          // Enhanced CRD-to-CRD reference detection
          const versions = crd.spec.versions || [];
          for (const version of versions) {
            const schema = version.schema?.openAPIV3Schema;
            if (!schema) continue;
            
            // Use efficient schema analysis for CRD references
            const references = analyzeSchemaPropertiesEfficient(schema);
            
            // Check for references to the other CRD
            const hasReference = references.some(ref => 
              ref.reason && (
                ref.reason.toLowerCase().includes(otherCrdKind.toLowerCase()) ||
                ref.reason.toLowerCase().includes(otherCrdName.toLowerCase())
              )
            );
            
            // Also check schema string for backwards compatibility
            const schemaStr = JSON.stringify(schema).toLowerCase();
            const hasSchemaReference = schemaStr.includes(otherCrdKind.toLowerCase()) ||
                                      schemaStr.includes(otherCrdName.toLowerCase()) ||
                                      schemaStr.includes(otherCrdGroup.toLowerCase());
            
            if (hasReference || hasSchemaReference) {
              const edgeId = `${crdNodeId}-refs-${otherCrdNodeId}`;
              addEdge(
                edgeId,
                crdNodeId,
                otherCrdNodeId,
                'custom',
                'strong',
                {
                  reason: `CRD schema references ${otherCrdKind} (${otherCrdGroup})`,
                  schemaVersion: version.name,
                  referenceType: 'crd-to-crd',
                  analysisType: hasReference ? 'enhanced' : 'legacy'
                }
              );
              break;
            }
          }
        }
        
      } catch (crdError) {
        log(`Warning: Failed to analyze CRD ${crd.metadata.name}:`, crdError.message);
      }
    }
    
    log(`Enhanced CRD dictionary analysis complete: ${nodes.length} nodes, ${edges.length} relationships`);
    log(`API group statistics:`, Array.from(apiGroupStats.entries()).map(([group, stats]) => `${group}: ${stats.count} CRDs`));
    
    return {
      metadata: {
        namespace: 'dictionary-analysis',
        nodeCount: nodes.length,
        edgeCount: edges.length,
        timestamp: new Date().toISOString(),
        apiGroups: Array.from(apiGroupStats.keys()),
        apiGroupStats: Object.fromEntries(apiGroupStats),
        analysisOptions: options
      },
      nodes,
      edges
    };
    
  } catch (error) {
    log('ERROR: Failed to analyze CRD schemas:', error.message);
    throw error;
  }
};

// Legacy function for backwards compatibility
const analyzeCRDSchemas = async () => {
  return await analyzeCRDSchemasEnhanced();
};


// Get dependency graph for a namespace or entire cluster
app.get('/api/dependencies/graph', async (req, res) => {
  const namespace = req.query.namespace;
  const includeCustomResources = req.query.includeCustom === 'true';
  const maxNodes = parseInt(req.query.maxNodes) || Math.min(MAX_RESOURCES_PER_TYPE, 50); // Limit for performance
  log(`Dependency graph request for ${namespace ? `namespace: ${namespace}` : 'entire cluster'} (maxNodes: ${maxNodes})`);

  // Clear workload cache at the start of each request to ensure fresh data
  clearWorkloadCache();
  
  try {
    const nodes = [];
    const edges = [];
    const resourceMap = new Map();
    const edgeMap = new Map(); // Track edges to prevent duplicates
    
    // Performance tracking
    const startTime = Date.now();
    let resourcesProcessed = 0;
    const MAX_PROCESSING_TIME = 25000; // 25 seconds max processing time
    
    // Helper function to add an edge safely (avoiding duplicates)
    const addEdge = (edgeId, source, target, type, strength, metadata) => {
      if (edgeMap.has(edgeId)) return; // Skip duplicates
      
      const edge = {
        id: edgeId,
        source,
        target,
        type,
        strength,
        metadata
      };
      
      edges.push(edge);
      edgeMap.set(edgeId, edge);
    };
    
    // Helper function to add a resource as a node
    const addResourceNode = (resource) => {
      if (!resource || !resource.metadata) return;
      
      // Ensure we have a kind, fallback to 'Unknown' if missing
      const kind = resource.kind || 'Unknown';
      const nodeId = `${kind}/${resource.metadata.name}${resource.metadata.namespace ? `@${resource.metadata.namespace}` : ''}`;
      
      if (resourceMap.has(nodeId)) return nodeId;
      
      const node = {
        id: nodeId,
        kind: kind,
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        labels: resource.metadata.labels || {},
        creationTimestamp: resource.metadata.creationTimestamp,
        status: resource.status || {}
      };
      
      nodes.push(node);
      resourceMap.set(nodeId, resource);
      return nodeId;
    };
    
    // Fetch core resources
    const resourceTypes = [
      { kind: 'Pod', api: coreV1Api, method: 'listNamespacedPod', clusterMethod: 'listPodForAllNamespaces' },
      { kind: 'Service', api: coreV1Api, method: 'listNamespacedService', clusterMethod: 'listServiceForAllNamespaces' },
      { kind: 'ConfigMap', api: coreV1Api, method: 'listNamespacedConfigMap', clusterMethod: 'listConfigMapForAllNamespaces' },
      { kind: 'Secret', api: coreV1Api, method: 'listNamespacedSecret', clusterMethod: 'listSecretForAllNamespaces' },
      { kind: 'ServiceAccount', api: coreV1Api, method: 'listNamespacedServiceAccount', clusterMethod: 'listServiceAccountForAllNamespaces' },
      { kind: 'Deployment', api: appsV1Api, method: 'listNamespacedDeployment', clusterMethod: 'listDeploymentForAllNamespaces' },
      { kind: 'ReplicaSet', api: appsV1Api, method: 'listNamespacedReplicaSet', clusterMethod: 'listReplicaSetForAllNamespaces' },
      { kind: 'DaemonSet', api: appsV1Api, method: 'listNamespacedDaemonSet', clusterMethod: 'listDaemonSetForAllNamespaces' }
    ];
    
    for (const resourceType of resourceTypes) {
      try {
        let resources = [];
        if (namespace) {
          const response = await resourceType.api[resourceType.method]({ namespace });
          resources = response.items || [];
        } else {
          const response = await resourceType.api[resourceType.clusterMethod]();
          resources = response.items || [];
        }
        
    // Add nodes and analyze dependencies
        for (const resource of resources.slice(0, maxNodes)) { // Configurable limit for performance
          // Check time and resource limits to prevent infinite loops/heavy processing
          if (Date.now() - startTime > MAX_PROCESSING_TIME) {
            log('Performance limit reached: stopping resource processing early');
            break;
          }
          resourcesProcessed++;
          
          // Ensure resource has kind property set
          if (!resource.kind) {
            resource.kind = resourceType.kind;
          }
          const nodeId = addResourceNode(resource);
          const dependencies = await analyzeResourceDependencies(resource);
          
          // Add dependency edges
          // Process outgoing dependencies
          for (const dep of dependencies.outgoing) {
            if (dep.target && dep.target !== '*pods-matching-selector*') {
              const edgeId = `${nodeId}-->${dep.target}`;
              addEdge(edgeId, nodeId, dep.target, dep.type, dep.strength, dep.metadata);
            }
          }
          
          // Process incoming dependencies (these represent resources that depend on this resource)
          // The edge should be from the dependent resource TO this resource
          for (const dep of dependencies.incoming) {
            if (dep.target && dep.target !== '*pods-matching-selector*') {
              const edgeId = `${dep.target}-->${nodeId}`;
              addEdge(edgeId, dep.target, nodeId, dep.type, dep.strength, dep.metadata);
            }
          }
          
          // Process related dependencies (bidirectional, weak)
          for (const dep of dependencies.related) {
            if (dep.target && dep.target !== '*pods-matching-selector*') {
              const edgeId = `${nodeId}<-->${dep.target}`;
              addEdge(edgeId, nodeId, dep.target, dep.type, dep.strength, dep.metadata);
            }
          }
        }
      } catch (error) {
        log(`Warning: Failed to fetch ${resourceType.kind} resources:`, error.message);
      }
    }
    
    // Add cluster-scoped resources if not filtering by namespace
    if (!namespace) {
      try {
        const nodesResponse = await coreV1Api.listNode();
        const nodes_k8s = nodesResponse.items || [];
        for (const node of nodes_k8s.slice(0, MAX_NODES_TO_INCLUDE)) {
          // Ensure node resource has kind property set
          if (!node.kind) {
            node.kind = 'Node';
          }
          addResourceNode(node);
        }
      } catch (error) {
        log('Warning: Failed to fetch nodes:', error.message);
      }
    }
    
    // Helper function to check if pod labels match a selector
    const podMatchesSelector = (podLabels, selectorLabels) => {
      if (!podLabels || !selectorLabels) return false;
      
      // Check if all selector labels match pod labels
      for (const [key, value] of Object.entries(selectorLabels)) {
        if (podLabels[key] !== value) {
          return false;
        }
      }
      return true;
    };
    
    // Second pass: resolve selector matches and add reverse dependencies
    const servicesToPods = new Map();
    const configMapToPods = new Map();
    const secretToPods = new Map();
    const serviceAccountToPods = new Map();
    
    // Build lookup maps for reverse dependencies
    for (const edge of edges) {
      if (edge.type === 'environment' || edge.type === 'configMap') {
        if (edge.target.startsWith('ConfigMap/')) {
          if (!configMapToPods.has(edge.target)) {
            configMapToPods.set(edge.target, []);
          }
          configMapToPods.get(edge.target).push(edge.source);
        }
      }
      if (edge.type === 'environment' || edge.type === 'secret' || edge.type === 'imagePullSecret') {
        if (edge.target.startsWith('Secret/')) {
          if (!secretToPods.has(edge.target)) {
            secretToPods.set(edge.target, []);
          }
          secretToPods.get(edge.target).push(edge.source);
        }
      }
      if (edge.type === 'serviceAccount') {
        if (edge.target.startsWith('ServiceAccount/')) {
          if (!serviceAccountToPods.has(edge.target)) {
            serviceAccountToPods.set(edge.target, []);
          }
          serviceAccountToPods.get(edge.target).push(edge.source);
        }
      }
    }
    
    // Find Service->Pod relationships by resolving selectors
    const servicePods = nodes.filter(node => node.kind === 'Service');
    const pods = nodes.filter(node => node.kind === 'Pod');
    
    for (const serviceNode of servicePods) {
      const service = resourceMap.get(serviceNode.id);
      if (service && service.spec && service.spec.selector) {
        const selectorLabels = service.spec.selector;
        const matchingPods = [];
        
        for (const podNode of pods) {
          const pod = resourceMap.get(podNode.id);
          if (pod && pod.metadata && pod.metadata.labels && 
              pod.metadata.namespace === service.metadata.namespace) {
            if (podMatchesSelector(pod.metadata.labels, selectorLabels)) {
              matchingPods.push(podNode.id);
              
              // Add Service->Pod edge
              const edgeId = `${serviceNode.id}-->${podNode.id}`;
              addEdge(edgeId, serviceNode.id, podNode.id, 'service', 'strong', {
                field: 'spec.selector',
                reason: `Service ${service.metadata.name} targets Pod ${pod.metadata.name} via label selector`,
                selector: selectorLabels
              });
            }
          }
        }
        
        servicesToPods.set(serviceNode.id, matchingPods);
      }
    }
    
    // Clean up selector placeholder edges
    const filteredEdges = edges.filter(edge => edge.target !== '*selector-match*');
    
    // Add efficient reverse dependency relationships
    // This calculates incoming dependencies by inverting the existing outgoing edges
    const reverseEdgeMap = new Map();
    filteredEdges.forEach(edge => {
      // For each outgoing dependency A -> B, create reverse dependency B <- A
      if (edge.type === 'configMap' || edge.type === 'secret' || edge.type === 'environment' || edge.type === 'serviceAccount') {
        const reverseEdgeId = `${edge.target}<--${edge.source}`;
        if (!edgeMap.has(reverseEdgeId)) {
          const reverseEdge = {
            id: reverseEdgeId,
            source: edge.target,
            target: edge.source,
            type: edge.type,
            strength: edge.strength,
            metadata: {
              ...edge.metadata,
              reason: `Provides ${edge.type} to ${edge.source}`,
              reverse: true
            }
          };
          reverseEdgeMap.set(reverseEdgeId, reverseEdge);
        }
      }
    });
    
    // Add reverse edges to the main edge list (but limit to prevent explosion)
    const MAX_REVERSE_EDGES = 50;
    const reverseEdges = Array.from(reverseEdgeMap.values()).slice(0, MAX_REVERSE_EDGES);
    filteredEdges.push(...reverseEdges);
    
    // Calculate final performance metrics
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    const response = {
      metadata: {
        namespace: namespace || 'cluster',
        nodeCount: nodes.length,
        edgeCount: filteredEdges.length,
        timestamp: new Date().toISOString(),
        serviceToPodMappings: servicesToPods.size,
        configMapDependencies: configMapToPods.size,
        secretDependencies: secretToPods.size,
        serviceAccountDependencies: serviceAccountToPods.size,
        performance: {
          processingTimeMs: processingTime,
          resourcesProcessed: resourcesProcessed,
          cacheHits: workloadCache.size
        }
      },
      nodes,
      edges: filteredEdges
    };
    
    log(`Generated dependency graph: ${nodes.length} nodes, ${filteredEdges.length} edges (${servicesToPods.size} Service->Pod mappings, ${serviceAccountToPods.size} ServiceAccount dependencies) - Processing time: ${processingTime}ms, Resources processed: ${resourcesProcessed}`);
    
    // Clear cache after each request to prevent memory leaks
    clearWorkloadCache();
    
    res.json(response);
  } catch (error) {
    log(`ERROR: Failed to generate dependency graph:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate structured export data
const generateExportData = async (analysisResult, analysisOptions, exportOptions) => {
  const { nodes, edges, metadata } = analysisResult;
  
  // Calculate statistics
  const crdNodes = nodes.filter(node => node.labels['dictionary.type'] === 'crd-definition');
  const coreResourceNodes = nodes.filter(node => node.labels['dictionary.type'] === 'core-resource-type');
  const strongEdges = edges.filter(edge => edge.strength === 'strong');
  const weakEdges = edges.filter(edge => edge.strength === 'weak');
  
  // Count dependencies per CRD for complexity metrics
  const dependenciesPerCRD = {};
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (sourceNode && sourceNode.labels['dictionary.type'] === 'crd-definition') {
      dependenciesPerCRD[edge.source] = (dependenciesPerCRD[edge.source] || 0) + 1;
    }
  });
  
  const dependencyCounts = Object.values(dependenciesPerCRD);
  const avgDependencies = dependencyCounts.length > 0 ? dependencyCounts.reduce((a, b) => a + b, 0) / dependencyCounts.length : 0;
  const maxDependencies = dependencyCounts.length > 0 ? Math.max(...dependencyCounts) : 0;
  const isolatedCRDs = crdNodes.filter(node => !dependenciesPerCRD[node.id]).length;
  
  // Group nodes by type for statistics
  const nodesByType = {};
  nodes.forEach(node => {
    const type = node.kind || node.labels['dictionary.type'] || 'Unknown';
    nodesByType[type] = (nodesByType[type] || 0) + 1;
  });
  
  // Group edges by type for statistics
  const edgesByType = {};
  edges.forEach(edge => {
    edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
  });
  
  // Generate API group summaries
  const apiGroupMap = new Map();
  crdNodes.forEach(node => {
    const group = node.labels['api-group'] || 'unknown';
    if (!apiGroupMap.has(group)) {
      apiGroupMap.set(group, {
        name: group,
        crdCount: 0,
        versions: new Set(),
        crds: [],
        dependencies: { incoming: 0, outgoing: 0, internal: 0 }
      });
    }
    const groupData = apiGroupMap.get(group);
    groupData.crdCount++;
    groupData.crds.push({
      name: node.name,
      kind: node.kind || 'Unknown',
      scope: node.labels['scope'] || 'Namespaced',
      versions: [node.labels['version'] || 'v1']
    });
    if (node.labels['version']) {
      groupData.versions.add(node.labels['version']);
    }
  });
  
  // Calculate dependencies for API groups
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      const sourceGroup = sourceNode.labels['api-group'] || 'unknown';
      const targetGroup = targetNode.labels['api-group'] || 'unknown';
      
      if (apiGroupMap.has(sourceGroup)) {
        apiGroupMap.get(sourceGroup).dependencies.outgoing++;
      }
      if (apiGroupMap.has(targetGroup)) {
        apiGroupMap.get(targetGroup).dependencies.incoming++;
      }
      if (sourceGroup === targetGroup && apiGroupMap.has(sourceGroup)) {
        apiGroupMap.get(sourceGroup).dependencies.internal++;
      }
    }
  });
  
  const apiGroups = Array.from(apiGroupMap.values()).map(group => ({
    ...group,
    versions: Array.from(group.versions)
  }));
  
  // Generate CRD schema details if requested with enhanced OpenAPI schema information
  let crdSchemas = [];
  if (exportOptions.includeSchemaDetails) {
    // Fetch full CRD definitions from Kubernetes API to get complete schema details
    try {
      const crdResponse = await apiExtensionsV1Api.listCustomResourceDefinition();
      const fullCRDs = crdResponse.items || [];
      
      crdSchemas = crdNodes.map(node => {
        // Find the corresponding full CRD definition
        const fullCRD = fullCRDs.find(crd => crd.metadata.name === node.name);
        
        if (fullCRD && fullCRD.spec) {
          const spec = fullCRD.spec;
          return {
            name: node.name,
            kind: spec.names?.kind || node.kind || 'Unknown',
            group: spec.group || node.labels['api-group'] || 'unknown',
            versions: spec.versions?.map(version => ({
              name: version.name,
              served: version.served || false,
              storage: version.storage || false,
              deprecated: version.deprecated || false,
              deprecationWarning: version.deprecationWarning,
              schema: version.schema?.openAPIV3Schema || undefined,
              additionalPrinterColumns: version.additionalPrinterColumns || [],
              subresources: version.subresources || {}
            })) || [{
              name: node.labels['version'] || 'v1',
              served: true,
              storage: true,
              schema: node.labels['schema'] ? JSON.parse(node.labels['schema']) : undefined
            }],
            scope: spec.scope || (node.labels['scope'] === 'Cluster' ? 'Cluster' : 'Namespaced'),
            shortNames: spec.names?.shortNames || [],
            categories: spec.names?.categories || [],
            singular: spec.names?.singular,
            plural: spec.names?.plural,
            listKind: spec.names?.listKind,
            description: fullCRD.metadata?.annotations?.['kubernetes.io/description'] || `Custom Resource Definition: ${spec.names?.kind || node.kind}`,
            instanceCount: parseInt(node.labels['instance-count']) || 0,
            conversion: spec.conversion,
            preserveUnknownFields: spec.preserveUnknownFields
          };
        } else {
          // Fallback to basic information if full CRD not found
          return {
            name: node.name,
            kind: node.kind || 'Unknown',
            group: node.labels['api-group'] || 'unknown',
            versions: [{
              name: node.labels['version'] || 'v1',
              served: true,
              storage: true,
              schema: node.labels['schema'] ? JSON.parse(node.labels['schema']) : undefined
            }],
            scope: node.labels['scope'] === 'Cluster' ? 'Cluster' : 'Namespaced',
            shortNames: node.labels['short-names'] ? node.labels['short-names'].split(',') : [],
            categories: node.labels['categories'] ? node.labels['categories'].split(',') : [],
            description: node.labels['description'] || `Custom Resource Definition: ${node.kind}`,
            instanceCount: parseInt(node.labels['instance-count']) || 0
          };
        }
      });
    } catch (error) {
      log('Warning: Could not fetch full CRD definitions for enhanced schema details:', error.message);
      // Fallback to basic schema information
      crdSchemas = crdNodes.map(node => ({
        name: node.name,
        kind: node.kind || 'Unknown',
        group: node.labels['api-group'] || 'unknown',
        versions: [{
          name: node.labels['version'] || 'v1',
          served: true,
          storage: true,
          schema: node.labels['schema'] ? JSON.parse(node.labels['schema']) : undefined
        }],
        scope: node.labels['scope'] === 'Cluster' ? 'Cluster' : 'Namespaced',
        shortNames: node.labels['short-names'] ? node.labels['short-names'].split(',') : [],
        categories: node.labels['categories'] ? node.labels['categories'].split(',') : [],
        description: node.labels['description'] || `Custom Resource Definition: ${node.kind}`,
        instanceCount: parseInt(node.labels['instance-count']) || 0
      }));
    }
  }
  
  // Generate dependency details
  const dependencies = edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    return {
      id: edge.id,
      source: {
        name: sourceNode?.name || 'Unknown',
        kind: sourceNode?.kind || 'Unknown',
        group: sourceNode?.labels['api-group'],
        version: sourceNode?.labels['version']
      },
      target: {
        name: targetNode?.name || 'Unknown',
        kind: targetNode?.kind || 'Unknown',
        group: targetNode?.labels['api-group'],
        version: targetNode?.labels['version']
      },
      type: edge.type,
      strength: edge.strength,
      reason: edge.metadata?.reason || 'Schema dependency',
      field: edge.metadata?.field,
      metadata: exportOptions.includeDependencyMetadata ? edge.metadata : undefined
    };
  });
  
  return {
    metadata: {
      exportTimestamp: new Date().toISOString(),
      exportFormat: exportOptions.format,
      analysisTimestamp: metadata.timestamp,
      clusterInfo: {
        name: 'kubernetes-admin-ui-cluster',
        version: process.env.KUBERNETES_VERSION || 'unknown'
      }
    },
    analysisOptions: {
      selectedAPIGroups: analysisOptions.apiGroups || [],
      selectedCRDs: analysisOptions.crds || [],
      maxCRDs: analysisOptions.maxCRDs,
      includeNativeResources: analysisOptions.includeNativeResources,
      analysisDepth: analysisOptions.analysisDepth
    },
    statistics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      crdNodes: crdNodes.length,
      coreResourceNodes: coreResourceNodes.length,
      strongDependencies: strongEdges.length,
      weakDependencies: weakEdges.length,
      apiGroupCount: apiGroups.length,
      nodesByType,
      edgesByType,
      complexityMetrics: {
        averageDependenciesPerCRD: Math.round(avgDependencies * 100) / 100,
        maxDependenciesPerCRD: maxDependencies,
        circularDependencies: 0, // TODO: Implement circular dependency detection
        isolatedCRDs
      }
    },
    apiGroups,
    crdSchemas,
    dependencies,
    rawGraph: exportOptions.includeRawGraph ? { nodes, edges } : undefined
  };
};

// Helper function to generate CSV export
const generateCSVExport = async (exportData) => {
  const csvLines = [];
  
  // CRD Summary CSV
  csvLines.push('=== CRD SUMMARY ===');
  csvLines.push('Name,Kind,Group,Versions,Scope,Instance Count,Incoming Dependencies,Outgoing Dependencies');
  
  exportData.crdSchemas.forEach(crd => {
    const incoming = exportData.dependencies.filter(dep => dep.target.name === crd.name).length;
    const outgoing = exportData.dependencies.filter(dep => dep.source.name === crd.name).length;
    const versions = crd.versions.map(v => v.name).join(';');
    
    csvLines.push(`"${crd.name}","${crd.kind}","${crd.group}","${versions}","${crd.scope}",${crd.instanceCount || 0},${incoming},${outgoing}`);
  });
  
  csvLines.push('');
  csvLines.push('=== DEPENDENCIES ===');
  csvLines.push('Source Kind,Source Name,Source Group,Target Kind,Target Name,Target Group,Dependency Type,Strength,Reason');
  
  exportData.dependencies.forEach(dep => {
    csvLines.push(`"${dep.source.kind}","${dep.source.name}","${dep.source.group || ''}","${dep.target.kind}","${dep.target.name}","${dep.target.group || ''}","${dep.type}","${dep.strength}","${dep.reason}"`);
  });
  
  csvLines.push('');
  csvLines.push('=== API GROUP SUMMARY ===');
  csvLines.push('API Group,CRD Count,Versions,Total Dependencies');
  
  exportData.apiGroups.forEach(group => {
    const totalDeps = group.dependencies.incoming + group.dependencies.outgoing;
    const versions = group.versions.join(';');
    csvLines.push(`"${group.name}",${group.crdCount},"${versions}",${totalDeps}`);
  });
  
  return csvLines.join('\n');
};

// Helper function to generate Mermaid graph from UI dependency graph data
const generateMermaidGraphFromUI = (graphData, filters = {}) => {
  const lines = [];
  
  if (!graphData || !graphData.nodes || !graphData.edges || graphData.nodes.length === 0) {
    lines.push('```mermaid');
    lines.push('graph TD');
    lines.push('    NoData["No Resources Found"]');
    lines.push('```');
    return lines;
  }
  
  lines.push('```mermaid');
  lines.push('graph LR');
  
  // Apply the same filtering logic as the UI component
  let filteredNodes = [...graphData.nodes];
  let filteredEdges = [...graphData.edges];
  
  // Apply search filter if provided
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredNodes = filteredNodes.filter(node => {
      if (!node) return false;
      return (
        (node.name && node.name.toLowerCase().includes(searchLower)) ||
        (node.kind && node.kind.toLowerCase().includes(searchLower)) ||
        (node.namespace && node.namespace.toLowerCase().includes(searchLower))
      );
    });
  }
  
  // Apply resource type filter if provided
  if (filters.resourceTypes && filters.resourceTypes.length > 0) {
    filteredNodes = filteredNodes.filter(node => 
      node && node.kind && filters.resourceTypes.includes(node.kind)
    );
  }
  
  // Create node IDs set for edge filtering
  const nodeIds = new Set(filteredNodes.map(node => node.id));
  
  // Filter edges to only include those connecting filtered nodes
  filteredEdges = filteredEdges.filter(edge => 
    edge && edge.source && edge.target &&
    nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  
  // Apply dependency type filter if provided
  if (filters.dependencyTypes && filters.dependencyTypes.length > 0) {
    filteredEdges = filteredEdges.filter(edge => 
      edge && edge.type && filters.dependencyTypes.includes(edge.type)
    );
  }
  
  // Apply weak dependency filter if specified
  if (filters.showWeakDependencies === false) {
    filteredEdges = filteredEdges.filter(edge => edge && edge.strength === 'strong');
  }
  
  // If no edges remain after filtering, show message
  if (filteredEdges.length === 0) {
    if (filteredNodes.length > 0) {
      lines.push('    NoEdges["No Dependencies Found with Current Filters"]');
    } else {
      lines.push('    NoNodes["No Resources Found with Current Filters"]');
    }
    lines.push('```');
    return lines;
  }
  
  // Apply reasonable limits for Mermaid readability 
  const maxMermaidNodes = Math.min(filters.maxNodes || 25, 25); // Mermaid gets cluttered with too many nodes
  const maxMermaidEdges = 50;
  
  // Priority: show nodes that have the most connections first
  const nodeConnections = new Map();
  filteredEdges.forEach(edge => {
    nodeConnections.set(edge.source, (nodeConnections.get(edge.source) || 0) + 1);
    nodeConnections.set(edge.target, (nodeConnections.get(edge.target) || 0) + 1);
  });
  
  // Sort nodes by connection count (most connected first) for better visualization
  const sortedNodes = [...filteredNodes].sort((a, b) => {
    const aConnections = nodeConnections.get(a.id) || 0;
    const bConnections = nodeConnections.get(b.id) || 0;
    return bConnections - aConnections;
  });
  
  filteredNodes = sortedNodes.slice(0, maxMermaidNodes);
  
  // Re-filter edges based on limited nodes
  const limitedNodeIds = new Set(filteredNodes.map(node => node.id));
  filteredEdges = filteredEdges.filter(edge => 
    limitedNodeIds.has(edge.source) && limitedNodeIds.has(edge.target)
  ).slice(0, maxMermaidEdges);
  
  const nodeMap = new Map();
  let nodeCounter = 0;
  
  // Helper to get clean node ID and label (same logic as UI)
  const getNodeInfo = (node) => {
    if (!nodeMap.has(node.id)) {
      const nodeId = `N${++nodeCounter}`;
      
      // Create clean labels (same as UI CustomResourceNode component)
      let cleanName = node.name || 'Unknown';
      let displayKind = node.kind || 'Unknown';
      
      // Shorten long names for better readability
      if (cleanName.length > 15) {
        cleanName = cleanName.substring(0, 12) + '...';
      }
      
      // Add namespace info if present
      let label = `${displayKind}\\n${cleanName}`;
      if (node.namespace) {
        label += `\\n(${node.namespace})`;
      }
      
      nodeMap.set(node.id, { id: nodeId, label, originalKind: node.kind, node });
    }
    return nodeMap.get(node.id);
  };
  
  // Process all nodes to create node mappings
  filteredNodes.forEach(node => {
    getNodeInfo(node);
  });
  
  // Add edges with the same styling logic as the UI
  const addedEdges = new Set();
  
  filteredEdges.forEach(edge => {
    const sourceNode = filteredNodes.find(n => n.id === edge.source);
    const targetNode = filteredNodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;
    
    const sourceInfo = getNodeInfo(sourceNode);
    const targetInfo = getNodeInfo(targetNode);
    
    // Avoid duplicate edges
    const edgeKey = `${sourceInfo.id}-${targetInfo.id}-${edge.type}`;
    if (addedEdges.has(edgeKey)) return;
    addedEdges.add(edgeKey);
    
    // Determine edge style based on dependency type and strength (same as UI)
    let edgeStyle = '-->';
    if (edge.strength === 'strong') {
      edgeStyle = '==>';
    }
    
    // Create edge with meaningful label (same mapping as UI theme)
    const depTypeLabel = {
      'owner': '👑',
      'volume': '💾',
      'service': '🌐',
      'serviceAccount': '👤',
      'selector': '🔍',
      'network': '🌍',
      'configMap': '⚙️',
      'secret': '🔐',
      'environment': '🌿',
      'imagePullSecret': '🖼️',
      'scheduling': '📅',
      'custom': '🔗'
    }[edge.type] || edge.type;
    
    lines.push(`    ${sourceInfo.id} ${edgeStyle}|${depTypeLabel}| ${targetInfo.id}`);
    
    // Add edge styling (same colors as UI theme)
    const edgeColors = {
      'owner': '#ff6b6b',
      'volume': '#4ecdc4',
      'service': '#ffa726',
      'serviceAccount': '#42a5f5',
      'selector': '#66bb6a',
      'network': '#ab47bc',
      'configMap': '#26c6da',
      'secret': '#ef5350',
      'environment': '#9ccc65',
      'imagePullSecret': '#ffa726',
      'scheduling': '#8d6e63',
      'custom': '#78909c'
    };
    
    const edgeColor = edgeColors[edge.type] || '#666666';
    const strokeWidth = edge.strength === 'strong' ? '3px' : '1px';
    const strokeDash = edge.strength === 'weak' ? ',stroke-dasharray: 5 5' : '';
    
    lines.push(`    linkStyle ${addedEdges.size - 1} stroke:${edgeColor},stroke-width:${strokeWidth}${strokeDash}`);
  });
  
  // Add node definitions with styling (same as UI)
  nodeMap.forEach(nodeInfo => {
    lines.push(`    ${nodeInfo.id}["${nodeInfo.label}"]`);
    
    // Apply styling based on node type (same logic as UI)
    const nodeKind = nodeInfo.originalKind;
    let nodeClass = 'default';
    
    if (['Pod'].includes(nodeKind)) {
      nodeClass = 'pod';
    } else if (['Service', 'Ingress'].includes(nodeKind)) {
      nodeClass = 'service';
    } else if (['Deployment', 'ReplicaSet', 'DaemonSet', 'StatefulSet'].includes(nodeKind)) {
      nodeClass = 'workload';
    } else if (['ConfigMap', 'Secret'].includes(nodeKind)) {
      nodeClass = 'config';
    } else if (nodeKind.includes('Custom') || nodeKind === 'CustomResourceDefinition') {
      nodeClass = 'crd';
    }
    
    lines.push(`    class ${nodeInfo.id} ${nodeClass}`);
  });
  
  // Add styles (same color scheme as UI theme)
  lines.push('');
  lines.push('    classDef default fill:#f9f9f9,stroke:#666666,stroke-width:1px,color:#000');
  lines.push('    classDef pod fill:#e8f5e8,stroke:#4caf50,stroke-width:2px,color:#000');
  lines.push('    classDef service fill:#e3f2fd,stroke:#2196f3,stroke-width:2px,color:#000');
  lines.push('    classDef workload fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000');
  lines.push('    classDef config fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000');
  lines.push('    classDef crd fill:#e8f5e8,stroke:#1976d2,stroke-width:3px,color:#000,font-weight:bold');
  
  // Add note about filtering if we limited the results
  if (filteredNodes.length < graphData.nodes.length || filteredEdges.length < graphData.edges.length) {
    lines.push(`    %% Showing ${filteredNodes.length} resources and ${filteredEdges.length} dependencies`);
    lines.push(`    %% Original: ${graphData.nodes.length} resources, ${graphData.edges.length} dependencies`);
  }
  
  lines.push('```');
  return lines;
};

// Keep the legacy function for backward compatibility with CRD exports
const generateMermaidGraph = (exportData) => {
  const lines = [];
  
  if (!exportData.dependencies || exportData.dependencies.length === 0) {
    lines.push('```mermaid');
    lines.push('graph TD');
    lines.push('    NoData["No Dependencies Found"]');
    lines.push('```');
    return lines;
  }
  
  lines.push('```mermaid');
  lines.push('graph LR');
  
  // Group dependencies by source CRD for better visualization
  const crdDependencies = new Map();
  const nodeMap = new Map();
  let nodeCounter = 0;
  
  // Helper to get clean node ID and label
  const getNodeInfo = (name, kind) => {
    const key = `${kind}/${name}`;
    if (!nodeMap.has(key)) {
      const nodeId = `N${++nodeCounter}`;
      
      // Create clean labels
      let cleanName = name;
      let displayKind = kind;
      
      // Handle CRD names - extract the actual kind from CRD schemas if available
      if (kind === 'CustomResourceDefinition' && exportData.crdSchemas) {
        const crdSchema = exportData.crdSchemas.find(crd => crd.name === name);
        if (crdSchema) {
          cleanName = crdSchema.kind;
          displayKind = crdSchema.kind; // Use the actual CRD kind, not generic 'CRD'
        }
      }
      
      // For CRDs, don't truncate - show full kind name
      if (kind !== 'CustomResourceDefinition' && cleanName.length > 15) {
        cleanName = cleanName.substring(0, 12) + '...';
      }
      
      const label = `${displayKind}\\n${cleanName}`;
      nodeMap.set(key, { id: nodeId, label, originalKind: kind });
    }
    return nodeMap.get(key);
  };
  
  // Process dependencies to find meaningful CRD relationships
  const meaningfulDeps = exportData.dependencies.filter(dep => {
    // Focus on strong dependencies and specific types that matter
    return dep.strength === 'strong' || 
           ['configMap', 'secret', 'serviceAccount', 'volume', 'selector'].includes(dep.type);
  });
  
  // Limit to most important dependencies for clarity (25 max)
  const topDeps = meaningfulDeps.slice(0, 25);
  
  if (topDeps.length === 0) {
    lines.push('    NoDeps["No Strong Dependencies Found"]');
    lines.push('```');
    return lines;
  }
  
  // Add nodes and edges
  const addedEdges = new Set();
  
  topDeps.forEach(dep => {
    const sourceInfo = getNodeInfo(dep.source.name, dep.source.kind);
    const targetInfo = getNodeInfo(dep.target.name, dep.target.kind);
    
    // Avoid duplicate edges
    const edgeKey = `${sourceInfo.id}-${targetInfo.id}-${dep.type}`;
    if (addedEdges.has(edgeKey)) return;
    addedEdges.add(edgeKey);
    
    // Determine edge style based on dependency type and strength
    let edgeStyle = '-->';
    let edgeClass = '';
    
    if (dep.strength === 'strong') {
      edgeStyle = '==>';
      edgeClass = ' strong';
    }
    
    // Create edge with meaningful label
    const depTypeLabel = {
      'configMap': 'Config',
      'secret': 'Secret',
      'serviceAccount': 'SA',
      'volume': 'Volume',
      'selector': 'Select',
      'custom': 'Uses',
      'environment': 'Env',
      'imagePullSecret': 'Image'
    }[dep.type] || dep.type;
    
    lines.push(`    ${sourceInfo.id} ${edgeStyle}|${depTypeLabel}| ${targetInfo.id}`);
    
    // Add edge class for styling
    if (edgeClass) {
      lines.push(`    linkStyle ${addedEdges.size - 1} stroke:#ff6b6b,stroke-width:3px`);
    }
  });
  
  // Add node definitions with styling
  nodeMap.forEach(nodeInfo => {
    lines.push(`    ${nodeInfo.id}["${nodeInfo.label}"]`);
    
    // Apply styling based on node type
    if (nodeInfo.originalKind === 'CustomResourceDefinition') {
      lines.push(`    class ${nodeInfo.id} crd`);
    } else {
      lines.push(`    class ${nodeInfo.id} k8s`);
    }
  });
  
  // Add styles
  lines.push('');
  lines.push('    classDef crd fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000,font-weight:bold');
  lines.push('    classDef k8s fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000');
  
  // Add note about filtering if we limited the dependencies
  if (topDeps.length < exportData.dependencies.length) {
    lines.push(`    %% Showing ${topDeps.length} key dependencies of ${exportData.dependencies.length} total`);
  }
  
  lines.push('```');
  return lines;
};

// Helper function to recursively render OpenAPI schema properties
const renderSchemaProperties = (properties, required = [], prefix = '', maxDepth = 3, currentDepth = 0) => {
  const lines = [];
  
  if (!properties || currentDepth >= maxDepth) {
    return lines;
  }
  
  Object.keys(properties).forEach(prop => {
    const propSchema = properties[prop];
    const fullPropName = prefix ? `${prefix}.${prop}` : prop;
    const isRequired = required.includes(prop) ? '✅' : '❌';
    const type = propSchema.type || 'object';
    
    // Format constraints and validation info
    const constraints = [];
    if (propSchema.minimum !== undefined) constraints.push(`min: ${propSchema.minimum}`);
    if (propSchema.maximum !== undefined) constraints.push(`max: ${propSchema.maximum}`);
    if (propSchema.minLength !== undefined) constraints.push(`minLen: ${propSchema.minLength}`);
    if (propSchema.maxLength !== undefined) constraints.push(`maxLen: ${propSchema.maxLength}`);
    if (propSchema.pattern) constraints.push(`pattern: ${propSchema.pattern}`);
    if (propSchema.enum) constraints.push(`enum: [${propSchema.enum.join(', ')}]`);
    if (propSchema.format) constraints.push(`format: ${propSchema.format}`);
    
    const constraintText = constraints.length > 0 ? ` (${constraints.join(', ')})` : '';
    const typeText = `${type}${constraintText}`;
    
    // Handle array types
    let arrayInfo = '';
    if (type === 'array' && propSchema.items) {
      const itemType = propSchema.items.type || 'object';
      arrayInfo = ` of ${itemType}`;
      if (propSchema.items.properties) {
        arrayInfo += ' objects';
      }
    }
    
    // Description with proper escaping
    let description = propSchema.description || '';
    if (description.length > 200) {
      description = description.substring(0, 200) + '...';
    }
    description = description.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    
    // Add default value if present
    if (propSchema.default !== undefined) {
      const defaultVal = typeof propSchema.default === 'object' ? JSON.stringify(propSchema.default) : propSchema.default;
      description = `${description}${description ? ' ' : ''}Default: \`${defaultVal}\``;
    }
    
    lines.push(`| ${fullPropName} | ${typeText}${arrayInfo} | ${isRequired} | ${description} |`);
    
    // Recursively process nested object properties
    if (propSchema.type === 'object' && propSchema.properties && currentDepth < maxDepth - 1) {
      const nestedRequired = propSchema.required || [];
      const nestedLines = renderSchemaProperties(
        propSchema.properties,
        nestedRequired,
        fullPropName,
        maxDepth,
        currentDepth + 1
      );
      lines.push(...nestedLines);
    }
    
    // Handle array items with properties
    if (propSchema.type === 'array' && propSchema.items && propSchema.items.properties && currentDepth < maxDepth - 1) {
      const itemRequired = propSchema.items.required || [];
      const arrayItemLines = renderSchemaProperties(
        propSchema.items.properties,
        itemRequired,
        `${fullPropName}[]`,
        maxDepth,
        currentDepth + 1
      );
      lines.push(...arrayItemLines);
    }
  });
  
  return lines;
};

// Helper function to generate detailed CRD table with comprehensive OpenAPI schema
const generateDetailedCRDTable = (crdSchemas) => {
  if (!crdSchemas || crdSchemas.length === 0) {
    return ['*No CRD schema details available (enable "Include Schema Details" in export options)*', ''];
  }
  
  const lines = [];
  
  crdSchemas.forEach((crd, index) => {
    if (index > 0) lines.push('---', ''); // Separator between CRDs
    
    lines.push(`### ${crd.kind} (${crd.name})`);
    lines.push('');
    
    // Basic information table
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| **Name** | ${crd.name} |`);
    lines.push(`| **Kind** | ${crd.kind} |`);
    lines.push(`| **API Group** | ${crd.group} |`);
    lines.push(`| **Scope** | ${crd.scope} |`);
    lines.push(`| **Versions** | ${crd.versions.map(v => v.name).join(', ')} |`);
    lines.push(`| **Instance Count** | ${crd.instanceCount || 0} |`);
    
    if (crd.singular) lines.push(`| **Singular** | ${crd.singular} |`);
    if (crd.plural) lines.push(`| **Plural** | ${crd.plural} |`);
    if (crd.listKind) lines.push(`| **List Kind** | ${crd.listKind} |`);
    
    if (crd.shortNames && crd.shortNames.length > 0) {
      lines.push(`| **Short Names** | ${crd.shortNames.join(', ')} |`);
    }
    
    if (crd.categories && crd.categories.length > 0) {
      lines.push(`| **Categories** | ${crd.categories.join(', ')} |`);
    }
    
    if (crd.preserveUnknownFields !== undefined) {
      lines.push(`| **Preserve Unknown Fields** | ${crd.preserveUnknownFields ? '✅' : '❌'} |`);
    }
    
    lines.push('');
    
    // Version details with enhanced information
    if (crd.versions && crd.versions.length > 0) {
      lines.push('#### Version Information');
      lines.push('');
      lines.push('| Version | Served | Storage | Deprecated | Schema | Subresources | Printer Columns |');
      lines.push('|---------|--------|---------|------------|--------|--------------|-----------------|');
      
      crd.versions.forEach(version => {
        const served = version.served ? '✅' : '❌';
        const storage = version.storage ? '✅' : '❌';
        const deprecated = version.deprecated ? '⚠️' : '✅';
        const hasSchema = version.schema ? '✅' : '❌';
        const hasSubresources = version.subresources && Object.keys(version.subresources).length > 0 ? '✅' : '❌';
        const printerCols = version.additionalPrinterColumns ? version.additionalPrinterColumns.length : 0;
        
        lines.push(`| ${version.name} | ${served} | ${storage} | ${deprecated} | ${hasSchema} | ${hasSubresources} | ${printerCols} |`);
        
        if (version.deprecationWarning) {
          lines.push(`| | | | *${version.deprecationWarning}* | | | |`);
        }
      });
      
      lines.push('');
    }
    
    // Conversion information
    if (crd.conversion && crd.conversion.strategy && crd.conversion.strategy !== 'None') {
      lines.push('#### Version Conversion');
      lines.push('');
      lines.push('| Property | Value |');
      lines.push('|----------|-------|');
      lines.push(`| **Strategy** | ${crd.conversion.strategy} |`);
      if (crd.conversion.webhook) {
        lines.push(`| **Webhook Service** | ${crd.conversion.webhook.service?.name || 'N/A'} |`);
        lines.push(`| **Webhook Namespace** | ${crd.conversion.webhook.service?.namespace || 'N/A'} |`);
      }
      lines.push('');
    }
    
    // Comprehensive schema properties for each version
    crd.versions.forEach(version => {
      if (version.schema && version.schema.properties) {
        lines.push(`#### Schema Properties - Version ${version.name}`);
        lines.push('');
        
        // Top-level schema info
        if (version.schema.type) {
          lines.push(`**Root Type:** ${version.schema.type}`);
          lines.push('');
        }
        
        lines.push('| Property Path | Type & Constraints | Required | Description |');
        lines.push('|---------------|-------------------|----------|-------------|');
        
        const required = version.schema.required || [];
        const propertyLines = renderSchemaProperties(version.schema.properties, required, '', 4, 0);
        
        if (propertyLines.length > 0) {
          lines.push(...propertyLines);
        } else {
          lines.push('| *No properties defined* | | | |');
        }
        
        lines.push('');
        
        // Additional printer columns
        if (version.additionalPrinterColumns && version.additionalPrinterColumns.length > 0) {
          lines.push(`##### Additional Printer Columns - Version ${version.name}`);
          lines.push('');
          lines.push('| Name | Type | JSONPath | Description | Priority |');
          lines.push('|------|------|----------|-------------|----------|');
          
          version.additionalPrinterColumns.forEach(col => {
            const description = (col.description || '').replace(/\|/g, '\\|');
            const priority = col.priority || 0;
            lines.push(`| ${col.name} | ${col.type} | ${col.jsonPath} | ${description} | ${priority} |`);
          });
          
          lines.push('');
        }
        
        // Subresources
        if (version.subresources && Object.keys(version.subresources).length > 0) {
          lines.push(`##### Subresources - Version ${version.name}`);
          lines.push('');
          lines.push('| Subresource | Available |');
          lines.push('|-------------|-----------|');
          
          Object.keys(version.subresources).forEach(sub => {
            lines.push(`| ${sub} | ✅ |`);
          });
          
          lines.push('');
        }
      }
    });
    
    // Description
    if (crd.description) {
      lines.push('#### Description');
      lines.push('');
      lines.push(crd.description);
      lines.push('');
    }
  });
  
  return lines;
};

// Helper function to generate Markdown export
const generateMarkdownExport = async (exportData) => {
  const lines = [];
  
  lines.push('# CRD Dependency Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${exportData.metadata.exportTimestamp}`);
  lines.push(`**Analysis Timestamp:** ${exportData.metadata.analysisTimestamp}`);
  lines.push(`**Cluster:** ${exportData.metadata.clusterInfo?.name || 'Unknown'}`);
  lines.push('');
  
  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  lines.push('- [Summary](#summary)');
  lines.push('- [Analysis Configuration](#analysis-configuration)');
  lines.push('- [Dependency Graph](#dependency-graph)');
  lines.push('- [API Groups](#api-groups)');
  lines.push('- [Dependencies Summary](#dependencies-summary)');
  if (exportData.crdSchemas && exportData.crdSchemas.length > 0) {
    lines.push('- [CRD Details](#crd-details)');
    lines.push('- [Detailed CRD Specifications](#detailed-crd-specifications)');
  }
  lines.push('- [Top Dependencies](#top-dependencies)');
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Nodes:** ${exportData.statistics.totalNodes}`);
  lines.push(`- **Total Dependencies:** ${exportData.statistics.totalEdges}`);
  lines.push(`- **CRD Definitions:** ${exportData.statistics.crdNodes}`);
  lines.push(`- **Core Resources:** ${exportData.statistics.coreResourceNodes}`);
  lines.push(`- **API Groups:** ${exportData.statistics.apiGroupCount}`);
  lines.push(`- **Strong Dependencies:** ${exportData.statistics.strongDependencies}`);
  lines.push(`- **Weak Dependencies:** ${exportData.statistics.weakDependencies}`);
  lines.push('');
  
  // Analysis Options
  lines.push('## Analysis Configuration');
  lines.push('');
  lines.push(`- **Selected API Groups:** ${exportData.analysisOptions.selectedAPIGroups.length > 0 ? exportData.analysisOptions.selectedAPIGroups.join(', ') : 'All'}`);
  lines.push(`- **Selected CRDs:** ${exportData.analysisOptions.selectedCRDs.length > 0 ? exportData.analysisOptions.selectedCRDs.join(', ') : 'All in selected groups'}`);
  lines.push(`- **Max CRDs:** ${exportData.analysisOptions.maxCRDs === 9999 ? 'Unlimited' : exportData.analysisOptions.maxCRDs}`);
  lines.push(`- **Include Native Resources:** ${exportData.analysisOptions.includeNativeResources}`);
  lines.push(`- **Analysis Depth:** ${exportData.analysisOptions.analysisDepth}`);
  lines.push('');
  
  // Dependency Graph (Mermaid)
  lines.push('## Dependency Graph');
  lines.push('');
  lines.push('This diagram shows the key dependencies between Custom Resources and core Kubernetes resources.');
  lines.push('Only strong dependencies and important resource types are shown for clarity:');
  lines.push('');
        const mermaidLines = generateMermaidGraph(exportData);
        lines.push(...mermaidLines);
  lines.push('');
  
  // API Groups
  lines.push('## API Groups');
  lines.push('');
  lines.push('| API Group | CRD Count | Versions | Incoming Deps | Outgoing Deps | Internal Deps |');
  lines.push('|-----------|-----------|----------|---------------|---------------|---------------|');
  
  exportData.apiGroups.forEach(group => {
    lines.push(`| ${group.name} | ${group.crdCount} | ${group.versions.join(', ')} | ${group.dependencies.incoming} | ${group.dependencies.outgoing} | ${group.dependencies.internal} |`);
  });
  
  lines.push('');
  
  // CRD Details
  if (exportData.crdSchemas && exportData.crdSchemas.length > 0) {
    lines.push('## CRD Details');
    lines.push('');
    lines.push('| Name | Kind | Group | Scope | Versions | Instances |');
    lines.push('|------|------|-------|-------|----------|-----------|');
    
    exportData.crdSchemas.forEach(crd => {
      const versions = crd.versions.map(v => v.name).join(', ');
      lines.push(`| ${crd.name} | ${crd.kind} | ${crd.group} | ${crd.scope} | ${versions} | ${crd.instanceCount || 0} |`);
    });
    
    lines.push('');
  }
  
  // Dependencies Summary
  lines.push('## Dependencies Summary');
  lines.push('');
  lines.push('### By Type');
  lines.push('');
  Object.entries(exportData.statistics.edgesByType).forEach(([type, count]) => {
    lines.push(`- **${type}:** ${count}`);
  });
  lines.push('');
  
  lines.push('### Complexity Metrics');
  lines.push('');
  lines.push(`- **Average Dependencies per CRD:** ${exportData.statistics.complexityMetrics.averageDependenciesPerCRD}`);
  lines.push(`- **Max Dependencies per CRD:** ${exportData.statistics.complexityMetrics.maxDependenciesPerCRD}`);
  lines.push(`- **Isolated CRDs:** ${exportData.statistics.complexityMetrics.isolatedCRDs}`);
  lines.push('');
  
  // Detailed CRD Specifications
  if (exportData.crdSchemas && exportData.crdSchemas.length > 0) {
    lines.push('## Detailed CRD Specifications');
    lines.push('');
    lines.push('This section provides comprehensive details for each Custom Resource Definition, including schema properties, versions, and configuration details.');
    lines.push('');
    const detailedCRDLines = generateDetailedCRDTable(exportData.crdSchemas);
    lines.push(...detailedCRDLines);
  }
  
  // Top Dependencies (show more in exports)
  if (exportData.dependencies.length > 0) {
    lines.push('## Top Dependencies');
    lines.push('');
    lines.push('| Source | Target | Type | Strength | Reason |');
    lines.push('|--------|--------|------|----------|--------|');
    
    const dependenciesToShow = Math.min(exportData.dependencies.length, 100); // Show up to 100 in exports
    exportData.dependencies.slice(0, dependenciesToShow).forEach(dep => {
      const reason = dep.reason.replace(/\|/g, '\\|'); // Escape pipe characters in markdown
      lines.push(`| ${dep.source.kind}/${dep.source.name} | ${dep.target.kind}/${dep.target.name} | ${dep.type} | ${dep.strength} | ${reason} |`);
    });
    
    if (exportData.dependencies.length > dependenciesToShow) {
      lines.push('');
      lines.push(`*Showing first ${dependenciesToShow} of ${exportData.dependencies.length} total dependencies*`);
    }
  }
  
  return lines.join('\n');
};

// Configuration validation
const validateConfiguration = () => {
  const errors = [];
  const warnings = [];
  
  // Validate port
  if (port < 1000 || port > 65535) {
    errors.push(`Invalid port: ${port}. Must be between 1000-65535`);
  }
  
  // Validate timeout
  if (apiTimeout < 1000) {
    errors.push(`Invalid timeout: ${apiTimeout}. Must be at least 1000ms`);
  }
  
  // Note: CLUSTER_CONTEXT is optional - if not set, current kubectl context is used
  // This is validated during kubeconfig loading
  
  // Validate performance limits
  if (MAX_RESOURCES_PER_TYPE < 1 || MAX_RESOURCES_PER_TYPE > 1000) {
    warnings.push(`MAX_RESOURCES_PER_TYPE (${MAX_RESOURCES_PER_TYPE}) should be between 1-1000`);
  }
  
  if (MAX_NAMESPACES_TO_SCAN < 1 || MAX_NAMESPACES_TO_SCAN > 100) {
    warnings.push(`MAX_NAMESPACES_TO_SCAN (${MAX_NAMESPACES_TO_SCAN}) should be between 1-100`);
  }
  
  if (MAX_NODES_TO_INCLUDE < 1 || MAX_NODES_TO_INCLUDE > 500) {
    warnings.push(`MAX_NODES_TO_INCLUDE (${MAX_NODES_TO_INCLUDE}) should be between 1-500`);
  }
  
  // Report results
  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease fix the configuration errors above before starting the server.');
    console.error('Refer to .env.example for configuration guidance.');
    process.exit(1);
  }
  
  console.log('✅ Backend configuration validation passed');
  
  // Log current configuration in verbose mode
  if (enableVerboseLogging) {
    console.log('\n📋 Backend Configuration Summary:');
    console.log(`  • Port: ${port}`);
    console.log(`  • Timeout: ${apiTimeout}ms`);
    console.log(`  • Cluster Context: ${clusterContext || 'current kubectl context'}`);
    console.log(`  • Context Source: ${process.env.CLUSTER_CONTEXT ? 'environment variable' : 'kubectl current-context'}`);
    console.log(`  • Max Resources per Type: ${MAX_RESOURCES_PER_TYPE}`);
    console.log(`  • Max Namespaces to Scan: ${MAX_NAMESPACES_TO_SCAN}`);
    console.log(`  • Max Nodes to Include: ${MAX_NODES_TO_INCLUDE}`);
    console.log(`  • Max CRD Instances per NS: ${MAX_CRD_INSTANCES_PER_NS}`);
    console.log(`  • Max CRD Sample Instances: ${MAX_CRD_SAMPLE_INSTANCES}`);
    console.log(`  • Core Resources Config: ${coreResourcesConfig.length} resources loaded\n`);
  }
};

// Start server
const startServer = async () => {
  logAlways('🚀 Starting Kubernetes Admin API Server');
  logAlways(`   Environment: ${nodeEnv}`);
  logAlways(`   Port: ${port}`);
  logAlways(`   Timeout: ${apiTimeout}ms`);
  logAlways(`   Target Context: ${clusterContext}`);
  logAlways(`   Verbose Logging: ${enableVerboseLogging}`);
  logAlways('');
  
  // Validate configuration
  validateConfiguration();
  
  // Initialize Kubernetes APIs
  const initialized = await initializeK8sApis();
  if (!initialized) {
    if (enableMulticluster) {
      logAlways('⚠️ Failed to initialize Kubernetes APIs, but continuing in multicluster mode.');
      logAlways('💡 You can add cluster configurations dynamically through the API endpoints.');
      logAlways('   Use POST /api/cluster/switch to configure a cluster.');
    } else {
      logAlways('❌ Failed to initialize Kubernetes APIs. Server will not start.');
      process.exit(1);
    }
  }
  
  app.listen(port, () => {
    log(`Development API server running on http://localhost:${port}`);
    log('Available endpoints:');
    log('  GET  /api/health');
    log('  POST /api/auth/login');
    log('  GET  /api/nodes');
    log('  GET  /api/namespaces');
    log('  GET  /api/crds');
    log('  GET  /api/crds/:name');
    log('  GET  /api/resources');
    log('  GET  /api/events');
    log('  RBAC endpoints:');
    log('    GET    /api/rbac/serviceaccounts');
    log('    POST   /api/rbac/serviceaccounts');
    log('    DELETE /api/rbac/serviceaccounts/:namespace/:name');
    log('    GET    /api/rbac/roles');
    log('    POST   /api/rbac/roles');
    log('    DELETE /api/rbac/roles/:namespace/:name');
    log('    GET    /api/rbac/clusterroles');
    log('    POST   /api/rbac/clusterroles');
    log('    DELETE /api/rbac/clusterroles/:name');
    log('    GET    /api/rbac/rolebindings');
    log('    POST   /api/rbac/rolebindings');
    log('    DELETE /api/rbac/rolebindings/:namespace/:name');
    log('    GET    /api/rbac/clusterrolebindings');
    log('    POST   /api/rbac/clusterrolebindings');
    log('    DELETE /api/rbac/clusterrolebindings/:name');
    log('  Resource Dependencies endpoints:');
    log('    GET    /api/dependencies/:kind/:name');
    log('    GET    /api/dependencies/graph');
    log('    GET    /api/dependencies/graph/export (JSON/CSV/Markdown - UI Graph Export)');
    log('  CRD Analysis endpoints:');
    log('    GET    /api/dependencies/dictionary (Legacy CRD Schema Analysis)');
    log('    GET    /api/dependencies/crd/apigroups');
    log('    GET    /api/dependencies/crd/enhanced');
    log('    GET    /api/dependencies/crd/export (JSON/CSV/Markdown - CRD Schema Export)');
    log('');
    log('CORS Policy: Accepting requests from any localhost port (development mode)');
    log('Frontend can run on any port: http://localhost:5173, 5174, 5175, etc.');
    log('Common frontend ports that will work:');
    log('  - http://localhost:5173 (Vite default)');
    log('  - http://localhost:5174 (Vite fallback)');
    log('  - http://localhost:5175 (Vite fallback)');
  });
};

// === RBAC ENDPOINTS ===

// Service Accounts
app.get('/api/rbac/serviceaccounts', async (req, res) => {
  log('Service accounts request received');
  const namespace = req.query.namespace;
  
  try {
    let response;
    if (namespace) {
      response = await coreV1Api.listNamespacedServiceAccount({ namespace });
    } else {
      response = await coreV1Api.listServiceAccountForAllNamespaces();
    }
    
    const serviceAccounts = response.items || [];
    log(`Retrieved ${serviceAccounts.length} service accounts`);
    res.json(serviceAccounts);
  } catch (error) {
    log('ERROR: Failed to get service accounts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rbac/serviceaccounts', async (req, res) => {
  log('Create service account request received');
  const serviceAccount = req.body;
  const namespace = serviceAccount.metadata?.namespace || 'default';
  
  try {
    const response = await coreV1Api.createNamespacedServiceAccount({ 
      namespace, 
      body: serviceAccount 
    });
    const created = response.body || response;
    
    log(`Created service account: ${created.metadata?.name}`);
    res.json(created);
  } catch (error) {
    log('ERROR: Failed to create service account:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rbac/serviceaccounts/:namespace/:name', async (req, res) => {
  const { namespace, name } = req.params;
  log(`Delete service account request: ${namespace}/${name}`);
  
  try {
    await coreV1Api.deleteNamespacedServiceAccount({ name, namespace });
    log(`Deleted service account: ${namespace}/${name}`);
    res.json({ message: `Service account ${namespace}/${name} deleted` });
  } catch (error) {
    log(`ERROR: Failed to delete service account ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Roles
app.get('/api/rbac/roles', async (req, res) => {
  log('Roles request received');
  const namespace = req.query.namespace;
  
  try {
    let response;
    if (namespace) {
      response = await rbacV1Api.listNamespacedRole({ namespace });
    } else {
      response = await rbacV1Api.listRoleForAllNamespaces();
    }
    
    const roles = response.items || [];
    log(`Retrieved ${roles.length} roles`);
    res.json(roles);
  } catch (error) {
    log('ERROR: Failed to get roles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rbac/roles', async (req, res) => {
  log('Create role request received');
  const role = req.body;
  const namespace = role.metadata?.namespace;
  
  try {
    if (!namespace) {
      return res.status(400).json({ error: 'Namespace is required for Role creation' });
    }
    
    const response = await rbacV1Api.createNamespacedRole({ 
      namespace, 
      body: role 
    });
    const created = response.body || response;
    
    log(`Created role: ${created.metadata?.name}`);
    res.json(created);
  } catch (error) {
    log('ERROR: Failed to create role:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rbac/roles/:namespace/:name', async (req, res) => {
  const { namespace, name } = req.params;
  log(`Delete role request: ${namespace}/${name}`);
  
  try {
    await rbacV1Api.deleteNamespacedRole({ name, namespace });
    log(`Deleted role: ${namespace}/${name}`);
    res.json({ message: `Role ${namespace}/${name} deleted` });
  } catch (error) {
    log(`ERROR: Failed to delete role ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cluster Roles
app.get('/api/rbac/clusterroles', async (req, res) => {
  log('Cluster roles request received');
  
  try {
    const response = await rbacV1Api.listClusterRole();
    const clusterRoles = response.items || [];
    
    log(`Retrieved ${clusterRoles.length} cluster roles`);
    res.json(clusterRoles);
  } catch (error) {
    log('ERROR: Failed to get cluster roles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rbac/clusterroles', async (req, res) => {
  log('Create cluster role request received');
  const clusterRole = req.body;
  
  try {
    const response = await rbacV1Api.createClusterRole({ body: clusterRole });
    const created = response.body || response;
    
    log(`Created cluster role: ${created.metadata?.name}`);
    res.json(created);
  } catch (error) {
    log('ERROR: Failed to create cluster role:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rbac/clusterroles/:name', async (req, res) => {
  const { name } = req.params;
  log(`Delete cluster role request: ${name}`);
  
  try {
    await rbacV1Api.deleteClusterRole({ name });
    log(`Deleted cluster role: ${name}`);
    res.json({ message: `Cluster role ${name} deleted` });
  } catch (error) {
    log(`ERROR: Failed to delete cluster role ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Role Bindings
app.get('/api/rbac/rolebindings', async (req, res) => {
  log('Role bindings request received');
  const namespace = req.query.namespace;
  
  try {
    let response;
    if (namespace) {
      response = await rbacV1Api.listNamespacedRoleBinding({ namespace });
    } else {
      response = await rbacV1Api.listRoleBindingForAllNamespaces();
    }
    
    const roleBindings = response.items || [];
    log(`Retrieved ${roleBindings.length} role bindings`);
    res.json(roleBindings);
  } catch (error) {
    log('ERROR: Failed to get role bindings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rbac/rolebindings', async (req, res) => {
  log('Create role binding request received');
  const roleBinding = req.body;
  const namespace = roleBinding.metadata?.namespace;
  
  try {
    if (!namespace) {
      return res.status(400).json({ error: 'Namespace is required for RoleBinding creation' });
    }
    
    const response = await rbacV1Api.createNamespacedRoleBinding({ 
      namespace, 
      body: roleBinding 
    });
    const created = response.body || response;
    
    log(`Created role binding: ${created.metadata?.name}`);
    res.json(created);
  } catch (error) {
    log('ERROR: Failed to create role binding:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rbac/rolebindings/:namespace/:name', async (req, res) => {
  const { namespace, name } = req.params;
  log(`Delete role binding request: ${namespace}/${name}`);
  
  try {
    await rbacV1Api.deleteNamespacedRoleBinding({ name, namespace });
    log(`Deleted role binding: ${namespace}/${name}`);
    res.json({ message: `Role binding ${namespace}/${name} deleted` });
  } catch (error) {
    log(`ERROR: Failed to delete role binding ${namespace}/${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cluster Role Bindings
app.get('/api/rbac/clusterrolebindings', async (req, res) => {
  log('Cluster role bindings request received');
  
  try {
    const response = await rbacV1Api.listClusterRoleBinding();
    const clusterRoleBindings = response.items || [];
    
    log(`Retrieved ${clusterRoleBindings.length} cluster role bindings`);
    res.json(clusterRoleBindings);
  } catch (error) {
    log('ERROR: Failed to get cluster role bindings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rbac/clusterrolebindings', async (req, res) => {
  log('Create cluster role binding request received');
  const clusterRoleBinding = req.body;
  
  try {
    const response = await rbacV1Api.createClusterRoleBinding({ body: clusterRoleBinding });
    const created = response.body || response;
    
    log(`Created cluster role binding: ${created.metadata?.name}`);
    res.json(created);
  } catch (error) {
    log('ERROR: Failed to create cluster role binding:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rbac/clusterrolebindings/:name', async (req, res) => {
  const { name } = req.params;
  log(`Delete cluster role binding request: ${name}`);
  
  try {
    await rbacV1Api.deleteClusterRoleBinding({ name });
    log(`Deleted cluster role binding: ${name}`);
    res.json({ message: `Cluster role binding ${name} deleted` });
  } catch (error) {
    log(`ERROR: Failed to delete cluster role binding ${name}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
