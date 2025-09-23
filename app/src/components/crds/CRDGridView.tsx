import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  CircularProgress,
  Drawer,
  Divider,
  Collapse,
  Avatar,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  Extension as CRDIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  DragHandle as DragIcon,
  ExpandLess,
  ExpandMore,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as FitToViewIcon,
  AutoFixHigh as AutoLayoutIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  RestartAlt as ResetIcon,
  Computer as CoreIcon,
  Apps as AppsIcon,
  Security as SecurityIcon,
  Router as NetworkIcon,
  Storage as StorageIcon,
  Extension as ExtensionIcon,
  ViewList as InstancesIcon,
  Visibility as ViewIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { crdAnalysisService, CRDApiGroup, CRDDependencyNode } from '../../services/crd-analysis';

// Canvas-specific interfaces for Phase 2
interface ComposerCRD {
  id: string;
  name: string;
  group: string;
  version: string;
  kind: string;
  plural: string;
  scope: 'Namespaced' | 'Cluster';
  schema?: any;
  description?: string;
  creationTimestamp?: string;
  status?: 'Active' | 'Establishing' | 'Terminating';
  instances?: number;
  position?: { x: number; y: number };
  isOnCanvas?: boolean;
}

interface CRDConnection {
  id: string;
  sourceCRDId: string;
  targetCRDId: string;
  type: 'reference' | 'dependency' | 'composition' | 'weak';
  strength: 'strong' | 'weak';
  metadata: {
    field?: string;
    reason: string;
    path?: string;
  };
}

interface CanvasState {
  selectedCRD: ComposerCRD | null;
  draggedCRD: ComposerCRD | null;
  zoom: number;
  pan: { x: number; y: number };
  gridSize: number;
  showGrid: boolean;
}

// Canvas layout constants
const CANVAS_CONSTANTS = {
  LEFT_RIBBON_WIDTH: 320,
  RIGHT_RIBBON_WIDTH: 320,
  TOOLBAR_HEIGHT: 64,
  CRD_NODE_WIDTH: 200,
  CRD_NODE_HEIGHT: 120,
  GRID_SIZE: 20,
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 2,
  ZOOM_STEP: 0.1
};

// Helper function to convert CRD API Group data to ComposerCRD
const convertApiGroupCRDsToComposerCRDs = (apiGroups: CRDApiGroup[]): ComposerCRD[] => {
  const composerCRDs: ComposerCRD[] = [];
  
  apiGroups.forEach(group => {
    group.crds.forEach(crd => {
      composerCRDs.push({
        id: `${crd.name}.${group.group}`,
        name: crd.name,
        group: group.group,
        version: group.versions[0] || 'v1',
        kind: crd.kind,
        plural: crd.name,
        scope: crd.scope as 'Namespaced' | 'Cluster',
        description: `${crd.kind} resource from ${group.group} API group`,
        status: 'Active',
        isOnCanvas: false
      });
    });
  });
  
  return composerCRDs;
};

// Helper function to convert CRD Dependency Nodes to ComposerCRD
const convertDependencyNodeToComposerCRD = (node: CRDDependencyNode): ComposerCRD => {
  // Extract group from the name (e.g., "applications.example.com" -> "example.com")
  const nameParts = node.name.split('.');
  const kind = node.kind;
  const group = nameParts.length > 1 ? nameParts.slice(1).join('.') : 'core';
  
  return {
    id: node.id,
    name: node.name,
    group,
    version: 'v1', // Default, could be extracted from metadata if available
    kind,
    plural: node.name,
    scope: node.metadata?.scope === 'Cluster' ? 'Cluster' : 'Namespaced',
    description: `${kind} custom resource`,
    status: 'Active',
    isOnCanvas: false
  };
};

interface FilterOptions {
  search: string;
  scope: 'all' | 'Namespaced' | 'Cluster';
  group: string;
  status: 'all' | 'Active' | 'Establishing' | 'Terminating';
}

interface CRDCanvasViewProps {
  initialCRDs?: ComposerCRD[];
  readOnly?: boolean;
  onCRDSelect?: (crd: ComposerCRD) => void;
  onCRDCreate?: () => void;
}

