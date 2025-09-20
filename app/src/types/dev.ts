// Development types that don't import @kubernetes/client-node to avoid Node.js dependencies

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
  versionDetails?: {
    major: string;
    minor: string;
    gitVersion: string;
    buildDate: string;
    platform: string;
  };
  nodes: number;
  namespaces: number;
}

export interface ClusterNode {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
    creationTimestamp?: string | Date;
  };
  status: {
    conditions: Array<{
      type: string;
      status: string;
      lastHeartbeatTime?: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
    nodeInfo: {
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
    capacity: Record<string, string>;
    allocatable: Record<string, string>;
  };
}

export interface NamespaceWithMetrics {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
    creationTimestamp?: string | Date;
  };
  status?: {
    phase?: string;
  };
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

export interface CRDWithInstances {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    creationTimestamp?: string | Date;
  };
  spec?: {
    group?: string;
    versions?: Array<{ name: string; served: boolean; storage: boolean }>;
    scope?: string;
    names?: {
      plural?: string;
      singular?: string;
      kind?: string;
    };
  };
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

export interface RoleWithBinding {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
  };
  rules?: Array<{
    apiGroups: string[];
    resources: string[];
    verbs: string[];
  }>;
  bindings?: any[];
}

export interface ClusterRoleWithBinding {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
  };
  rules?: Array<{
    apiGroups: string[];
    resources: string[];
    verbs: string[];
  }>;
  bindings?: any[];
}

export interface ServiceAccountWithSecrets {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
  };
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