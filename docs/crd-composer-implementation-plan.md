# CRD Composer Implementation Plan

## Overview

A visual CRD composition tool that allows users to drag and drop Custom Resource Definitions onto a canvas, automatically detect relationships between them, and visualize their dependencies in an interactive grid layout.

## Feature Requirements

### Core Functionality
- **Left Ribbon**: Select CRDs discovered from Dictionary → Custom Resources
- **Center Grid**: Drag-and-drop canvas for CRD composition
- **Right Ribbon**: Detailed information panel for selected CRDs
- **Auto-linking**: Detect and visualize relationships between CRDs
- **Interactive**: Click on CRDs to view details

## Implementation Plan

### Phase 1: Foundation & UI Structure

#### 1.1 Route & Navigation Setup
```typescript
// Add to App.tsx routing
{
  id: 'crd-composer',
  label: 'CRD Composer',
  icon: <AccountTreeIcon />,
  path: '/dictionary/composer'
}
```

#### 1.2 Core Component Structure
```
app/src/components/composer/
├── CRDComposer.tsx               # Main component
├── CRDSourcePanel.tsx            # Left ribbon - CRD selector
├── CompositionCanvas.tsx         # Center grid - drag & drop area
├── CRDDetailsPanel.tsx           # Right ribbon - details view
├── ComposerToolbar.tsx           # Top toolbar with actions
├── CRDNode.tsx                   # Individual CRD node component
├── CRDConnection.tsx             # Connection/link component
├── hooks/
│   ├── useComposerState.ts       # State management
│   ├── useDragAndDrop.ts         # Drag & drop logic
│   └── useCRDRelationships.ts    # Relationship detection
└── types/
    └── composer.ts               # TypeScript interfaces
```

#### 1.3 TypeScript Interfaces
```typescript
// app/src/components/composer/types/composer.ts
export interface ComposerCRD {
  id: string;
  name: string;
  kind: string;
  group: string;
  version: string;
  scope: 'Cluster' | 'Namespaced';
  position: { x: number; y: number };
  metadata: any;
  schema?: CRDSchema;
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
  availableCRDs: ComposerCRD[];
  canvasCRDs: ComposerCRD[];
  relationships: CRDRelationship[];
  selectedCRD: ComposerCRD | null;
  draggedCRD: ComposerCRD | null;
  canvasSize: { width: number; height: number };
  zoomLevel: number;
}

export interface ComposerActions {
  addCRDToCanvas: (crd: ComposerCRD, position: { x: number; y: number }) => void;
  removeCRDFromCanvas: (crdId: string) => void;
  updateCRDPosition: (crdId: string, position: { x: number; y: number }) => void;
  selectCRD: (crd: ComposerCRD | null) => void;
  analyzeRelationships: () => Promise<void>;
  exportComposition: () => void;
  importComposition: (data: any) => void;
}
```

### Phase 2: Left Ribbon - CRD Source Panel

#### 2.1 CRD Discovery & Filtering
```typescript
// CRDSourcePanel.tsx features:
- Search and filter CRDs by name, group, kind
- Categorize by API groups
- Show CRD metadata preview
- Drag handles for each CRD
- Pagination for large CRD lists
- Refresh button to reload CRDs
```

#### 2.2 Implementation Details
```typescript
const CRDSourcePanel: React.FC = () => {
  const [crds, setCRDs] = useState<ComposerCRD[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  
  // Features:
  // - Load CRDs from existing /api/resources endpoint
  // - Filter and search functionality
  // - Draggable CRD items
  // - Group categorization
  // - Loading states and error handling
};
```

### Phase 3: Center Canvas - Composition Grid

#### 3.1 Canvas Implementation
```typescript
// CompositionCanvas.tsx features:
- Drag and drop target area
- Grid background with snap-to-grid
- Zoom and pan capabilities
- CRD node rendering with connections
- Context menu for CRD operations
- Multi-select and bulk operations
- Auto-layout algorithms
```

#### 3.2 Drag & Drop Integration
```typescript
// useDragAndDrop.ts hook:
export const useDragAndDrop = () => {
  const handleDragStart = (crd: ComposerCRD) => { /* ... */ };
  const handleDragOver = (e: DragEvent) => { /* ... */ };
  const handleDrop = (e: DragEvent, position: { x: number; y: number }) => {
    // Add CRD to canvas at dropped position
    // Trigger relationship analysis
    // Update canvas state
  };
  
  return { handleDragStart, handleDragOver, handleDrop };
};
```