// Mock data for demonstration
const mockCRDs: CRD[] = [
  {
    id: 'applications.example.com',
    name: 'applications.example.com',
    group: 'example.com',
    version: 'v1',
    kind: 'Application',
    plural: 'applications',
    scope: 'Namespaced',
    description: 'Represents application deployments with custom configurations',
    creationTimestamp: '2024-12-20T10:00:00Z',
    status: 'Active'
  },
  {
    id: 'databases.mysql.com',
    name: 'databases.mysql.com',
    group: 'mysql.com',
    version: 'v1beta1',
    kind: 'Database',
    plural: 'databases',
    scope: 'Namespaced',
    description: 'MySQL database instances with automated backup and recovery',
    creationTimestamp: '2024-12-19T15:30:00Z',
    status: 'Active'
  },
  {
    id: 'certificates.cert-manager.io',
    name: 'certificates.cert-manager.io',
    group: 'cert-manager.io',
    version: 'v1',
    kind: 'Certificate',
    plural: 'certificates',
    scope: 'Namespaced',
    description: 'TLS certificates managed by cert-manager',
    creationTimestamp: '2024-12-18T09:15:00Z',
    status: 'Active'
  },
  {
    id: 'clusterissuers.cert-manager.io',
    name: 'clusterissuers.cert-manager.io',
    group: 'cert-manager.io',
    version: 'v1',
    kind: 'ClusterIssuer',
    plural: 'clusterissuers',
    scope: 'Cluster',
    description: 'Cluster-wide certificate issuers',
    creationTimestamp: '2024-12-17T14:45:00Z',
    status: 'Active'
  },
  {
    id: 'workflows.argoproj.io',
    name: 'workflows.argoproj.io',
    group: 'argoproj.io',
    version: 'v1alpha1',
    kind: 'Workflow',
    plural: 'workflows',
    scope: 'Namespaced',
    description: 'Argo Workflows for complex job orchestration',
    creationTimestamp: '2024-12-16T11:20:00Z',
    status: 'Active'
  },
  {
    id: 'virtualmachines.kubevirt.io',
    name: 'virtualmachines.kubevirt.io',
    group: 'kubevirt.io',
    version: 'v1',
    kind: 'VirtualMachine',
    plural: 'virtualmachines',
    scope: 'Namespaced',
    description: 'Virtual machines running on Kubernetes',
    creationTimestamp: '2024-12-15T08:30:00Z',
    status: 'Establishing'
  }
];

