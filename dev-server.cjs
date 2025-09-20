const express = require('express');
const cors = require('cors');
let k8s; // Will be loaded dynamically

const app = express();
const port = process.env.API_PORT || 3001;
const nodeEnv = process.env.NODE_ENV || 'development';
const enableVerboseLogging = nodeEnv === 'development';
const apiTimeout = parseInt(process.env.API_TIMEOUT || '30000');
const clusterContext = process.env.CLUSTER_CONTEXT || 'kind-krateo-quickstart';

// Enable CORS for frontend - allow any localhost port for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
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

// Initialize Kubernetes client
let kc, coreV1Api, appsV1Api, rbacV1Api, apiExtensionsV1Api, metricsV1Api, customObjectsApi;

// Configurable logging
const log = (message, data = '') => {
  if (enableVerboseLogging) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [K8s Dev Server] ${message}`, data);
  }
};

const logAlways = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [K8s Dev Server] ${message}`, data);
};

// Initialize Kubernetes APIs
const initializeK8sApis = async () => {
  try {
    // Dynamic import of the ES module
    if (!k8s) {
      log('Loading Kubernetes client module...');
      k8s = await import('@kubernetes/client-node');
      kc = new k8s.KubeConfig();
    }
    
    log('Loading kubeconfig from default location...');
    kc.loadFromDefault();
    
    const currentContext = kc.getCurrentContext();
    const currentUser = kc.getCurrentUser();
    const currentCluster = kc.getCurrentCluster();
    
    log('Kubeconfig loaded successfully');
    log('Current context:', currentContext);
    log('Current user:', currentUser?.name || 'unknown');
    log('Current cluster server:', currentCluster?.server || 'unknown');
    
    coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
    rbacV1Api = kc.makeApiClient(k8s.RbacAuthorizationV1Api);
    apiExtensionsV1Api = kc.makeApiClient(k8s.ApiextensionsV1Api);
    customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
    
    try {
      metricsV1Api = new k8s.Metrics(kc);
      log('Metrics API initialized');
    } catch (err) {
      log('Warning: Metrics API not available:', err.message);
    }
    
    log('All Kubernetes APIs initialized successfully');
    return true;
  } catch (error) {
    log('ERROR: Failed to initialize Kubernetes APIs:', error.message);
    return false;
  }
};

