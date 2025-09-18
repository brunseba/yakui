import { V1Node, V1Pod, V1Namespace, V1CustomResourceDefinition, V1ServiceAccount, V1Role, V1RoleBinding, V1ClusterRole, V1ClusterRoleBinding } from '@kubernetes/client-node';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  cluster: ClusterInfo | null;
}

export interface User {
  username: string;
  groups: string[];
  permissions: string[];
}

export interface ClusterInfo {
  name: string;
  server: string;
  version: string;
  nodes: number;
  namespaces: number;
}

export interface ClusterNode extends V1Node {
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