import { AuthState, ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent, ResourceMetrics } from '../types/dev';
import { config } from '../config/environment';

interface MockConfig {
  cluster: {
    name: string;
    server: string;
    version: string;
  };
  user: {
    username: string;
    email: string;
    groups: string[];
  };
  nodes: {
    count: number;
    namePrefix: string;
  };
  namespaces: {
    default: string[];
  };
}

const getMockConfig = (): MockConfig => ({
  cluster: {
    name: process.env.VITE_MOCK_CLUSTER_NAME || 'development-cluster',
    server: process.env.VITE_MOCK_CLUSTER_SERVER || 'https://kubernetes.default.svc',
    version: process.env.VITE_MOCK_CLUSTER_VERSION || 'v1.28.0',
  },
  user: {
    username: process.env.VITE_MOCK_USER_NAME || 'dev-user',
    email: process.env.VITE_MOCK_USER_EMAIL || 'dev@company.local',
    groups: (process.env.VITE_MOCK_USER_GROUPS || 'system:masters,developers').split(','),
  },
  nodes: {
    count: parseInt(process.env.VITE_MOCK_NODE_COUNT || '2'),
    namePrefix: process.env.VITE_MOCK_NODE_PREFIX || 'node',
  },
  namespaces: {
    default: (process.env.VITE_MOCK_NAMESPACES || 'default,kube-system,monitoring').split(','),
  },
});

// Generate mock nodes dynamically
const generateMockNodes = (mockConfig: MockConfig): ClusterNode[] => {
  const nodes: ClusterNode[] = [];
  const now = new Date();
  
  for (let i = 1; i <= mockConfig.nodes.count; i++) {
    const isControlPlane = i === 1;
    nodes.push({
      apiVersion: 'v1',
      kind: 'Node',
      metadata: {
        name: `${mockConfig.nodes.namePrefix}-${i}`,
        labels: {
          'kubernetes.io/os': 'linux',
          'kubernetes.io/arch': 'amd64',
          ...(isControlPlane 
            ? { 'node-role.kubernetes.io/control-plane': '' }
            : { 'node-role.kubernetes.io/worker': '' }
          ),
        },
        creationTimestamp: new Date(now.getTime() - (i * 60 * 60 * 1000)),
      },
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'True',
            lastHeartbeatTime: new Date().toISOString(),
            lastTransitionTime: new Date(now.getTime() - (i * 60 * 60 * 1000)).toISOString(),
            reason: 'KubeletReady',
            message: 'kubelet is posting ready status',
          },
        ],
        nodeInfo: {
          machineID: `machine-id-${i}-${Math.random().toString(36).substr(2, 9)}`,
          systemUUID: `system-uuid-${i}-${Math.random().toString(36).substr(2, 9)}`,
          bootID: `boot-id-${i}-${Math.random().toString(36).substr(2, 9)}`,
          kernelVersion: process.env.VITE_MOCK_KERNEL_VERSION || '5.4.0-90-generic',
          osImage: process.env.VITE_MOCK_OS_IMAGE || 'Ubuntu 20.04.3 LTS',
          containerRuntimeVersion: process.env.VITE_MOCK_RUNTIME_VERSION || 'containerd://1.6.6',
          kubeletVersion: mockConfig.cluster.version,
          kubeProxyVersion: mockConfig.cluster.version,
          operatingSystem: 'linux',
          architecture: 'amd64',
        },
        capacity: {
          cpu: process.env.VITE_MOCK_NODE_CPU || '4',
          memory: process.env.VITE_MOCK_NODE_MEMORY || '8Gi',
          pods: '110',
        },
        allocatable: {
          cpu: process.env.VITE_MOCK_NODE_CPU_ALLOCATABLE || '3900m',
          memory: process.env.VITE_MOCK_NODE_MEMORY_ALLOCATABLE || '7.5Gi',
          pods: '110',
        },
      },
    });
  }
  
  return nodes;
};

