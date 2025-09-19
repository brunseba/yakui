const express = require('express');
const cors = require('cors');
const k8s = require('@kubernetes/client-node');

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
const kc = new k8s.KubeConfig();
let coreV1Api, appsV1Api, rbacV1Api, apiExtensionsV1Api, metricsV1Api, customObjectsApi;

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
const initializeK8sApis = () => {
  try {
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
const startServer = () => {
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
  const initialized = initializeK8sApis();
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
    log('');
    log('CORS Policy: Accepting requests from any localhost port (development mode)');
    log('Frontend can run on any port: http://localhost:5173, 5174, 5175, etc.');
    log('Common frontend ports that will work:');
    log('  - http://localhost:5173 (Vite default)');
    log('  - http://localhost:5174 (Vite fallback)');
    log('  - http://localhost:5175 (Vite fallback)');
  });
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer();