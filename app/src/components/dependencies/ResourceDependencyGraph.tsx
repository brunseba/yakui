import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  Autocomplete,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  AccountTree as TreeIcon
} from '@mui/icons-material';
import {
  dependencyAnalyzer,
  DependencyGraph,
  DependencyFilters,
  DependencyType,
  DependencyGraphNode,
  DependencyGraphEdge
} from '../../services/dependency-analyzer';

// Custom node types
const CustomResourceNode: React.FC<{ data: any }> = ({ data }) => {
  const { kind, name, namespace, labels, status } = data;
  const icon = dependencyAnalyzer.getResourceKindIcon(kind);
  
  const getStatusColor = (status: any) => {
    if (!status) return '#gray';
    if (status.phase === 'Running' || status.readyReplicas > 0) return '#4caf50';
    if (status.phase === 'Failed' || status.phase === 'Error') return '#f44336';
    if (status.phase === 'Pending') return '#ff9800';
    return '#9e9e9e';
  };

  return (
    <Card 
      sx={{ 
        minWidth: 200, 
        maxWidth: 250,
        border: '2px solid',
        borderColor: getStatusColor(status),
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 4,
          transform: 'scale(1.05)'
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="h6" component="span" mr={1}>
            {icon}
          </Typography>
          <Typography variant="subtitle2" fontWeight="bold" color="primary">
            {kind}
          </Typography>
        </Box>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {name}
        </Typography>
        {namespace && (
          <Chip 
            label={namespace} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        )}
        {Object.keys(labels || {}).length > 0 && (
          <Typography variant="caption" display="block" mt={1} color="textSecondary">
            Labels: {Object.keys(labels).length}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Custom edge types
const CustomDependencyEdge: React.FC<any> = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition,
  data
}) => {
  const { type, strength, metadata } = data;
  const color = dependencyAnalyzer.getDependencyTypeColor(type);
  const strokeWidth = strength === 'strong' ? 3 : 1;
  const strokeDasharray = strength === 'weak' ? '5,5' : 'none';

  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  
  return (
    <g>
      <path
        id={id}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray,
          fill: 'none',
          markerEnd: 'url(#arrowhead)'
        }}
        d={edgePath}
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={color}
          />
        </marker>
      </defs>
    </g>
  );
};

const nodeTypes: NodeTypes = {
  resourceNode: CustomResourceNode,
};

const edgeTypes: EdgeTypes = {
  dependencyEdge: CustomDependencyEdge,
};

// Layout algorithm using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 150 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 75,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface ResourceDependencyGraphProps {
  filters?: DependencyFilters;
  onNodeClick?: (node: DependencyGraphNode) => void;
  onEdgeClick?: (edge: DependencyGraphEdge) => void;
  initialFocusResource?: string;
}

const ResourceDependencyGraphInner: React.FC<ResourceDependencyGraphProps> = ({
  filters = {},
  onNodeClick,
  onEdgeClick,
  initialFocusResource
}) => {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);
  const [selectedDependencyTypes, setSelectedDependencyTypes] = useState<DependencyType[]>([]);
  const [showWeakDependencies, setShowWeakDependencies] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DependencyGraphNode | null>(null);
  
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Fetch dependency graph data
  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const graphData = await dependencyAnalyzer.getDependencyGraph(filters);
      setGraph(graphData);
    } catch (err) {
      console.error('Failed to fetch dependency graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dependency graph');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Process graph data into ReactFlow format
  const { processedNodes, processedEdges } = useMemo(() => {
    if (!graph) return { processedNodes: [], processedEdges: [] };

    // Filter nodes
    let filteredNodes = graph.nodes;
    
    if (searchTerm) {
      filteredNodes = filteredNodes.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.kind.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.namespace && node.namespace.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedResourceTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        selectedResourceTypes.includes(node.kind)
      );
    }

    // Create node IDs set for edge filtering
    const nodeIds = new Set(filteredNodes.map(node => node.id));

    // Filter edges
    let filteredEdges = graph.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    if (selectedDependencyTypes.length > 0) {
      filteredEdges = filteredEdges.filter(edge => 
        selectedDependencyTypes.includes(edge.type)
      );
    }

    if (!showWeakDependencies) {
      filteredEdges = filteredEdges.filter(edge => edge.strength === 'strong');
    }

    // Convert to ReactFlow format
    const processedNodes: Node[] = filteredNodes.map(node => ({
      id: node.id,
      type: 'resourceNode',
      position: { x: 0, y: 0 },
      data: {
        ...node,
        onClick: () => {
          setSelectedNode(node);
          setDetailDialogOpen(true);
          onNodeClick?.(node);
        }
      },
    }));

    const processedEdges: Edge[] = filteredEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'dependencyEdge',
      data: {
        type: edge.type,
        strength: edge.strength,
        metadata: edge.metadata,
        onClick: () => onEdgeClick?.(edge)
      },
      animated: edge.strength === 'strong',
      style: {
        stroke: dependencyAnalyzer.getDependencyTypeColor(edge.type),
        strokeWidth: edge.strength === 'strong' ? 3 : 1,
        strokeDasharray: edge.strength === 'weak' ? '5,5' : 'none'
      }
    }));

    return { processedNodes, processedEdges };
  }, [graph, searchTerm, selectedResourceTypes, selectedDependencyTypes, showWeakDependencies, onNodeClick, onEdgeClick]);

  // Update ReactFlow nodes and edges with layout
  useEffect(() => {
    if (processedNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        processedNodes,
        processedEdges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [processedNodes, processedEdges, setNodes, setEdges]);

  // Focus on initial resource if specified
  useEffect(() => {
    if (initialFocusResource && nodes.length > 0) {
      setTimeout(() => {
        const focusNode = nodes.find(n => n.id === initialFocusResource);
        if (focusNode) {
          fitView({ nodes: [focusNode], padding: 0.3 });
        }
      }, 100);
    }
  }, [initialFocusResource, nodes, fitView]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleRefresh = () => {
    fetchGraph();
  };

  const handleFitView = () => {
    fitView({ padding: 0.1 });
  };

  const statistics = graph ? dependencyAnalyzer.getGraphStatistics(graph) : null;
  const availableResourceTypes = statistics?.resourceTypes || [];
  const availableDependencyTypes = statistics?.dependencyTypes || [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="h6" ml={2}>Loading dependency graph...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Controls Panel */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Autocomplete
              multiple
              size="small"
              options={availableResourceTypes}
              value={selectedResourceTypes}
              onChange={(_, value) => setSelectedResourceTypes(value)}
              renderInput={(params) => (
                <TextField {...params} label="Resource Types" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option}
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Autocomplete
              multiple
              size="small"
              options={availableDependencyTypes}
              value={selectedDependencyTypes}
              onChange={(_, value) => setSelectedDependencyTypes(value as DependencyType[])}
              renderInput={(params) => (
                <TextField {...params} label="Dependency Types" />
              )}
              getOptionLabel={(option) => dependencyAnalyzer.getDependencyTypeDescription(option)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option}
                    label={option}
                    size="small"
                    style={{ backgroundColor: dependencyAnalyzer.getDependencyTypeColor(option) }}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <FormControlLabel
                control={
                  <Switch
                    checked={showWeakDependencies}
                    onChange={(e) => setShowWeakDependencies(e.target.checked)}
                    size="small"
                  />
                }
                label="Weak deps"
              />
              <Box>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={handleRefresh}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fit to view">
                  <IconButton size="small" onClick={handleFitView}>
                    <CenterIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics */}
      {statistics && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" color="primary">{statistics.totalNodes}</Typography>
              <Typography variant="caption">Resources</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" color="secondary">{statistics.totalEdges}</Typography>
              <Typography variant="caption">Dependencies</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" color="success.main">{statistics.strongDependencies}</Typography>
              <Typography variant="caption">Strong</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" color="warning.main">{statistics.weakDependencies}</Typography>
              <Typography variant="caption">Weak</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Graph Container */}
      <Paper sx={{ height: 600, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const nodeData = node.data as DependencyGraphNode;
              return dependencyAnalyzer.getDependencyTypeColor('owner'); // Default color
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </Paper>

      {/* Resource Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Typography variant="h6" component="span" mr={1}>
              {selectedNode && dependencyAnalyzer.getResourceKindIcon(selectedNode.kind)}
            </Typography>
            <Typography variant="h6">
              {selectedNode?.kind} / {selectedNode?.name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <List>
              <ListItem>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText 
                  primary="Kind" 
                  secondary={selectedNode.kind} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText 
                  primary="Name" 
                  secondary={selectedNode.name} 
                />
              </ListItem>
              {selectedNode.namespace && (
                <ListItem>
                  <ListItemIcon><InfoIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Namespace" 
                    secondary={selectedNode.namespace} 
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText 
                  primary="Created" 
                  secondary={selectedNode.creationTimestamp ? new Date(selectedNode.creationTimestamp).toLocaleString() : 'Unknown'} 
                />
              </ListItem>
              {Object.keys(selectedNode.labels).length > 0 && (
                <ListItem>
                  <ListItemIcon><InfoIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Labels" 
                    secondary={
                      <Box>
                        {Object.entries(selectedNode.labels).map(([key, value]) => (
                          <Chip key={key} label={`${key}=${value}`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    } 
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ResourceDependencyGraph: React.FC<ResourceDependencyGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ResourceDependencyGraphInner {...props} />
    </ReactFlowProvider>
  );
};

export default ResourceDependencyGraph;