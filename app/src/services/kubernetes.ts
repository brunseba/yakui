// Browser-safe wrapper service that delegates to the API service
// This maintains compatibility with existing imports while avoiding direct Kubernetes client usage
import { kubernetesService as apiService } from './kubernetes-api';
import { AuthState, ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent, ResourceMetrics } from '../types';
import { V1Namespace, V1ServiceAccount } from '../types';
import { ClusterConnection } from '../types/cluster';

class KubernetesService {
  private isInitialized = false;
  private currentCluster: ClusterConnection | null = null;

  constructor() {
    console.log('[K8s Service] Browser-safe wrapper service initialized');
    
    // Listen for cluster switch events
    if (typeof window !== 'undefined') {
      window.addEventListener('clusterSwitch', this.handleClusterSwitch.bind(this));
    }
  }

  private handleClusterSwitch(event: CustomEvent<any>) {
    const { to } = event.detail;
    console.log('[K8s Service] Cluster switched to:', to.config.displayName || to.config.name);
    this.currentCluster = to;
    // Reset initialization to force reconnection with new cluster
    this.isInitialized = false;
  }

  setCurrentCluster(cluster: ClusterConnection | null) {
    this.currentCluster = cluster;
    this.isInitialized = false; // Force re-initialization with new cluster
  }

  getCurrentCluster(): ClusterConnection | null {
    return this.currentCluster;
  }

  async initialize(config?: string): Promise<boolean> {
    console.log('[K8s Service] Delegating initialization to API service...');
    
    // Use current cluster configuration if available
    let clusterConfig = config;
    if (!clusterConfig && this.currentCluster) {
      clusterConfig = this.getClusterConfig(this.currentCluster);
    }
    
    try {
      const result = await apiService.initialize(clusterConfig);
      this.isInitialized = result;
      return result;
    } catch (error) {
      console.error('[K8s Service] Initialization failed:', error);
      throw error;
    }
  }

  private getClusterConfig(cluster: ClusterConnection): string {
    // Convert cluster connection to config string based on auth type
    switch (cluster.auth.type) {
      case 'kubeconfig':
        return cluster.auth.kubeconfig || '';
      case 'token':
        return JSON.stringify({
          server: cluster.config.server,
          token: cluster.auth.token,
          namespace: cluster.auth.namespace
        });
      case 'certificate':
        return JSON.stringify({
          server: cluster.config.server,
          certificate: cluster.auth.certificate,
          namespace: cluster.auth.namespace
        });
      case 'serviceaccount':
        return JSON.stringify({
          server: cluster.config.server,
          serviceAccount: cluster.auth.serviceAccount,
          namespace: cluster.auth.namespace
        });
      default:
        return '';
    }
  }

  private ensureClusterContext(): void {
    if (!this.currentCluster) {
      console.warn('[K8s Service] No cluster context available. Operations may fail.');
      // Don't throw error to maintain backward compatibility
    }
  }

  async authenticate(token?: string): Promise<AuthState> {
    console.log('[K8s Service] Delegating authentication to API service...');
    this.ensureClusterContext();
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.authenticate(token);
  }

  async getNodes(): Promise<ClusterNode[]> {
    console.log('[K8s Service] Delegating getNodes to API service...');
    this.ensureClusterContext();
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.getNodes();
  }

  async getNamespaces(): Promise<NamespaceWithMetrics[]> {
    console.log('[K8s Service] Delegating getNamespaces to API service...');
    this.ensureClusterContext();
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.getNamespaces();
  }

  async createNamespace(name: string, labels?: Record<string, string>): Promise<V1Namespace> {
    console.log('[K8s Service] Delegating createNamespace to API service...');
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.createNamespace(name, labels);
  }

  async deleteNamespace(name: string): Promise<void> {
    console.log('[K8s Service] Delegating deleteNamespace to API service...');
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.deleteNamespace(name);
  }

  async getCRDs(): Promise<CRDWithInstances[]> {
    console.log('[K8s Service] Delegating getCRDs to API service...');
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.getCRDs();
  }

  async getServiceAccounts(namespace?: string): Promise<V1ServiceAccount[]> {
    console.log('[K8s Service] Delegating getServiceAccounts to API service...');
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.getServiceAccounts(namespace);
  }

  // Stub implementations for RBAC methods - these would need to be implemented in the API service
  async getRoles(namespace?: string): Promise<any[]> {
    console.log('[K8s Service] getRoles - using API service (stub)');
    return [];
  }

  async getClusterRoles(): Promise<any[]> {
    console.log('[K8s Service] getClusterRoles - using API service (stub)');
    return [];
  }

  async getRoleBindings(namespace?: string): Promise<any[]> {
    console.log('[K8s Service] getRoleBindings - using API service (stub)');
    return [];
  }

  async getClusterRoleBindings(): Promise<any[]> {
    console.log('[K8s Service] getClusterRoleBindings - using API service (stub)');
    return [];
  }

  async getEvents(namespace?: string): Promise<ClusterEvent[]> {
    console.log('[K8s Service] getEvents - using API service (stub)');
    return [];
  }

  async getPodLogs(namespace: string, podName: string, containerName?: string): Promise<string> {
    console.log('[K8s Service] getPodLogs - using API service (stub)');
    return 'No logs available in browser environment. Use kubectl logs instead.';
  }

  async getResourceMetrics(namespace?: string): Promise<ResourceMetrics[]> {
    console.log('[K8s Service] getResourceMetrics - using API service (stub)');
    return [];
  }

  // Remove getKubeConfig as it's not available in browser environment
}

export const kubernetesService = new KubernetesService();