#### 3.3 Visual Components
```typescript
// CRDNode.tsx - Visual representation of CRDs
const CRDNode: React.FC<{ crd: ComposerCRD; isSelected: boolean }> = ({ crd, isSelected }) => {
  return (
    <Paper
      elevation={isSelected ? 4 : 2}
      sx={{
        position: 'absolute',
        left: crd.position.x,
        top: crd.position.y,
        width: 200,
        minHeight: 100,
        cursor: 'move',
        border: isSelected ? '2px solid primary.main' : '1px solid grey.300'
      }}
    >
      <CardHeader
        title={crd.kind}
        subheader={`${crd.group}/${crd.version}`}
        avatar={<ExtensionIcon />}
      />
      <CardContent>
        <Chip 
          label={crd.scope} 
          size="small" 
          color={crd.scope === 'Cluster' ? 'primary' : 'secondary'} 
        />
      </CardContent>
    </Paper>
  );
};
```

### Phase 4: Right Ribbon - CRD Details Panel

#### 4.1 Detailed Information Display
```typescript
// CRDDetailsPanel.tsx features:
- Selected CRD comprehensive information
- Schema properties and structure
- Instance examples and counts
- Relationship details
- Actions (edit, remove, export)
- Related CRDs suggestions
```

#### 4.2 Information Sections
```typescript
const CRDDetailsPanel: React.FC<{ selectedCRD: ComposerCRD | null }> = ({ selectedCRD }) => {
  if (!selectedCRD) return <EmptyState />;
  
  return (
    <Box>
      {/* Basic Information */}
      <CRDBasicInfo crd={selectedCRD} />
      
      {/* Schema Properties */}
      <CRDSchemaView crd={selectedCRD} />
      
      {/* Relationships */}
      <CRDRelationshipsView crd={selectedCRD} />
      
      {/* Instances */}
      <CRDInstancesView crd={selectedCRD} />
      
      {/* Actions */}
      <CRDActions crd={selectedCRD} />
    </Box>
  );
};
```

### Phase 5: Relationship Detection & Visualization

#### 5.1 Relationship Analysis Algorithm
```typescript
// useCRDRelationships.ts
export const useCRDRelationships = () => {
  const analyzeRelationships = async (crds: ComposerCRD[]): Promise<CRDRelationship[]> => {
    // Use existing /api/dependencies/crd/enhanced endpoint
    // Analyze schema cross-references
    // Detect owner references
    // Find field dependencies
    // Return structured relationships
  };
  
  const detectFieldReferences = (sourceCRD: ComposerCRD, targetCRD: ComposerCRD) => {
    // Analyze OpenAPI schemas for cross-references
    // Look for field patterns like:
    // - spec.someField.nameRef -> target CRD
    // - ownerReferences
    // - labels/annotations references
  };
};
```

#### 5.2 Connection Visualization
```typescript
// CRDConnection.tsx
const CRDConnection: React.FC<{ relationship: CRDRelationship; sourceCRD: ComposerCRD; targetCRD: ComposerCRD }> = ({
  relationship, sourceCRD, targetCRD
}) => {
  const getConnectionColor = () => {
    switch (relationship.type) {
      case 'reference': return '#2196F3';
      case 'dependency': return '#FF9800';
      case 'composition': return '#4CAF50';
      default: return '#757575';
    }
  };
  
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <line
        x1={sourceCRD.position.x + 100}
        y1={sourceCRD.position.y + 50}
        x2={targetCRD.position.x + 100}
        y2={targetCRD.position.y + 50}
        stroke={getConnectionColor()}
        strokeWidth={relationship.strength === 'strong' ? 3 : 1}
        markerEnd="url(#arrowhead)"
      />
    </svg>
  );
};
```

### Phase 6: State Management & Data Flow

#### 6.1 State Management Hook
```typescript
// useComposerState.ts
export const useComposerState = () => {
  const [state, setState] = useState<ComposerState>({
    availableCRDs: [],
    canvasCRDs: [],
    relationships: [],
    selectedCRD: null,
    draggedCRD: null,
    canvasSize: { width: 1200, height: 800 },
    zoomLevel: 1
  });
  
  const actions: ComposerActions = {
    addCRDToCanvas: (crd, position) => {
      setState(prev => ({
        ...prev,
        canvasCRDs: [...prev.canvasCRDs, { ...crd, position }]
      }));
      // Trigger relationship analysis
      analyzeRelationships();
    },
    
    removeCRDFromCanvas: (crdId) => {
      setState(prev => ({
        ...prev,
        canvasCRDs: prev.canvasCRDs.filter(c => c.id !== crdId),
        relationships: prev.relationships.filter(r => 
          r.source !== crdId && r.target !== crdId
        )
      }));
    },
    
    selectCRD: (crd) => {
      setState(prev => ({ ...prev, selectedCRD: crd }));
    }
  };
  
  return { state, actions };
};
```

#### 6.2 API Integration
```typescript
// Integration with existing backend endpoints:
// - GET /api/resources (for available CRDs)
// - GET /api/dependencies/crd/enhanced (for relationship analysis)
// - GET /api/crds/:name (for detailed CRD information)
```

