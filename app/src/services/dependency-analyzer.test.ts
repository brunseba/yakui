import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { dependencyAnalyzer, DependencyFilters, DependencyGraph } from './dependency-analyzer';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ResourceDependencyAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getResourceDependencies', () => {
    it('should fetch resource dependencies successfully', async () => {
      const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
      const mockResponse = {
        data: {
          resource: {
            kind: 'Pod',
            name: 'test-pod',
            namespace: testNamespace,
            uid: 'test-uid',
            labels: { app: 'test' }
          },
          dependencies: {
            outgoing: [
              {
                type: 'volume',
                target: `ConfigMap/test-config@${testNamespace}`,
                strength: 'strong',
                metadata: {
                  field: 'spec.volumes',
                  reason: 'Mounts ConfigMap test-config'
                }
              }
            ],
            incoming: [],
            related: []
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await dependencyAnalyzer.getResourceDependencies('Pod', 'test-pod', testNamespace);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `http://localhost:3001/api/dependencies/Pod/test-pod?namespace=${testNamespace}`,
        { timeout: 30000 }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when fetching resource dependencies', async () => {
      const errorMessage = 'Network error';
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        dependencyAnalyzer.getResourceDependencies('Pod', 'test-pod', testNamespace)
      ).rejects.toThrow('Failed to get dependencies for Pod/test-pod: Network error');
    });

    it('should URL encode resource names correctly', async () => {
      const mockResponse = { data: { resource: {}, dependencies: { outgoing: [], incoming: [], related: [] } } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const testNamespace2 = process.env.VITE_TEST_NAMESPACE || 'test-ns';
      await dependencyAnalyzer.getResourceDependencies('CustomResource', 'test.resource.io', testNamespace2);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `http://localhost:3001/api/dependencies/CustomResource/test.resource.io?namespace=${testNamespace2}`,
        { timeout: 30000 }
      );
    });
  });

  describe('getDependencyGraph', () => {
    const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
    const mockGraph: DependencyGraph = {
      metadata: {
        namespace: testNamespace,
        nodeCount: 3,
        edgeCount: 2,
        timestamp: '2023-01-01T00:00:00Z'
      },
      nodes: [
        {
          id: `Pod/test-pod@${testNamespace}`,
          kind: 'Pod',
          name: 'test-pod',
          namespace: testNamespace,
          labels: { app: 'test' },
          creationTimestamp: '2023-01-01T00:00:00Z',
          status: {}
        },
        {
          id: `Service/test-service@${testNamespace}`,
          kind: 'Service',
          name: 'test-service',
          namespace: testNamespace,
          labels: {},
          creationTimestamp: '2023-01-01T00:00:00Z',
          status: {}
        }
      ],
      edges: [
        {
          id: `Pod/test-pod@${testNamespace}-Service/test-service@${testNamespace}`,
          source: `Pod/test-pod@${testNamespace}`,
          target: `Service/test-service@${testNamespace}`,
          type: 'service',
          strength: 'weak',
          metadata: { reason: 'Service selects pod' }
        }
      ]
    };

    it('should fetch dependency graph successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockGraph });

      const result = await dependencyAnalyzer.getDependencyGraph();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/dependencies/graph?',
        { timeout: 30000 }
      );
      expect(result).toEqual(mockGraph);
    });

    it('should handle filters correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockGraph });

      const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
      const filters: DependencyFilters = {
        namespace: testNamespace,
        includeCustomResources: false,
        maxNodes: 50
      };

      await dependencyAnalyzer.getDependencyGraph(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `http://localhost:3001/api/dependencies/graph?namespace=${testNamespace}&includeCustom=false&maxNodes=50`,
        { timeout: 30000 }
      );
    });

    it('should handle errors when fetching graph', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API error'));

      await expect(
        dependencyAnalyzer.getDependencyGraph()
      ).rejects.toThrow('Failed to get dependency graph: API error');
    });
  });

  describe('helper methods', () => {
    describe('generateResourceId', () => {
      it('should generate correct IDs for namespaced resources', () => {
        const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
        const id = dependencyAnalyzer.generateResourceId('Pod', 'test-pod', testNamespace);
        expect(id).toBe(`Pod/test-pod@${testNamespace}`);
      });

      it('should generate correct IDs for cluster-scoped resources', () => {
        const id = dependencyAnalyzer.generateResourceId('Node', 'test-node');
        expect(id).toBe('Node/test-node');
      });
    });

    describe('parseResourceId', () => {
      it('should parse namespaced resource IDs correctly', () => {
        const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
        const parsed = dependencyAnalyzer.parseResourceId(`Pod/test-pod@${testNamespace}`);
        expect(parsed).toEqual({
          kind: 'Pod',
          name: 'test-pod',
          namespace: testNamespace
        });
      });

      it('should parse cluster-scoped resource IDs correctly', () => {
        const parsed = dependencyAnalyzer.parseResourceId('Node/test-node');
        expect(parsed).toEqual({
          kind: 'Node',
          name: 'test-node',
          namespace: undefined
        });
      });
    });

    describe('getDependencyTypeDescription', () => {
      it('should return correct descriptions for dependency types', () => {
        expect(dependencyAnalyzer.getDependencyTypeDescription('owner'))
          .toBe('Ownership relationship (parent-child)');
        expect(dependencyAnalyzer.getDependencyTypeDescription('volume'))
          .toBe('Volume mount relationship');
        expect(dependencyAnalyzer.getDependencyTypeDescription('service'))
          .toBe('Service discovery relationship');
      });
    });

    describe('getDependencyTypeColor', () => {
      it('should return correct colors for dependency types', () => {
        expect(dependencyAnalyzer.getDependencyTypeColor('owner')).toBe('#ff6b6b');
        expect(dependencyAnalyzer.getDependencyTypeColor('volume')).toBe('#4ecdc4');
        expect(dependencyAnalyzer.getDependencyTypeColor('service')).toBe('#ffa726');
      });
    });

    describe('getResourceKindIcon', () => {
      it('should return correct icons for resource kinds', () => {
        expect(dependencyAnalyzer.getResourceKindIcon('Pod')).toBe('🚀');
        expect(dependencyAnalyzer.getResourceKindIcon('Service')).toBe('🌐');
        expect(dependencyAnalyzer.getResourceKindIcon('Deployment')).toBe('📦');
        expect(dependencyAnalyzer.getResourceKindIcon('Unknown')).toBe('📋');
      });
    });
  });

  describe('filtering methods', () => {
    const mockNodes = [
      { id: '1', kind: 'Pod', name: 'pod1', labels: {} },
      { id: '2', kind: 'Service', name: 'svc1', labels: {} },
      { id: '3', kind: 'Pod', name: 'pod2', labels: {} }
    ];

    const mockEdges = [
      { id: '1', source: '1', target: '2', type: 'service' as const, strength: 'weak' as const, metadata: {} },
      { id: '2', source: '3', target: '2', type: 'volume' as const, strength: 'strong' as const, metadata: {} }
    ];

    describe('filterNodesByType', () => {
      it('should filter nodes by type correctly', () => {
        const result = dependencyAnalyzer.filterNodesByType(mockNodes, ['Pod']);
        expect(result).toHaveLength(2);
        expect(result.every(node => node.kind === 'Pod')).toBe(true);
      });

      it('should return all nodes when no types specified', () => {
        const result = dependencyAnalyzer.filterNodesByType(mockNodes, []);
        expect(result).toEqual(mockNodes);
      });
    });

    describe('filterEdgesByType', () => {
      it('should filter edges by dependency type correctly', () => {
        const result = dependencyAnalyzer.filterEdgesByType(mockEdges, ['service']);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('service');
      });

      it('should return all edges when no types specified', () => {
        const result = dependencyAnalyzer.filterEdgesByType(mockEdges, []);
        expect(result).toEqual(mockEdges);
      });
    });
  });

  describe('getGraphStatistics', () => {
    const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
    const testGraphNamespace = process.env.VITE_TEST_GRAPH_NAMESPACE || 'test-graph-ns';
    const mockGraph: DependencyGraph = {
      metadata: {
        namespace: testGraphNamespace,
        nodeCount: 4,
        edgeCount: 3,
        timestamp: '2023-01-01T00:00:00Z'
      },
      nodes: [
        { id: '1', kind: 'Pod', name: 'pod1', namespace: testNamespace, labels: {}, status: {} },
        { id: '2', kind: 'Pod', name: 'pod2', namespace: testNamespace, labels: {}, status: {} },
        { id: '3', kind: 'Service', name: 'svc1', namespace: testNamespace, labels: {}, status: {} },
        { id: '4', kind: 'Node', name: 'node1', labels: {}, status: {} }
      ],
      edges: [
        { id: '1', source: '1', target: '3', type: 'service', strength: 'weak', metadata: {} },
        { id: '2', source: '2', target: '3', type: 'service', strength: 'weak', metadata: {} },
        { id: '3', source: '1', target: '2', type: 'owner', strength: 'strong', metadata: {} }
      ]
    };

    it('should calculate correct statistics', () => {
      const stats = dependencyAnalyzer.getGraphStatistics(mockGraph);

      expect(stats.totalNodes).toBe(4);
      expect(stats.totalEdges).toBe(3);
      expect(stats.resourceTypes).toEqual(['Pod', 'Service', 'Node']);
      expect(stats.dependencyTypes).toEqual(['service', 'owner']);
      expect(stats.namespaces).toEqual([testNamespace]);
      expect(stats.strongDependencies).toBe(1);
      expect(stats.weakDependencies).toBe(2);
      expect(stats.nodesByType).toEqual({ Pod: 2, Service: 1, Node: 1 });
      expect(stats.edgesByType).toEqual({ service: 2, owner: 1 });
    });
  });
});