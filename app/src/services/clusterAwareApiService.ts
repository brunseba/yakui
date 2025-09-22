/**
 * Cluster-Aware API Service
 * 
 * This service routes all Kubernetes API calls through the backend,
 * ensuring they use the active cluster context configured in the backend.
 */

import { config } from '../config/environment';
import { backendClusterService } from './backendClusterService';

// API endpoints
const API_BASE = config.api.baseUrl;

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  skipClusterCheck?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

class ClusterAwareApiService {
  
  /**
   * Make an API request through the backend's active cluster context
   */
  async request<T = any>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = config.api.timeout,
      skipClusterCheck = false
    } = options;

    // Ensure we have an active cluster unless explicitly skipped
    if (!skipClusterCheck) {
      try {
        const backendCluster = await backendClusterService.getCurrentBackendCluster();
        if (!backendCluster.success) {
          throw new Error('No active cluster in backend. Please select a cluster first.');
        }
      } catch (error) {
        console.error('[ClusterAwareApiService] Backend cluster check failed:', error);
        return {
          success: false,
          error: 'No active cluster configured',
          status: 400
        };
      }
    }

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: AbortSignal.timeout(timeout)
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      console.log(`[ClusterAwareApiService] ${method} ${url}`);
      const response = await fetch(url, requestOptions);

      let data: T | undefined;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : undefined;
      } catch (parseError) {
        console.warn('[ClusterAwareApiService] Failed to parse response as JSON:', parseError);
        // For non-JSON responses, we'll return the raw text
        data = response.statusText as unknown as T;
      }

      const result: ApiResponse<T> = {
        success: response.ok,
        data,
        status: response.status
      };

      if (!response.ok) {
        const errorData = data as any;
        result.error = errorData?.error || errorData?.message || response.statusText;
        console.error(`[ClusterAwareApiService] Request failed:`, {
          url,
          status: response.status,
          error: result.error
        });
      }

      return result;

    } catch (error) {
      console.error(`[ClusterAwareApiService] Request error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage,
        status: 500
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  // Kubernetes-specific API methods

  /**
   * Get pods in namespace
   */
  async getPods(namespace: string = 'default'): Promise<ApiResponse> {
    return this.get(`/k8s/api/v1/namespaces/${namespace}/pods`);
  }

  /**
   * Get deployments in namespace
   */
  async getDeployments(namespace: string = 'default'): Promise<ApiResponse> {
    return this.get(`/k8s/apis/apps/v1/namespaces/${namespace}/deployments`);
  }

  /**
   * Get services in namespace
   */
  async getServices(namespace: string = 'default'): Promise<ApiResponse> {
    return this.get(`/k8s/api/v1/namespaces/${namespace}/services`);
  }

  /**
   * Get nodes
   */
  async getNodes(): Promise<ApiResponse> {
    return this.get(`/k8s/api/v1/nodes`);
  }

  /**
   * Get namespaces
   */
  async getNamespaces(): Promise<ApiResponse> {
    return this.get(`/k8s/api/v1/namespaces`);
  }

  /**
   * Get cluster info
   */
  async getClusterInfo(): Promise<ApiResponse> {
    return this.get(`/k8s/api/v1`);
  }

  /**
   * Get resource by generic path
   */
  async getResource(apiPath: string): Promise<ApiResponse> {
    const sanitizedPath = apiPath.startsWith('/') ? apiPath.substring(1) : apiPath;
    return this.get(`/k8s/${sanitizedPath}`);
  }

  /**
   * Create resource
   */
  async createResource(apiPath: string, resource: any): Promise<ApiResponse> {
    const sanitizedPath = apiPath.startsWith('/') ? apiPath.substring(1) : apiPath;
    return this.post(`/k8s/${sanitizedPath}`, resource);
  }

  /**
   * Update resource
   */
  async updateResource(apiPath: string, resource: any): Promise<ApiResponse> {
    const sanitizedPath = apiPath.startsWith('/') ? apiPath.substring(1) : apiPath;
    return this.put(`/k8s/${sanitizedPath}`, resource);
  }

  /**
   * Delete resource
   */
  async deleteResource(apiPath: string): Promise<ApiResponse> {
    const sanitizedPath = apiPath.startsWith('/') ? apiPath.substring(1) : apiPath;
    return this.delete(`/k8s/${sanitizedPath}`);
  }

  /**
   * Patch resource
   */
  async patchResource(apiPath: string, patch: any, patchType: 'strategic-merge-patch' | 'merge-patch' | 'json-patch' = 'strategic-merge-patch'): Promise<ApiResponse> {
    const sanitizedPath = apiPath.startsWith('/') ? apiPath.substring(1) : apiPath;
    
    const contentType = {
      'strategic-merge-patch': 'application/strategic-merge-patch+json',
      'merge-patch': 'application/merge-patch+json',
      'json-patch': 'application/json-patch+json'
    }[patchType];

    return this.patch(`/k8s/${sanitizedPath}`, patch, {
      headers: { 'Content-Type': contentType }
    });
  }

  /**
   * Stream logs for a pod
   * Note: This returns a Promise that resolves to a Response for streaming
   */
  async streamPodLogs(namespace: string, podName: string, options: {
    container?: string;
    follow?: boolean;
    previous?: boolean;
    tailLines?: number;
  } = {}): Promise<Response> {
    const params = new URLSearchParams();
    if (options.container) params.append('container', options.container);
    if (options.follow) params.append('follow', 'true');
    if (options.previous) params.append('previous', 'true');
    if (options.tailLines) params.append('tailLines', options.tailLines.toString());

    const url = `${API_BASE}/k8s/api/v1/namespaces/${namespace}/pods/${podName}/log?${params}`;
    
    // For streaming, we need to return the raw fetch response
    return fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(config.api.timeout)
    });
  }

  /**
   * Execute command in pod
   */
  async execInPod(namespace: string, podName: string, command: string[], options: {
    container?: string;
    stdin?: boolean;
    stdout?: boolean;
    stderr?: boolean;
    tty?: boolean;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    command.forEach(cmd => params.append('command', cmd));
    if (options.container) params.append('container', options.container);
    if (options.stdin !== false) params.append('stdin', 'true');
    if (options.stdout !== false) params.append('stdout', 'true');  
    if (options.stderr !== false) params.append('stderr', 'true');
    if (options.tty) params.append('tty', 'true');

    return this.post(`/k8s/api/v1/namespaces/${namespace}/pods/${podName}/exec?${params}`);
  }

  /**
   * Get events in namespace
   */
  async getEvents(namespace: string = 'default', fieldSelector?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (fieldSelector) params.append('fieldSelector', fieldSelector);
    
    const query = params.toString();
    const endpoint = `/k8s/api/v1/namespaces/${namespace}/events${query ? `?${query}` : ''}`;
    
    return this.get(endpoint);
  }

  /**
   * Get metrics (requires metrics-server)
   */
  async getNodeMetrics(): Promise<ApiResponse> {
    return this.get('/k8s/apis/metrics.k8s.io/v1beta1/nodes');
  }

  async getPodMetrics(namespace: string = 'default'): Promise<ApiResponse> {
    return this.get(`/k8s/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`);
  }

  /**
   * Health check endpoint that doesn't require cluster context
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/health', { skipClusterCheck: true });
  }
}

// Export singleton instance
export const clusterAwareApiService = new ClusterAwareApiService();
export default clusterAwareApiService;