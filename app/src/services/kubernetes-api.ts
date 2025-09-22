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

  async authenticate(token?: string, kubeconfig?: string, server?: string): Promise<AuthState> {
    console.log('[K8s API] Authenticating with real cluster...');
    console.log('[K8s API] Auth details:', {
      hasToken: !!token,
      hasKubeconfig: !!kubeconfig,
      hasServer: !!server
    });
    
    if (!this.isInitialized) {
      console.error('[K8s API] Service not initialized!');
      throw new Error('Service not initialized');
    }

    try {
      const result = await safeApiCall(
        async () => {
          // Prepare request body based on available authentication data
          const requestBody: any = {};
          
          if (token) {
            requestBody.token = token;
          }
          
          if (kubeconfig) {
            requestBody.kubeconfig = kubeconfig;
          }
          
          if (server) {
            requestBody.server = server;
          }
          
          console.log('[K8s API] Sending auth request with:', {
            hasToken: !!requestBody.token,
            hasKubeconfig: !!requestBody.kubeconfig,
            hasServer: !!requestBody.server
          });
          
          const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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

  async createResource(type: string, manifest: any, namespace?: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Creating ${type} in namespace ${namespace || manifest?.metadata?.namespace || 'default'}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/resources/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace, manifest }),
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create ${type}`);
      }
      const result = await response.json();
      console.log(`[K8s API] Created ${type}:`, result?.resource?.metadata?.name || 'unknown');
      return result.resource;
    } catch (error) {
      console.error(`[K8s API] Failed to create ${type}:`, error);
      throw error;
    }
  }

  async getServiceAccounts(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching service accounts${namespace ? ` in namespace: ${namespace}` : ''}...`);
    
    try {
      const url = namespace 
        ? `${this.apiBaseUrl}/rbac/serviceaccounts?namespace=${namespace}`
        : `${this.apiBaseUrl}/rbac/serviceaccounts`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch service accounts');
      }
      
      const serviceAccounts = await response.json();
      console.log(`[K8s API] Retrieved ${serviceAccounts.length} service accounts`);
      return serviceAccounts;
    } catch (error) {
      console.error('[K8s API] Failed to get service accounts:', error);
      throw error;
    }
  }

  async createServiceAccount(serviceAccount: any): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Creating service account: ${serviceAccount.metadata?.name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/rbac/serviceaccounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceAccount),
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create service account');
      }
      
      const result = await response.json();
      console.log(`[K8s API] Created service account: ${serviceAccount.metadata?.name}`);
      return result;
    } catch (error) {
      console.error('[K8s API] Failed to create service account:', error);
      throw error;
    }
  }

  async deleteServiceAccount(name: string, namespace: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Deleting service account: ${namespace}/${name}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/rbac/serviceaccounts/${namespace}/${name}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete service account');
      }
      
      console.log(`[K8s API] Deleted service account: ${namespace}/${name}`);
    } catch (error) {
      console.error('[K8s API] Failed to delete service account:', error);
      throw error;
    }
  }

  async getRoles(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching roles${namespace ? ` in namespace: ${namespace}` : ''}...`);
    
    try {
      const url = namespace 
        ? `${this.apiBaseUrl}/rbac/roles?namespace=${namespace}`
        : `${this.apiBaseUrl}/rbac/roles`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch roles');
      }
      
      const roles = await response.json();
      console.log(`[K8s API] Retrieved ${roles.length} roles`);
      return roles;
    } catch (error) {
      console.error('[K8s API] Failed to get roles:', error);
      throw error;
    }
  }

  async getClusterRoles(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching cluster roles...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/rbac/clusterroles`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch cluster roles');
      }
      
      const clusterRoles = await response.json();
      console.log(`[K8s API] Retrieved ${clusterRoles.length} cluster roles`);
      return clusterRoles;
    } catch (error) {
      console.error('[K8s API] Failed to get cluster roles:', error);
      throw error;
    }
  }

  async createRole(role: any): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const isClusterRole = !role.metadata?.namespace;
    console.log(`[K8s API] Creating ${isClusterRole ? 'cluster role' : 'role'}: ${role.metadata?.name}`);
    
    try {
      const endpoint = isClusterRole ? 'clusterroles' : 'roles';
      const response = await fetch(`${this.apiBaseUrl}/rbac/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(role),
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create ${isClusterRole ? 'cluster role' : 'role'}`);
      }
      
      const result = await response.json();
      console.log(`[K8s API] Created ${isClusterRole ? 'cluster role' : 'role'}: ${role.metadata?.name}`);
      return result;
    } catch (error) {
      console.error(`[K8s API] Failed to create ${isClusterRole ? 'cluster role' : 'role'}:`, error);
      throw error;
    }
  }

  async deleteRole(name: string, namespace?: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const isClusterRole = !namespace;
    console.log(`[K8s API] Deleting ${isClusterRole ? 'cluster role' : 'role'}: ${namespace ? namespace + '/' : ''}${name}`);
    
    try {
      const endpoint = isClusterRole ? 'clusterroles' : 'roles';
      const url = isClusterRole 
        ? `${this.apiBaseUrl}/rbac/${endpoint}/${name}`
        : `${this.apiBaseUrl}/rbac/${endpoint}/${namespace}/${name}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete ${isClusterRole ? 'cluster role' : 'role'}`);
      }
      
      console.log(`[K8s API] Deleted ${isClusterRole ? 'cluster role' : 'role'}: ${name}`);
    } catch (error) {
      console.error(`[K8s API] Failed to delete ${isClusterRole ? 'cluster role' : 'role'}:`, error);
      throw error;
    }
  }

  async getRoleBindings(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching role bindings${namespace ? ` in namespace: ${namespace}` : ''}...`);
    
    try {
      const url = namespace 
        ? `${this.apiBaseUrl}/rbac/rolebindings?namespace=${namespace}`
        : `${this.apiBaseUrl}/rbac/rolebindings`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch role bindings');
      }
      
      const roleBindings = await response.json();
      console.log(`[K8s API] Retrieved ${roleBindings.length} role bindings`);
      return roleBindings;
    } catch (error) {
      console.error('[K8s API] Failed to get role bindings:', error);
      throw error;
    }
  }

  async getClusterRoleBindings(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log('[K8s API] Fetching cluster role bindings...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/rbac/clusterrolebindings`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch cluster role bindings');
      }
      
      const clusterRoleBindings = await response.json();
      console.log(`[K8s API] Retrieved ${clusterRoleBindings.length} cluster role bindings`);
      return clusterRoleBindings;
    } catch (error) {
      console.error('[K8s API] Failed to get cluster role bindings:', error);
      throw error;
    }
  }

  async createRoleBinding(roleBinding: any): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const isClusterRoleBinding = !roleBinding.metadata?.namespace;
    console.log(`[K8s API] Creating ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}: ${roleBinding.metadata?.name}`);
    
    try {
      const endpoint = isClusterRoleBinding ? 'clusterrolebindings' : 'rolebindings';
      const response = await fetch(`${this.apiBaseUrl}/rbac/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleBinding),
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}`);
      }
      
      const result = await response.json();
      console.log(`[K8s API] Created ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}: ${roleBinding.metadata?.name}`);
      return result;
    } catch (error) {
      console.error(`[K8s API] Failed to create ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}:`, error);
      throw error;
    }
  }

  async deleteRoleBinding(name: string, namespace?: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    const isClusterRoleBinding = !namespace;
    console.log(`[K8s API] Deleting ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}: ${namespace ? namespace + '/' : ''}${name}`);
    
    try {
      const endpoint = isClusterRoleBinding ? 'clusterrolebindings' : 'rolebindings';
      const url = isClusterRoleBinding 
        ? `${this.apiBaseUrl}/rbac/${endpoint}/${name}`
        : `${this.apiBaseUrl}/rbac/${endpoint}/${namespace}/${name}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}`);
      }
      
      console.log(`[K8s API] Deleted ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}: ${name}`);
    } catch (error) {
      console.error(`[K8s API] Failed to delete ${isClusterRoleBinding ? 'cluster role binding' : 'role binding'}:`, error);
      throw error;
    }
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

  async getPodsByNode(nodeName: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    console.log(`[K8s API] Fetching pods for node: ${nodeName}`);
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/nodes/${nodeName}/pods`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pods for node');
      }
      
      const pods = await response.json();
      console.log(`[K8s API] Retrieved ${pods.length} pods for node ${nodeName}`);
      return pods;
    } catch (error) {
      console.error(`[K8s API] Failed to get pods for node ${nodeName}:`, error);
      // Return empty array as fallback for topology view
      return [];
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
      getCurrentCluster: () => ({ server: maskServerUrl('https://*********:6443') }),
    };
  }

  // === HELM METHODS ===

  async getHelmRepositories(): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log('[K8s API] Fetching Helm repositories...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/repositories`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Helm repositories');
      }

      const repositories = await response.json();
      console.log(`[K8s API] Retrieved ${repositories.length} Helm repositories`);
      return repositories;
    } catch (error) {
      console.error('[K8s API] Failed to get Helm repositories:', error);
      throw error;
    }
  }

  async addHelmRepository(name: string, url: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Adding Helm repository: ${name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add Helm repository');
      }

      console.log(`[K8s API] Added Helm repository: ${name}`);
    } catch (error) {
      console.error(`[K8s API] Failed to add Helm repository ${name}:`, error);
      throw error;
    }
  }

  async removeHelmRepository(name: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Removing Helm repository: ${name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/repositories/${name}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove Helm repository');
      }

      console.log(`[K8s API] Removed Helm repository: ${name}`);
    } catch (error) {
      console.error(`[K8s API] Failed to remove Helm repository ${name}:`, error);
      throw error;
    }
  }

  async searchHelmCharts(query: string = '', repo?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Searching Helm charts: ${query}`);

    try {
      const url = new URL(`${this.apiBaseUrl}/helm/charts/search`);
      if (query) url.searchParams.set('query', query);
      if (repo) url.searchParams.set('repo', repo);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search Helm charts');
      }

      const charts = await response.json();
      console.log(`[K8s API] Found ${charts.length} Helm charts`);
      return charts;
    } catch (error) {
      console.error('[K8s API] Failed to search Helm charts:', error);
      throw error;
    }
  }

  async getHelmChartInfo(repo: string, chart: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Getting Helm chart info: ${repo}/${chart}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/charts/${repo}/${chart}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get Helm chart info');
      }

      const chartInfo = await response.json();
      console.log(`[K8s API] Retrieved chart info: ${repo}/${chart}`);
      return chartInfo;
    } catch (error) {
      console.error(`[K8s API] Failed to get Helm chart info ${repo}/${chart}:`, error);
      throw error;
    }
  }

  async getHelmReleases(namespace?: string): Promise<any[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Fetching Helm releases${namespace ? ` in ${namespace}` : ''}...`);

    try {
      const url = new URL(`${this.apiBaseUrl}/helm/releases`);
      if (namespace) url.searchParams.set('namespace', namespace);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Helm releases');
      }

      const releases = await response.json();
      console.log(`[K8s API] Retrieved ${releases.length} Helm releases`);
      return releases;
    } catch (error) {
      console.error('[K8s API] Failed to get Helm releases:', error);
      throw error;
    }
  }

  async getHelmReleaseDetails(namespace: string, name: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Getting Helm release details: ${namespace}/${name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/releases/${namespace}/${name}`, {
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get Helm release details');
      }

      const details = await response.json();
      console.log(`[K8s API] Retrieved release details: ${namespace}/${name}`);
      return details;
    } catch (error) {
      console.error(`[K8s API] Failed to get Helm release details ${namespace}/${name}:`, error);
      throw error;
    }
  }

  async installHelmChart(params: {
    name: string;
    chart: string;
    namespace: string;
    values?: string;
    version?: string;
  }): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Installing Helm chart: ${params.chart} as ${params.name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(120000) // 2 minute timeout for installations
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to install Helm chart');
      }

      const result = await response.json();
      console.log(`[K8s API] Installed Helm chart: ${params.name}`);
      return result;
    } catch (error) {
      console.error(`[K8s API] Failed to install Helm chart ${params.chart}:`, error);
      throw error;
    }
  }

  async upgradeHelmRelease(namespace: string, name: string, params: {
    chart?: string;
    values?: string;
    version?: string;
  }): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Upgrading Helm release: ${namespace}/${name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/releases/${namespace}/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(120000)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upgrade Helm release');
      }

      const result = await response.json();
      console.log(`[K8s API] Upgraded Helm release: ${namespace}/${name}`);
      return result;
    } catch (error) {
      console.error(`[K8s API] Failed to upgrade Helm release ${namespace}/${name}:`, error);
      throw error;
    }
  }

  async uninstallHelmRelease(namespace: string, name: string): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Uninstalling Helm release: ${namespace}/${name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/releases/${namespace}/${name}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to uninstall Helm release');
      }

      const result = await response.json();
      console.log(`[K8s API] Uninstalled Helm release: ${namespace}/${name}`);
      return result;
    } catch (error) {
      console.error(`[K8s API] Failed to uninstall Helm release ${namespace}/${name}:`, error);
      throw error;
    }
  }

  async rollbackHelmRelease(namespace: string, name: string, revision?: number): Promise<any> {
    if (!this.isInitialized) throw new Error('Service not initialized');

    console.log(`[K8s API] Rolling back Helm release: ${namespace}/${name}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/helm/releases/${namespace}/${name}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision }),
        signal: AbortSignal.timeout(config.api.timeout)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rollback Helm release');
      }

      const result = await response.json();
      console.log(`[K8s API] Rolled back Helm release: ${namespace}/${name}`);
      return result;
    } catch (error) {
      console.error(`[K8s API] Failed to rollback Helm release ${namespace}/${name}:`, error);
      throw error;
    }
  }
}

export const kubernetesService = new KubernetesApiService();
