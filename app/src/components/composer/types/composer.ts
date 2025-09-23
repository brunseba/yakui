// CRD Composer TypeScript Interfaces
// Based on API documentation review: /api/resources, /api/crds/:name, /api/dependencies/crd/enhanced

export interface ComposerCRD {
  id: string;
  name: string;
  kind: string;
  group: string;
  version: string;
  scope: 'Cluster' | 'Namespaced';
  plural: string;
  description: string;
  position: { x: number; y: number };
  // Extended from /api/resources endpoint
  isCustom: boolean;
  crdName?: string;
  // Extended from /api/crds/:name endpoint
  instances?: number;
  metadata?: any;
  schema?: CRDSchema;
}

export interface CRDSchema {
  version: string;
  served: boolean;
  storage: boolean;
  properties: CRDSchemaProperty[];
  additionalProperties?: boolean;
}

export interface CRDSchemaProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface CRDRelationship {
  id: string;
  source: string;
  target: string;
  type: 'reference' | 'dependency' | 'composition' | 'weak';
  strength: 'strong' | 'weak';
  metadata: {
    field?: string;
    reason: string;
    path?: string;
  };
}

export interface ComposerState {
  // Available CRDs loaded from /api/resources
  availableCRDs: ComposerCRD[];
  // CRDs currently on the canvas
  canvasCRDs: ComposerCRD[];
  // Relationships between CRDs from /api/dependencies/crd/enhanced
  relationships: CRDRelationship[];
  // Currently selected CRD for details panel
  selectedCRD: ComposerCRD | null;
  // CRD being dragged
  draggedCRD: ComposerCRD | null;
  // Canvas configuration
  canvasSize: { width: number; height: number };
  zoomLevel: number;
  // Loading states
  loading: {
    crds: boolean;
    relationships: boolean;
    details: boolean;
  };
  // Error states
  error: string | null;
}

export interface ComposerActions {
  // Canvas operations
  addCRDToCanvas: (crd: ComposerCRD, position: { x: number; y: number }) => void;
  removeCRDFromCanvas: (crdId: string) => void;
  updateCRDPosition: (crdId: string, position: { x: number; y: number }) => void;
  
  // Selection and interaction
  selectCRD: (crd: ComposerCRD | null) => void;
  
  // Data operations
  loadAvailableCRDs: () => Promise<void>;
  analyzeRelationships: () => Promise<void>;
  loadCRDDetails: (crdName: string) => Promise<ComposerCRD | null>;
  
  // Canvas controls
  setZoomLevel: (level: number) => void;
  resetCanvas: () => void;
  
  // Export/Import
  exportComposition: () => void;
  importComposition: (data: any) => void;
}

// API Group information from /api/dependencies/crd/apigroups
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

// Filter options for CRD source panel
export interface CRDFilterOptions {
  searchTerm: string;
  selectedApiGroups: string[];
  showCustomOnly: boolean;
  showCoreOnly: boolean;
  scopeFilter: 'all' | 'cluster' | 'namespaced';
}

// Composition export format
export interface CompositionExport {
  version: string;
  metadata: {
    name: string;
    created: string;
    crdCount: number;
    relationshipCount: number;
    description?: string;
  };
  crds: ComposerCRD[];
  relationships: CRDRelationship[];
}

// Canvas interaction events
export interface CanvasInteractionEvent {
  type: 'click' | 'drag' | 'drop' | 'select' | 'deselect';
  crdId?: string;
  position?: { x: number; y: number };
  data?: any;
}

// Auto-layout options
export interface AutoLayoutOptions {
  algorithm: 'force-directed' | 'hierarchical' | 'circular' | 'grid';
  spacing: number;
  animate: boolean;
  duration: number;
}