export const CRDGridView: React.FC<CRDCanvasViewProps> = ({
  initialCRDs,
  readOnly = false,
  onCRDSelect,
  onCRDCreate
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Main state
  const [availableCRDs, setAvailableCRDs] = useState<ComposerCRD[]>(initialCRDs || []);
  const [canvasCRDs, setCanvasCRDs] = useState<ComposerCRD[]>([]);
  const [connections, setConnections] = useState<CRDConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Canvas state
  const [canvasState, setCanvasState] = useState<CanvasState>({
    selectedCRD: null,
    draggedCRD: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridSize: CANVAS_CONSTANTS.GRID_SIZE,
    showGrid: true
  });
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    scope: 'all',
    group: '',
    status: 'all'
  });
  
  // API Group expansion state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Load CRDs from Dictionary API endpoints
  const loadCRDs = useCallback(async () => {
    if (initialCRDs && initialCRDs.length > 0) {
      setAvailableCRDs(initialCRDs);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Canvas] Loading CRDs from Dictionary API endpoints...');
      
      // Try to get CRDs from API groups endpoint first
      try {
        const apiGroups = await crdAnalysisService.getApiGroups();
        console.log('[Canvas] Loaded CRD API groups:', apiGroups.length);
        const crdList = convertApiGroupCRDsToComposerCRDs(apiGroups);
        setAvailableCRDs(crdList);
        console.log('[Canvas] Converted to ComposerCRDs:', crdList.length);
        return;
      } catch (apiGroupError) {
        console.warn('[Canvas] API groups endpoint failed, trying enhanced analysis:', apiGroupError);
        
        // Fallback to enhanced CRD analysis
        const analysisResult = await crdAnalysisService.getEnhancedCRDAnalysis({
          includeNativeResources: false, // Only custom resources
          maxCRDs: 100
        });
        console.log('[Canvas] Enhanced analysis nodes:', analysisResult.nodes.length);
        
        // Filter nodes to only include CRD definitions
        const crdNodes = analysisResult.nodes.filter(node => 
          node.kind && node.name && !node.kind.toLowerCase().includes('field')
        );
        
        const crdList = crdNodes.map(convertDependencyNodeToComposerCRD);
        setAvailableCRDs(crdList);
        console.log('[Canvas] Converted CRD nodes to ComposerCRDs:', crdList.length);
      }
    } catch (err) {
      console.error('[Canvas] Failed to load CRDs from Dictionary APIs:', err);
      setError(`Failed to load CRDs from Dictionary: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Fallback to mock data
      console.log('[Canvas] Using fallback mock data');
      setAvailableCRDs(mockCRDs.map(crd => ({ ...crd, isOnCanvas: false })));
    } finally {
      setLoading(false);
    }
  }, [initialCRDs]);

  useEffect(() => {
    loadCRDs();
  }, [loadCRDs]);

  // Get unique groups for filter
  const uniqueGroups = Array.from(new Set(availableCRDs.map(crd => crd.group))).sort();

  // Filter available CRDs
  const filteredAvailableCRDs = availableCRDs.filter(crd => {
    if (crd.isOnCanvas) return false; // Don't show CRDs that are already on canvas
    
    const matchesSearch = !filters.search || 
      crd.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      crd.kind.toLowerCase().includes(filters.search.toLowerCase()) ||
      crd.group.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesScope = filters.scope === 'all' || crd.scope === filters.scope;
    const matchesGroup = !filters.group || crd.group === filters.group;
    const matchesStatus = filters.status === 'all' || crd.status === filters.status;
    
    return matchesSearch && matchesScope && matchesGroup && matchesStatus;
  });

  // Group CRDs by API group
  const groupedCRDs = filteredAvailableCRDs.reduce((groups, crd) => {
    const group = crd.group || 'core';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(crd);
    return groups;
  }, {} as Record<string, ComposerCRD[]>);

  // Sort groups alphabetically, with 'core' first
  const sortedGroups = Object.keys(groupedCRDs).sort((a, b) => {
    if (a === 'core') return -1;
    if (b === 'core') return 1;
    return a.localeCompare(b);
  });

  // Handle API group expansion
  const handleGroupToggle = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Auto-expand groups when there are few CRDs
  React.useEffect(() => {
    if (sortedGroups.length <= 3) {
      setExpandedGroups(new Set(sortedGroups));
    }
  }, [sortedGroups.join(',')]);

  // Canvas event handlers
  const handleCRDDragStart = useCallback((crd: ComposerCRD) => {
    setCanvasState(prev => ({ ...prev, draggedCRD: crd }));
  }, []);

  const handleCanvasDrop = useCallback((event: React.DragEvent, position: { x: number; y: number }) => {
    event.preventDefault();
    if (!canvasState.draggedCRD) return;

    const newCRD: ComposerCRD = {
      ...canvasState.draggedCRD,
      position,
      isOnCanvas: true
    };

    setCanvasCRDs(prev => [...prev, newCRD]);
    setAvailableCRDs(prev => 
      prev.map(crd => 
        crd.id === canvasState.draggedCRD!.id ? { ...crd, isOnCanvas: true } : crd
      )
    );
    setCanvasState(prev => ({ ...prev, draggedCRD: null }));
  }, [canvasState.draggedCRD]);

  const handleCRDSelect = useCallback((crd: ComposerCRD) => {
    setCanvasState(prev => ({ ...prev, selectedCRD: crd }));
    if (onCRDSelect) {
      onCRDSelect(crd);
    }
  }, [onCRDSelect]);

  const handleRemoveFromCanvas = useCallback((crdId: string) => {
    setCanvasCRDs(prev => prev.filter(crd => crd.id !== crdId));
    setAvailableCRDs(prev => 
      prev.map(crd => 
        crd.id === crdId ? { ...crd, isOnCanvas: false } : crd
      )
    );
    setCanvasState(prev => ({
      ...prev,
      selectedCRD: prev.selectedCRD?.id === crdId ? null : prev.selectedCRD
    }));
  }, []);

  // Canvas controls
  const handleZoomIn = () => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + CANVAS_CONSTANTS.ZOOM_STEP, CANVAS_CONSTANTS.MAX_ZOOM)
    }));
  };

  const handleZoomOut = () => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - CANVAS_CONSTANTS.ZOOM_STEP, CANVAS_CONSTANTS.MIN_ZOOM)
    }));
  };

  const handleResetView = () => {
    setCanvasState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 }
    }));
  };

  const handleAutoLayout = () => {
    const layoutCRDs = [...canvasCRDs];
    layoutCRDs.forEach((crd, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      crd.position = {
        x: col * (CANVAS_CONSTANTS.CRD_NODE_WIDTH + 40) + 50,
        y: row * (CANVAS_CONSTANTS.CRD_NODE_HEIGHT + 40) + 50
      };
    });
    setCanvasCRDs(layoutCRDs);
  };

  // Filter handlers
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
  };

  const handleScopeChange = (event: SelectChangeEvent<string>) => {
    setFilters(prev => ({ ...prev, scope: event.target.value as any }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      scope: 'all',
      group: '',
      status: 'all'
    });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Toolbar */}
      <Paper elevation={1} sx={{ zIndex: 2 }}>
        <Toolbar sx={{ minHeight: CANVAS_CONSTANTS.TOOLBAR_HEIGHT }}>
          <CRDIcon color="primary" sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            CRD Canvas Composer
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            📐 Phase 2: Dictionary Integration
          </Typography>
          
          {/* Canvas Controls */}
          <Box sx={{ display: 'flex', gap: 1, borderLeft: 1, borderColor: 'divider', pl: 2, ml: 2 }}>
            <Tooltip title="Auto Layout">
              <IconButton onClick={handleAutoLayout} size="small">
                <AutoLayoutIcon />
              </IconButton>
            </Tooltip>
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
            <Tooltip title="Reset View">
              <IconButton onClick={handleResetView} size="small">
                <FitToViewIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Paper>

      {/* Main Layout: Left Ribbon + Canvas + Right Ribbon */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Ribbon - CRD Source Panel */}
        <Paper 
          elevation={2} 
          sx={{ 
            width: CANVAS_CONSTANTS.LEFT_RIBBON_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            zIndex: 1
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              📋 Dictionary CRDs
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              From Dictionary → Custom Resources
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search CRDs..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Scope</InputLabel>
              <Select
                value={filters.scope}
                label="Scope"
                onChange={handleScopeChange}
              >
                <MenuItem value="all">All Scopes</MenuItem>
                <MenuItem value="Namespaced">Namespaced</MenuItem>
                <MenuItem value="Cluster">Cluster</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : sortedGroups.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CRDIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No CRDs available
                </Typography>
              </Box>
            ) : (
              <List dense sx={{ p: 0 }}>
                {sortedGroups.map((group) => {
                  const groupCRDs = groupedCRDs[group];
                  const isExpanded = expandedGroups.has(group);
                  const groupIcon = group === 'core' ? <CoreIcon /> : 
                                   group.includes('apps') ? <AppsIcon /> :
                                   group.includes('cert-manager') ? <SecurityIcon /> :
                                   group.includes('networking') ? <NetworkIcon /> :
                                   group.includes('storage') ? <StorageIcon /> :
                                   <ExtensionIcon />;
                  
                  return (
                    <Box key={group}>
                      {/* API Group Header */}
                      <ListItem 
                        button
                        onClick={() => handleGroupToggle(group)}
                        sx={{ 
                          bgcolor: 'grey.100', 
                          borderBottom: 1, 
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'grey.200' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {groupIcon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {group}
                              </Typography>
                              <Chip 
                                label={`${groupCRDs.length}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={group === 'core' ? 'Kubernetes Core Resources' : 
                                    `Custom Resources (${group})`}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </ListItem>
                      
                      {/* CRDs in this group */}
                      <Collapse in={isExpanded} timeout="auto">
                        <List dense sx={{ pl: 2, bgcolor: 'grey.50' }}>
                          {groupCRDs.map((crd) => (
                            <ListItem
                              key={crd.id}
                              draggable
                              onDragStart={() => handleCRDDragStart(crd)}
                              sx={{
                                cursor: 'grab',
                                borderLeft: 3,
                                borderColor: 'transparent',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                  borderColor: 'primary.main'
                                },
                                '&:active': {
                                  cursor: 'grabbing'
                                }
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <DragIcon color="action" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                      {crd.kind}
                                    </Typography>
                                    <Chip 
                                      label={crd.scope} 
                                      size="small" 
                                      variant="outlined"
                                      color={crd.scope === 'Cluster' ? 'secondary' : 'primary'}
                                      sx={{ height: 16, fontSize: '0.65rem' }}
                                    />
                                  </Box>
                                }
                                secondary={crd.version}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        </Paper>

        {/* Center Canvas */}
        <Box
          ref={canvasRef}
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            bgcolor: 'grey.50',
            backgroundImage: canvasState.showGrid ? `
              linear-gradient(${theme.palette.divider} 1px, transparent 1px),
              linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)
            ` : 'none',
            backgroundSize: `${canvasState.gridSize * canvasState.zoom}px ${canvasState.gridSize * canvasState.zoom}px`,
            backgroundPosition: `${canvasState.pan.x}px ${canvasState.pan.y}px`
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const position = {
              x: (e.clientX - rect.left - canvasState.pan.x) / canvasState.zoom,
              y: (e.clientY - rect.top - canvasState.pan.y) / canvasState.zoom
            };
            handleCanvasDrop(e, position);
          }}
        >
          {/* Canvas CRDs */}
          {canvasCRDs.map((crd) => (
            <Card
              key={crd.id}
              sx={{
                position: 'absolute',
                left: (crd.position?.x || 0) * canvasState.zoom + canvasState.pan.x,
                top: (crd.position?.y || 0) * canvasState.zoom + canvasState.pan.y,
                width: CANVAS_CONSTANTS.CRD_NODE_WIDTH * canvasState.zoom,
                minHeight: CANVAS_CONSTANTS.CRD_NODE_HEIGHT * canvasState.zoom,
                cursor: 'pointer',
                border: canvasState.selectedCRD?.id === crd.id ? 2 : 1,
                borderColor: canvasState.selectedCRD?.id === crd.id ? 'primary.main' : 'divider',
                boxShadow: canvasState.selectedCRD?.id === crd.id ? 4 : 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: 6
                }
              }}
              onClick={() => handleCRDSelect(crd)}
            >
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: crd.scope === 'Cluster' ? 'secondary.main' : 'primary.main' }}>
                    <CRDIcon />
                  </Avatar>
                }
                title={crd.kind}
                subheader={`${crd.group}/${crd.version}`}
                titleTypographyProps={{ variant: 'subtitle2', fontSize: 12 * canvasState.zoom }}
                subheaderTypographyProps={{ variant: 'caption', fontSize: 10 * canvasState.zoom }}
                action={
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromCanvas(crd.id);
                    }}
                    sx={{ transform: `scale(${canvasState.zoom})` }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                <Chip
                  label={crd.scope}
                  size="small"
                  variant="filled"
                  color={crd.scope === 'Cluster' ? 'secondary' : 'primary'}
                  sx={{ transform: `scale(${canvasState.zoom})`, transformOrigin: 'left' }}
                />
              </CardContent>
            </Card>
          ))}

          {/* Empty Canvas State */}
          {canvasCRDs.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              <CRDIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag CRDs from the left panel
              </Typography>
              <Typography variant="body2">
                Start composing by dragging Custom Resource Definitions onto this canvas
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right Ribbon - CRD Details Panel */}
        <Paper 
          elevation={2} 
          sx={{ 
            width: CANVAS_CONSTANTS.RIGHT_RIBBON_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            zIndex: 1
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              📊 CRD Details
            </Typography>
            {canvasState.selectedCRD && (
              <Typography variant="caption" color="text.secondary">
                From Dictionary Inventory
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {canvasState.selectedCRD ? (
              <Box>
                {/* Header Card */}
                <Card sx={{ m: 2, mb: 2 }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: canvasState.selectedCRD.scope === 'Cluster' ? 'secondary.main' : 'primary.main' }}>
                        <CRDIcon />
                      </Avatar>
                    }
                    title={
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {canvasState.selectedCRD.kind}
                      </Typography>
                    }
                    subheader={`${canvasState.selectedCRD.group}/${canvasState.selectedCRD.version}`}
                    action={
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Chip
                          label={canvasState.selectedCRD.scope}
                          size="small"
                          color={canvasState.selectedCRD.scope === 'Cluster' ? 'secondary' : 'primary'}
                          variant="filled"
                        />
                        {typeof canvasState.selectedCRD.instances === 'number' && (
                          <Chip
                            label={`${canvasState.selectedCRD.instances} instances`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </Card>

                {/* Basic Information */}
                <Card sx={{ m: 2, mb: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ExtensionIcon fontSize="small" />
                      Basic Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">API Group</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {canvasState.selectedCRD.group || 'core'}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">Plural Name</Typography>
                        <Typography variant="body2">
                          {canvasState.selectedCRD.plural}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">Resource Name</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                          {canvasState.selectedCRD.name}
                        </Typography>
                      </Box>
                      
                      {canvasState.selectedCRD.creationTimestamp && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Created</Typography>
                          <Typography variant="body2">
                            {new Date(canvasState.selectedCRD.creationTimestamp).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Description */}
                {canvasState.selectedCRD.description && (
                  <Card sx={{ m: 2, mb: 2 }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Description
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {canvasState.selectedCRD.description}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {/* Status & Metrics */}
                <Card sx={{ m: 2, mb: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InstancesIcon fontSize="small" />
                      Status & Metrics
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Status</Typography>
                        <Chip
                          label={canvasState.selectedCRD.status || 'Active'}
                          size="small"
                          color={canvasState.selectedCRD.status === 'Active' ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Box>
                      
                      {typeof canvasState.selectedCRD.instances === 'number' && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Instances</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {canvasState.selectedCRD.instances}
                          </Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">API Version</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {canvasState.selectedCRD.version}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Canvas Actions */}
                <Card sx={{ m: 2, mb: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Canvas Actions
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ClearIcon />}
                        onClick={() => handleRemoveFromCanvas(canvasState.selectedCRD!.id)}
                        fullWidth
                      >
                        Remove from Canvas
                      </Button>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => navigate(`/dictionary/crds/${canvasState.selectedCRD!.name}`)}
                        fullWidth
                      >
                        View Full Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* Relationships Placeholder */}
                <Card sx={{ m: 2, mb: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountTreeIcon fontSize="small" />
                      Relationships
                    </Typography>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <AccountTreeIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Relationship detection coming in future updates
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', mt: 8, p: 3 }}>
                <CRDIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No CRD Selected
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select a CRD on the canvas to view detailed information
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click any CRD node on the canvas to see its properties, status, and available actions
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Status Bar */}
      <Paper elevation={1} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'grey.100', zIndex: 1 }}>
        <Typography variant="caption">
          Canvas: {canvasCRDs.length} CRDs | Available: {filteredAvailableCRDs.length} | Groups: {sortedGroups.length} | Zoom: {Math.round(canvasState.zoom * 100)}%
        </Typography>
        
        {canvasState.selectedCRD && (
          <Chip
            label={`Selected: ${canvasState.selectedCRD.kind}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ m: 2 }}>
          {error}
          <Button size="small" onClick={() => setError(null)} sx={{ ml: 2 }}>
            Dismiss
          </Button>
        </Alert>
      )}
    </Box>
  );
};