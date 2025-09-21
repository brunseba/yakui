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

class CRDAnalysisService {
  private apiTimeout = 30000; // 30 seconds

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
   * Get enhanced CRD dependency analysis
   */
  async getEnhancedCRDAnalysis(options: CRDAnalysisOptions = {}): Promise<CRDAnalysisResult> {
    try {
      const params = new URLSearchParams();
      
      if (options.apiGroups && options.apiGroups.length > 0) {
        params.append('apiGroups', options.apiGroups.join(','));
      }
      
      if (options.maxCRDs) {
        params.append('maxCRDs', options.maxCRDs.toString());
      }
      
      if (options.includeNativeResources !== undefined) {
        params.append('includeNative', options.includeNativeResources.toString());
      }
      
      if (options.analysisDepth) {
        params.append('depth', options.analysisDepth);
      }

      console.log('Fetching enhanced CRD analysis with params:', params.toString());

      const response = await axios.get(
        `${API_BASE_URL}/dependencies/crd/enhanced?${params}`,
        { timeout: this.apiTimeout }
      );

      const rawData = response.data;
      console.log('Raw CRD analysis response:', { 
        hasNodes: !!rawData.nodes, 
        nodeCount: rawData.nodes?.length, 
        hasEdges: !!rawData.edges, 
        edgeCount: rawData.edges?.length,
        hasMetadata: !!rawData.metadata
      });

      // Return the backend data directly - no transformation needed
      return {
        metadata: rawData.metadata || {},
        nodes: rawData.nodes || [],
        edges: rawData.edges || []
      } as CRDAnalysisResult;
    } catch (error) {
      console.error('Failed to get enhanced CRD analysis:', error);
      throw new Error(`Failed to get enhanced CRD analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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