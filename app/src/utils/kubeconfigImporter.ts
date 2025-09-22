import * as yaml from 'js-yaml';
import { ClusterConfig, ClusterAuth, AddClusterRequest } from '../types/cluster';

interface KubeconfigCluster {
  name: string;
  cluster: {
    'certificate-authority-data'?: string;
    'certificate-authority'?: string;
    server: string;
    'insecure-skip-tls-verify'?: boolean;
  };
}

interface KubeconfigUser {
  name: string;
  user: {
    'client-certificate-data'?: string;
    'client-key-data'?: string;
    'client-certificate'?: string;
    'client-key'?: string;
    token?: string;
    username?: string;
    password?: string;
    'auth-provider'?: any;
    exec?: any;
  };
}

interface KubeconfigContext {
  name: string;
  context: {
    cluster: string;
    user: string;
    namespace?: string;
  };
}

interface Kubeconfig {
  apiVersion: string;
  kind: string;
  clusters: KubeconfigCluster[];
  users: KubeconfigUser[];
  contexts: KubeconfigContext[];
  'current-context': string;
}

export class KubeconfigImporter {
  
  /**
   * Parse a kubeconfig file content and extract cluster configurations
   */
  static parseKubeconfig(kubeconfigContent: string): AddClusterRequest[] {
    try {
      const kubeconfig = yaml.load(kubeconfigContent) as Kubeconfig;
      
      if (!kubeconfig || !kubeconfig.contexts || !kubeconfig.clusters || !kubeconfig.users) {
        throw new Error('Invalid kubeconfig format');
      }

      const clusterRequests: AddClusterRequest[] = [];

      for (const context of kubeconfig.contexts) {
        const cluster = kubeconfig.clusters.find(c => c.name === context.context.cluster);
        const user = kubeconfig.users.find(u => u.name === context.context.user);

        if (!cluster || !user) {
          console.warn(`Skipping context ${context.name}: missing cluster or user`);
          continue;
        }

        const clusterConfig = this.createClusterConfig(context, cluster);
        const clusterAuth = this.createClusterAuth(context, user, kubeconfigContent);

        clusterRequests.push({
          config: clusterConfig,
          auth: clusterAuth
        });
      }

      return clusterRequests;
    } catch (error) {
      console.error('Failed to parse kubeconfig:', error);
      throw new Error(`Failed to parse kubeconfig: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create cluster configuration from kubeconfig context and cluster
   */
  private static createClusterConfig(
    context: KubeconfigContext, 
    cluster: KubeconfigCluster
  ): Omit<ClusterConfig, 'id' | 'createdAt' | 'updatedAt'> {
    // Extract server information
    const serverUrl = new URL(cluster.cluster.server);
    const isLocal = serverUrl.hostname === 'localhost' || 
                   serverUrl.hostname === '127.0.0.1' || 
                   serverUrl.hostname.includes('docker') ||
                   serverUrl.hostname.includes('kind') ||
                   serverUrl.hostname.includes('minikube');

    // Determine provider based on server URL and context name
    let provider: 'aws' | 'gcp' | 'azure' | 'local' | 'other' = 'other';
    const contextLower = context.name.toLowerCase();
    const serverLower = cluster.cluster.server.toLowerCase();

    if (isLocal || contextLower.includes('local') || contextLower.includes('docker') || 
        contextLower.includes('kind') || contextLower.includes('minikube') ||
        contextLower.includes('talos')) {
      provider = 'local';
    } else if (serverLower.includes('eks') || contextLower.includes('aws')) {
      provider = 'aws';
    } else if (serverLower.includes('gke') || contextLower.includes('gcp') || contextLower.includes('google')) {
      provider = 'gcp';
    } else if (serverLower.includes('aks') || contextLower.includes('azure')) {
      provider = 'azure';
    }

    // Determine environment based on context name
    let environment: 'development' | 'staging' | 'production' = 'development';
    if (contextLower.includes('prod') || contextLower.includes('production')) {
      environment = 'production';
    } else if (contextLower.includes('stag') || contextLower.includes('staging')) {
      environment = 'staging';
    }

    // Generate display name and description
    const displayName = this.generateDisplayName(context.name);
    const description = `Imported from kubeconfig - ${cluster.cluster.server}`;

    return {
      name: context.name,
      displayName,
      description,
      server: cluster.cluster.server,
      provider,
      environment,
      tags: {
        imported: 'true',
        source: 'kubeconfig'
      }
    };
  }

  /**
   * Create cluster authentication from kubeconfig user
   */
  private static createClusterAuth(
    context: KubeconfigContext,
    user: KubeconfigUser,
    originalKubeconfig: string
  ): Omit<ClusterAuth, 'clusterId'> {
    // For now, we'll store the entire kubeconfig as the auth method
    // In a real implementation, you might want to extract specific auth details
    
    if (user.user.token) {
      return {
        type: 'token',
        token: user.user.token,
        namespace: context.context.namespace || 'default'
      };
    }

    if (user.user['client-certificate-data'] && user.user['client-key-data']) {
      return {
        type: 'certificate',
        certificate: {
          cert: user.user['client-certificate-data'],
          key: user.user['client-key-data'],
          // Note: We'd need to extract CA data from the cluster as well
        },
        namespace: context.context.namespace || 'default'
      };
    }

    // Default to kubeconfig type with the full config
    return {
      type: 'kubeconfig',
      kubeconfig: originalKubeconfig,
      namespace: context.context.namespace || 'default'
    };
  }

  /**
   * Generate a human-readable display name from context name
   */
  private static generateDisplayName(contextName: string): string {
    // Handle common patterns
    const patterns = [
      { regex: /^admin@(.+)$/, replacement: '$1 Admin' },
      { regex: /^(.+)-cluster$/, replacement: '$1 Cluster' },
      { regex: /^(.+)_(.+)$/, replacement: '$1 $2' },
      { regex: /^(.+)-(.+)$/, replacement: '$1 $2' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(contextName)) {
        return contextName.replace(pattern.regex, pattern.replacement)
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Default formatting: capitalize first letter of each word after splitting on common separators
    return contextName
      .split(/[-_@.]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Import clusters from a kubeconfig file path
   */
  static async importFromFile(filePath: string): Promise<AddClusterRequest[]> {
    try {
      // In a browser environment, this would need to be handled differently
      // For now, this is a server-side utility
      const fs = await import('fs');
      const kubeconfigContent = fs.readFileSync(filePath, 'utf8');
      return this.parseKubeconfig(kubeconfigContent);
    } catch (error) {
      console.error(`Failed to import kubeconfig from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Validate kubeconfig content
   */
  static validateKubeconfig(kubeconfigContent: string): boolean {
    try {
      const kubeconfig = yaml.load(kubeconfigContent) as any;
      
      return !!(
        kubeconfig &&
        kubeconfig.apiVersion &&
        kubeconfig.kind === 'Config' &&
        kubeconfig.clusters &&
        kubeconfig.users &&
        kubeconfig.contexts &&
        Array.isArray(kubeconfig.clusters) &&
        Array.isArray(kubeconfig.users) &&
        Array.isArray(kubeconfig.contexts)
      );
    } catch (error) {
      return false;
    }
  }
}

// Utility function to detect Kubernetes version from server info
export async function detectKubernetesVersion(serverUrl: string, auth: ClusterAuth): Promise<string | undefined> {
  try {
    // This would need to be implemented with actual API calls
    // For now, return undefined to indicate unknown version
    return undefined;
  } catch (error) {
    console.error('Failed to detect Kubernetes version:', error);
    return undefined;
  }
}

// Pre-configured workspace kubeconfigs for this project
export const WORKSPACE_KUBECONFIGS = [
  {
    name: 'Talos 3-Node Cluster',
    path: '/Users/brun_s/sandbox/kubernetes-admin-ui/workspace/kubeconfig-talos-3-noeuds',
    description: '3-node Talos control plane cluster'
  },
  {
    name: 'Talos Local Cluster', 
    path: '/Users/brun_s/sandbox/kubernetes-admin-ui/workspace/kubeconfig-talosctl-cluster-local',
    description: 'Local Talos cluster with 1 control plane and 2 workers'
  }
];