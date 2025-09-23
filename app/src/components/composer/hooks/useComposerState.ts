import { useState, useCallback, useRef } from 'react';
import { ComposerState, ComposerActions, ComposerCRD } from '../types/composer';
import { kubernetesService } from '../../../services/kubernetes-api';
import { crdAnalysisService } from '../../../services/crd-analysis';

const initialState: ComposerState = {
  availableCRDs: [],
  canvasCRDs: [],
  relationships: [],
  selectedCRD: null,
  draggedCRD: null,
  canvasSize: { width: 1200, height: 800 },
  zoomLevel: 1,
  loading: {
    crds: false,
    relationships: false,
    details: false
  },
  error: null
};

export const useComposerState = () => {
  const [state, setState] = useState<ComposerState>(initialState);
  const crdDetailsCache = useRef<Map<string, ComposerCRD>>(new Map());

  // Transform API resource to ComposerCRD format
  const transformResourceToCRD = (resource: any): ComposerCRD => ({
    id: resource.crdName || `${resource.group}-${resource.kind}-${resource.version}`,
    name: resource.crdName || resource.plural,
    kind: resource.kind,
    group: resource.group || 'core',
    version: resource.version,
    scope: resource.namespaced ? 'Namespaced' : 'Cluster',
    plural: resource.plural,
    description: resource.description || `${resource.kind} resource`,
    position: { x: 0, y: 0 }, // Will be set when added to canvas
    isCustom: resource.isCustom,
    crdName: resource.crdName
  });

  const actions: ComposerActions = {
    // Load available CRDs from /api/resources
    loadAvailableCRDs: useCallback(async () => {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, crds: true },
        error: null 
      }));

      try {
        console.log('[CRD Composer] Loading available CRDs from API...');
        const resources = await kubernetesService.getKubernetesResources();
        
        // Filter to only show CRDs (custom resources)
        const crdResources = resources.filter(resource => resource.isCustom);
        
        const crds = crdResources.map(transformResourceToCRD);
        
        setState(prev => ({
          ...prev,
          availableCRDs: crds,
          loading: { ...prev.loading, crds: false }
        }));

        console.log(`[CRD Composer] Loaded ${crds.length} CRDs`);
      } catch (error) {
        console.error('[CRD Composer] Failed to load CRDs:', error);
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, crds: false },
          error: error instanceof Error ? error.message : 'Failed to load CRDs'
        }));
      }
    }, []),

    // Load detailed CRD information from /api/crds/:name
    loadCRDDetails: useCallback(async (crdName: string): Promise<ComposerCRD | null> => {
      // Check cache first
      if (crdDetailsCache.current.has(crdName)) {
        return crdDetailsCache.current.get(crdName) || null;
      }

      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, details: true }
      }));

      try {
        console.log(`[CRD Composer] Loading details for CRD: ${crdName}`);
        const crdDetails = await kubernetesService.getCRDDetails(crdName);
        
        // Transform detailed CRD to ComposerCRD format
        const composerCRD: ComposerCRD = {
          id: crdDetails.metadata?.name || crdName,
          name: crdDetails.metadata?.name || crdName,
          kind: crdDetails.spec?.names?.kind || 'Unknown',
          group: crdDetails.spec?.group || 'unknown',
          version: crdDetails.spec?.versions?.[0]?.name || 'v1',
          scope: crdDetails.spec?.scope === 'Cluster' ? 'Cluster' : 'Namespaced',
          plural: crdDetails.spec?.names?.plural || 'unknown',
          description: `Custom Resource: ${crdDetails.spec?.names?.kind}`,
          position: { x: 0, y: 0 },
          isCustom: true,
          crdName: crdDetails.metadata?.name,
          instances: crdDetails.instances || 0,
          metadata: crdDetails.metadata,
          schema: crdDetails.schema ? {
            version: crdDetails.schema.version,
            served: crdDetails.schema.served || true,
            storage: crdDetails.schema.storage || true,
            properties: crdDetails.schema.properties || [],
            additionalProperties: crdDetails.schema.additionalProperties
          } : undefined
        };

        // Cache the result
        crdDetailsCache.current.set(crdName, composerCRD);

        setState(prev => ({ 
          ...prev, 
          loading: { ...prev.loading, details: false }
        }));

        return composerCRD;
      } catch (error) {
        console.error(`[CRD Composer] Failed to load CRD details for ${crdName}:`, error);
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, details: false }
        }));
        return null;
      }
    }, []),

    // Add CRD to canvas
    addCRDToCanvas: useCallback(async (crd: ComposerCRD, position: { x: number; y: number }) => {
      console.log(`[CRD Composer] Adding CRD to canvas: ${crd.kind} at (${position.x}, ${position.y})`);
      
      // Load detailed information if not already loaded
      let detailedCRD = crd;
      if (crd.crdName && !crd.schema) {
        const detailed = await actions.loadCRDDetails(crd.crdName);
        if (detailed) {
          detailedCRD = detailed;
        }
      }

      const crdWithPosition = {
        ...detailedCRD,
        position,
        id: `canvas-${detailedCRD.id}-${Date.now()}` // Unique ID for canvas instance
      };

      setState(prev => {
        const newState = {
          ...prev,
          canvasCRDs: [...prev.canvasCRDs, crdWithPosition]
        };
        
        // Trigger relationship analysis if we have multiple CRDs
        if (newState.canvasCRDs.length > 1) {
          setTimeout(() => actions.analyzeRelationships(), 100);
        }
        
        return newState;
      });
    }, []),

    // Remove CRD from canvas
    removeCRDFromCanvas: useCallback((crdId: string) => {
      console.log(`[CRD Composer] Removing CRD from canvas: ${crdId}`);
      
      setState(prev => ({
        ...prev,
        canvasCRDs: prev.canvasCRDs.filter(crd => crd.id !== crdId),
        relationships: prev.relationships.filter(rel => 
          rel.source !== crdId && rel.target !== crdId
        ),
        selectedCRD: prev.selectedCRD?.id === crdId ? null : prev.selectedCRD
      }));
    }, []),

    // Update CRD position on canvas
    updateCRDPosition: useCallback((crdId: string, position: { x: number; y: number }) => {
      setState(prev => ({
        ...prev,
        canvasCRDs: prev.canvasCRDs.map(crd =>
          crd.id === crdId ? { ...crd, position } : crd
        )
      }));
    }, []),

    // Select CRD for details panel
    selectCRD: useCallback((crd: ComposerCRD | null) => {
      console.log(`[CRD Composer] Selected CRD: ${crd?.kind || 'none'}`);
      setState(prev => ({ ...prev, selectedCRD: crd }));
    }, []),

    // Analyze relationships using /api/dependencies/crd/enhanced
    analyzeRelationships: useCallback(async () => {
      setState(prev => {
        if (prev.canvasCRDs.length < 2) {
          console.log('[CRD Composer] Not enough CRDs for relationship analysis');
          return prev;
        }

        console.log(`[CRD Composer] Analyzing relationships for ${prev.canvasCRDs.length} CRDs`);
        
        // Get API groups from canvas CRDs
        const apiGroups = [...new Set(prev.canvasCRDs.map(crd => crd.group))];
        
        // Set loading state and start analysis
        const newState = { 
          ...prev, 
          loading: { ...prev.loading, relationships: true }
        };
        
        // Start async analysis
        crdAnalysisService.getEnhancedCRDAnalysis({
          apiGroups,
          maxCRDs: 50,
          includeNativeResources: false,
          analysisDepth: 'deep'
        }).then(analysisResult => {
          // Transform analysis edges to CRDRelationship format
          const relationships = analysisResult.edges?.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type as 'reference' | 'dependency' | 'composition' | 'weak',
            strength: edge.strength as 'strong' | 'weak',
            metadata: {
              field: edge.metadata?.field,
              reason: edge.metadata?.reason || 'Unknown relationship',
              path: edge.metadata?.path
            }
          })) || [];

          setState(currentPrev => ({
            ...currentPrev,
            relationships,
            loading: { ...currentPrev.loading, relationships: false }
          }));

          console.log(`[CRD Composer] Found ${relationships.length} relationships`);
        }).catch(error => {
          console.error('[CRD Composer] Failed to analyze relationships:', error);
          setState(currentPrev => ({
            ...currentPrev,
            loading: { ...currentPrev.loading, relationships: false }
          }));
        });
        
        return newState;
      });
    }, []),

    // Canvas controls
    setZoomLevel: useCallback((level: number) => {
      setState(prev => ({ ...prev, zoomLevel: Math.max(0.1, Math.min(3, level)) }));
    }, []),

    resetCanvas: useCallback(() => {
      console.log('[CRD Composer] Resetting canvas');
      setState(prev => ({
        ...prev,
        canvasCRDs: [],
        relationships: [],
        selectedCRD: null,
        draggedCRD: null,
        zoomLevel: 1
      }));
    }, []),

    // Export composition
    exportComposition: useCallback(() => {
      setState(prev => {
        const composition = {
          version: '1.0',
          metadata: {
            name: 'crd-composition',
            created: new Date().toISOString(),
            crdCount: prev.canvasCRDs.length,
            relationshipCount: prev.relationships.length,
            description: `CRD composition with ${prev.canvasCRDs.length} resources`
          },
          crds: prev.canvasCRDs,
          relationships: prev.relationships
        };

        // Create and trigger download
        const blob = new Blob([JSON.stringify(composition, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `crd-composition-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('[CRD Composer] Composition exported');
        
        return prev; // No state change needed
      });
    }, []),

    // Import composition
    importComposition: useCallback((data: any) => {
      try {
        setState(prev => ({
          ...prev,
          canvasCRDs: data.crds || [],
          relationships: data.relationships || [],
          selectedCRD: null,
          draggedCRD: null
        }));
        console.log('[CRD Composer] Composition imported');
      } catch (error) {
        console.error('[CRD Composer] Failed to import composition:', error);
      }
    }, [])
  };

  return { state, actions };
};