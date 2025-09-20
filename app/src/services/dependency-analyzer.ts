import axios from 'axios';

// Base URL for the API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Dependency types
export type DependencyType = 
  | 'owner'
  | 'selector'  
  | 'volume'
  | 'serviceAccount'
  | 'network'
  | 'custom'
  | 'service';

export type DependencyStrength = 'strong' | 'weak';

// Dependency edge structure
export interface DependencyEdge {
  type: DependencyType;
  target: string;
  strength: DependencyStrength;
  metadata: {
    field?: string;
    reason: string;
    controller?: boolean;
    selector?: any;
  };
}

// Resource dependencies response
export interface ResourceDependencies {
  outgoing: DependencyEdge[];  // Resources this resource depends on
  incoming: DependencyEdge[];  // Resources that depend on this resource  
  related: DependencyEdge[];   // Related resources (weak relationships)
}

// Individual resource info
export interface ResourceInfo {
  kind: string;
  name: string;
  namespace?: string;
  uid?: string;
  labels?: Record<string, string>;
  creationTimestamp?: string;
}

// Resource with dependencies
export interface ResourceWithDependencies {
  resource: ResourceInfo;
  dependencies: ResourceDependencies;
}

// Graph node
export interface DependencyGraphNode {
  id: string;
  kind: string;
  name: string;
  namespace?: string;
  labels: Record<string, string>;
  creationTimestamp?: string;
  status: any;
}

// Graph edge
export interface DependencyGraphEdge {
  id: string;
  source: string;
  target: string;
  type: DependencyType;
  strength: DependencyStrength;
  metadata: any;
}

// Graph structure
export interface DependencyGraph {
  metadata: {
    namespace: string;
    nodeCount: number;
    edgeCount: number;
    timestamp: string;
  };
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

// Filter options for graph queries
export interface DependencyFilters {
  namespace?: string;
  includeCustomResources?: boolean;
  resourceTypes?: string[];
  dependencyTypes?: DependencyType[];
  maxNodes?: number;
}

class ResourceDependencyAnalyzer {
  private apiTimeout = 30000; // 30 seconds

  /**
   * Get dependencies for a specific resource
   */
  async getResourceDependencies(
    kind: string, 
    name: string, 
    namespace?: string
  ): Promise<ResourceWithDependencies> {
    try {
      const params = new URLSearchParams();
      if (namespace) {
        params.append('namespace', namespace);
      }

      const response = await axios.get(
        `${API_BASE_URL}/dependencies/${encodeURIComponent(kind)}/${encodeURIComponent(name)}?${params}`,
        { timeout: this.apiTimeout }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get resource dependencies:', error);
      throw new Error(`Failed to get dependencies for ${kind}/${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get dependency graph for a namespace or entire cluster
   */
  async getDependencyGraph(filters: DependencyFilters = {}): Promise<DependencyGraph> {
    try {
      const params = new URLSearchParams();
      
      if (filters.namespace) {
        params.append('namespace', filters.namespace);
      }
      
      if (filters.includeCustomResources !== undefined) {
        params.append('includeCustom', filters.includeCustomResources.toString());
      }

      if (filters.maxNodes) {
        params.append('maxNodes', filters.maxNodes.toString());
      }

      const response = await axios.get(
        `${API_BASE_URL}/dependencies/graph?${params}`,
        { timeout: this.apiTimeout }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get dependency graph:', error);
      throw new Error(`Failed to get dependency graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filter graph nodes by type
   */
  filterNodesByType(nodes: DependencyGraphNode[], types: string[]): DependencyGraphNode[] {
    if (!types.length) return nodes;
    return nodes.filter(node => types.includes(node.kind));
  }

  /**
   * Filter graph edges by dependency type
   */
  filterEdgesByType(edges: DependencyGraphEdge[], types: DependencyType[]): DependencyGraphEdge[] {
    if (!types.length) return edges;
    return edges.filter(edge => types.includes(edge.type));
  }

  /**
   * Find nodes connected to a specific resource
   */
  findConnectedNodes(
    graph: DependencyGraph, 
    resourceId: string, 
    maxDepth: number = 2
  ): { nodes: DependencyGraphNode[], edges: DependencyGraphEdge[] } {
    const connectedNodeIds = new Set<string>();
    const connectedEdges: DependencyGraphEdge[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string, depth: number }> = [{ id: resourceId, depth: 0 }];

    // BFS to find connected resources
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || depth > maxDepth) {
        continue;
      }
      
      visited.add(currentId);
      connectedNodeIds.add(currentId);

      // Find edges connected to this node
      for (const edge of graph.edges) {
        if (edge.source === currentId || edge.target === currentId) {
          connectedEdges.push(edge);
          
          const connectedNodeId = edge.source === currentId ? edge.target : edge.source;
          if (!visited.has(connectedNodeId) && depth < maxDepth) {
            queue.push({ id: connectedNodeId, depth: depth + 1 });
            connectedNodeIds.add(connectedNodeId);
          }
        }
      }
    }

    const connectedNodes = graph.nodes.filter(node => connectedNodeIds.has(node.id));
    
    return { nodes: connectedNodes, edges: connectedEdges };
  }

  /**
   * Get dependency statistics for a graph
   */
  getGraphStatistics(graph: DependencyGraph) {
    if (!graph || !graph.nodes || !graph.edges) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        resourceTypes: [],
        dependencyTypes: [],
        namespaces: [],
        strongDependencies: 0,
        weakDependencies: 0,
        nodesByType: {},
        edgesByType: {}
      };
    }
    
    const resourceTypes = new Set(graph.nodes.map(node => node.kind).filter(Boolean));
    const dependencyTypes = new Set(graph.edges.map(edge => edge.type).filter(Boolean));
    const namespaces = new Set(graph.nodes.map(node => node.namespace).filter(Boolean));
    
    const strongDependencies = graph.edges.filter(edge => edge.strength === 'strong');
    const weakDependencies = graph.edges.filter(edge => edge.strength === 'weak');

    // Count nodes by type
    const nodesByType: Record<string, number> = {};
    graph.nodes.forEach(node => {
      if (node && node.kind) {
        nodesByType[node.kind] = (nodesByType[node.kind] || 0) + 1;
      }
    });

    // Count edges by type
    const edgesByType: Record<string, number> = {};
    graph.edges.forEach(edge => {
      if (edge && edge.type) {
        edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
      }
    });

    return {
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      resourceTypes: Array.from(resourceTypes),
      dependencyTypes: Array.from(dependencyTypes),
      namespaces: Array.from(namespaces),
      strongDependencies: strongDependencies.length,
      weakDependencies: weakDependencies.length,
      nodesByType,
      edgesByType
    };
  }

