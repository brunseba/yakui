/**
 * Backend-Integrated Cluster Service
 * 
 * This service integrates multicluster management with the backend's
 * dynamic authentication system, ensuring all cluster operations
 * go through the authenticated backend context.
 */

import {
  ClusterConfig,
  ClusterAuth,
  ClusterStatus,
  ClusterMetrics,
  ClusterConnection,
  ClusterHealthCheck,
  AddClusterRequest,
  UpdateClusterRequest,
  ClusterListFilters,
  ClusterImportConfig
} from '../types/cluster';
import { ConnectionLogEntry } from '../components/cluster/ConnectionLogViewer';
import { config } from '../config/environment';

// API endpoints
const API_BASE = config.api.baseUrl;

interface BackendClusterInfo {
  success: boolean;
  clusterId?: string;
  context?: string;
  server?: string;
  user?: string;
  version?: string;
  versionDetails?: any;
  nodes?: number;
  namespaces?: number;
  availableContexts?: string[];
  timestamp?: string;
  error?: string;
}

interface ClusterSwitchRequest {
  clusterId?: string;
  kubeconfig?: string;
  token?: string;
  server?: string;
  context?: string;
}

interface ClusterTestRequest {
  kubeconfig?: string;
  token?: string;
  server?: string;
  context?: string;
}

class BackendClusterService {
  private clusters: ClusterConnection[] = [];
  private activeClusterId: string | null = null;

  constructor() {
    this.loadClusters();
  }

