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
import { createKubernetesApiClient, KubernetesApiClient } from '../utils/kubernetesApi';
import kubernetesProxy from './kubernetesProxy';


// Simulate storage in localStorage
const STORAGE_KEY = 'kubernetes-clusters';

class ClusterService {
  private clusters: ClusterConnection[] = [];

  constructor() {
    this.loadClusters();
    // Re-register all existing clusters with proxy service on startup
    this.reRegisterExistingClusters();
  }

  private loadClusters(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
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
      } else {
        // Initialize with empty clusters
        this.clusters = [];
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      this.clusters = [];
    }
  }

  private async reRegisterExistingClusters(): Promise<void> {
    if (this.clusters.length === 0) {
      console.log('No existing clusters to register with proxy service');
      return;
    }

    console.log(`Re-registering ${this.clusters.length} existing clusters with proxy service...`);
    
    for (const connection of this.clusters) {
      try {
        const proxyResponse = await kubernetesProxy.registerCluster({
          id: connection.config.id,
          name: connection.config.name,
          server: connection.config.server,
          auth: {
            type: connection.auth.type,
            kubeconfig: connection.auth.kubeconfig,
            token: connection.auth.token,
            certificate: connection.auth.certificate,
            privateKey: connection.auth.privateKey,
            caCertificate: connection.auth.caCertificate,
            serviceAccount: connection.auth.serviceAccount,
          },
        });
        
        if (proxyResponse.success) {
          console.log(`✅ Cluster '${connection.config.name}' (${connection.config.id}) registered with proxy service`);
        } else {
          console.warn(`❌ Failed to register cluster '${connection.config.name}' with proxy: ${proxyResponse.error}`);
        }
      } catch (error) {
        console.warn(`❌ Error registering cluster '${connection.config.name}' with proxy:`, error instanceof Error ? error.message : error);
      }
    }
  }

  private saveClusters(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clusters));
    } catch (error) {
      console.error('Error saving clusters:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

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

    // Initialize with unknown status
    const status: ClusterStatus = {
      clusterId: id,
      status: 'unknown',
      lastChecked: now,
    };

    const connection: ClusterConnection = {
      config,
      auth,
      status,
    };

    // Register cluster with proxy service if available
    console.log(`🔄 Attempting to register cluster '${config.name}' (${id}) with proxy service...`);
    try {
      const proxyResponse = await kubernetesProxy.registerCluster({
        id,
        name: config.name,
        server: config.server,
        auth: {
          type: auth.type,
          kubeconfig: auth.kubeconfig,
          token: auth.token,
          certificate: auth.certificate,
          privateKey: auth.privateKey,
          caCertificate: auth.caCertificate,
          serviceAccount: auth.serviceAccount,
        },
      });
      
      if (proxyResponse.success) {
        console.log(`✅ Cluster '${config.name}' (${id}) successfully registered with proxy service`);
      } else {
        console.error(`❌ Failed to register cluster '${config.name}' with proxy:`, proxyResponse.error);
        console.error('Response data:', proxyResponse);
      }
    } catch (error) {
      console.error(`❌ Exception during cluster registration for '${config.name}':`, error);
      console.error('Full error:', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    }

    this.clusters.push(connection);
    this.saveClusters();

    // Trigger health check
    setTimeout(() => this.checkClusterHealth(id), 1000);

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
      cluster.config = {
        ...cluster.config,
        ...request.config,
        updatedAt: now,
      };
    }

    if (request.auth) {
      cluster.auth = {
        ...cluster.auth,
        ...request.auth,
      };
    }

    this.clusters[index] = cluster;
    this.saveClusters();

    // Trigger health check if auth or server changed
    if (request.auth || request.config?.server) {
      setTimeout(() => this.checkClusterHealth(id), 1000);
    }

    return cluster;
  }

  async removeCluster(id: string): Promise<void> {
    const index = this.clusters.findIndex(c => c.config.id === id);
    if (index === -1) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    // Unregister from proxy service if available
    try {
      await kubernetesProxy.unregisterCluster(id);
      console.log(`Cluster ${id} unregistered from proxy service`);
    } catch (error) {
      console.warn('Failed to unregister from proxy service:', error instanceof Error ? error.message : error);
    }

    this.clusters.splice(index, 1);
    this.saveClusters();
  }

  async checkClusterHealth(id: string): Promise<ClusterHealthCheck> {
    const cluster = await this.getCluster(id);
    if (!cluster) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    try {
      // Create API client for this cluster (preferring proxy service)
      const apiClient = createKubernetesApiClient(cluster.config, cluster.auth, true);
      
      // Get real health check from Kubernetes API
      const healthCheck = await apiClient.getClusterHealth();
      
      if (!healthCheck) {
        throw new Error('Unable to retrieve cluster health information');
      }

      healthCheck.clusterId = id;

      // Get additional cluster info for status update
      const clusterInfo = await apiClient.getClusterInfo();
      const startTime = Date.now();
      
      // Test basic connectivity to measure response time
      const connectionTest = await apiClient.testConnection();
      const responseTime = Date.now() - startTime;

      // Update cluster status with real data
      const status: ClusterStatus = {
        clusterId: id,
        status: healthCheck.healthy ? 'connected' : (connectionTest.success ? 'degraded' : 'error'),
        lastChecked: healthCheck.timestamp,
        responseTime,
        error: healthCheck.healthy ? undefined : healthCheck.errors?.[0],
        version: clusterInfo.version || cluster.config.version,
        nodeCount: clusterInfo.nodeCount,
        namespaceCount: clusterInfo.namespaceCount,
        podCount: cluster.metrics?.pods.total, // Will be updated when metrics are fetched
      };

      // Update the cluster status
      const clusterIndex = this.clusters.findIndex(c => c.config.id === id);
      if (clusterIndex !== -1) {
        this.clusters[clusterIndex].status = status;
        this.saveClusters();
      }

      return healthCheck;
    } catch (error) {
      console.error(`Health check failed for cluster ${id}:`, error);
      
      // Create error health check
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

      // Update cluster status with error
      const status: ClusterStatus = {
        clusterId: id,
        status: 'error',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
        version: cluster.config.version,
        nodeCount: cluster.status?.nodeCount,
        namespaceCount: cluster.status?.namespaceCount,
        podCount: cluster.status?.podCount,
      };

      const clusterIndex = this.clusters.findIndex(c => c.config.id === id);
      if (clusterIndex !== -1) {
        this.clusters[clusterIndex].status = status;
        this.saveClusters();
      }

      return errorHealthCheck;
    }
  }

  async getClusterMetrics(id: string): Promise<ClusterMetrics | null> {
    const cluster = await this.getCluster(id);
    if (!cluster) {
      return null;
    }

    try {
      // Create API client for this cluster (preferring proxy service)
      const apiClient = createKubernetesApiClient(cluster.config, cluster.auth, true);
      
      // Get real metrics from Kubernetes API
      const metrics = await apiClient.getClusterMetrics();
      
      if (metrics) {
        metrics.clusterId = id;
        
        // Update the stored metrics
        const clusterIndex = this.clusters.findIndex(c => c.config.id === id);
        if (clusterIndex !== -1) {
          this.clusters[clusterIndex].metrics = metrics;
          this.saveClusters();
        }
      }
      
      return metrics;
    } catch (error) {
      console.error(`Failed to get metrics for cluster ${id}:`, error);
      
      // Return cached metrics if available, otherwise null
      return cluster.metrics || null;
    }
  }

  async importClusters(config: ClusterImportConfig): Promise<ClusterConnection[]> {
    if (config.source === 'kubeconfig' || config.source === 'file') {
      if (!config.kubeconfigContent) {
        throw new Error('Kubeconfig content is required for import');
      }

      try {
        const clusters = this.parseKubeconfigForClusters(config.kubeconfigContent);
        const imported: ClusterConnection[] = [];

        for (const clusterData of clusters) {
          const request: AddClusterRequest = {
            config: {
              name: clusterData.name,
              displayName: clusterData.displayName,
              description: `Imported from kubeconfig${clusterData.context ? ` (context: ${clusterData.context})` : ''}`,
              server: clusterData.server,
              provider: this.detectProvider(clusterData.server),
              environment: 'development', // Default, user can change later
            },
            auth: {
              type: 'kubeconfig',
              kubeconfig: config.kubeconfigContent,
              namespace: clusterData.namespace || 'default',
            },
          };

          const cluster = await this.addCluster(request);
          imported.push(cluster);
        }

        return imported;
      } catch (error) {
        throw new Error(`Failed to parse kubeconfig: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (config.source === 'manual' && config.manualConfig) {
      const request: AddClusterRequest = {
        config: {
          name: config.manualConfig.name || 'manual-cluster',
          displayName: config.manualConfig.displayName || 'Manual Cluster',
          description: 'Manually configured cluster',
          server: config.manualConfig.server,
          provider: this.detectProvider(config.manualConfig.server),
          environment: 'development',
        },
        auth: {
          type: config.manualConfig.token ? 'token' : 'certificate',
          token: config.manualConfig.token,
          certificate: config.manualConfig.certificate,
          privateKey: config.manualConfig.privateKey,
          caCertificate: config.manualConfig.caCertificate,
          namespace: config.manualConfig.namespace || 'default',
        },
      };

      const cluster = await this.addCluster(request);
      return [cluster];
    }

    return [];
  }

  private parseKubeconfigForClusters(kubeconfigContent: string): Array<{
    name: string;
    displayName: string;
    server: string;
    context?: string;
    namespace?: string;
  }> {
    try {
      // Simple YAML-like parsing for kubeconfig
      // In production, you'd want to use a proper YAML parser like js-yaml
      const lines = kubeconfigContent.split('\n');
      const clusters: Array<{ name: string; server: string }> = [];
      const contexts: Array<{ name: string; cluster: string; namespace?: string }> = [];
      let currentSection = '';
      let currentCluster: any = {};
      let currentContext: any = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('clusters:')) {
          currentSection = 'clusters';
          continue;
        }
        if (line.startsWith('contexts:')) {
          currentSection = 'contexts';
          continue;
        }
        if (line.startsWith('users:')) {
          currentSection = 'users';
          continue;
        }

        if (currentSection === 'clusters') {
          if (line.startsWith('- name:')) {
            if (currentCluster.name && currentCluster.server) {
              clusters.push({ ...currentCluster });
            }
            currentCluster = { name: line.split('name:')[1]?.trim().replace(/["']/g, '') };
          } else if (line.includes('server:') && currentCluster.name) {
            currentCluster.server = line.split('server:')[1]?.trim().replace(/["']/g, '');
          }
        }

        if (currentSection === 'contexts') {
          if (line.startsWith('- name:')) {
            if (currentContext.name && currentContext.cluster) {
              contexts.push({ ...currentContext });
            }
            currentContext = { name: line.split('name:')[1]?.trim().replace(/["']/g, '') };
          } else if (line.includes('cluster:') && currentContext.name) {
            currentContext.cluster = line.split('cluster:')[1]?.trim().replace(/["']/g, '');
          } else if (line.includes('namespace:') && currentContext.name) {
            currentContext.namespace = line.split('namespace:')[1]?.trim().replace(/["']/g, '');
          }
        }
      }

      // Add last cluster and context if they exist
      if (currentCluster.name && currentCluster.server) {
        clusters.push(currentCluster);
      }
      if (currentContext.name && currentContext.cluster) {
        contexts.push(currentContext);
      }

      // Combine clusters with contexts
      const result: Array<{
        name: string;
        displayName: string;
        server: string;
        context?: string;
        namespace?: string;
      }> = [];

      for (const cluster of clusters) {
        const relatedContexts = contexts.filter(ctx => ctx.cluster === cluster.name);
        
        if (relatedContexts.length > 0) {
          for (const context of relatedContexts) {
            result.push({
              name: `${cluster.name}-${context.name}`,
              displayName: `${cluster.name} (${context.name})`,
              server: cluster.server,
              context: context.name,
              namespace: context.namespace,
            });
          }
        } else {
          result.push({
            name: cluster.name,
            displayName: cluster.name,
            server: cluster.server,
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to parse kubeconfig: ${error instanceof Error ? error.message : 'Invalid format'}`);
    }
  }

  private detectProvider(server: string): string {
    const url = server.toLowerCase();
    
    if (url.includes('eks.amazonaws.com') || url.includes('.aws.')) {
      return 'aws';
    }
    if (url.includes('gke.') || url.includes('googleapis.com')) {
      return 'gcp';
    }
    if (url.includes('.azmk8s.io') || url.includes('azure')) {
      return 'azure';
    }
    if (url.includes('digitalocean')) {
      return 'digitalocean';
    }
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.') || url.includes('10.')) {
      return 'local';
    }
    
    return 'other';
  }

  async setDefaultCluster(id: string): Promise<void> {
    // Remove default flag from all clusters
    this.clusters.forEach(cluster => {
      cluster.config.isDefault = false;
    });

    // Set default flag on specified cluster
    const cluster = this.clusters.find(c => c.config.id === id);
    if (cluster) {
      cluster.config.isDefault = true;
      cluster.config.updatedAt = new Date();
      this.saveClusters();
    } else {
      throw new Error(`Cluster with id ${id} not found`);
    }
  }

  async getDefaultCluster(): Promise<ClusterConnection | null> {
    const defaultCluster = this.clusters.find(c => c.config.isDefault);
    return defaultCluster || (this.clusters.length > 0 ? this.clusters[0] : null);
  }

  // Smart connection testing - tries proxy first, falls back to direct
  async testConnection(
    config: ClusterConfig, 
    auth: ClusterAuth,
    logCallback?: (log: ConnectionLogEntry) => void
  ): Promise<{ success: boolean; error?: string; version?: string }> {
    const startTime = Date.now();
    
    const log = (level: 'info' | 'warning' | 'error' | 'success', step: string, message: string, details?: any) => {
      if (logCallback) {
        const entry: ConnectionLogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          level,
          step,
          message,
          details,
          duration: Date.now() - startTime,
        };
        logCallback(entry);
      }
    };

    try {
      log('info', 'Connection Strategy', 'Determining optimal connection method...');
      
      // First, try to test if proxy service is available
      try {
        log('info', 'Proxy Test', 'Testing proxy service availability...');
        
        // Create a temporary cluster ID for testing
        const tempId = `test-${Date.now()}`;
        
        // Register cluster temporarily with proxy
        const registrationResponse = await kubernetesProxy.registerCluster({
          id: tempId,
          name: config.name || 'test-cluster',
          server: config.server,
          auth: {
            type: auth.type,
            kubeconfig: auth.kubeconfig,
            token: auth.token,
            certificate: auth.certificate,
            privateKey: auth.privateKey,
            caCertificate: auth.caCertificate,
            serviceAccount: auth.serviceAccount,
          },
        });
        
        if (registrationResponse.success) {
          log('success', 'Proxy Test', 'Proxy service available, testing through proxy...');
          
          try {
            // Test connection through proxy
            const proxyResult = await kubernetesProxy.testConnection(tempId);
            
            // Clean up temporary registration
            await kubernetesProxy.unregisterCluster(tempId);
            
            if (proxyResult.success) {
              log('success', 'Proxy Connection', 'Connection successful through proxy service', {
                version: proxyResult.data?.version,
                method: 'proxy'
              });
              
              return {
                success: true,
                version: proxyResult.data?.version || 'Unknown',
              };
            } else {
              log('warning', 'Proxy Connection', 'Proxy connection failed, trying direct connection...', {
                error: proxyResult.error
              });
            }
          } catch (proxyError) {
            // Clean up temporary registration
            await kubernetesProxy.unregisterCluster(tempId).catch(() => {});
            log('warning', 'Proxy Connection', 'Proxy connection error, falling back to direct...', {
              error: proxyError instanceof Error ? proxyError.message : proxyError
            });
          }
        } else {
          log('info', 'Proxy Test', 'Proxy service not available, using direct connection');
        }
      } catch (proxyError) {
        log('info', 'Proxy Test', 'Proxy service not available, using direct connection');
      }
      
      // Fallback to direct connection
      log('info', 'Direct Connection', 'Attempting direct connection to cluster...');
      
      // Create API client for direct connection
      const apiClient = createKubernetesApiClient(config, auth);
      
      // Use the API client's connection test method with logging
      const result = await apiClient.testConnection((logEntry) => {
        if (logCallback) {
          logCallback(logEntry);
        }
      });
      
      if (result.success) {
        log('success', 'Connection Test', 'Connection successful via direct access', {
          version: result.version,
          method: 'direct',
          totalDuration: Date.now() - startTime
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      
      log('error', 'Connection Test', `All connection methods failed: ${errorMessage}`, {
        error: errorMessage,
        totalDuration: Date.now() - startTime
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }


  // Method to refresh all cluster statuses and metrics
  async refreshAllClusters(): Promise<void> {
    const promises = this.clusters.map(async (cluster) => {
      try {
        // Run health check and metrics update in parallel
        const [healthCheck] = await Promise.allSettled([
          this.checkClusterHealth(cluster.config.id),
          this.getClusterMetrics(cluster.config.id),
        ]);
        
        console.log(`Refreshed cluster ${cluster.config.displayName || cluster.config.name}`);
      } catch (error) {
        console.error(`Failed to refresh cluster ${cluster.config.id}:`, error);
      }
    });
    
    await Promise.all(promises);
    console.log('All clusters refreshed');
  }

  // Method to refresh a single cluster
  async refreshCluster(id: string): Promise<void> {
    const cluster = await this.getCluster(id);
    if (!cluster) {
      throw new Error(`Cluster with id ${id} not found`);
    }

    try {
      // Run health check and metrics update in parallel
      await Promise.allSettled([
        this.checkClusterHealth(id),
        this.getClusterMetrics(id),
      ]);
      
      console.log(`Refreshed cluster ${cluster.config.displayName || cluster.config.name}`);
    } catch (error) {
      console.error(`Failed to refresh cluster ${id}:`, error);
      throw error;
    }
  }
}

export const clusterService = new ClusterService();