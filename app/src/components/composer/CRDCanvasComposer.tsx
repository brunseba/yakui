import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Toolbar,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  ListItemText
} from '@mui/material';
import {
  AccountTree as ComposerIcon,
  Add as AddIcon,
  AutoFixHigh as AutoLayoutIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as FitToViewIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  RestartAlt as ResetIcon,
  GridOn as GridIcon,
  ViewModule as RibbonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Timeline as RelationshipIcon
} from '@mui/icons-material';
import { ComposerCRD } from './types/composer';
import { crdAnalysisService, CRDDependencyEdge, CRDDependencyNode } from '../../services/crd-analysis';

// Extend Window interface for debug properties
declare global {
  interface Window {
    __canvas_debug?: {
      crds: any[];
      relationships: CRDDependencyEdge[];
      loadingRelationships: boolean;
      showRelationships: boolean;
    };
    __debug_relationships?: {
      allEdges: CRDDependencyEdge[];
      relevantEdges: CRDDependencyEdge[];
      canvasCRDs: any[];
      crdMappings: any[];
    };
  }
}
import CRDConnectionLines from './CRDConnectionLines';
import CRDCanvasDetailsPanel from './CRDCanvasDetailsPanel';

interface CRDCanvasComposerProps {
  initialCRDs?: ComposerCRD[];
  readOnly?: boolean;
  onCRDsChange?: (crds: ComposerCRD[]) => void;
  onBack?: () => void;
}

interface GridPosition {
  row: number;
  col: number;
}

interface CRDGridItem {
  id: string;
  name: string;
  kind: string;
  group: string;
  version: string;
  scope: 'Cluster' | 'Namespaced';
  plural: string;
  position: GridPosition;
  isSelected?: boolean;
  schema?: {
    type: string;
    properties: {
      [key: string]: any;
    };
    additionalProperties?: boolean;
  };
}

interface NewCRDDialog {
  open: boolean;
  name: string;
  group: string;
  version: string;
  kind: string;
}

