import * as k8s from '@kubernetes/client-node';
import { AuthState, ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent, ResourceMetrics } from '../types/dev';

class KubernetesService {
  private kc: k8s.KubeConfig;
  private coreV1Api?: k8s.CoreV1Api;
  private appsV1Api?: k8s.AppsV1Api;
  private rbacV1Api?: k8s.RbacAuthorizationV1Api;
  private apiExtensionsV1Api?: k8s.ApiextensionsV1Api;
  private metricsV1Api?: k8s.Metrics;
  private customObjectsApi?: k8s.CustomObjectsApi;

  constructor() {
    this.kc = new k8s.KubeConfig();
  }

  async initialize(config?: string) {
    try {
      if (config) {
        this.kc.loadFromString(config);
      } else {
        this.kc.loadFromDefault();
      }

      this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
      this.appsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
      this.rbacV1Api = this.kc.makeApiClient(k8s.RbacAuthorizationV1Api);
      this.apiExtensionsV1Api = this.kc.makeApiClient(k8s.ApiextensionsV1Api);
      this.metricsV1Api = new k8s.Metrics(this.kc);
      this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
        throw new Error('Kubeconfig file not found. Please provide a valid kubeconfig file or ensure kubectl is configured.');
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect ECONNREFUSED')) {
        throw new Error('Cannot connect to Kubernetes cluster. Please ensure the cluster is running and accessible.');
      }
      console.error('Failed to initialize Kubernetes client:', error);
      throw new Error(`Failed to initialize Kubernetes client: ${errorMessage}`);
    }
  }

  async authenticate(token?: string): Promise<AuthState> {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes client not initialized');
    }

    try {
      // Test authentication by calling a simple API
      const version = await this.coreV1Api.getAPIResources();
      
      // Get cluster info
      const nodes = await this.getNodes();
      const namespaces = await this.getNamespaces();
      
      // Get current user info (from kubeconfig)
      const currentContext = this.kc.getCurrentContext();
      const user = this.kc.getCurrentUser();

      return {
        isAuthenticated: true,
        user: {
          username: user?.name || 'unknown',
          groups: user?.['user']?.['groups'] || [],
          permissions: [] // Will be populated by RBAC checks
        },
        token: token || null,
        cluster: {
          name: currentContext || 'default',
          server: this.kc.getCurrentCluster()?.server || '',
          version: version.response.statusCode === 200 ? 'v1' : 'unknown',
          nodes: nodes.length,
          namespaces: namespaces.length
        }
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async getNodes(): Promise<ClusterNode[]> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      const response = await this.coreV1Api.listNode();
      return response.body.items as ClusterNode[];
    } catch (error) {
      console.error('Failed to get nodes:', error);
      throw error;
    }
  }

  async getNamespaces(): Promise<NamespaceWithMetrics[]> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      const response = await this.coreV1Api.listNamespace();
      const namespaces: NamespaceWithMetrics[] = [];

      for (const namespace of response.body.items) {
        const namespaceName = namespace.metadata?.name || '';
        const podsResponse = await this.coreV1Api.listNamespacedPod(namespaceName);
        
        namespaces.push({
          ...namespace,
          metrics: {
            podCount: podsResponse.body.items.length,
            cpuUsage: '0m', // Would need metrics server
            memoryUsage: '0Mi', // Would need metrics server
            resourceQuotas: [] // Would need to fetch resource quotas
          }
        });
      }

      return namespaces;
    } catch (error) {
      console.error('Failed to get namespaces:', error);
      throw error;
    }
  }

  async createNamespace(name: string, labels?: Record<string, string>): Promise<k8s.V1Namespace> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      const namespace: k8s.V1Namespace = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name,
          labels: labels || {}
        }
      };

      const response = await this.coreV1Api.createNamespace(namespace);
      return response.body;
    } catch (error) {
      console.error('Failed to create namespace:', error);
      throw error;
    }
  }

  async deleteNamespace(name: string): Promise<void> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      await this.coreV1Api.deleteNamespace(name);
    } catch (error) {
      console.error('Failed to delete namespace:', error);
      throw error;
    }
  }

  async getCRDs(): Promise<CRDWithInstances[]> {
    if (!this.apiExtensionsV1Api || !this.customObjectsApi) throw new Error('API not initialized');
    
    try {
      const response = await this.apiExtensionsV1Api.listCustomResourceDefinition();
      const crds: CRDWithInstances[] = [];

      for (const crd of response.body.items) {
        const scope = crd.spec?.scope as 'Cluster' | 'Namespaced';
        let instances = 0;

        try {
          // Try to get instances of this CRD
          const group = crd.spec?.group || '';
          const version = crd.spec?.versions?.[0]?.name || '';
          const plural = crd.spec?.names?.plural || '';

          if (scope === 'Cluster') {
            const instancesResponse = await this.customObjectsApi.listClusterCustomObject(group, version, plural);
            instances = (instancesResponse.body as any).items?.length || 0;
          }
        } catch (error) {
          // Ignore errors when getting instances
        }

        crds.push({
          ...crd,
          instances,
          scope
        });
      }

      return crds;
    } catch (error) {
      console.error('Failed to get CRDs:', error);
      throw error;
    }
  }

  async getServiceAccounts(namespace?: string): Promise<k8s.V1ServiceAccount[]> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      const response = namespace 
        ? await this.coreV1Api.listNamespacedServiceAccount(namespace)
        : await this.coreV1Api.listServiceAccountForAllNamespaces();
      
      return response.body.items;
    } catch (error) {
      console.error('Failed to get service accounts:', error);
      throw error;
    }
  }

  async getRoles(namespace?: string): Promise<k8s.V1Role[]> {
    if (!this.rbacV1Api) throw new Error('API not initialized');
    
    try {
      const response = namespace
        ? await this.rbacV1Api.listNamespacedRole(namespace)
        : await this.rbacV1Api.listRoleForAllNamespaces();
      
      return response.body.items;
    } catch (error) {
      console.error('Failed to get roles:', error);
      throw error;
    }
  }

  async getClusterRoles(): Promise<k8s.V1ClusterRole[]> {
    if (!this.rbacV1Api) throw new Error('API not initialized');
    
    try {
      const response = await this.rbacV1Api.listClusterRole();
      return response.body.items;
    } catch (error) {
      console.error('Failed to get cluster roles:', error);
      throw error;
    }
  }

  async getRoleBindings(namespace?: string): Promise<k8s.V1RoleBinding[]> {
    if (!this.rbacV1Api) throw new Error('API not initialized');
    
    try {
      const response = namespace
        ? await this.rbacV1Api.listNamespacedRoleBinding(namespace)
        : await this.rbacV1Api.listRoleBindingForAllNamespaces();
      
      return response.body.items;
    } catch (error) {
      console.error('Failed to get role bindings:', error);
      throw error;
    }
  }

  async getClusterRoleBindings(): Promise<k8s.V1ClusterRoleBinding[]> {
    if (!this.rbacV1Api) throw new Error('API not initialized');
    
    try {
      const response = await this.rbacV1Api.listClusterRoleBinding();
      return response.body.items;
    } catch (error) {
      console.error('Failed to get cluster role bindings:', error);
      throw error;
    }
  }

  async getEvents(namespace?: string): Promise<ClusterEvent[]> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      const response = namespace
        ? await this.coreV1Api.listNamespacedEvent(namespace)
        : await this.coreV1Api.listEventForAllNamespaces();
      
      return response.body.items.map(event => ({
        type: event.type as 'Normal' | 'Warning',
        reason: event.reason || '',
        message: event.message || '',
        source: event.source?.component || '',
        object: `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
        firstTimestamp: event.firstTimestamp || '',
        lastTimestamp: event.lastTimestamp || '',
        count: event.count || 1
      }));
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  async getPodLogs(namespace: string, podName: string, containerName?: string): Promise<string> {
    if (!this.coreV1Api) throw new Error('API not initialized');
    
    try {
      const response = await this.coreV1Api.readNamespacedPodLog(
        podName,
        namespace,
        containerName,
        false, // follow
        undefined, // previous
        undefined, // sinceSeconds
        undefined, // sinceTime
        undefined, // timestamps
        1000 // tailLines
      );
      
      return response.body;
    } catch (error) {
      console.error('Failed to get pod logs:', error);
      throw error;
    }
  }

  async getResourceMetrics(namespace?: string): Promise<ResourceMetrics[]> {
    // This would require metrics-server to be installed
    // For now, return mock data
    return [];
  }

  getKubeConfig(): k8s.KubeConfig {
    return this.kc;
  }
}

export const kubernetesService = new KubernetesService();