### Phase 7: Advanced Features

#### 7.1 Export & Import
```typescript
// Export composition to various formats
const exportComposition = (canvasCRDs: ComposerCRD[], relationships: CRDRelationship[]) => {
  const composition = {
    version: '1.0',
    metadata: {
      name: 'crd-composition',
      created: new Date().toISOString(),
      crdCount: canvasCRDs.length,
      relationshipCount: relationships.length
    },
    crds: canvasCRDs,
    relationships: relationships
  };
  
  // Support JSON, YAML, or visual diagram export
  return composition;
};
```

#### 7.2 Auto-Layout Algorithms
```typescript
// Implement automatic positioning algorithms:
// - Force-directed layout
// - Hierarchical layout
// - Circular layout
// - Grid layout with smart spacing
```

#### 7.3 Canvas Controls
```typescript
// ComposerToolbar.tsx features:
- Zoom in/out controls
- Pan reset
- Auto-layout trigger
- Export/import buttons
- Clear canvas
- Undo/redo
- Search on canvas
- Filter relationships
```

## UI Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🔧 CRD Composer - Toolbar                                                              │
│ [Auto Layout] [Zoom] [Export] [Import] [Clear] [Undo] [Redo]                        │
├──────────────┬─────────────────────────────────────────────────────┬─────────────────┤
│ 📋 CRDs      │ 🎨 Composition Canvas                                │ 📊 Details      │
│              │                                                     │                 │
│ Search: ___  │  ┌─────────┐      ┌─────────┐                      │ Selected CRD:   │
│              │  │   Pod   │────▶ │Service  │                      │ ┌─────────────┐ │
│ API Groups:  │  │Core/v1  │      │Core/v1  │                      │ │    Pod      │ │
│ ☑ core       │  └─────────┘      └─────────┘                      │ │  Core/v1    │ │
│ ☑ apps       │       │                                            │ └─────────────┘ │
│ ☐ networking │       ▼                                            │                 │
│              │  ┌─────────┐                                       │ 📋 Properties   │
│ CRDs:        │  │PodSpec  │                                       │ • replicas      │
│ • Pod        │  │Apps/v1  │                                       │ • selector      │
│ • Service    │  └─────────┘                                       │ • template      │
│ • Deployment │                                                    │                 │
│ • ConfigMap  │ Grid with snap-to functionality                    │ 🔗 Relations    │
│ • Secret     │ Drag & Drop target area                           │ • → Service     │
│              │ Zoom: 100% | Pan enabled                          │ • → ConfigMap   │
└──────────────┴─────────────────────────────────────────────────────┴─────────────────┘
```

## Implementation Timeline

### Sprint 1 (Week 1-2): Foundation
- [ ] Create basic component structure
- [ ] Implement routing and navigation
- [ ] Build left CRD source panel
- [ ] Basic state management setup

### Sprint 2 (Week 3-4): Canvas & Drag-Drop
- [ ] Implement composition canvas
- [ ] Add drag & drop functionality
- [ ] Create CRD node components
- [ ] Basic positioning and selection

### Sprint 3 (Week 5-6): Relationships
- [ ] Implement relationship detection
- [ ] Add connection visualization
- [ ] Build right details panel
- [ ] Integrate with existing APIs

### Sprint 4 (Week 7-8): Polish & Features
- [ ] Add canvas controls and toolbar
- [ ] Implement export/import
- [ ] Add auto-layout algorithms
- [ ] Testing and bug fixes

## Technical Dependencies

### Required Libraries
```json
{
  "@types/react-beautiful-dnd": "^13.1.4",
  "react-beautiful-dnd": "^13.1.1",
  "react-flow-renderer": "^10.3.17",  // Alternative for complex graphs
  "d3": "^7.8.5",                     // For advanced layouts
  "@types/d3": "^7.4.0"
}
```

### API Endpoints Integration
- **Existing**: `/api/resources`, `/api/crds/:name`, `/api/dependencies/crd/enhanced`
- **New**: None required - reuse existing backend APIs

## Success Metrics

1. **Usability**: Users can drag 5+ CRDs and see relationships within 30 seconds
2. **Performance**: Handle 50+ CRDs on canvas without lag
3. **Accuracy**: Detect 90%+ of actual CRD relationships
4. **Adoption**: 80%+ of users find the composer useful for understanding CRD structures

## Future Enhancements

1. **Real-time Collaboration**: Multiple users editing same composition
2. **Template Library**: Pre-built compositions for common patterns
3. **Validation**: Check composition validity against cluster policies
4. **Deployment**: Generate Helm charts or Kustomize from compositions
5. **Integration**: Connect with GitOps workflows

---

This plan provides a comprehensive roadmap for implementing a powerful CRD Composer feature that enhances the Dictionary functionality with visual composition capabilities.