export const CRDCanvasComposer: React.FC<CRDCanvasComposerProps> = ({
  initialCRDs = [],
  readOnly = false,
  onCRDsChange,
  onBack
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [crds, setCRDs] = useState<CRDGridItem[]>([]);
  const [selectedCRD, setSelectedCRD] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [gridSize] = useState({ rows: 8, cols: 12 });
  const [showGrid, setShowGrid] = useState(true);
  
  // Relationship state
  const [relationships, setRelationships] = useState<CRDDependencyEdge[]>([]);
  const [relationshipNodes, setRelationshipNodes] = useState<CRDDependencyNode[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const [showRelationships, setShowRelationships] = useState(true);
  const [relationshipFilter, setRelationshipFilter] = useState<string[]>(['reference', 'dependency', 'composition', 'custom']);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [newCRDDialog, setNewCRDDialog] = useState<NewCRDDialog>({
    open: false,
    name: '',
    group: '',
    version: 'v1',
    kind: ''
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Grid cell size calculation using useMemo to prevent temporal dead zone
  const cellSize = useMemo(() => 120 * zoom, [zoom]);
  const cellGap = useMemo(() => 8 * zoom, [zoom]);
  
  // Drag and drop state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedCRDId: string | null;
    startPosition: { x: number; y: number } | null;
    currentPosition: { x: number; y: number } | null;
  }>({
    isDragging: false,
    draggedCRDId: null,
    startPosition: null,
    currentPosition: null
  });
  
  // Debug: Expose data to window for manual debugging
  useEffect(() => {
    window.__canvas_debug = {
      crds,
      relationships,
      loadingRelationships,
      showRelationships
    };
  }, [crds, relationships, loadingRelationships, showRelationships]);
  
  // Show notification helper (moved here to be available for loadRelationships)
  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  }, []);
  
  // Load CRD-to-CRD relationships using optimized API
  const loadRelationships = useCallback(async (targetCRDs: CRDGridItem[]) => {
    if (targetCRDs.length === 0) {
      setRelationships([]);
      setRelationshipNodes([]);
      return;
    }
    
    setLoadingRelationships(true);
    try {
      console.log('\n🚀 [Canvas] Loading CRD-to-CRD relationships for:', targetCRDs.length, 'CRDs');
      
      // Extract API groups and CRD kinds from the specific CRDs passed (not global crds state)
      const apiGroups = [...new Set(
        targetCRDs.map(crd => crd.group).filter(group => group && group !== 'core')
      )];
      
      const crdKinds = [...new Set(
        targetCRDs.map(crd => crd.kind).filter(Boolean)
      )];
      
      console.log('📊 [Canvas] Analysis parameters:', {
        apiGroups: apiGroups.length,
        crdKinds: crdKinds.length,
        canvasCRDs: targetCRDs.length
      });
      
      // Use the new optimized CRD relationships API
      const relationshipResult = await crdAnalysisService.getCRDRelationships({
        apiGroups: apiGroups.length > 0 ? apiGroups : undefined,
        crds: crdKinds.length > 0 ? crdKinds : undefined,
        maxRelationships: 50, // Reasonable limit for Canvas
        relationshipTypes: ['reference', 'composition', 'dependency'],
        includeMetadata: true
      });
      
      console.log('✅ [Canvas] CRD relationships loaded:', {
        analysisTime: relationshipResult.metadata.analysisTimeMs + 'ms',
        requestTime: relationshipResult.metadata.requestTimeMs + 'ms',
        crdCount: relationshipResult.metadata.crdCount,
        relationshipCount: relationshipResult.metadata.relationshipCount,
        apiGroups: relationshipResult.metadata.apiGroups
      });
      
      // Convert the new relationship format to match the existing Canvas expectations
      const convertedRelationships = relationshipResult.relationships.map(rel => ({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        strength: rel.strength,
        metadata: {
          reason: rel.metadata.reason,
          field: rel.metadata.sourceField,
          confidence: rel.metadata.confidence,
          referenceType: rel.metadata.referenceType,
          schemaVersion: rel.metadata.schemaVersion
        }
      }));
      
      // Convert CRD info to nodes for compatibility
      const convertedNodes = relationshipResult.crds.map(crd => ({
        id: crd.id,
        name: crd.kind,
        kind: crd.kind,
        labels: {
          'api.group': crd.group,
          'crd.scope': crd.scope,
          'dictionary.type': 'crd-definition'
        },
        metadata: {
          name: crd.name,
          group: crd.group,
          version: crd.version
        }
      }));
      
      setRelationships(convertedRelationships);
      setRelationshipNodes(convertedNodes);
      
      // Enhanced debug information
      window.__debug_relationships = {
        originalResponse: relationshipResult,
        convertedRelationships,
        convertedNodes,
        canvasCRDs: targetCRDs,
        performance: {
          analysisTime: relationshipResult.metadata.analysisTimeMs,
          requestTime: relationshipResult.metadata.requestTimeMs,
          totalTime: (relationshipResult.metadata.analysisTimeMs || 0) + (relationshipResult.metadata.requestTimeMs || 0)
        }
      };
      
      console.log(`🎯 [Canvas] SUCCESS: ${convertedRelationships.length} relationships loaded in ${relationshipResult.metadata.requestTimeMs}ms!`);
      
      if (convertedRelationships.length > 0) {
        console.log('🔗 [Canvas] Top relationships:');
        convertedRelationships.slice(0, 3).forEach((rel, i) => {
          const sourceCRD = targetCRDs.find(c => rel.source.includes(c.kind.toLowerCase()));
          const targetCRD = targetCRDs.find(c => rel.target.includes(c.kind.toLowerCase()));
          console.log(`  ${i + 1}. ${sourceCRD?.kind || 'Unknown'} -> ${targetCRD?.kind || 'Unknown'} (${rel.type}, confidence: ${rel.metadata.confidence || 'N/A'})`);
        });
      } else {
        console.log('ℹ️ [Canvas] No relationships found for current CRDs');
      }
    } catch (error) {
      console.error('❌ [Canvas] Failed to load CRD relationships:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timeout')) {
        showNotification(
          'CRD relationship analysis timed out. The backend may be processing a large cluster.', 
          'warning'
        );
      } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        showNotification(
          'Cannot connect to backend API. Make sure the API server is running on port 3001.', 
          'error'
        );
      } else {
        showNotification(`Failed to load CRD relationships: ${errorMessage}`, 'error');
      }
    } finally {
      setLoadingRelationships(false);
    }
  }, [showNotification]);
  
  // Auto-trigger relationship analysis when CRDs change
  useEffect(() => {
    if (crds.length > 0) {
      console.log('[Canvas] Loading relationships for CRDs:', crds.map(c => `${c.group}/${c.kind}`));
      // Pass the actual CRDs instead of trying to create IDs
      loadRelationships(crds);
    } else {
      setRelationships([]);
      setRelationshipNodes([]);
    }
  }, [crds, loadRelationships]);
  
  // Handle relationship filter changes
  const handleFilterChange = useCallback((type: string) => {
    setRelationshipFilter(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);
  
  // Get available relationship types from current relationships
  const availableRelationshipTypes = useMemo(() => {
    const types = new Set(relationships.map(rel => rel.type.toLowerCase()));
    return Array.from(types);
  }, [relationships]);

  // Initialize CRDs with grid positions
  useEffect(() => {
    if (initialCRDs.length > 0) {
      const gridCRDs: CRDGridItem[] = initialCRDs.map((crd, index) => ({
        id: crd.id,
        name: crd.name,
        kind: crd.kind,
        group: crd.group,
        version: crd.version,
        scope: crd.scope,
        plural: crd.plural,
        position: {
          row: Math.floor(index / gridSize.cols),
          col: index % gridSize.cols
        },
        isSelected: false,
        schema: crd.schema ? {
          type: 'object',
          properties: crd.schema.properties.reduce((acc, prop) => {
            acc[prop.name] = {
              type: prop.type,
              description: prop.description
            };
            return acc;
          }, {} as { [key: string]: any }),
          additionalProperties: crd.schema.additionalProperties
        } : {
          type: 'object',
          properties: {}
        }
      }));
      setCRDs(gridCRDs);
    } else {
      // Load sample CNPG CRDs for immediate testing
      const sampleCRDs: CRDGridItem[] = [
        {
          id: 'sample-cluster',
          name: 'clusters.postgresql.cnpg.io',
          group: 'postgresql.cnpg.io',
          version: 'v1',
          kind: 'Cluster',
          plural: 'clusters',
          scope: 'Namespaced',
          schema: {
            type: 'object',
            properties: {
              spec: {
                type: 'object',
                properties: {
                  postgresql: {
                    type: 'object',
                    properties: {
                      parameters: { type: 'object', description: 'PostgreSQL configuration parameters' },
                      pg_hba: { type: 'array', description: 'PostgreSQL host-based authentication rules' },
                      ldap: { type: 'object', description: 'LDAP configuration for authentication' }
                    }
                  },
                  bootstrap: {
                    type: 'object', 
                    properties: {
                      initdb: { type: 'object', description: 'Database initialization configuration' },
                      recovery: { type: 'object', description: 'Recovery configuration from backup' }
                    }
                  },
                  instances: { type: 'integer', description: 'Number of PostgreSQL instances', required: true },
                  primaryUpdateStrategy: { type: 'string', description: 'Update strategy for primary instance' },
                  monitoring: {
                    type: 'object',
                    properties: {
                      enabled: { type: 'boolean', description: 'Enable monitoring' },
                      prometheusRule: { type: 'object', description: 'Prometheus rule configuration' }
                    }
                  }
                }
              },
              status: {
                type: 'object',
                properties: {
                  phase: { type: 'string', description: 'Current cluster phase' },
                  instances: { type: 'integer', description: 'Number of running instances' },
                  readyInstances: { type: 'integer', description: 'Number of ready instances' },
                  currentPrimary: { type: 'string', description: 'Current primary instance name' },
                  targetPrimary: { type: 'string', description: 'Target primary instance name' }
                }
              }
            }
          },
          position: { row: 1, col: 1 },
          isSelected: false
        },
        {
          id: 'sample-backup',
          name: 'backups.postgresql.cnpg.io',
          group: 'postgresql.cnpg.io',
          version: 'v1',
          kind: 'Backup',
          plural: 'backups',
          scope: 'Namespaced',
          schema: {
            type: 'object', 
            properties: {
              spec: {
                type: 'object',
                properties: {
                  cluster: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Name of the PostgreSQL cluster to backup', required: true }
                    }
                  },
                  target: { type: 'string', description: 'Backup target (primary or prefer-standby)' },
                  method: { type: 'string', description: 'Backup method (barmanObjectStore or volumeSnapshot)' },
                  retentionPolicy: { type: 'string', description: 'How long to retain this backup' },
                  online: { type: 'boolean', description: 'Whether backup should be taken online' }
                }
              },
              status: {
                type: 'object',
                properties: {
                  phase: { type: 'string', description: 'Current backup phase' },
                  startedAt: { type: 'string', description: 'Backup start timestamp' },
                  stoppedAt: { type: 'string', description: 'Backup completion timestamp' },
                  beginWal: { type: 'string', description: 'Starting WAL location' },
                  endWal: { type: 'string', description: 'Ending WAL location' },
                  instanceID: { type: 'object', description: 'Instance ID information' }
                }
              }
            }
          },
          position: { row: 1, col: 3 },
          isSelected: false
        },
        {
          id: 'sample-pooler',
          name: 'poolers.postgresql.cnpg.io',
          group: 'postgresql.cnpg.io',
          version: 'v1',
          kind: 'Pooler',
          plural: 'poolers',
          scope: 'Namespaced',
          schema: {
            type: 'object',
            properties: {
              spec: {
                type: 'object',
                properties: {
                  cluster: {
                    type: 'object', 
                    properties: {
                      name: { type: 'string', description: 'Name of the PostgreSQL cluster', required: true }
                    }
                  },
                  instances: { type: 'integer', description: 'Number of pooler instances' },
                  type: { type: 'string', description: 'Type of pooler (rw, ro, or rw-split)' },
                  pgbouncer: {
                    type: 'object',
                    properties: {
                      poolMode: { type: 'string', description: 'PgBouncer pool mode (session, transaction, or statement)' },
                      parameters: { type: 'object', description: 'PgBouncer configuration parameters' },
                      authQuery: { type: 'string', description: 'Authentication query for user validation' }
                    }
                  },
                  monitoring: {
                    type: 'object',
                    properties: {
                      enabled: { type: 'boolean', description: 'Enable monitoring for pooler' }
                    }
                  }
                }
              },
              status: {
                type: 'object',
                properties: {
                  instances: { type: 'integer', description: 'Number of running pooler instances' },
                  secrets: { type: 'object', description: 'Generated secrets information' }
                }
              }
            }
          },
          position: { row: 2, col: 2 },
          isSelected: false
        },
        {
          id: 'sample-scheduledbackup',
          name: 'scheduledbackups.postgresql.cnpg.io',
          group: 'postgresql.cnpg.io',
          version: 'v1',
          kind: 'ScheduledBackup',
          plural: 'scheduledbackups',
          scope: 'Namespaced',
          schema: {
            type: 'object',
            properties: {
              spec: {
                type: 'object',
                properties: {
                  schedule: { type: 'string', description: 'Cron schedule for backups', required: true },
                  backupOwnerReference: { type: 'string', description: 'Owner reference policy for created backups' },
                  cluster: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Name of the PostgreSQL cluster', required: true }
                    }
                  },
                  target: { type: 'string', description: 'Backup target (primary or prefer-standby)' },
                  method: { type: 'string', description: 'Backup method (barmanObjectStore or volumeSnapshot)' },
                  retentionPolicy: { type: 'string', description: 'How long to retain scheduled backups' },
                  suspend: { type: 'boolean', description: 'Whether to suspend scheduled backups' }
                }
              },
              status: {
                type: 'object',
                properties: {
                  lastCheckTime: { type: 'string', description: 'Last time the schedule was checked' },
                  lastScheduleTime: { type: 'string', description: 'Last time a backup was scheduled' },
                  nextScheduleTime: { type: 'string', description: 'Next scheduled backup time' }
                }
              }
            }
          },
          position: { row: 0, col: 2 },
          isSelected: false
        }
      ];
      
      console.log('[Canvas] Loading sample CNPG CRDs for testing');
      setCRDs(sampleCRDs);
      showNotification('Sample CNPG CRDs loaded - try dragging them around!', 'info');
    }
  }, [initialCRDs, gridSize.cols]);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleFitToView = useCallback(() => {
    setZoom(1);
  }, []);

  // Handle auto layout
  const handleAutoLayout = useCallback(() => {
    const layoutCRDs = [...crds];
    layoutCRDs.forEach((crd, index) => {
      crd.position = {
        row: Math.floor(index / gridSize.cols),
        col: index % gridSize.cols
      };
    });
    setCRDs(layoutCRDs);
    showNotification('Grid layout applied', 'success');
  }, [crds, gridSize.cols, showNotification]);
  
  // Handle relationship-aware auto layout
  const handleAutoLayoutWithRelationships = useCallback(() => {
    if (relationships.length === 0) {
      // Fall back to grid layout if no relationships
      const layoutCRDs = [...crds];
      layoutCRDs.forEach((crd, index) => {
        crd.position = {
          row: Math.floor(index / gridSize.cols),
          col: index % gridSize.cols
        };
      });
      setCRDs(layoutCRDs);
      showNotification('Grid layout applied', 'success');
      return;
    }
    
    console.log('[Canvas] Applying relationship-aware layout');
    
    // Create force-directed layout nodes
    const nodes = crds.map(crd => ({
      ...crd,
      x: crd.position?.col || 0,
      y: crd.position?.row || 0,
      vx: 0,
      vy: 0
    }));
    
    // Simple force simulation (50 iterations)
    for (let iteration = 0; iteration < 50; iteration++) {
      // Apply attractive forces for relationships
      relationships.forEach(rel => {
        const source = nodes.find(n => 
          rel.source.toLowerCase().includes(n.kind.toLowerCase()) ||
          n.kind.toLowerCase().includes(rel.source.toLowerCase())
        );
        const target = nodes.find(n => 
          rel.target.toLowerCase().includes(n.kind.toLowerCase()) ||
          n.kind.toLowerCase().includes(rel.target.toLowerCase())
        );
        
        if (source && target && source !== target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Desired distance based on relationship strength
          const desiredDistance = rel.strength === 'strong' ? 1.5 : 2.5;
          const force = (distance - desiredDistance) * 0.1;
          
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;
          
          source.vx += forceX;
          source.vy += forceY;
          target.vx -= forceX;
          target.vy -= forceY;
        }
      });
      
      // Apply repulsive forces between all nodes
      nodes.forEach(nodeA => {
        nodes.forEach(nodeB => {
          if (nodeA !== nodeB) {
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
            
            if (distance < 3) { // Only repel if too close
              const repulsionForce = 0.5 / (distance * distance);
              const forceX = (dx / distance) * repulsionForce;
              const forceY = (dy / distance) * repulsionForce;
              
              nodeA.vx -= forceX;
              nodeA.vy -= forceY;
              nodeB.vx += forceX;
              nodeB.vy += forceY;
            }
          }
        });
      });
      
      // Update positions with damping
      nodes.forEach(node => {
        node.x += node.vx * 0.1;
        node.y += node.vy * 0.1;
        node.vx *= 0.8; // Damping
        node.vy *= 0.8;
        
        // Keep nodes within grid bounds
        node.x = Math.max(0, Math.min(gridSize.cols - 1, node.x));
        node.y = Math.max(0, Math.min(gridSize.rows - 1, node.y));
      });
    }
    
    // Apply new positions
    const updatedCRDs = crds.map(crd => {
      const node = nodes.find(n => n.id === crd.id);
      return {
        ...crd,
        position: { 
          row: Math.round(node?.y || 0), 
          col: Math.round(node?.x || 0) 
        }
      };
    });
    
    setCRDs(updatedCRDs);
    showNotification(`Relationship layout applied (${relationships.length} connections)`, 'success');
  }, [crds, relationships, gridSize, showNotification]);

  // Handle add new CRD
  const handleAddCRD = useCallback(() => {
    setNewCRDDialog({
      open: true,
      name: '',
      group: 'example.com',
      version: 'v1',
      kind: ''
    });
  }, []);

  const handleCreateCRD = useCallback(() => {
    const { name, group, version, kind } = newCRDDialog;
    
    if (!group || !kind) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Find empty position
    const occupiedPositions = new Set(crds.map(crd => `${crd.position.row}-${crd.position.col}`));
    let position: GridPosition = { row: 0, col: 0 };
    
    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        if (!occupiedPositions.has(`${row}-${col}`)) {
          position = { row, col };
          break;
        }
      }
      if (position.row !== 0 || position.col !== 0) break;
    }

    const newCRD: CRDGridItem = {
      id: `crd-${Date.now()}`,
      name: name || `${kind.toLowerCase()}s.${group}`,
      group,
      version,
      kind,
      plural: `${kind.toLowerCase()}s`,
      scope: 'Namespaced',
      schema: {
        type: 'object',
        properties: {
          spec: {
            type: 'object',
            properties: {}
          },
          status: {
            type: 'object',
            properties: {}
          }
        }
      },
      position,
      isSelected: false
    };

    const updatedCRDs = [...crds, newCRD];
    setCRDs(updatedCRDs);
    setNewCRDDialog({
      open: false,
      name: '',
      group: '',
      version: 'v1',
      kind: ''
    });
    showNotification(`CRD "${kind}" created successfully`, 'success');
    
    // Immediately trigger relationship analysis for the updated CRD list
    console.log('[Canvas] Triggering relationships for new CRD:', `${group}/${kind}`);
    setTimeout(() => loadRelationships(updatedCRDs), 100); // Small delay to ensure state is updated
  }, [newCRDDialog, crds, gridSize, showNotification]);

  // Handle CRD selection
  const handleCRDSelect = useCallback((crdId: string) => {
    setSelectedCRD(crdId);
    setCRDs(prev => prev.map(crd => ({
      ...crd,
      isSelected: crd.id === crdId
    })));
  }, []);

  // Handle CRD delete
  const handleCRDDelete = useCallback((crdId: string) => {
    setCRDs(prev => prev.filter(crd => crd.id !== crdId));
    if (selectedCRD === crdId) {
      setSelectedCRD(null);
    }
    showNotification('CRD deleted', 'success');
  }, [selectedCRD, showNotification]);


  // Handle notification close
  const handleNotificationClose = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);
  
  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.MouseEvent, crdId: string) => {
    if (readOnly) return;
    
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    
    setDragState({
      isDragging: true,
      draggedCRDId: crdId,
      startPosition: { x: startX, y: startY },
      currentPosition: { x: startX, y: startY }
    });
    
    // Add global mouse move and up listeners
    const handleMouseMove = (e: MouseEvent) => {
      setDragState(prev => ({
        ...prev,
        currentPosition: { x: e.clientX, y: e.clientY }
      }));
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const relativeX = e.clientX - canvasRect.left;
      const relativeY = e.clientY - canvasRect.top;
      
      // Calculate grid position
      const newCol = Math.max(0, Math.min(gridSize.cols - 1, Math.floor(relativeX / (cellSize + cellGap))));
      const newRow = Math.max(0, Math.min(gridSize.rows - 1, Math.floor(relativeY / (cellSize + cellGap))));
      
      // Check if position is occupied
      const isOccupied = crds.some(crd => 
        crd.id !== crdId && 
        crd.position.row === newRow && 
        crd.position.col === newCol
      );
      
      if (!isOccupied) {
        // Update CRD position
        setCRDs(prev => prev.map(crd => 
          crd.id === crdId 
            ? { ...crd, position: { row: newRow, col: newCol } }
            : crd
        ));
        showNotification(`Moved ${crds.find(c => c.id === crdId)?.kind} to (${newRow}, ${newCol})`, 'success');
      } else {
        showNotification('Position occupied - move cancelled', 'warning');
      }
      
      // Reset drag state
      setDragState({
        isDragging: false,
        draggedCRDId: null,
        startPosition: null,
        currentPosition: null
      });
      
      // Remove global listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [readOnly, cellSize, cellGap, gridSize, crds, showNotification]);
  
  // Handle drag over canvas (for visual feedback)
  const getDropPreviewPosition = useCallback(() => {
    if (!dragState.isDragging || !dragState.currentPosition || !canvasRef.current) {
      return null;
    }
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const relativeX = dragState.currentPosition.x - canvasRect.left;
    const relativeY = dragState.currentPosition.y - canvasRect.top;
    
    const col = Math.max(0, Math.min(gridSize.cols - 1, Math.floor(relativeX / (cellSize + cellGap))));
    const row = Math.max(0, Math.min(gridSize.rows - 1, Math.floor(relativeY / (cellSize + cellGap))));
    
    // Check if position is occupied
    const isOccupied = crds.some(crd => 
      crd.id !== dragState.draggedCRDId && 
      crd.position.row === row && 
      crd.position.col === col
    );
    
    return { row, col, isOccupied };
  }, [dragState, cellSize, cellGap, gridSize, crds]);

  // Export CRDs
  const handleExport = useCallback(() => {
    const exportData = {
      crds: crds.map(({ position, isSelected, ...crd }) => crd),
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crd-composition.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('CRD composition exported', 'success');
  }, [crds, showNotification]);

  // Reset canvas
  const handleReset = useCallback(() => {
    setCRDs([]);
    setSelectedCRD(null);
    showNotification('Canvas reset', 'info');
  }, []);


  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      {/* Main layout with sidebar */}
      {/* Header with Ribbon */}
      <Paper elevation={1} sx={{ zIndex: 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {onBack && (
            <Tooltip title="Back to Mode Selection">
              <IconButton onClick={onBack} sx={{ mr: 1 }}>
                <BackIcon />
              </IconButton>
            </Tooltip>
          )}
          <ComposerIcon sx={{ mr: 2 }} color="info" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            CRD Canvas Composer
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            📐 Phase 2: Visual Grid Designer
          </Typography>
          
          {/* Ribbon Controls */}
          <Tooltip title="Add CRD">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCRD}
              disabled={readOnly}
              size="small"
            >
              Add CRD
            </Button>
          </Tooltip>
          
          <Tooltip title="Grid Layout">
            <IconButton onClick={handleAutoLayout} disabled={readOnly}>
              <AutoLayoutIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Relationship Layout">
            <IconButton 
              onClick={handleAutoLayoutWithRelationships} 
              disabled={readOnly || relationships.length === 0}
              color={relationships.length > 0 ? 'primary' : 'default'}
            >
              <RelationshipIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Toggle Grid">
            <IconButton 
              onClick={() => setShowGrid(!showGrid)}
              color={showGrid ? 'primary' : 'default'}
            >
              <GridIcon />
            </IconButton>
          </Tooltip>
          
          <Box sx={{ display: 'flex', gap: 0.5, borderLeft: 1, borderColor: 'divider', pl: 1, ml: 1 }}>
            <Tooltip title="Toggle Relationships">
              <IconButton 
                onClick={() => setShowRelationships(!showRelationships)}
                color={showRelationships ? 'primary' : 'default'}
                size="small"
              >
                <ComposerIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Relationships">
              <IconButton 
                onClick={() => loadRelationships(crds.map(crd => crd.kind || crd.id))}
                disabled={loadingRelationships}
                size="small"
              >
                {loadingRelationships ? <CircularProgress size={16} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Filter Relationships">
              <IconButton 
                onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                size="small"
                color={relationshipFilter.length < 3 ? 'primary' : 'default'}
              >
                <FilterIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, borderLeft: 1, borderColor: 'divider', pl: 1, ml: 1 }}>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn} size="small">
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut} size="small">
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Fit to View">
              <IconButton onClick={handleFitToView} size="small">
                <FitToViewIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, borderLeft: 1, borderColor: 'divider', pl: 1, ml: 1 }}>
            <Tooltip title="Export">
              <IconButton onClick={handleExport} size="small">
                <ExportIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Reset">
              <IconButton onClick={handleReset} disabled={readOnly} size="small">
                <ResetIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas Area */}
        <Box
          ref={canvasRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            cursor: dragState.isDragging ? 'grabbing' : 'default',
            userSelect: 'none' // Prevent text selection during drag
          }}
        >
        {/* Grid Background */}
        {showGrid && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${gridSize.cols * (cellSize + cellGap)}px`,
              height: `${gridSize.rows * (cellSize + cellGap)}px`,
              backgroundImage: `
                linear-gradient(to right, ${theme.palette.divider} 1px, transparent 1px),
                linear-gradient(to bottom, ${theme.palette.divider} 1px, transparent 1px)
              `,
              backgroundSize: `${cellSize + cellGap}px ${cellSize + cellGap}px`,
              opacity: 0.3,
              pointerEvents: 'none'
            }}
          />
        )}
        
        {/* Connection Lines Layer */}
        <CRDConnectionLines 
          relationships={relationships}
          canvasCRDs={crds}
          canvasState={{
            zoom,
            cellSize,
            cellGap
          }}
          showRelationships={showRelationships}
          relationshipFilter={relationshipFilter}
        />

        {/* Drag Preview */}
        {dragState.isDragging && (() => {
          const previewPos = getDropPreviewPosition();
          return previewPos ? (
            <Box
              sx={{
                position: 'absolute',
                left: previewPos.col * (cellSize + cellGap) + cellGap,
                top: previewPos.row * (cellSize + cellGap) + cellGap,
                width: cellSize - cellGap,
                height: cellSize - cellGap,
                border: `2px dashed ${previewPos.isOccupied ? theme.palette.error.main : theme.palette.primary.main}`,
                borderRadius: 1,
                bgcolor: previewPos.isOccupied ? 
                  `${theme.palette.error.main}20` : 
                  `${theme.palette.primary.main}20`,
                pointerEvents: 'none',
                zIndex: 1000
              }}
            />
          ) : null;
        })()}
        
        {/* CRD Items */}
        {crds.map((crd) => {
          const isDragged = dragState.draggedCRDId === crd.id;
          const dragOffset = isDragged && dragState.startPosition && dragState.currentPosition ? {
            x: dragState.currentPosition.x - dragState.startPosition.x,
            y: dragState.currentPosition.y - dragState.startPosition.y
          } : { x: 0, y: 0 };
          
          return (
          <Tooltip 
            key={crd.id}
            title={readOnly ? `${crd.kind} (Read Only)` : `${crd.kind} - Click to select, drag to move`}
            arrow
            placement="top"
          >
            <Card
              sx={{
                position: 'absolute',
                left: crd.position.col * (cellSize + cellGap) + cellGap + (isDragged ? dragOffset.x : 0),
                top: crd.position.row * (cellSize + cellGap) + cellGap + (isDragged ? dragOffset.y : 0),
                width: cellSize - cellGap,
                height: cellSize - cellGap,
                cursor: readOnly ? 'pointer' : (isDragged ? 'grabbing' : 'grab'),
                transition: isDragged ? 'none' : 'all 0.2s ease',
                transform: crd.isSelected ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isDragged ? theme.shadows[12] : 
                           crd.isSelected ? theme.shadows[8] : theme.shadows[2],
                borderColor: crd.isSelected ? theme.palette.primary.main : 'transparent',
                borderWidth: 2,
                borderStyle: 'solid',
                opacity: isDragged ? 0.8 : 1,
                zIndex: isDragged ? 1001 : 1,
                '&:hover': !isDragged ? {
                  transform: 'scale(1.02)',
                  boxShadow: theme.shadows[4]
                } : {}
              }}
              onClick={() => !isDragged && handleCRDSelect(crd.id)}
              onMouseDown={(e) => handleDragStart(e, crd.id)}
            >
            <CardContent sx={{ 
              p: 1, 
              '&:last-child': { pb: 1 },
              userSelect: 'none' // Prevent text selection during drag
            }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {crd.kind}
              </Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {crd.group}/{crd.version}
              </Typography>
              
              <Chip
                label={crd.scope}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, fontSize: '0.6rem', height: 16 }}
              />
            </CardContent>
            
            <CardActions sx={{ p: 0.5, pt: 0, justifyContent: 'space-between' }}>
              <IconButton size="small" disabled={readOnly}>
                <EditIcon fontSize="small" />
              </IconButton>
              
              <IconButton size="small" disabled={readOnly}>
                <LinkIcon fontSize="small" />
              </IconButton>
              
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCRDDelete(crd.id);
                }}
                disabled={readOnly}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
            </Card>
          </Tooltip>
          );
        })}

        {/* Empty State - only shows if user clears all CRDs */}
        {crds.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: 400
            }}
          >
            <ComposerIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" gutterBottom>
              Canvas Composer
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The canvas is empty. Add CRDs to start building relationships and test drag & drop functionality.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddCRD}
              disabled={readOnly}
              sx={{ mb: 2 }}
            >
              Add CRD
            </Button>
            <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
              💡 Tip: Refresh the page to reload sample CNPG CRDs for testing
            </Typography>
          </Box>
        )}
        </Box>
        
        {/* Right Ribbon - Details Panel */}
        <Box sx={{ width: 360, borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <CRDCanvasDetailsPanel
            selectedCRD={crds.find(c => c.id === selectedCRD) || null}
            relationships={relationships}
            canvasCRDs={crds}
            loadingRelationships={loadingRelationships}
            onCRDSelect={(crd) => handleCRDSelect(crd.id)}
          />
        </Box>
      </Box>

      {/* Status Bar */}
      <Paper elevation={1} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'grey.100', zIndex: 1 }}>
        <Typography variant="caption">
          CRDs: {crds.length} | Relations: {relationships.length} | Zoom: {Math.round(zoom * 100)}%
          {!readOnly && crds.length > 0 && ' | 🖱️ Click and drag CRDs to move them around!'}
        </Typography>
        
        {dragState.isDragging && (
          <Chip
            label={`Dragging ${crds.find(c => c.id === dragState.draggedCRDId)?.kind}`}
            size="small"
            color="primary"
            variant="filled"
          />
        )}
        
        {relationships.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`${relationships.filter(r => r.type === 'reference').length} refs`}
              size="small" 
              color="primary"
              variant="outlined"
            />
            <Chip 
              label={`${relationships.filter(r => r.type === 'dependency').length} deps`}
              size="small"
              color="warning" 
              variant="outlined"
            />
          </Box>
        )}
        
        {selectedCRD && (
          <Chip
            label={`Selected: ${crds.find(c => c.id === selectedCRD)?.kind || 'Unknown'}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Paper>

      {/* New CRD Dialog */}
      <Dialog 
        open={newCRDDialog.open} 
        onClose={() => setNewCRDDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New CRD</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Kind *"
              value={newCRDDialog.kind}
              onChange={(e) => setNewCRDDialog(prev => ({ ...prev, kind: e.target.value }))}
              placeholder="e.g., Application, Database, Service"
              fullWidth
            />
            
            <TextField
              label="API Group *"
              value={newCRDDialog.group}
              onChange={(e) => setNewCRDDialog(prev => ({ ...prev, group: e.target.value }))}
              placeholder="e.g., example.com, apps.mycompany.io"
              fullWidth
            />
            
            <TextField
              label="Version"
              value={newCRDDialog.version}
              onChange={(e) => setNewCRDDialog(prev => ({ ...prev, version: e.target.value }))}
              placeholder="e.g., v1, v1beta1"
              fullWidth
            />
            
            <TextField
              label="Name (optional)"
              value={newCRDDialog.name}
              onChange={(e) => setNewCRDDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Auto-generated from kind"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCRDDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateCRD}>
            Create CRD
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Relationship Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Relationship Types
          </Typography>
        </MenuItem>
        {availableRelationshipTypes.map(type => (
          <MenuItem
            key={type}
            onClick={() => handleFilterChange(type)}
            dense
          >
            <Checkbox
              checked={relationshipFilter.includes(type)}
              size="small"
            />
            <ListItemText 
              primary={type.charAt(0).toUpperCase() + type.slice(1)}
              secondary={`${relationships.filter(r => r.type.toLowerCase() === type).length} found`}
            />
          </MenuItem>
        ))}
        {availableRelationshipTypes.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No relationships to filter
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};