// Test cluster connection
const testConnection = async () => {
  try {
    log('Testing cluster connection...');
    const response = await coreV1Api.getAPIResources();
    log('Cluster connection test successful');
    return true;
  } catch (error) {
    log('ERROR: Cluster connection test failed:', error.message);
    return false;
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

// Initialize and authenticate
app.post('/api/auth/login', async (req, res) => {
  log('Login request received');
  
  try {
    // Test the connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      return res.status(500).json({ error: 'Failed to connect to Kubernetes cluster' });
    }
    
    // Get cluster info with detailed logging
    log('Fetching cluster version...');
    const clusterVersion = await getClusterVersion();
    
    log('Fetching nodes...');
    const nodesResponse = await coreV1Api.listNode();
    log('Nodes response keys:', Object.keys(nodesResponse));
    log('Nodes response structure:', {
      hasBody: !!nodesResponse.body,
      hasResponse: !!nodesResponse.response,
      hasItems: !!(nodesResponse.body && nodesResponse.body.items),
      responseItems: !!(nodesResponse.response && nodesResponse.response.body && nodesResponse.response.body.items),
      directItems: !!nodesResponse.items
    });
    
    log('Fetching namespaces...');
    const namespacesResponse = await coreV1Api.listNamespace();
    log('Namespaces response keys:', Object.keys(namespacesResponse));
    log('Namespaces response structure:', {
      hasBody: !!namespacesResponse.body,
      hasResponse: !!namespacesResponse.response,
      hasItems: !!(namespacesResponse.body && namespacesResponse.body.items),
      responseItems: !!(namespacesResponse.response && namespacesResponse.response.body && namespacesResponse.response.body.items),
      directItems: !!namespacesResponse.items
    });
    
    const currentContext = kc.getCurrentContext();
    const currentUser = kc.getCurrentUser();
    const currentCluster = kc.getCurrentCluster();
    
    log('Kubeconfig details:', {
      context: currentContext,
      user: currentUser?.name,
      server: currentCluster?.server
    });
    
    const authState = {
      isAuthenticated: true,
      user: {
        username: currentUser?.name || 'unknown',
        email: null,
        groups: [],
        permissions: ['*']
      },
      token: 'real-cluster-token',
      cluster: {
        name: currentContext || 'local-cluster',
        server: currentCluster?.server || 'unknown',
        version: clusterVersion.gitVersion || 'unknown',
        versionDetails: clusterVersion,
        nodes: nodesResponse.items?.length || 0,
        namespaces: namespacesResponse.items?.length || 0
      }
    };
    
    log('Login successful', { 
      cluster: authState.cluster.name,
      nodes: authState.cluster.nodes,
      namespaces: authState.cluster.namespaces 
    });
    
    res.json(authState);
  } catch (error) {
    log('ERROR: Login failed:', error.message);
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
          
          for (const namespace of namespaces.slice(0, 5)) { // Limit to first 5 namespaces for performance
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
              instances.push(...namespaceInstances.slice(0, 3).map(instance => ({
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
            
            instances = clusterInstances.slice(0, 10).map(instance => ({
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
    
    // Define core Kubernetes resources with their metadata
    const coreResources = [
      // Core/v1 resources
      { group: 'core', version: 'v1', kind: 'Pod', plural: 'pods', namespaced: true, description: 'A Pod is a collection of containers that can run on a host' },
      { group: 'core', version: 'v1', kind: 'Service', plural: 'services', namespaced: true, description: 'A Service is an abstraction for network access to pods' },
      { group: 'core', version: 'v1', kind: 'ConfigMap', plural: 'configmaps', namespaced: true, description: 'ConfigMap holds configuration data for pods to consume' },
      { group: 'core', version: 'v1', kind: 'Secret', plural: 'secrets', namespaced: true, description: 'Secret holds secret data of a certain type' },
      { group: 'core', version: 'v1', kind: 'PersistentVolume', plural: 'persistentvolumes', namespaced: false, description: 'PersistentVolume represents a piece of storage' },
      { group: 'core', version: 'v1', kind: 'PersistentVolumeClaim', plural: 'persistentvolumeclaims', namespaced: true, description: 'PersistentVolumeClaim is a user\'s request for storage' },
      { group: 'core', version: 'v1', kind: 'Namespace', plural: 'namespaces', namespaced: false, description: 'Namespace provides a scope for names' },
      { group: 'core', version: 'v1', kind: 'Node', plural: 'nodes', namespaced: false, description: 'Node is a worker node in Kubernetes' },
      { group: 'core', version: 'v1', kind: 'ServiceAccount', plural: 'serviceaccounts', namespaced: true, description: 'ServiceAccount binds together a name, a principal, and a set of tokens' },
      
      // Apps/v1 resources
      { group: 'apps', version: 'v1', kind: 'Deployment', plural: 'deployments', namespaced: true, description: 'Deployment enables declarative updates for Pods and ReplicaSets' },
      { group: 'apps', version: 'v1', kind: 'ReplicaSet', plural: 'replicasets', namespaced: true, description: 'ReplicaSet ensures that a specified number of pod replicas are running' },
      { group: 'apps', version: 'v1', kind: 'StatefulSet', plural: 'statefulsets', namespaced: true, description: 'StatefulSet manages the deployment and scaling of Pods with persistent storage' },
      { group: 'apps', version: 'v1', kind: 'DaemonSet', plural: 'daemonsets', namespaced: true, description: 'DaemonSet ensures that all nodes run a copy of a Pod' },
      
      // Batch resources
      { group: 'batch', version: 'v1', kind: 'Job', plural: 'jobs', namespaced: true, description: 'Job represents a finite task that runs one or more pods to completion' },
      { group: 'batch', version: 'v1', kind: 'CronJob', plural: 'cronjobs', namespaced: true, description: 'CronJob represents a time-based Job' },
      
      // Networking resources
      { group: 'networking.k8s.io', version: 'v1', kind: 'Ingress', plural: 'ingresses', namespaced: true, description: 'Ingress manages external access to services' },
      { group: 'networking.k8s.io', version: 'v1', kind: 'NetworkPolicy', plural: 'networkpolicies', namespaced: true, description: 'NetworkPolicy describes allowed network traffic' },
      
      // RBAC resources
      { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'Role', plural: 'roles', namespaced: true, description: 'Role contains rules that represent a set of permissions' },
      { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'ClusterRole', plural: 'clusterroles', namespaced: false, description: 'ClusterRole contains rules that represent a set of permissions' },
      { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'RoleBinding', plural: 'rolebindings', namespaced: true, description: 'RoleBinding references a role, but does not contain it' },
      { group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'ClusterRoleBinding', plural: 'clusterrolebindings', namespaced: false, description: 'ClusterRoleBinding references a ClusterRole, but does not contain it' },
      
      // Storage resources
      { group: 'storage.k8s.io', version: 'v1', kind: 'StorageClass', plural: 'storageclasses', namespaced: false, description: 'StorageClass describes the parameters for a class of storage' },
      
      // Policy resources
      { group: 'policy', version: 'v1', kind: 'PodDisruptionBudget', plural: 'poddisruptionbudgets', namespaced: true, description: 'PodDisruptionBudget limits the number of pods that are down' },
      
      // Autoscaling resources
      { group: 'autoscaling', version: 'v2', kind: 'HorizontalPodAutoscaler', plural: 'horizontalpodautoscalers', namespaced: true, description: 'HorizontalPodAutoscaler automatically scales pods based on metrics' },
    ];
    
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

// Configuration validation
const validateConfiguration = () => {
  const errors = [];
  
  if (port < 1000 || port > 65535) {
    errors.push(`Invalid port: ${port}. Must be between 1000-65535`);
  }
  
  if (apiTimeout < 1000) {
    errors.push(`Invalid timeout: ${apiTimeout}. Must be at least 1000ms`);
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Configuration validation passed');
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
    logAlways('❌ Failed to initialize Kubernetes APIs. Server will not start.');
    process.exit(1);
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
