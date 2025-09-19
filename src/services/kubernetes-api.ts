import { AuthState, ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent, ResourceMetrics } from '../types/dev';
import { config } from '../config/environment';
import { safeApiCall, handleStubImplementation, fallbackValues, maskServerUrl } from '../utils/errorHandling';

class KubernetesApiService {
  private isInitialized = false;
  private readonly apiBaseUrl = config.api.baseUrl;

  async initialize(kubeConfig?: string): Promise<boolean> {
    console.log('[K8s API] Initializing Kubernetes API service...');
    console.log('[K8s API] API Base URL:', this.apiBaseUrl);
    console.log('[K8s API] Config provided:', kubeConfig ? 'Yes' : 'No');
    
    try {
      // Test backend connection
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        throw new Error(`Backend API not available: ${response.status}`);
      }
      
      const health = await response.json();
      console.log('[K8s API] Backend health check:', health);
      
      this.isInitialized = true;
      console.log('[K8s API] Initialization complete');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[K8s API] Failed to initialize:', errorMessage);
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED')) {
        throw new Error('Backend API server is not running. Please start it with: node dev-server.js');
      }
      
      throw new Error(`Failed to initialize API service: ${errorMessage}`);
    }
  }

  async authenticate(token?: string): Promise<AuthState> {
    console.log('[K8s API] Authenticating with real cluster...');
    console.log('[K8s API] Token provided:', token ? 'Yes' : 'No');
    
    if (!this.isInitialized) {
      console.error('[K8s API] Service not initialized!');
      throw new Error('Service not initialized');
    }

    try {
      const result = await safeApiCall(
        async () => {
          const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
            signal: AbortSignal.timeout(config.api.timeout)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Authentication failed');
          }

          return response.json();
        },
        {
          ...fallbackValues.cluster.info,
          ...fallbackValues.user,
          isAuthenticated: false,
          token: null,
          cluster: fallbackValues.cluster.info
        },
        'AUTH_LOGIN_FAILED',
        { token: token ? '***' : 'none' }
      );

      // Mask server URL for security
      if (result.data.cluster?.server) {
        result.data.cluster.server = maskServerUrl(result.data.cluster.server);
      }

      console.log('[K8s API] Authentication result', {
        cluster: result.data.cluster?.name,
        nodes: result.data.cluster?.nodes,
        namespaces: result.data.cluster?.namespaces,
        fallback: result.fallback ? 'Used fallback data' : 'Real data'
      });

      return result.data;
    } catch (error) {
      console.error('[K8s API] Authentication failed:', error);
      throw error;
    }
  }

  async getNodes(): Promise<ClusterNode[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching nodes from cluster...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/nodes`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch nodes');
      }
      
      const nodes = await response.json();
      console.log(`[K8s API] Retrieved ${nodes.length} nodes`);
      return nodes;
    } catch (error) {
      console.error('[K8s API] Failed to get nodes:', error);
      throw error;
    }
  }

  async getNamespaces(): Promise<NamespaceWithMetrics[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching namespaces from cluster...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/namespaces`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch namespaces');
      }
      
      const namespaces = await response.json();
      console.log(`[K8s API] Retrieved ${namespaces.length} namespaces`);
      return namespaces;
    } catch (error) {
      console.error('[K8s API] Failed to get namespaces:', error);
      throw error;
    }
  }

  async createNamespace(name: string, labels?: Record<string, string>): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Creating namespace: ${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/namespaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, labels }),
        signal: AbortSignal.timeout(config.api.timeout)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create namespace');
      }

      const namespace = await response.json();
      console.log(`[K8s API] Created namespace: ${name}`);
      return namespace;
    } catch (error) {
      console.error('[K8s API] Failed to create namespace:', error);
      throw error;
    }
  }

  async deleteNamespace(name: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Deleting namespace: ${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/namespaces/${name}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete namespace');
      }

      console.log(`[K8s API] Deleted namespace: ${name}`);
    } catch (error) {
      console.error('[K8s API] Failed to delete namespace:', error);
      throw error;
    }
  }

  async getNamespaceDetails(name: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching namespace details: ${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/namespaces/${name}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch namespace details');
      }
      
      const namespaceDetails = await response.json();
      console.log(`[K8s API] Retrieved details for namespace: ${name}`);
      return namespaceDetails;
    } catch (error) {
      console.error('[K8s API] Failed to get namespace details:', error);
      throw error;
    }
  }

  async getCRDs(): Promise<CRDWithInstances[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching CRDs from cluster...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/crds`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch CRDs');
      }
      
      const crds = await response.json();
      console.log(`[K8s API] Retrieved ${crds.length} CRDs`);
      return crds;
    } catch (error) {
      console.error('[K8s API] Failed to get CRDs:', error);
      throw error;
    }
  }

  async getKubernetesResources(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching Kubernetes resources from cluster...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Kubernetes resources');
      }
      
      const resources = await response.json();
      console.log(`[K8s API] Retrieved ${resources.length} Kubernetes resources`);
      return resources;
    } catch (error) {
      console.error('[K8s API] Failed to get Kubernetes resources:', error);
      throw error;
    }
  }

  async getCRDDetails(name: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching CRD details: ${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/crds/${name}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch CRD details');
      }
      
      const crdDetails = await response.json();
      console.log(`[K8s API] Retrieved details for CRD: ${name}`);
      return crdDetails;
    } catch (error) {
      console.error('[K8s API] Failed to get CRD details:', error);
      throw error;
    }
  }

  async getResourceDetails(type: string, namespace: string, name: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching ${type} details: ${namespace}/${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/${type}/${namespace}/${name}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch ${type} details`);
      }
      
      const resourceDetails = await response.json();
      console.log(`[K8s API] Retrieved details for ${type}: ${name}`);
      return resourceDetails;
    } catch (error) {
      console.error(`[K8s API] Failed to get ${type} details:`, error);
      throw error;
    }
  }

  async getResourceEvents(type: string, namespace: string, name: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching events for ${type}: ${namespace}/${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/${type}/${namespace}/${name}/events`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch events for ${type}`);
      }
      
      const events = await response.json();
      console.log(`[K8s API] Retrieved ${events.length} events for ${type}: ${name}`);
      return events;
    } catch (error) {
      console.error(`[K8s API] Failed to get events for ${type}:`, error);
      throw error;
    }
  }

  async getRelatedResources(type: string, namespace: string, name: string, resourceData: any): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching related resources for ${type}: ${namespace}/${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/${type}/${namespace}/${name}/related`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch related resources for ${type}`);
      }
      
      const relatedResources = await response.json();
      console.log(`[K8s API] Retrieved ${relatedResources.length} related resources for ${type}: ${name}`);
      return relatedResources;
    } catch (error) {
      console.error(`[K8s API] Failed to get related resources for ${type}:`, error);
      throw error;
    }
  }

  async getPodLogs(namespace: string, name: string, container?: string): Promise<string> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching logs for pod: ${namespace}/${name}`);
    
    try {
      const url = new URL(`${this.apiBaseUrl}/resources/pod/${namespace}/${name}/logs`);
      if (container) url.searchParams.set('container', container);
      
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pod logs');
      }
      
      const { logs } = await response.json();
      console.log(`[K8s API] Retrieved logs for pod: ${name}`);
      return logs;
    } catch (error) {
      console.error('[K8s API] Failed to get pod logs:', error);
      throw error;
    }
  }

  async deleteResource(type: string, namespace: string, name: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Deleting ${type}: ${namespace}/${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/${type}/${namespace}/${name}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete ${type}`);
      }
      
      console.log(`[K8s API] Deleted ${type}: ${name}`);
    } catch (error) {
      console.error(`[K8s API] Failed to delete ${type}:`, error);
      throw error;
    }
  }

  async getServiceAccounts(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const result = handleStubImplementation(
      'Service Accounts',
      fallbackValues.emptyResponse.serviceAccounts
    );
    
    console.log('[K8s API] Service accounts:', result.fallback ? 'Stub implementation' : 'Real data');
    return result.data;
  }

  async getRoles(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const result = handleStubImplementation(
      'Roles',
      fallbackValues.emptyResponse.roles
    );
    
    console.log('[K8s API] Roles:', result.fallback ? 'Stub implementation' : 'Real data');
    return result.data;
  }

  async getClusterRoles(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const result = handleStubImplementation(
      'Cluster Roles',
      fallbackValues.emptyResponse.clusterRoles
    );
    
    console.log('[K8s API] Cluster roles:', result.fallback ? 'Stub implementation' : 'Real data');
    return result.data;
  }

  async getRoleBindings(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const result = handleStubImplementation(
      'Role Bindings',
      fallbackValues.emptyResponse.roleBindings
    );
    
    console.log('[K8s API] Role bindings:', result.fallback ? 'Stub implementation' : 'Real data');
    return result.data;
  }

  async getClusterRoleBindings(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const result = handleStubImplementation(
      'Cluster Role Bindings',
      fallbackValues.emptyResponse.clusterRoleBindings
    );
    
    console.log('[K8s API] Cluster role bindings:', result.fallback ? 'Stub implementation' : 'Real data');
    return result.data;
  }

  async getEvents(namespace?: string): Promise<ClusterEvent[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching events from cluster...');
    
    try {
      const url = namespace ? `${this.apiBaseUrl}/events?namespace=${namespace}` : `${this.apiBaseUrl}/events`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch events');
      }
      
      const events = await response.json();
      console.log(`[K8s API] Retrieved ${events.length} events`);
      return events;
    } catch (error) {
      console.error('[K8s API] Failed to get events:', error);
      throw error;
    }
  }

  async getPodLogs(namespace: string, podName: string, containerName?: string): Promise<string> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Getting logs for pod ${podName} in namespace ${namespace}`);
    
    // This would need to be implemented in the backend
    return `Logs for pod ${podName} in namespace ${namespace} - not implemented yet`;
  }

  async getResourceMetrics(namespace?: string): Promise<ResourceMetrics[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    console.log('[K8s API] Resource metrics not implemented yet');
    return [];
  }

  async getDeployments(namespace: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching deployments in namespace: ${namespace}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/deployments?namespace=${namespace}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch deployments');
      }
      
      const deployments = await response.json();
      console.log(`[K8s API] Retrieved ${deployments.length} deployments in namespace ${namespace}`);
      return deployments;
    } catch (error) {
      console.error('[K8s API] Failed to get deployments:', error);
      throw error;
    }
  }

  async getServices(namespace: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching services in namespace: ${namespace}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/services?namespace=${namespace}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch services');
      }
      
      const services = await response.json();
      console.log(`[K8s API] Retrieved ${services.length} services in namespace ${namespace}`);
      return services;
    } catch (error) {
      console.error('[K8s API] Failed to get services:', error);
      throw error;
    }
  }

  async getPods(namespace: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching pods in namespace: ${namespace}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/pods?namespace=${namespace}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pods');
      }
      
      const pods = await response.json();
      console.log(`[K8s API] Retrieved ${pods.length} pods in namespace ${namespace}`);
      return pods;
    } catch (error) {
      console.error('[K8s API] Failed to get pods:', error);
      throw error;
    }
  }

  async getConfigMaps(namespace: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching configmaps in namespace: ${namespace}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/configmaps?namespace=${namespace}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch configmaps');
      }
      
      const configMaps = await response.json();
      console.log(`[K8s API] Retrieved ${configMaps.length} configmaps in namespace ${namespace}`);
      return configMaps;
    } catch (error) {
      console.error('[K8s API] Failed to get configmaps:', error);
      throw error;
    }
  }

  async getSecrets(namespace: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching secrets in namespace: ${namespace}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/secrets?namespace=${namespace}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch secrets');
      }
      
      const secrets = await response.json();
      console.log(`[K8s API] Retrieved ${secrets.length} secrets in namespace ${namespace}`);
      return secrets;
    } catch (error) {
      console.error('[K8s API] Failed to get secrets:', error);
      throw error;
    }
  }

  async getVersion(): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching cluster version...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/version`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch version');
      }
      
      const version = await response.json();
      console.log('[K8s API] Retrieved cluster version:', version);
      return version;
    } catch (error) {
      console.error('[K8s API] Failed to get version:', error);
      throw error;
    }
  }

  getKubeConfig(): any {
    return {
      getCurrentContext: () => config.cluster.defaultContext,
      getCurrentUser: () => ({ name: 'kind-user' }),
      getCurrentCluster: () => ({ server: maskServerUrl('https://127.0.0.1:6443') }),
    };
  }
}

export const kubernetesService = new KubernetesApiService();