  /**
   * Generate a resource ID from kind, name, and namespace
   */
  generateResourceId(kind: string, name: string, namespace?: string): string {
    return `${kind}/${name}${namespace ? `@${namespace}` : ''}`;
  }

  /**
   * Parse a resource ID back to its components
   */
  parseResourceId(resourceId: string): { kind: string, name: string, namespace?: string } {
    const [kindName, namespace] = resourceId.split('@');
    const [kind, name] = kindName.split('/');
    
    return {
      kind,
      name,
      namespace: namespace || undefined
    };
  }

  /**
   * Get human-readable description for a dependency type
   */
  getDependencyTypeDescription(type: DependencyType): string {
    switch (type) {
      case 'owner':
        return 'Ownership relationship (parent-child)';
      case 'volume':
        return 'Volume mount relationship';
      case 'serviceAccount':
        return 'Service account usage';
      case 'selector':
        return 'Label selector relationship';
      case 'service':
        return 'Service discovery relationship';
      case 'network':
        return 'Network policy relationship';
      case 'custom':
        return 'Custom resource relationship';
      default:
        return 'Unknown relationship type';
    }
  }

  /**
   * Get color for dependency type (for visualization)
   */
  getDependencyTypeColor(type: DependencyType): string {
    switch (type) {
      case 'owner':
        return '#ff6b6b';  // Red for ownership
      case 'volume':
        return '#4ecdc4';  // Teal for volumes
      case 'serviceAccount':
        return '#45b7d1';  // Blue for service accounts
      case 'selector':
        return '#96ceb4';  // Green for selectors
      case 'service':
        return '#ffa726';  // Orange for services
      case 'network':
        return '#ba68c8';  // Purple for networking
      case 'custom':
        return '#78909c';  // Gray for custom
      default:
        return '#666666';  // Dark gray for unknown
    }
  }

  /**
   * Get icon for resource kind
   */
  getResourceKindIcon(kind: string): string {
    if (!kind || typeof kind !== 'string') {
      return '📋'; // Default icon for unknown/invalid kinds
    }
    
    switch (kind.toLowerCase()) {
      case 'pod':
        return '🚀';
      case 'service':
        return '🌐';
      case 'deployment':
        return '📦';
      case 'configmap':
        return '⚙️';
      case 'secret':
        return '🔐';
      case 'persistentvolumeclaim':
      case 'persistentvolume':
        return '💾';
      case 'namespace':
        return '🏷️';
      case 'node':
        return '🖥️';
      case 'serviceaccount':
        return '👤';
      case 'role':
      case 'clusterrole':
        return '🛡️';
      case 'ingress':
        return '🌍';
      default:
        return '📋';
    }
  }
}

// Export singleton instance
export const dependencyAnalyzer = new ResourceDependencyAnalyzer();
export default dependencyAnalyzer;