// Generate mock namespaces dynamically
const generateMockNamespaces = (mockConfig: MockConfig): NamespaceWithMetrics[] => {
  const namespaces: NamespaceWithMetrics[] = [];
  const now = new Date();
  
  mockConfig.namespaces.default.forEach((name, index) => {
    const isSystemNamespace = name.startsWith('kube-') || name === 'monitoring';
    const baseMetrics = {
      default: { podCount: 3, cpuUsage: '100m', memoryUsage: '256Mi' },
      'kube-system': { podCount: 12, cpuUsage: '500m', memoryUsage: '1Gi' },
      monitoring: { podCount: 5, cpuUsage: '200m', memoryUsage: '512Mi' },
    };
    
    const metrics = baseMetrics[name] || { podCount: 1, cpuUsage: '50m', memoryUsage: '128Mi' };
    
    namespaces.push({
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name,
        labels: isSystemNamespace ? { 'app.kubernetes.io/name': name } : {},
        creationTimestamp: new Date(now.getTime() - (index * 2 * 60 * 60 * 1000)),
      },
      status: {
        phase: 'Active',
      },
      metrics: {
        ...metrics,
        resourceQuotas: name === 'monitoring' ? [
          {
            name: 'monitoring-quota',
            used: {
              'requests.cpu': '200m',
              'requests.memory': '512Mi',
            },
            hard: {
              'requests.cpu': '1',
              'requests.memory': '2Gi',
            },
          },
        ] : [],
      },
    });
  });
  
  return namespaces;
};

// Generate mock events dynamically
const generateMockEvents = (mockConfig: MockConfig): ClusterEvent[] => {
  const now = Date.now();
  const samplePodName = process.env.VITE_MOCK_SAMPLE_POD || 'sample-pod';
  const sampleImage = process.env.VITE_MOCK_SAMPLE_IMAGE || 'nginx:latest';
  
  return [
    {
      type: 'Normal',
      reason: 'Scheduled',
      message: `Successfully assigned default/${samplePodName} to ${mockConfig.nodes.namePrefix}-1`,
      source: 'default-scheduler',
      object: `Pod/${samplePodName}`,
      firstTimestamp: new Date(now - 300000).toISOString(),
      lastTimestamp: new Date(now - 300000).toISOString(),
      count: 1,
    },
    {
      type: 'Normal',
      reason: 'Pulling',
      message: `Pulling image "${sampleImage}"`,
      source: 'kubelet',
      object: `Pod/${samplePodName}`,
      firstTimestamp: new Date(now - 240000).toISOString(),
      lastTimestamp: new Date(now - 240000).toISOString(),
      count: 1,
    },
    {
      type: 'Warning',
      reason: 'FailedMount',
      message: 'Unable to attach or mount volumes: unmounted volumes=[config], unattached volumes=[config token]: timed out waiting for the condition',
      source: 'kubelet',
      object: 'Pod/failing-pod',
      firstTimestamp: new Date(now - 120000).toISOString(),
      lastTimestamp: new Date(now - 60000).toISOString(),
      count: 3,
    },
  ];
};

class MockKubernetesService {
  private isInitialized = false;
  private mockConfig: MockConfig;
  private mockNodes: ClusterNode[] = [];
  private mockNamespaces: NamespaceWithMetrics[] = [];
  private mockEvents: ClusterEvent[] = [];
  
  constructor() {
    this.mockConfig = getMockConfig();
  }

  async initialize(config?: string): Promise<boolean> {
    console.log('[K8s Mock] Initializing mock Kubernetes service...');
    console.log('[K8s Mock] Config provided:', config ? 'Yes' : 'No');
    
    // Refresh mock configuration in case environment variables changed
    this.mockConfig = getMockConfig();
    
    // Generate mock data
    this.mockNodes = generateMockNodes(this.mockConfig);
    this.mockNamespaces = generateMockNamespaces(this.mockConfig);
    this.mockEvents = generateMockEvents(this.mockConfig);
    
    console.log(`[K8s Mock] Generated ${this.mockNodes.length} nodes, ${this.mockNamespaces.length} namespaces`);
    
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isInitialized = true;
    
    console.log('[K8s Mock] Initialization complete');
    return true;
  }

  async authenticate(token?: string): Promise<AuthState> {
    console.log('[K8s Mock] Authenticating with mock service...');
    console.log('[K8s Mock] Token provided:', token ? 'Yes' : 'No');
    
    if (!this.isInitialized) {
      console.error('[K8s Mock] Service not initialized!');
      throw new Error('Service not initialized');
    }

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('[K8s Mock] Authentication successful');

    return {
      isAuthenticated: true,
      user: {
        username: this.mockConfig.user.username,
        email: this.mockConfig.user.email,
        groups: this.mockConfig.user.groups,
        permissions: ['*'],
      },
      token: token || 'mock-token-' + Math.random().toString(36).substr(2, 9),
      cluster: {
        name: this.mockConfig.cluster.name,
        server: this.mockConfig.cluster.server,
        version: this.mockConfig.cluster.version,
        nodes: this.mockNodes.length,
        namespaces: this.mockNamespaces.length,
      },
    };
  }

