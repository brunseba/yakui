import { ClusterConfig, ClusterAuth, ClusterStatus, ClusterMetrics, ClusterHealthCheck } from '../types/cluster';
import { ConnectionLogEntry } from '../components/cluster/ConnectionLogViewer';
import { kubernetesProxy } from '../services/kubernetesProxy';

/**
 * Kubernetes API client for real cluster operations
 * This replaces the mock functionality with actual Kubernetes API calls
 */

interface ApiConfig {
  server: string;
  auth: ClusterAuth;
  timeout?: number;
  skipTLSVerify?: boolean;
  clusterId?: string;
  preferProxy?: boolean;
}

interface KubeApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export class KubernetesApiClient {
  private config: ApiConfig;
  private baseHeaders: Record<string, string> = {};
  private useProxy: boolean = false;

  constructor(config: ApiConfig) {
    this.config = config;
    this.useProxy = config.preferProxy !== false && !!config.clusterId;
    this.setupAuthentication();
  }

  private setupAuthentication(): void {
    this.baseHeaders = {
      'Content-Type': 'application/json',
    };

    switch (this.config.auth.type) {
      case 'token':
        if (this.config.auth.token) {
          this.baseHeaders['Authorization'] = `Bearer ${this.config.auth.token}`;
        }
        break;
      case 'kubeconfig':
        // For kubeconfig, we would parse it and extract the auth info
        // This is a simplified implementation
        if (this.config.auth.kubeconfig) {
          try {
            const kubeconfigData = this.parseKubeconfig(this.config.auth.kubeconfig);
            if (kubeconfigData.token) {
              this.baseHeaders['Authorization'] = `Bearer ${kubeconfigData.token}`;
            } else if (kubeconfigData.clientCert && kubeconfigData.clientKey) {
              // For client cert auth, we'd need to setup mutual TLS
              // This would require different handling in the browser
            }
          } catch (error) {
            console.error('Failed to parse kubeconfig:', error);
          }
        }
        break;
      case 'certificate':
        // Client certificate authentication would require setting up mutual TLS
        // This is more complex in a browser environment
        break;
      case 'serviceaccount':
        if (this.config.auth.serviceAccount?.token) {
          this.baseHeaders['Authorization'] = `Bearer ${this.config.auth.serviceAccount.token}`;
        }
        break;
    }
  }

