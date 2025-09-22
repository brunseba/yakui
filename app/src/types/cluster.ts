export interface ClusterConfig {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  server: string;
  version?: string;
  provider?: 'aws' | 'gcp' | 'azure' | 'local' | 'other';
  region?: string;
  environment?: 'development' | 'staging' | 'production';
  tags?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

export interface ClusterAuth {
  clusterId: string;
  type: 'kubeconfig' | 'serviceaccount' | 'token' | 'certificate';
  kubeconfig?: string;
  token?: string;
  certificate?: string;
  privateKey?: string;
  caCertificate?: string;
  serviceAccount?: {
    namespace: string;
    name: string;
    token: string;
  };
  namespace?: string;
}

export interface ClusterStatus {
  clusterId: string;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  version?: string;
  nodeCount?: number;
  namespaceCount?: number;
  podCount?: number;
}

export interface ClusterMetrics {
  clusterId: string;
  timestamp: Date;
  nodes: {
    total: number;
    ready: number;
    notReady: number;
  };
  pods: {
    total: number;
    running: number;
    pending: number;
    failed: number;
  };
  namespaces: {
    total: number;
    active: number;
    terminating: number;
  };
  resources?: {
    cpu: {
      capacity: number;
      allocated: number;
      usage: number;
    };
    memory: {
      capacity: number;
      allocated: number;
      usage: number;
    };
    storage: {
      capacity: number;
      allocated: number;
      usage: number;
    };
  };
}

export interface ClusterConnection {
  config: ClusterConfig;
  auth: ClusterAuth;
  status: ClusterStatus;
  metrics?: ClusterMetrics;
}

export interface ClusterContextState {
  clusters: ClusterConnection[];
  currentCluster?: ClusterConnection;
  isLoading: boolean;
  error?: string;
}

export interface ClusterContextActions {
  addCluster: (clusterOrConfig: ClusterConnection | ClusterConfig, auth?: ClusterAuth) => Promise<void>;
  updateCluster: (id: string, config: Partial<ClusterConfig>, auth?: Partial<ClusterAuth>) => Promise<void>;
  removeCluster: (id: string) => Promise<void>;
  switchCluster: (id: string) => Promise<void>;
  refreshCluster: (id: string) => Promise<void>;
  refreshAllClusters: () => Promise<void>;
  setDefaultCluster: (id: string) => Promise<void>;
}

export type ClusterContextValue = ClusterContextState & ClusterContextActions;

export interface AddClusterRequest {
  config: Omit<ClusterConfig, 'id' | 'createdAt' | 'updatedAt'>;
  auth: Omit<ClusterAuth, 'clusterId'>;
}

export interface UpdateClusterRequest {
  config?: Partial<Omit<ClusterConfig, 'id' | 'createdAt' | 'updatedAt'>>;
  auth?: Partial<Omit<ClusterAuth, 'clusterId'>>;
}

export interface ClusterHealthCheck {
  clusterId: string;
  healthy: boolean;
  checks: {
    apiServer: boolean;
    nodes: boolean;
    coreDNS: boolean;
    networking: boolean;
  };
  errors?: string[];
  timestamp: Date;
}

export interface ClusterListFilters {
  provider?: string;
  environment?: string;
  status?: string;
  search?: string;
}

export interface ClusterImportConfig {
  source: 'kubeconfig' | 'file' | 'manual';
  kubeconfigContent?: string;
  kubeconfigFile?: File;
  manualConfig?: {
    server: string;
    token?: string;
    certificate?: {
      cert: string;
      key: string;
      ca?: string;
    };
  };
}

export interface ClusterSwitchEvent {
  from?: ClusterConnection;
  to: ClusterConnection;
  timestamp: Date;
}

// Utility types
export type ClusterProvider = ClusterConfig['provider'];
export type ClusterEnvironment = ClusterConfig['environment'];
export type ClusterAuthType = ClusterAuth['type'];
export type ClusterStatusType = ClusterStatus['status'];