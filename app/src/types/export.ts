// Export data types for CRD dependency analysis results
export type ExportFormat = 'json' | 'csv' | 'excel' | 'pdf' | 'markdown';

export interface ExportMetadata {
  exportTimestamp: string;
  exportFormat: ExportFormat;
  analysisTimestamp: string;
  exportedBy?: string;
  clusterInfo?: {
    name?: string;
    version?: string;
    nodes?: number;
  };
}

export interface CRDSchemaDetails {
  name: string;
  kind: string;
  group: string;
  versions: Array<{
    name: string;
    served: boolean;
    storage: boolean;
    schema?: {
      openAPIV3Schema?: any;
      properties?: Record<string, any>;
      required?: string[];
    };
  }>;
  scope: 'Namespaced' | 'Cluster';
  shortNames?: string[];
  categories?: string[];
  description?: string;
  instanceCount?: number;
  examples?: any[];
}

export interface DependencyDetails {
  id: string;
  source: {
    name: string;
    kind: string;
    group?: string;
    version?: string;
  };
  target: {
    name: string;
    kind: string;
    group?: string;
    version?: string;
  };
  type: string;
  strength: 'strong' | 'weak';
  reason: string;
  field?: string;
  metadata?: Record<string, any>;
}

export interface APIGroupSummary {
  name: string;
  crdCount: number;
  versions: string[];
  crds: Array<{
    name: string;
    kind: string;
    scope: string;
    versions: string[];
  }>;
  dependencies: {
    incoming: number;
    outgoing: number;
    internal: number; // dependencies within the same API group
  };
}

export interface AnalysisStatistics {
  totalNodes: number;
  totalEdges: number;
  crdNodes: number;
  coreResourceNodes: number;
  strongDependencies: number;
  weakDependencies: number;
  apiGroupCount: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  complexityMetrics: {
    averageDependenciesPerCRD: number;
    maxDependenciesPerCRD: number;
    circularDependencies: number;
    isolatedCRDs: number;
  };
}

export interface ExportData {
  metadata: ExportMetadata;
  analysisOptions: {
    selectedAPIGroups: string[];
    selectedCRDs: string[];
    maxCRDs: number;
    includeNativeResources: boolean;
    analysisDepth: 'shallow' | 'deep';
  };
  statistics: AnalysisStatistics;
  apiGroups: APIGroupSummary[];
  crdSchemas: CRDSchemaDetails[];
  dependencies: DependencyDetails[];
  rawGraph?: {
    nodes: any[];
    edges: any[];
  };
}

export interface ExportOptions {
  format: ExportFormat;
  includeRawGraph: boolean;
  includeSchemaDetails: boolean;
  includeDependencyMetadata: boolean;
  customFilename?: string;
  sections?: {
    summary: boolean;
    apiGroups: boolean;
    crdDetails: boolean;
    dependencies: boolean;
    statistics: boolean;
  };
}

// CSV export specific types
export interface CSVExportData {
  crdSummary: Array<{
    name: string;
    kind: string;
    group: string;
    versions: string;
    scope: string;
    instanceCount: number;
    incomingDependencies: number;
    outgoingDependencies: number;
  }>;
  dependencies: Array<{
    sourceKind: string;
    sourceName: string;
    sourceGroup: string;
    targetKind: string;
    targetName: string;
    targetGroup: string;
    dependencyType: string;
    strength: string;
    reason: string;
  }>;
  apiGroupSummary: Array<{
    name: string;
    crdCount: number;
    versions: string;
    totalDependencies: number;
  }>;
}

// PDF export specific types
export interface PDFSection {
  title: string;
  content: string | any[];
  type: 'text' | 'table' | 'chart' | 'diagram';
}

export interface PDFExportData {
  title: string;
  subtitle: string;
  sections: PDFSection[];
  metadata: ExportMetadata;
}