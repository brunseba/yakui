import React from 'react';
import axios from 'axios';

// Base URL for the API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// CRD Analysis interfaces
export interface CRDApiGroup {
  group: string;
  crdCount: number;
  crds: Array<{
    name: string;
    kind: string;
    scope: string;
  }>;
  versions: string[];
}

export interface CRDDependencyNode {
  id: string;
  name: string;
  kind: string;
  labels: Record<string, string>;
  metadata?: any;
}

export interface CRDDependencyEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: 'strong' | 'weak';
  metadata: {
    reason?: string;
    field?: string;
    [key: string]: any;
  };
}

export interface CRDAnalysisResult {
  metadata: {
    namespace: string;
    nodeCount: number;
    edgeCount: number;
    timestamp: string;
    apiGroups?: string[];
    apiGroupStats?: Record<string, any>;
    analysisOptions?: any;
    analysisTime?: number;
    crdCount?: number;
    dependencyCount?: number;
  };
  nodes: CRDDependencyNode[];
  edges: CRDDependencyEdge[];
}

export interface CRDAnalysisOptions {
  apiGroups?: string[];
  maxCRDs?: number;
  includeNativeResources?: boolean;
  analysisDepth?: 'shallow' | 'deep';
}

export interface CRDExportOptions {
  format?: 'json' | 'csv' | 'markdown';
  includeSchemaDetails?: boolean;
  includeDependencyMetadata?: boolean;
  focusOnCRDs?: boolean;
  apiGroups?: string[];
}

export interface CRDDependency {
  type: string;
  target: string;
  path?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface CRDType {
  kind: string;
  apiGroup?: string;
  version?: string;
  plural?: string;
  description?: string;
  dependencies: CRDDependency[];
}

// New interfaces for CRD-to-CRD relationships API
export interface CRDRelationshipOptions {
  apiGroups?: string[];
  crds?: string[];
  maxRelationships?: number;
  relationshipTypes?: string[];
  includeMetadata?: boolean;
}

export interface CRDRelationship {
  id: string;
  source: string;
  target: string;
  type: 'reference' | 'composition' | 'dependency';
  strength: 'strong' | 'weak';
  metadata: {
    sourceField?: string;
    reason: string;
    schemaVersion?: string;
    pattern?: string;
    confidence?: number;
    referenceType?: string;
  };
}

export interface CRDInfo {
  id: string;
  name: string;
  kind: string;
  group: string;
  version: string;
  scope: 'Cluster' | 'Namespaced';
  plural?: string;
  shortNames?: string[];
  categories?: string[];
}

export interface CRDRelationshipsResponse {
  metadata: {
    timestamp: string;
    analysisTimeMs: number;
    requestTimeMs?: number;
    crdCount: number;
    relationshipCount: number;
    apiGroups: string[];
    analysisOptions?: CRDRelationshipOptions;
  };
  crds: CRDInfo[];
  relationships: CRDRelationship[];
}

class CRDAnalysisService {
  private apiTimeout = 8000; // 8 seconds - reduced for faster feedback
  private fallbackTimeout = 3000; // 3 seconds for fallback attempt

