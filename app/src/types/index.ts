// Local type definitions to avoid importing Kubernetes client in frontend
// These types are compatible with the Kubernetes API types but safe for browser use

// Base Kubernetes types (compatible with client-node but browser-safe)
export interface KubernetesMetadata {
  name?: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
}

export interface KubernetesResource {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
}

export interface V1Node extends KubernetesResource {
  spec?: {
    podCIDR?: string;
    podCIDRs?: string[];
    providerID?: string;
    unschedulable?: boolean;
    taints?: Array<{
      key: string;
      value?: string;
      effect: string;
    }>;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      lastHeartbeatTime?: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
    nodeInfo?: {
      machineID: string;
      systemUUID: string;
      bootID: string;
      kernelVersion: string;
      osImage: string;
      containerRuntimeVersion: string;
      kubeletVersion: string;
      kubeProxyVersion: string;
      operatingSystem: string;
      architecture: string;
    };
    capacity?: Record<string, string>;
    allocatable?: Record<string, string>;
    addresses?: Array<{
      type: string;
      address: string;
    }>;
  };
}

export interface V1Namespace extends KubernetesResource {
  spec?: {
    finalizers?: string[];
  };
  status?: {
    phase?: string;
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
  };
}

export interface V1CustomResourceDefinition extends KubernetesResource {
  spec?: {
    group?: string;
    scope?: string;
    names?: {
      plural?: string;
      singular?: string;
      kind?: string;
      shortNames?: string[];
    };
    versions?: Array<{
      name: string;
      served: boolean;
      storage: boolean;
      schema?: any;
    }>;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
  };
}

export interface V1ServiceAccount extends KubernetesResource {
  secrets?: Array<{
    name?: string;
    namespace?: string;
  }>;
  imagePullSecrets?: Array<{
    name?: string;
  }>;
  automountServiceAccountToken?: boolean;
}

export interface V1Role extends KubernetesResource {
  rules?: Array<{
    apiGroups: string[];
    resources: string[];
    verbs: string[];
    resourceNames?: string[];
  }>;
}

export interface V1RoleBinding extends KubernetesResource {
  subjects?: Array<{
    kind: string;
    name: string;
    namespace?: string;
    apiGroup?: string;
  }>;
  roleRef: {
    kind: string;
    name: string;
    apiGroup: string;
  };
}

export interface V1ClusterRole extends KubernetesResource {
  rules?: Array<{
    apiGroups: string[];
    resources: string[];
    verbs: string[];
    resourceNames?: string[];
  }>;
}

export interface V1ClusterRoleBinding extends KubernetesResource {
  subjects?: Array<{
    kind: string;
    name: string;
    namespace?: string;
    apiGroup?: string;
  }>;
  roleRef: {
    kind: string;
    name: string;
    apiGroup: string;
  };
}

export interface V1Pod extends KubernetesResource {
  spec?: {
    containers: Array<{
      name: string;
      image: string;
      ports?: Array<{
        containerPort: number;
        protocol?: string;
      }>;
    }>;
    nodeName?: string;
    nodeSelector?: Record<string, string>;
  };
  status?: {
    phase?: string;
    conditions?: Array<{
      type: string;
      status: string;
    }>;
    containerStatuses?: Array<{
      name: string;
      ready: boolean;
      restartCount: number;
    }>;
  };
}

export interface V1Deployment extends KubernetesResource {
  spec?: {
    replicas?: number;
    selector: {
      matchLabels?: Record<string, string>;
    };
    template: {
      metadata?: KubernetesMetadata;
      spec?: {
        containers: Array<{
          name: string;
          image: string;
        }>;
      };
    };
  };
  status?: {
    replicas?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
  };
}

export interface V1Service extends KubernetesResource {
  spec?: {
    selector?: Record<string, string>;
    ports?: Array<{
      name?: string;
      port: number;
      targetPort?: number | string;
      protocol?: string;
    }>;
    type?: string;
    clusterIP?: string;
  };
  status?: {
    loadBalancer?: {
      ingress?: Array<{
        ip?: string;
        hostname?: string;
      }>;
    };
  };
}

export interface V1ConfigMap extends KubernetesResource {
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
}

export interface V1Secret extends KubernetesResource {
  type?: string;
  data?: Record<string, string>;
  stringData?: Record<string, string>;
}

// Application-specific interfaces
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  cluster: ClusterInfo | null;
}

export interface User {
  username: string;
  email?: string;
  roles?: string[];
  groups?: string[];
  permissions?: string[];
}

export interface ClusterInfo {
  name: string;
  server: string;
  version: string;
  nodes: number;
  namespaces: number;
}

export interface ClusterNode extends V1Node {
  // Additional computed fields can be added here
}

export interface NamespaceWithMetrics extends V1Namespace {
  metrics?: {
    podCount: number;
    cpuUsage: string;
    memoryUsage: string;
    resourceQuotas: Array<{
      name: string;
      used: Record<string, string>;
      hard: Record<string, string>;
    }>;
  };
}

export interface CRDWithInstances extends V1CustomResourceDefinition {
  instances?: number;
  scope: 'Cluster' | 'Namespaced';
}

export interface ResourceMetrics {
  name: string;
  namespace?: string;
  cpu: string;
  memory: string;
  timestamp: string;
}

export interface ClusterEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  source: string;
  object: string;
  firstTimestamp: string;
  lastTimestamp: string;
  count: number;
}

export interface Permission {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
  resourceNames?: string[];
}

export interface RoleWithBinding extends V1Role {
  bindings?: V1RoleBinding[];
}

export interface ClusterRoleWithBinding extends V1ClusterRole {
  bindings?: V1ClusterRoleBinding[];
}

export interface ServiceAccountWithSecrets extends V1ServiceAccount {
  tokens?: Array<{
    name: string;
    token: string;
    namespace: string;
  }>;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: NavigationItem[];
  requiredPermissions?: string[];
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}