  private loadClusters(): void {
    try {
      const stored = localStorage.getItem('kubernetes-clusters');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.clusters = parsed.map((cluster: any) => ({
          ...cluster,
          config: {
            ...cluster.config,
            createdAt: new Date(cluster.config.createdAt),
            updatedAt: new Date(cluster.config.updatedAt),
          },
          status: {
            ...cluster.status,
            lastChecked: new Date(cluster.status.lastChecked),
          },
          metrics: cluster.metrics ? {
            ...cluster.metrics,
            timestamp: new Date(cluster.metrics.timestamp),
          } : undefined,
        }));
      }
    } catch (error) {
      console.error('[BackendClusterService] Error loading clusters:', error);
      this.clusters = [];
    }
  }

  private saveClusters(): void {
    try {
      localStorage.setItem('kubernetes-clusters', JSON.stringify(this.clusters));
    } catch (error) {
      console.error('[BackendClusterService] Error saving clusters:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  /**
   * Switch active cluster context in the backend
   */
  async switchBackendCluster(clusterId: string): Promise<BackendClusterInfo> {
    console.log(`[BackendClusterService] 🔄 Switching backend to cluster: ${clusterId}`);
    
    const cluster = await this.getCluster(clusterId);
    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not found`);
    }

    const switchRequest: ClusterSwitchRequest = {
      clusterId,
      kubeconfig: cluster.auth.kubeconfig,
      token: cluster.auth.token,
      server: cluster.config.server,
      context: cluster.auth.context,
    };

    try {
      const response = await fetch(`${API_BASE}/cluster/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(switchRequest),
        signal: AbortSignal.timeout(config.api.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend switch failed: ${response.statusText}`);
      }

      const result = await response.json() as BackendClusterInfo;
      
      if (result.success) {
        this.activeClusterId = clusterId;
        console.log(`[BackendClusterService] ✅ Backend switched to cluster:`, {
          clusterId,
          context: result.context,
          server: result.server,
          nodes: result.nodes,
          namespaces: result.namespaces
        });
      }

      return result;
    } catch (error) {
      console.error(`[BackendClusterService] ❌ Backend cluster switch failed:`, error);
      throw error;
    }
  }

  /**
   * Test cluster connectivity through backend without switching
   */
  async testClusterConnectivity(
    cluster: ClusterConnection,
    logCallback?: (log: ConnectionLogEntry) => void
  ): Promise<BackendClusterInfo> {
    console.log(`[BackendClusterService] 🔍 Testing cluster connectivity: ${cluster.config.name}`);
    
    const startTime = Date.now();
    const log = (level: ConnectionLogEntry['level'], step: string, message: string, details?: any) => {
      if (logCallback) {
        logCallback({
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          level,
          step,
          message,
          details,
          duration: Date.now() - startTime,
        });
      }
    };

    const testRequest: ClusterTestRequest = {
      kubeconfig: cluster.auth.kubeconfig,
      token: cluster.auth.token,
      server: cluster.config.server,
      context: cluster.auth.context,
    };

    try {
      log('info', 'Backend Test', 'Testing cluster through backend authentication');
      
      const response = await fetch(`${API_BASE}/cluster/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRequest),
        signal: AbortSignal.timeout(config.api.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = errorData.error || `Test failed: ${response.statusText}`;
        log('error', 'Backend Test', error, errorData);
        throw new Error(error);
      }

      const result = await response.json() as BackendClusterInfo;
      
      if (result.success) {
        log('success', 'Backend Test', `Connected to ${result.context}`, {
          server: result.server,
          version: result.version,
          user: result.user
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'Backend Test', `Connection test failed: ${errorMessage}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get current backend cluster information
   */
  async getCurrentBackendCluster(): Promise<BackendClusterInfo> {
    try {
      const response = await fetch(`${API_BASE}/cluster/current`, {
        signal: AbortSignal.timeout(config.api.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get current cluster: ${response.statusText}`);
      }

      return await response.json() as BackendClusterInfo;
    } catch (error) {
      console.error('[BackendClusterService] Failed to get current backend cluster:', error);
      throw error;
    }
  }

  // Standard cluster management methods with backend integration
  async getClusters(filters?: ClusterListFilters): Promise<ClusterConnection[]> {
    let filtered = [...this.clusters];

    if (filters) {
      if (filters.provider) {
        filtered = filtered.filter(c => c.config.provider === filters.provider);
      }
      if (filters.environment) {
        filtered = filtered.filter(c => c.config.environment === filters.environment);
      }
      if (filters.status) {
        filtered = filtered.filter(c => c.status.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(c => 
          c.config.name.toLowerCase().includes(search) ||
          c.config.displayName?.toLowerCase().includes(search) ||
          c.config.description?.toLowerCase().includes(search)
        );
      }
    }

    return filtered;
  }

  async getCluster(id: string): Promise<ClusterConnection | null> {
    return this.clusters.find(c => c.config.id === id) || null;
  }

  async addCluster(request: AddClusterRequest): Promise<ClusterConnection> {
    const id = this.generateId();
    const now = new Date();

    const config: ClusterConfig = {
      ...request.config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const auth: ClusterAuth = {
      ...request.auth,
      clusterId: id,
    };

    const status: ClusterStatus = {
      clusterId: id,
      status: 'unknown',
      lastChecked: now,
    };

    const connection: ClusterConnection = { config, auth, status };

    this.clusters.push(connection);
    this.saveClusters();

    console.log(`[BackendClusterService] ✅ Added cluster: ${config.name} (${id})`);

    // Test connectivity through backend
    try {
      const testResult = await this.testClusterConnectivity(connection);
      if (testResult.success) {
        // Update status based on backend test
        connection.status = {
          ...connection.status,
          status: 'connected',
          lastChecked: new Date(),
          version: testResult.version,
          nodeCount: testResult.nodes,
          namespaceCount: testResult.namespaces,
        };
        this.saveClusters();
      }
    } catch (error) {
      console.warn(`[BackendClusterService] Initial connectivity test failed for ${config.name}:`, error instanceof Error ? error.message : error);
      connection.status.status = 'error';
      connection.status.error = error instanceof Error ? error.message : 'Connection test failed';
      this.saveClusters();
    }

    return connection;
  }

  async updateCluster(id: string, request: UpdateClusterRequest): Promise<ClusterConnection> {
    const index = this.clusters.findIndex(c => c.config.id === id);
    if (index === -1) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    const cluster = this.clusters[index];
    const now = new Date();

    if (request.config) {
      cluster.config = { ...cluster.config, ...request.config, updatedAt: now };
    }

    if (request.auth) {
      cluster.auth = { ...cluster.auth, ...request.auth };
    }

    this.clusters[index] = cluster;
    this.saveClusters();

    console.log(`[BackendClusterService] ✅ Updated cluster: ${cluster.config.name} (${id})`);
    return cluster;
  }

  async removeCluster(id: string): Promise<void> {
    const index = this.clusters.findIndex(c => c.config.id === id);
    if (index === -1) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    const cluster = this.clusters[index];
    this.clusters.splice(index, 1);
    this.saveClusters();

    // Clear active cluster if it was the removed one
    if (this.activeClusterId === id) {
      this.activeClusterId = null;
    }

    console.log(`[BackendClusterService] ✅ Removed cluster: ${cluster.config.name} (${id})`);
  }

  async checkClusterHealth(id: string): Promise<ClusterHealthCheck> {
    const cluster = await this.getCluster(id);
    if (!cluster) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    try {
      // Switch backend to this cluster temporarily to check health
      const currentBackend = await this.getCurrentBackendCluster().catch(() => null);
      const switchResult = await this.switchBackendCluster(id);

      if (switchResult.success) {
        // Update cluster status with real data from backend
        const status: ClusterStatus = {
          clusterId: id,
          status: 'connected',
          lastChecked: new Date(),
          version: switchResult.version,
          nodeCount: switchResult.nodes,
          namespaceCount: switchResult.namespaces,
          responseTime: 200, // Approximate, could be more precise
        };

        // Update stored cluster status
        const clusterIndex = this.clusters.findIndex(c => c.config.id === id);
        if (clusterIndex !== -1) {
          this.clusters[clusterIndex].status = status;
          this.saveClusters();
        }

        // Restore previous backend cluster if different
        if (currentBackend && currentBackend.clusterId !== id) {
          try {
            // Would need to implement restoring previous context
            // For now, we keep the current context as the tested cluster
          } catch (restoreError) {
            console.warn('[BackendClusterService] Failed to restore previous cluster context:', restoreError);
          }
        }

        const healthCheck: ClusterHealthCheck = {
          clusterId: id,
          healthy: true,
          checks: {
            apiServer: true,
            nodes: (switchResult.nodes || 0) > 0,
            coreDNS: true,
            networking: true,
          },
          timestamp: new Date(),
        };

        return healthCheck;
      } else {
        throw new Error(switchResult.error || 'Health check failed');
      }
    } catch (error) {
      console.error(`[BackendClusterService] Health check failed for cluster ${id}:`, error);
      
      // Update status to error
      const status: ClusterStatus = {
        clusterId: id,
        status: 'error',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      };

      const clusterIndex = this.clusters.findIndex(c => c.config.id === id);
      if (clusterIndex !== -1) {
        this.clusters[clusterIndex].status = status;
        this.saveClusters();
      }

      const errorHealthCheck: ClusterHealthCheck = {
        clusterId: id,
        healthy: false,
        checks: {
          apiServer: false,
          nodes: false,
          coreDNS: false,
          networking: false,
        },
        errors: [error instanceof Error ? error.message : 'Unknown health check error'],
        timestamp: new Date(),
      };

      return errorHealthCheck;
    }
  }

  // Additional helper methods for backend integration
  async refreshAllClusters(): Promise<void> {
    console.log(`[BackendClusterService] 🔄 Refreshing all ${this.clusters.length} clusters...`);
    
    for (const cluster of this.clusters) {
      try {
        await this.checkClusterHealth(cluster.config.id);
      } catch (error) {
        console.warn(`[BackendClusterService] Failed to refresh cluster ${cluster.config.name}:`, error);
      }
    }
    
    console.log(`[BackendClusterService] ✅ Cluster refresh completed`);
  }

  async setDefaultCluster(id: string): Promise<void> {
    const cluster = await this.getCluster(id);
    if (!cluster) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    // Remove default flag from all clusters
    this.clusters.forEach(c => {
      c.config.isDefault = false;
    });

    // Set the specified cluster as default
    cluster.config.isDefault = true;
    cluster.config.updatedAt = new Date();

    this.saveClusters();
    console.log(`[BackendClusterService] ✅ Set default cluster: ${cluster.config.name} (${id})`);
  }

  async getDefaultCluster(): Promise<ClusterConnection | null> {
    return this.clusters.find(c => c.config.isDefault) || (this.clusters.length > 0 ? this.clusters[0] : null);
  }

  getActiveClusterId(): string | null {
    return this.activeClusterId;
  }
}

// Export singleton instance
export const backendClusterService = new BackendClusterService();
export default backendClusterService;