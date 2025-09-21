// Browser-safe wrapper service that delegates to the API service
// This maintains compatibility with existing imports while avoiding direct Kubernetes client usage
import { kubernetesService as apiService } from './kubernetes-api';
import { AuthState, ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent, ResourceMetrics } from '../types';
import { V1Namespace, V1ServiceAccount } from '../types';

class KubernetesService {
  private isInitialized = false;

  constructor() {
    console.log('[K8s Service] Browser-safe wrapper service initialized');
  }

  async initialize(config?: string): Promise<boolean> {
    console.log('[K8s Service] Delegating initialization to API service...');
    try {
      const result = await apiService.initialize(config);
      this.isInitialized = result;
      return result;
    } catch (error) {
      console.error('[K8s Service] Initialization failed:', error);
      throw error;
    }
  }

  async authenticate(token?: string): Promise<AuthState> {
    console.log('[K8s Service] Delegating authentication to API service...');
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.authenticate(token);
  }

  async getNodes(): Promise<ClusterNode[]> {
    console.log('[K8s Service] Delegating getNodes to API service...');
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await apiService.getNodes();
  }

  async getNamespaces(): Promise<NamespaceWithMetrics[]> {
    console.log('[K8s Service] Delegating getNamespaces to API service...');
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