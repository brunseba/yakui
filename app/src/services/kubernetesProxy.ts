/**
 * Kubernetes Proxy Service
 * 
 * This service handles Kubernetes API requests through a backend proxy
 * to avoid CORS issues and provide secure authentication handling.
 */

export interface ProxyConfig {
  proxyUrl: string;
  enableDirectAccess?: boolean;
  timeout?: number;
}

export interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
}

export interface ProxyResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

class KubernetesProxyService {
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.config = config;
  }

  /**
   * Make a request through the proxy service
   */
  async makeRequest<T = any>(
    clusterId: string,
    request: ProxyRequest
  ): Promise<ProxyResponse<T>> {
    const { proxyUrl, timeout = 10000 } = this.config;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${proxyUrl}/api/proxy/${clusterId}${request.endpoint}`, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        body: request.data ? JSON.stringify(request.data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        statusCode: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
            statusCode: 408,
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  /**
   * Test cluster connection through proxy
   */
  async testConnection(clusterId: string): Promise<ProxyResponse<{ version: string }>> {
    return this.makeRequest(clusterId, {
      method: 'GET',
      endpoint: '/version',
    });
  }

  /**
   * Get cluster health through proxy
   */
  async getHealth(clusterId: string): Promise<ProxyResponse<{ status: string }>> {
    return this.makeRequest(clusterId, {
      method: 'GET',
      endpoint: '/healthz',
    });
  }

  /**
   * Get namespaces through proxy
   */
  async getNamespaces(clusterId: string): Promise<ProxyResponse<{ items: any[] }>> {
    return this.makeRequest(clusterId, {
      method: 'GET',
      endpoint: '/api/v1/namespaces',
    });
  }

  /**
   * Get nodes through proxy
   */
  async getNodes(clusterId: string): Promise<ProxyResponse<{ items: any[] }>> {
    return this.makeRequest(clusterId, {
      method: 'GET',
      endpoint: '/api/v1/nodes',
    });
  }

  /**
   * Get pods through proxy
   */
  async getPods(clusterId: string, namespace?: string): Promise<ProxyResponse<{ items: any[] }>> {
    const endpoint = namespace 
      ? `/api/v1/namespaces/${namespace}/pods`
      : '/api/v1/pods';
      
    return this.makeRequest(clusterId, {
      method: 'GET',
      endpoint,
    });
  }

  /**
   * Register a cluster with the proxy service
   */
  async registerCluster(cluster: {
    id: string;
    name: string;
    server: string;
    auth: {
      type: 'kubeconfig' | 'token' | 'certificate' | 'serviceaccount';
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
    };
  }): Promise<ProxyResponse<{ registered: boolean }>> {
    const { proxyUrl, timeout = 10000 } = this.config;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${proxyUrl}/api/clusters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cluster),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Failed to register cluster`,
          statusCode: response.status,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        statusCode: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Unregister a cluster from the proxy service
   */
  async unregisterCluster(clusterId: string): Promise<ProxyResponse<{ unregistered: boolean }>> {
    const { proxyUrl, timeout = 10000 } = this.config;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${proxyUrl}/api/clusters/${clusterId}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to unregister cluster`,
          statusCode: response.status,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        statusCode: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unregistration failed',
      };
    }
  }
}

// Create default proxy service instance
const proxyConfig: ProxyConfig = {
  proxyUrl: import.meta.env.VITE_PROXY_URL || 'http://localhost:3002',
  enableDirectAccess: import.meta.env.VITE_ENABLE_DIRECT_ACCESS === 'true',
  timeout: 10000,
};

export const kubernetesProxy = new KubernetesProxyService(proxyConfig);
export default kubernetesProxy;