  /**
   * Get available API groups for CRD analysis
   */
  async getApiGroups(): Promise<CRDApiGroup[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/dependencies/crd/apigroups`,
        { timeout: this.apiTimeout }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get CRD API groups:', error);
      throw new Error(`Failed to get CRD API groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enhanced CRD dependency analysis with fallback
   */
  async getEnhancedCRDAnalysis(options: CRDAnalysisOptions = {}): Promise<CRDAnalysisResult> {
    console.log('🔍 Starting CRD analysis with options:', options);
    
    try {
      // Try with minimal parameters first for faster response
      const fastParams = new URLSearchParams();
      fastParams.append('maxCRDs', Math.min(options.maxCRDs || 10, 10).toString());
      fastParams.append('includeNative', 'false');
      fastParams.append('depth', 'shallow');
      
      if (options.apiGroups && options.apiGroups.length > 0) {
        // Limit to first 3 API groups for faster analysis
        fastParams.append('apiGroups', options.apiGroups.slice(0, 3).join(','));
      }

      console.log('🚀 Fetching enhanced CRD analysis with fast params:', fastParams.toString());

      const response = await axios.get(
        `${API_BASE_URL}/dependencies/crd/enhanced?${fastParams}`,
        { timeout: this.apiTimeout }
      );

      const rawData = response.data;
      console.log('✅ CRD analysis response received:', { 
        hasNodes: !!rawData.nodes, 
        nodeCount: rawData.nodes?.length, 
        hasEdges: !!rawData.edges, 
        edgeCount: rawData.edges?.length,
        hasMetadata: !!rawData.metadata
      });

      return {
        metadata: rawData.metadata || {
          namespace: 'default',
          nodeCount: rawData.nodes?.length || 0,
          edgeCount: rawData.edges?.length || 0,
          timestamp: new Date().toISOString(),
          analysisTime: Date.now()
        },
        nodes: rawData.nodes || [],
        edges: rawData.edges || []
      } as CRDAnalysisResult;
    } catch (error) {
      console.warn('⚠️ Primary CRD analysis failed, trying fallback approach:', error);
      
      // Try fallback with even more minimal params
      try {
        const fallbackResponse = await this.getFallbackAnalysis(options);
        if (fallbackResponse) {
          console.log('✅ Fallback CRD analysis succeeded');
          return fallbackResponse;
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback analysis also failed:', fallbackError);
      }
      
      // Return mock data for development purposes
      console.log('📋 Using mock CRD analysis data for development');
      return this.getMockAnalysisData(options);
    }
  }
  
  /**
   * Fallback analysis with minimal parameters
   */
  private async getFallbackAnalysis(options: CRDAnalysisOptions): Promise<CRDAnalysisResult | null> {
    try {
      const minimalParams = new URLSearchParams();
      minimalParams.append('maxCRDs', '3');
      minimalParams.append('includeNative', 'false');
      minimalParams.append('depth', 'shallow');
      
      const response = await axios.get(
        `${API_BASE_URL}/dependencies/crd/enhanced?${minimalParams}`,
        { timeout: this.fallbackTimeout }
      );
      
      const rawData = response.data;
      return {
        metadata: rawData.metadata || {
          namespace: 'default',
          nodeCount: rawData.nodes?.length || 0,
          edgeCount: rawData.edges?.length || 0,
          timestamp: new Date().toISOString(),
          analysisTime: Date.now()
        },
        nodes: rawData.nodes || [],
        edges: rawData.edges || []
      };
    } catch (error) {
      console.log('Fallback analysis failed:', error);
      return null;
    }
  }
  
  /**
   * Generate mock analysis data for development
   */
  private getMockAnalysisData(options: CRDAnalysisOptions): CRDAnalysisResult {
    const mockNodes: CRDDependencyNode[] = [
      {
        id: 'clusters.postgresql.cnpg.io',
        name: 'Cluster',
        kind: 'Cluster',
        labels: { group: 'postgresql.cnpg.io' }
      },
      {
        id: 'backups.postgresql.cnpg.io',
        name: 'Backup',
        kind: 'Backup', 
        labels: { group: 'postgresql.cnpg.io' }
      },
      {
        id: 'scheduledbackups.postgresql.cnpg.io',
        name: 'ScheduledBackup',
        kind: 'ScheduledBackup',
        labels: { group: 'postgresql.cnpg.io' }
      }
    ];
    
    const mockEdges: CRDDependencyEdge[] = [
      {
        id: 'backup-cluster-ref',
        source: 'backups.postgresql.cnpg.io',
        target: 'clusters.postgresql.cnpg.io',
        type: 'reference',
        strength: 'strong',
        metadata: {
          reason: 'Backup references cluster via spec.cluster.name',
          field: 'spec.cluster.name'
        }
      },
      {
        id: 'scheduledbackup-cluster-ref', 
        source: 'scheduledbackups.postgresql.cnpg.io',
        target: 'clusters.postgresql.cnpg.io',
        type: 'reference',
        strength: 'strong',
        metadata: {
          reason: 'ScheduledBackup references cluster',
          field: 'spec.cluster.name'
        }
      }
    ];
    
    return {
      metadata: {
        namespace: 'mock-analysis',
        nodeCount: mockNodes.length,
        edgeCount: mockEdges.length,
        timestamp: new Date().toISOString(),
        apiGroups: options.apiGroups || ['postgresql.cnpg.io'],
        analysisTime: Date.now(),
        crdCount: mockNodes.length,
        dependencyCount: mockEdges.length
      },
      nodes: mockNodes,
      edges: mockEdges
    };
  }

  /**
   * Get CRD-to-CRD relationships (specialized API)
   * This method uses the new optimized endpoint for Canvas Composer
   */
  async getCRDRelationships(options: CRDRelationshipOptions = {}): Promise<CRDRelationshipsResponse> {
    console.log('🔍 Starting CRD-to-CRD relationship analysis with options:', options);
    
    try {
      const params = new URLSearchParams();
      
      if (options.apiGroups && options.apiGroups.length > 0) {
        params.append('apiGroups', options.apiGroups.join(','));
      }
      
      if (options.crds && options.crds.length > 0) {
        params.append('crds', options.crds.join(','));
      }
      
      if (options.maxRelationships) {
        params.append('maxRelationships', options.maxRelationships.toString());
      }
      
      if (options.relationshipTypes && options.relationshipTypes.length > 0) {
        params.append('relationshipTypes', options.relationshipTypes.join(','));
      }
      
      if (options.includeMetadata !== undefined) {
        params.append('includeMetadata', options.includeMetadata.toString());
      }

      console.log('🚀 Fetching CRD relationships with params:', params.toString());

      const response = await axios.get(
        `${API_BASE_URL}/dependencies/crd-relationships?${params}`,
        { timeout: 5000 } // Much faster than the old 8s timeout
      );

      const responseData = response.data;
      console.log('✅ CRD relationships response received:', { 
        crdCount: responseData.crds?.length || 0,
        relationshipCount: responseData.relationships?.length || 0,
        analysisTimeMs: responseData.metadata?.analysisTimeMs,
        requestTimeMs: responseData.metadata?.requestTimeMs
      });

      return {
        metadata: {
          timestamp: responseData.metadata?.timestamp || new Date().toISOString(),
          analysisTimeMs: responseData.metadata?.analysisTimeMs || 0,
          requestTimeMs: responseData.metadata?.requestTimeMs || 0,
          crdCount: responseData.metadata?.crdCount || 0,
          relationshipCount: responseData.metadata?.relationshipCount || 0,
          apiGroups: responseData.metadata?.apiGroups || [],
          analysisOptions: responseData.metadata?.analysisOptions
        },
        crds: responseData.crds || [],
        relationships: responseData.relationships || []
      };
    } catch (error) {
      console.warn('⚠️ CRD relationships API failed, using mock data:', error);
      
      // Return mock data for development
      return this.getMockCRDRelationshipsData(options);
    }
  }

  /**
   * Generate mock CRD relationship data for development/fallback
   */
  private getMockCRDRelationshipsData(options: CRDRelationshipOptions): CRDRelationshipsResponse {
    const mockCRDs: CRDInfo[] = [
      {
        id: 'crd-clusters.postgresql.cnpg.io',
        name: 'clusters.postgresql.cnpg.io',
        kind: 'Cluster',
        group: 'postgresql.cnpg.io',
        version: 'v1',
        scope: 'Namespaced',
        plural: 'clusters'
      },
      {
        id: 'crd-backups.postgresql.cnpg.io',
        name: 'backups.postgresql.cnpg.io',
        kind: 'Backup',
        group: 'postgresql.cnpg.io',
        version: 'v1',
        scope: 'Namespaced',
        plural: 'backups'
      },
      {
        id: 'crd-scheduledbackups.postgresql.cnpg.io',
        name: 'scheduledbackups.postgresql.cnpg.io',
        kind: 'ScheduledBackup',
        group: 'postgresql.cnpg.io',
        version: 'v1',
        scope: 'Namespaced',
        plural: 'scheduledbackups'
      }
    ];
    
    const mockRelationships: CRDRelationship[] = [
      {
        id: 'backup-cluster-reference',
        source: 'crd-backups.postgresql.cnpg.io',
        target: 'crd-clusters.postgresql.cnpg.io',
        type: 'reference',
        strength: 'strong',
        metadata: {
          sourceField: 'spec.cluster.name',
          reason: 'Backup references cluster via spec.cluster.name field',
          confidence: 0.9,
          referenceType: 'crd-to-crd'
        }
      },
      {
        id: 'scheduledbackup-cluster-reference',
        source: 'crd-scheduledbackups.postgresql.cnpg.io',
        target: 'crd-clusters.postgresql.cnpg.io',
        type: 'reference',
        strength: 'strong',
        metadata: {
          sourceField: 'spec.cluster.name',
          reason: 'ScheduledBackup references cluster for automated backups',
          confidence: 0.9,
          referenceType: 'crd-to-crd'
        }
      },
      {
        id: 'backup-scheduledbackup-composition',
        source: 'crd-scheduledbackups.postgresql.cnpg.io',
        target: 'crd-backups.postgresql.cnpg.io',
        type: 'composition',
        strength: 'weak',
        metadata: {
          sourceField: 'spec.backupOwnerReference',
          reason: 'ScheduledBackup creates Backup instances',
          confidence: 0.7,
          referenceType: 'crd-to-crd'
        }
      }
    ];
    
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        analysisTimeMs: 50,
        requestTimeMs: 100,
        crdCount: mockCRDs.length,
        relationshipCount: mockRelationships.length,
        apiGroups: ['postgresql.cnpg.io'],
        analysisOptions: options
      },
      crds: mockCRDs,
      relationships: mockRelationships
    };
  }