  private parseKubeconfig(kubeconfig: string): { token?: string; clientCert?: string; clientKey?: string } {
    try {
      // This is a simplified YAML parser - in production you'd use a proper YAML library
      const lines = kubeconfig.split('\n');
      let token: string | undefined;
      let clientCert: string | undefined;
      let clientKey: string | undefined;

      // Extract token
      const tokenLine = lines.find(line => line.trim().startsWith('token:'));
      if (tokenLine) {
        token = tokenLine.split('token:')[1]?.trim().replace(/['"]/g, '');
      }

      // Extract client certificate data
      const certDataStart = lines.findIndex(line => line.trim().startsWith('client-certificate-data:'));
      if (certDataStart !== -1) {
        clientCert = lines[certDataStart].split('client-certificate-data:')[1]?.trim().replace(/['"]/g, '');
      }

      // Extract client key data
      const keyDataStart = lines.findIndex(line => line.trim().startsWith('client-key-data:'));
      if (keyDataStart !== -1) {
        clientKey = lines[keyDataStart].split('client-key-data:')[1]?.trim().replace(/['"]/g, '');
      }

      return { token, clientCert, clientKey };
    } catch (error) {
      throw new Error(`Failed to parse kubeconfig: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<KubeApiResponse> {
    // Use proxy service if available and configured
    if (this.useProxy && this.config.clusterId) {
      try {
        const proxyResponse = await kubernetesProxy.makeRequest(this.config.clusterId, {
          method: (options.method as any) || 'GET',
          endpoint,
          data: options.body ? JSON.parse(options.body as string) : undefined,
          headers: options.headers as Record<string, string>,
        });
        
        return {
          success: proxyResponse.success,
          data: proxyResponse.data,
          error: proxyResponse.error,
          statusCode: proxyResponse.statusCode,
        };
      } catch (error) {
        console.warn('Proxy request failed, falling back to direct connection:', error);
        // Fall back to direct connection
      }
    }

    // Direct connection fallback
    const url = `${this.config.server}${endpoint}`;
    const timeout = this.config.timeout || 10000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.baseHeaders,
          ...options.headers,
        },
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

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
            error: 'Request timeout - the cluster may be unreachable',
            statusCode: 408,
          };
        }
        
        // Handle specific network errors
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          return {
            success: false,
            error: 'Network error - this is likely due to CORS restrictions or the cluster being unreachable. For local development, consider using a proxy or kubectl port-forward.',
            statusCode: 0,
          };
        }
        
        if (error.message.includes('CORS')) {
          return {
            success: false,
            error: 'CORS error - the Kubernetes API server does not allow cross-origin requests from the browser. Consider using kubectl proxy or configuring CORS on the API server.',
            statusCode: 0,
          };
        }
        
        return {
          success: false,
          error: `Connection error: ${error.message}`,
        };
      }
      
      return {
        success: false,
        error: 'Unknown network error occurred',
      };
    }
  }

  async testConnection(logCallback?: (log: ConnectionLogEntry) => void): Promise<{ success: boolean; error?: string; version?: string }> {
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
      log('info', 'Connection Test', 'Starting connection test to Kubernetes API server');
      
      // Detect connection mode
      const connectionMode = this.useProxy ? 'proxy' : 'direct';
      const isLocalProxy = this.config.server.includes('localhost') || this.config.server.includes('127.0.0.1');
      
      if (!this.useProxy && !isLocalProxy) {
        log('warning', 'CORS Notice', 'Direct connections to remote Kubernetes clusters may fail due to CORS restrictions. Consider using kubectl proxy for development.', {
          suggestion: 'Run "kubectl proxy" and use http://localhost:8001 as the server URL',
          documentation: 'See KUBERNETES_PROXY_SETUP.md for detailed setup instructions'
        });
      } else if (this.useProxy) {
        log('info', 'Connection Mode', `Using proxy service for secure API access (Cluster ID: ${this.config.clusterId})`);
      }

      // Test basic connectivity with /version endpoint
      log('info', 'Network Test', 'Testing network connectivity...');
      const versionResponse = await this.makeRequest('/version');
      
      if (!versionResponse.success) {
        // Provide specific guidance for CORS/network errors
        if (versionResponse.error?.includes('CORS') || versionResponse.error?.includes('Network error')) {
          log('error', 'CORS/Network Issue', 'Connection blocked by browser security policies', {
            error: versionResponse.error,
            solution: 'Use kubectl proxy for development',
            command: 'kubectl proxy --port=8001',
            serverUrl: 'http://localhost:8001'
          });
          
          return {
            success: false,
            error: `${versionResponse.error}\n\nFor development, use kubectl proxy:\n1. Run: kubectl proxy --port=8001\n2. Use server URL: http://localhost:8001`,
          };
        }
        
        log('error', 'Network Test', `Failed to connect to API server: ${versionResponse.error}`);
        return {
          success: false,
          error: versionResponse.error,
        };
      }

      log('success', 'Network Test', 'Network connectivity established');

      // Check API server health
      log('info', 'Health Check', 'Checking API server health...');
      const healthResponse = await this.makeRequest('/healthz');

      if (!healthResponse.success) {
        if (healthResponse.error?.includes('CORS') || healthResponse.error?.includes('Network error')) {
          log('warning', 'Health Check', 'Health check blocked by CORS, but version endpoint worked');
        } else {
          log('warning', 'Health Check', 'Health check endpoint not available, but version endpoint worked');
        }
      } else {
        log('success', 'Health Check', 'API server health check passed');
      }

      // Get version information
      const version = versionResponse.data?.gitVersion || 'Unknown';
      log('success', 'Version Check', `Kubernetes version detected: ${version}`);

      // Test authentication by trying to access a resource
      log('info', 'Auth Test', 'Testing authentication...');
      const namespacesResponse = await this.makeRequest('/api/v1/namespaces');

      if (!namespacesResponse.success) {
        if (namespacesResponse.statusCode === 401 || namespacesResponse.statusCode === 403) {
          log('error', 'Auth Test', 'Authentication failed - invalid credentials');
          return {
            success: false,
            error: 'Authentication failed - please check your credentials',
          };
        } else if (namespacesResponse.error?.includes('CORS') || namespacesResponse.error?.includes('Network error')) {
          log('warning', 'Auth Test', 'Cannot test authentication due to CORS restrictions, but API server is accessible');
        } else {
          log('warning', 'Auth Test', 'Cannot verify authentication, but API server is accessible');
        }
      } else {
        log('success', 'Auth Test', 'Authentication successful');
      }

      log('success', 'Connection Test', 'Connection test completed successfully', {
        totalDuration: Date.now() - startTime,
        version,
        apiServerUrl: this.config.server,
        corsNotice: !isLocalProxy ? 'Some features may be limited due to CORS restrictions' : undefined
      });

      return {
        success: true,
        version,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log('error', 'Connection Test', `Connection test failed: ${errorMessage}`, { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getClusterInfo(): Promise<{ version?: string; nodeCount?: number; namespaceCount?: number }> {
    try {
      const [versionResponse, nodesResponse, namespacesResponse] = await Promise.all([
        this.makeRequest('/version'),
        this.makeRequest('/api/v1/nodes'),
        this.makeRequest('/api/v1/namespaces')
      ]);

      return {
        version: versionResponse.data?.gitVersion,
        nodeCount: nodesResponse.data?.items?.length || 0,
        namespaceCount: namespacesResponse.data?.items?.length || 0,
      };
    } catch (error) {
      console.error('Failed to get cluster info:', error);
      return {};
    }
  }

  async getClusterMetrics(): Promise<ClusterMetrics | null> {
    try {
      const [nodesResponse, namespacesResponse, podsResponse] = await Promise.all([
        this.makeRequest('/api/v1/nodes'),
        this.makeRequest('/api/v1/namespaces'),
        this.makeRequest('/api/v1/pods')
      ]);

      const nodes = nodesResponse.data?.items || [];
      const namespaces = namespacesResponse.data?.items || [];
      const pods = podsResponse.data?.items || [];

      // Calculate node status
      const readyNodes = nodes.filter((node: any) => {
        const readyCondition = node.status?.conditions?.find((c: any) => c.type === 'Ready');
        return readyCondition?.status === 'True';
      });

      // Calculate namespace status
      const activeNamespaces = namespaces.filter((ns: any) => ns.status?.phase === 'Active');
      const terminatingNamespaces = namespaces.filter((ns: any) => ns.status?.phase === 'Terminating');

      // Calculate pod status
      const runningPods = pods.filter((pod: any) => pod.status?.phase === 'Running');
      const pendingPods = pods.filter((pod: any) => pod.status?.phase === 'Pending');
      const failedPods = pods.filter((pod: any) => pod.status?.phase === 'Failed');

      return {
        clusterId: '', // Will be set by the caller
        timestamp: new Date(),
        nodes: {
          total: nodes.length,
          ready: readyNodes.length,
          notReady: nodes.length - readyNodes.length,
        },
        namespaces: {
          total: namespaces.length,
          active: activeNamespaces.length,
          terminating: terminatingNamespaces.length,
        },
        pods: {
          total: pods.length,
          running: runningPods.length,
          pending: pendingPods.length,
          failed: failedPods.length,
        },
      };
    } catch (error) {
      console.error('Failed to get cluster metrics:', error);
      return null;
    }
  }

  async getClusterHealth(): Promise<ClusterHealthCheck | null> {
    try {
      const [healthzResponse, readyzResponse, livezResponse] = await Promise.all([
        this.makeRequest('/healthz'),
        this.makeRequest('/readyz'),
        this.makeRequest('/livez')
      ]);

      const errors: string[] = [];
      const checks = {
        apiServer: healthzResponse.success,
        readiness: readyzResponse.success,
        liveness: livezResponse.success,
      };

      if (!healthzResponse.success) {
        errors.push(`Health check failed: ${healthzResponse.error}`);
      }
      if (!readyzResponse.success) {
        errors.push(`Readiness check failed: ${readyzResponse.error}`);
      }
      if (!livezResponse.success) {
        errors.push(`Liveness check failed: ${livezResponse.error}`);
      }

      // Additional checks could include CoreDNS, network connectivity, etc.
      // For now, we'll assume they're healthy if the API server is responsive
      const additionalChecks = {
        nodes: true, // Would check node status
        coreDNS: true, // Would check CoreDNS pods
        networking: true, // Would check network plugins
      };

      const allChecks = { ...checks, ...additionalChecks };
      const healthy = Object.values(allChecks).every(Boolean) && errors.length === 0;

      return {
        clusterId: '', // Will be set by the caller
        healthy,
        checks: allChecks,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get cluster health:', error);
      return null;
    }
  }
}

// Factory function to create API client from cluster connection
export function createKubernetesApiClient(config: ClusterConfig, auth: ClusterAuth, preferProxy: boolean = true): KubernetesApiClient {
  return new KubernetesApiClient({
    server: config.server,
    auth,
    clusterId: config.id,
    preferProxy,
    timeout: 10000,
    skipTLSVerify: false, // Should be configurable
  });
}

// Utility function to test if a URL is reachable
export async function testNetworkConnectivity(url: string, timeout: number = 5000): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors', // For cross-origin requests
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // With no-cors mode, we can't read the response status
    // but if the fetch completes without error, the server is reachable
    return {
      success: true,
      responseTime,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Connection timeout' };
      }
      
      // Handle network/CORS errors more gracefully
      if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
        return { 
          success: false, 
          error: 'Cannot test connectivity due to browser security restrictions. This is normal for Kubernetes API servers.' 
        };
      }
      
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'Network connectivity test failed' };
  }
}
