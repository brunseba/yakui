import { AuthState, ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent, ResourceMetrics } from '../types/dev';

// Mock data for development
const mockNodes: ClusterNode[] = [
  {
    apiVersion: 'v1',
    kind: 'Node',
    metadata: {
      name: 'node-1',
      labels: {
        'kubernetes.io/os': 'linux',
        'kubernetes.io/arch': 'amd64',
        'node-role.kubernetes.io/control-plane': '',
      },
      creationTimestamp: new Date('2024-01-01T00:00:00Z'),
    },
    status: {
      conditions: [
        {
          type: 'Ready',
          status: 'True',
          lastHeartbeatTime: new Date().toISOString(),
          lastTransitionTime: '2024-01-01T00:00:00Z',
          reason: 'KubeletReady',
          message: 'kubelet is posting ready status',
        },
      ],
      nodeInfo: {
        machineID: 'mock-machine-id-1',
        systemUUID: 'mock-system-uuid-1',
        bootID: 'mock-boot-id-1',
        kernelVersion: '5.4.0-90-generic',
        osImage: 'Ubuntu 20.04.3 LTS',
        containerRuntimeVersion: 'containerd://1.6.6',
        kubeletVersion: 'v1.28.0',
        kubeProxyVersion: 'v1.28.0',
        operatingSystem: 'linux',
        architecture: 'amd64',
      },
      capacity: {
        cpu: '4',
        memory: '8Gi',
        pods: '110',
      },
      allocatable: {
        cpu: '3900m',
        memory: '7.5Gi',
        pods: '110',
      },
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Node',
    metadata: {
      name: 'node-2',
      labels: {
        'kubernetes.io/os': 'linux',
        'kubernetes.io/arch': 'amd64',
        'node-role.kubernetes.io/worker': '',
      },
      creationTimestamp: new Date('2024-01-01T01:00:00Z'),
    },
    status: {
      conditions: [
        {
          type: 'Ready',
          status: 'True',
          lastHeartbeatTime: new Date().toISOString(),
          lastTransitionTime: '2024-01-01T01:00:00Z',
          reason: 'KubeletReady',
          message: 'kubelet is posting ready status',
        },
      ],
      nodeInfo: {
        machineID: 'mock-machine-id-2',
        systemUUID: 'mock-system-uuid-2',
        bootID: 'mock-boot-id-2',
        kernelVersion: '5.4.0-90-generic',
        osImage: 'Ubuntu 20.04.3 LTS',
        containerRuntimeVersion: 'containerd://1.6.6',
        kubeletVersion: 'v1.28.0',
        kubeProxyVersion: 'v1.28.0',
        operatingSystem: 'linux',
        architecture: 'amd64',
      },
      capacity: {
        cpu: '4',
        memory: '8Gi',
        pods: '110',
      },
      allocatable: {
        cpu: '3900m',
        memory: '7.5Gi',
        pods: '110',
      },
    },
  },
];

const mockNamespaces: NamespaceWithMetrics[] = [
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: 'default',
      creationTimestamp: new Date('2024-01-01T00:00:00Z'),
    },
    status: {
      phase: 'Active',
    },
    metrics: {
      podCount: 3,
      cpuUsage: '100m',
      memoryUsage: '256Mi',
      resourceQuotas: [],
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: 'kube-system',
      creationTimestamp: new Date('2024-01-01T00:00:00Z'),
    },
    status: {
      phase: 'Active',
    },
    metrics: {
      podCount: 12,
      cpuUsage: '500m',
      memoryUsage: '1Gi',
      resourceQuotas: [],
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: 'monitoring',
      labels: {
        'app.kubernetes.io/name': 'monitoring',
      },
      creationTimestamp: new Date('2024-01-01T02:00:00Z'),
    },
    status: {
      phase: 'Active',
    },
    metrics: {
      podCount: 5,
      cpuUsage: '200m',
      memoryUsage: '512Mi',
      resourceQuotas: [
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
      ],
    },
  },
];

const mockEvents: ClusterEvent[] = [
  {
    type: 'Normal',
    reason: 'Scheduled',
    message: 'Successfully assigned default/test-pod to node-1',
    source: 'default-scheduler',
    object: 'Pod/test-pod',
    firstTimestamp: new Date(Date.now() - 300000).toISOString(),
    lastTimestamp: new Date(Date.now() - 300000).toISOString(),
    count: 1,
  },
  {
    type: 'Normal',
    reason: 'Pulling',
    message: 'Pulling image "nginx:latest"',
    source: 'kubelet',
    object: 'Pod/test-pod',
    firstTimestamp: new Date(Date.now() - 240000).toISOString(),
    lastTimestamp: new Date(Date.now() - 240000).toISOString(),
    count: 1,
  },
  {
    type: 'Warning',
    reason: 'FailedMount',
    message: 'Unable to attach or mount volumes: unmounted volumes=[config], unattached volumes=[config default-token-xyz]: timed out waiting for the condition',
    source: 'kubelet',
    object: 'Pod/failing-pod',
    firstTimestamp: new Date(Date.now() - 120000).toISOString(),
    lastTimestamp: new Date(Date.now() - 60000).toISOString(),
    count: 3,
  },
];

class MockKubernetesService {
  private isInitialized = false;

  async initialize(config?: string): Promise<boolean> {
    console.log('[K8s Mock] Initializing mock Kubernetes service...');
    console.log('[K8s Mock] Config provided:', config ? 'Yes' : 'No');
    
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
        username: 'dev-user',
        email: 'dev@example.com',
        groups: ['system:masters', 'developers'],
        permissions: ['*'],
      },
      token: token || 'mock-token',
      cluster: {
        name: 'development-cluster',
        server: 'https://localhost:6443',
        version: 'v1.28.0',
        nodes: mockNodes.length,
        namespaces: mockNamespaces.length,
      },
    };
  }

  async getNodes(): Promise<ClusterNode[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockNodes];
  }

  async getNamespaces(): Promise<NamespaceWithMetrics[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockNamespaces];
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

    mockNamespaces.push(newNamespace);
    return newNamespace;
  }

  async deleteNamespace(name: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = mockNamespaces.findIndex(ns => ns.metadata?.name === name);
    if (index >= 0) {
      mockNamespaces.splice(index, 1);
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
    return [...mockEvents];
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
      getCurrentContext: () => 'development-cluster',
      getCurrentUser: () => ({ name: 'dev-user' }),
      getCurrentCluster: () => ({ server: 'https://localhost:6443' }),
    };
  }
}

export const kubernetesService = new MockKubernetesService();