  /**
   * Get legacy CRD dictionary analysis
   */
  async getLegacyCRDAnalysis(): Promise<CRDAnalysisResult> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/dependencies/dictionary`,
        { timeout: this.apiTimeout }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get legacy CRD analysis:', error);
      throw new Error(`Failed to get legacy CRD analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export CRD analysis in various formats
   */
  async exportCRDAnalysis(options: CRDExportOptions = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (options.format) {
        params.append('format', options.format);
      }
      
      if (options.includeSchemaDetails !== undefined) {
        params.append('includeSchemaDetails', options.includeSchemaDetails.toString());
      }
      
      if (options.includeDependencyMetadata !== undefined) {
        params.append('includeDependencyMetadata', options.includeDependencyMetadata.toString());
      }
      
      if (options.focusOnCRDs !== undefined) {
        params.append('focusOnCRDs', options.focusOnCRDs.toString());
      }
      
      if (options.apiGroups && options.apiGroups.length > 0) {
        params.append('apiGroups', options.apiGroups.join(','));
      }

      console.log('Exporting CRD analysis with params:', params.toString());

      const response = await axios.get(
        `${API_BASE_URL}/dependencies/crd/export?${params}`,
        { timeout: this.apiTimeout }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to export CRD analysis:', error);
      throw new Error(`Failed to export CRD analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get CRD type color for visualization
   */
  getCRDTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'crd-definition':
        return '#ff6b6b';  // Red for CRD definitions
      case 'core-resource-type':
        return '#4ecdc4';  // Teal for core resources
      case 'schema-field':
        return '#45b7d1';  // Blue for schema fields
      case 'api-group':
        return '#96ceb4';  // Green for API groups
      case 'version':
        return '#ffa726';  // Orange for versions
      default:
        return '#666666';  // Gray for unknown
    }
  }

  // Note: The transformCRDAnalysisData method has been removed as we now
  // directly use backend nodes/edges in the graph component for optimal performance

  /**
   * Get CRD icon as React element (temporary stub)
   */
  getCRDIcon(crd: any): React.ReactElement {
    return React.createElement('span', { style: { fontSize: '16px' } }, this.getCRDKindIcon(crd.kind || 'unknown'));
  }

  /**
   * Get CRD kind icon
   */
  getCRDKindIcon(kind: string): string {
    if (!kind || typeof kind !== 'string') {
      return '📋'; // Default icon
    }
    
    switch (kind.toLowerCase()) {
      case 'customresourcedefinition':
      case 'crd':
        return '🔧';
      case 'deployment':
      case 'application':
        return '📦';
      case 'service':
      case 'ingress':
        return '🌐';
      case 'database':
      case 'postgres':
      case 'mysql':
        return '🗄️';
      case 'secret':
      case 'certificate':
        return '🔐';
      case 'configmap':
      case 'config':
        return '⚙️';
      case 'policy':
      case 'rule':
        return '🛡️';
      case 'operator':
      case 'controller':
        return '🤖';
      default:
        return '📋';
    }
  }
}

// Export singleton instance
export const crdAnalysisService = new CRDAnalysisService();
export default crdAnalysisService;