  async getNodes(): Promise<ClusterNode[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.mockNodes];
  }

  async getNamespaces(): Promise<NamespaceWithMetrics[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.mockNamespaces];
  }

  async createNamespace(name: string, labels?: Record<string, string>): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const newNamespace: NamespaceWithMetrics = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name,
        labels: labels || {},
        creationTimestamp: new Date(),
      },
      status: {
        phase: 'Active',
      },
      metrics: {
        podCount: 0,
        cpuUsage: '0m',
        memoryUsage: '0Mi',
        resourceQuotas: [],
      },
    };

    this.mockNamespaces.push(newNamespace);
    return newNamespace;
  }

  async deleteNamespace(name: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.mockNamespaces.findIndex(ns => ns.metadata?.name === name);
    if (index >= 0) {
      this.mockNamespaces.splice(index, 1);
    }
  }

  async getCRDs(): Promise<CRDWithInstances[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return [
      {
        apiVersion: 'apiextensions.k8s.io/v1',
        kind: 'CustomResourceDefinition',
        metadata: {
          name: 'applications.argoproj.io',
          creationTimestamp: new Date('2024-01-01T00:00:00Z'),
        },
        spec: {
          group: 'argoproj.io',
          versions: [{ name: 'v1alpha1', served: true, storage: true }],
          scope: 'Namespaced',
          names: {
            plural: 'applications',
            singular: 'application',
            kind: 'Application',
          },
        },
        instances: 5,
        scope: 'Namespaced',
      },
      {
        apiVersion: 'apiextensions.k8s.io/v1',
        kind: 'CustomResourceDefinition',
        metadata: {
          name: 'prometheuses.monitoring.coreos.com',
          creationTimestamp: new Date('2024-01-01T00:00:00Z'),
        },
        spec: {
          group: 'monitoring.coreos.com',
          versions: [{ name: 'v1', served: true, storage: true }],
          scope: 'Namespaced',
          names: {
            plural: 'prometheuses',
            singular: 'prometheus',
            kind: 'Prometheus',
          },
        },
        instances: 1,
        scope: 'Namespaced',
      },
    ];
  }

  async getServiceAccounts(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          name: 'default',
          namespace: namespace || 'default',
        },
      },
    ];
  }

  async getRoles(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: {
          name: 'pod-reader',
          namespace: namespace || 'default',
        },
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list'],
          },
        ],
      },
    ];
  }

  async getClusterRoles(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        metadata: {
          name: 'cluster-admin',
        },
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['*'],
          },
        ],
      },
    ];
  }

  async getRoleBindings(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    return [];
  }

  async getClusterRoleBindings(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    return [];
  }

  async getEvents(namespace?: string): Promise<ClusterEvent[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.mockEvents];
  }

  async getPodLogs(namespace: string, podName: string, containerName?: string): Promise<string> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return `Mock logs for pod ${podName} in namespace ${namespace}${containerName ? ` (container: ${containerName})` : ''}
2024-01-01T10:00:00.000Z Starting application...
2024-01-01T10:00:01.000Z Loading configuration...
2024-01-01T10:00:02.000Z Connecting to database...
2024-01-01T10:00:03.000Z Database connection established
2024-01-01T10:00:04.000Z Server listening on port 8080
2024-01-01T10:00:05.000Z Application ready to serve requests`;
  }

  async getResourceMetrics(namespace?: string): Promise<ResourceMetrics[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return [
      {
        name: 'test-pod',
        namespace: 'default',
        cpu: '100m',
        memory: '128Mi',
        timestamp: new Date().toISOString(),
      },
      {
        name: 'nginx-deployment',
        namespace: 'default',
        cpu: '50m',
        memory: '64Mi',
        timestamp: new Date().toISOString(),
      },
    ];
  }

  getKubeConfig(): any {
    return {
      getCurrentContext: () => this.mockConfig.cluster.name,
      getCurrentUser: () => ({ name: this.mockConfig.user.username }),
      getCurrentCluster: () => ({ server: this.mockConfig.cluster.server }),
    };
  }
}

export const kubernetesService = new MockKubernetesService();