import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  Position,
  MarkerType,
  NodeTypes,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Grid
} from '@mui/material';
import {
  AccountTree as DependencyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  CRDAnalysisResult,
  CRDType,
  crdAnalysisService
} from '../../services/crd-analysis';
import { CRDGraphHelpButton } from './CRDGraphHelp';

// Enhanced CRD Node component focused on CRD-to-CRD relationships
const CRDToCRDNode: React.FC<{ 
  data: { 
    crd: CRDType; 
    crdToCrdCount: number; 
    isHighlighted: boolean;
    isSourceOfHighlighted: boolean;
    isTargetOfHighlighted: boolean;
    centralityScore: number;
  } 
}> = ({ data }) => {
  const { 
    crd, 
    crdToCrdCount, 
    isHighlighted, 
    isSourceOfHighlighted, 
    isTargetOfHighlighted,
    centralityScore 
  } = data;
  
  const getNodeColor = () => {
    if (isHighlighted) return 'primary.main';
    if (isSourceOfHighlighted) return 'success.main';
    if (isTargetOfHighlighted) return 'warning.main';
    if (centralityScore > 0.7) return 'info.main';
    return 'background.paper';
  };

  const getNodeBorderColor = () => {
    if (isHighlighted) return 'primary.main';
    if (isSourceOfHighlighted) return 'success.main';
    if (isTargetOfHighlighted) return 'warning.main';
    if (centralityScore > 0.7) return 'info.main';
    return 'divider';
  };

  const getNodeSize = () => {
    const baseSize = 120;
    const sizeMultiplier = 1 + (centralityScore * 0.5); // Up to 1.5x size for high centrality
    return baseSize * sizeMultiplier;
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        backgroundColor: getNodeColor(),
        color: isHighlighted || isSourceOfHighlighted || isTargetOfHighlighted || centralityScore > 0.7 
          ? 'white' : 'text.primary',
        border: 3,
        borderColor: getNodeBorderColor(),
        boxShadow: isHighlighted ? 8 : centralityScore > 0.7 ? 6 : 4,
        minWidth: getNodeSize(),
        maxWidth: getNodeSize() + 50,
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
          boxShadow: 10,
          transform: 'scale(1.05)',
          zIndex: 1000
        }
      }}
    >
      {/* Centrality indicator */}
      {centralityScore > 0.5 && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'error.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            zIndex: 1
          }}
        >
          ⭐
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {crdAnalysisService.getCRDIcon(crd)}
        <Typography variant="h6" fontWeight="bold" noWrap>
          {crd.kind}
        </Typography>
      </Box>
      
      <Typography 
        variant="caption" 
        color={isHighlighted || isSourceOfHighlighted || isTargetOfHighlighted || centralityScore > 0.7 
          ? 'white' : 'text.secondary'} 
        display="block"
        sx={{ mb: 1 }}
      >
        {crd.apiGroup || 'core'}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {crd.version && (
          <Chip
            label={`v${crd.version}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
        
        {crdToCrdCount > 0 && (
          <Chip
            label={`${crdToCrdCount} CRDs`}
            size="small"
            color="secondary"
            variant="filled"
            sx={{ fontSize: '0.7rem' }}
          />
        )}

        {centralityScore > 0.3 && (
          <Chip
            label={`${Math.round(centralityScore * 100)}% central`}
            size="small"
            color="info"
            variant="filled"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
      </Box>
    </Box>
  );
};

// Define node types
const nodeTypes: NodeTypes = {
  crdToCrd: CRDToCRDNode,
};

interface CRDToCRDGraphAnalysisProps {
  results: CRDAnalysisResult | null;
  height?: number;
}

export const CRDToCRDGraphAnalysis: React.FC<CRDToCRDGraphAnalysisProps> = ({
  results,
  height = 700
}) => {
  // DEBUG: Log received data structure
  if (import.meta.env.DEV) {
    console.log('🔍 CRDToCRDGraphAnalysis received data:', {
      hasResults: !!results,
      hasNodes: !!results?.nodes,
      nodeCount: results?.nodes?.length || 0,
      hasEdges: !!results?.edges,
      edgeCount: results?.edges?.length || 0
    });
  }
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Analysis settings
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showMiniMap] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [minDependencies, setMinDependencies] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutType, setLayoutType] = useState<'circular' | 'hierarchical' | 'force'>('circular');
  const [showAllConnected, setShowAllConnected] = useState<boolean>(true);
  
  // Calculate centrality scores for nodes based on backend edges
  const calculateCentrality = (backendNodes: any[], backendEdges: any[]) => {
    const centralityScores = new Map<string, number>();
    
    // Filter to only CRD definition nodes
    const crdNodes = backendNodes.filter(node => 
      node.labels?.['dictionary.type'] === 'crd-definition'
    );
    
    const nodeIds = crdNodes.map(node => node.id);
    
    // Simple degree centrality calculation based on backend edges
    nodeIds.forEach(nodeId => {
      const inDegree = backendEdges.filter(edge => edge.target === nodeId).length;
      const outDegree = backendEdges.filter(edge => edge.source === nodeId).length;
      const totalDegree = inDegree + outDegree;
      const maxPossible = (nodeIds.length - 1) * 2; // Max in + out degree
      centralityScores.set(nodeId, maxPossible > 0 ? totalDegree / maxPossible : 0);
    });

    return centralityScores;
  };

  // Generate CRD-to-CRD focused graph data directly from backend nodes/edges
  const graphData = useMemo(() => {
    if (!results || !results.nodes || !results.edges) {
      return { nodes: [], edges: [], statistics: null };
    }

    if (import.meta.env.DEV) {
      console.log('🔍 Processing backend data:', {
        nodeCount: results.nodes.length,
        edgeCount: results.edges.length,
        sampleNodes: results.nodes.slice(0, 3),
        sampleEdges: results.edges.slice(0, 3)
      });
    }

    // Filter backend nodes to only CRD definitions
    const crdNodes = results.nodes.filter(node => 
      node.labels?.['dictionary.type'] === 'crd-definition'
    );
    
    // Filter backend edges to only those between CRD definitions
    const crdEdges = results.edges.filter(edge => {
      const sourceNode = results.nodes.find(n => n.id === edge.source);
      const targetNode = results.nodes.find(n => n.id === edge.target);
      
      return sourceNode?.labels?.['dictionary.type'] === 'crd-definition' &&
             targetNode?.labels?.['dictionary.type'] === 'crd-definition';
    });
    
    if (import.meta.env.DEV) {
      console.log('🔗 Filtered CRD data:', {
        crdNodeCount: crdNodes.length,
        crdEdgeCount: crdEdges.length,
        nodeTypes: crdNodes.map(n => n.labels?.['dictionary.type']),
        crdKinds: crdNodes.map(n => n.labels?.['crd.kind'] || n.kind)
      });
    }
    
    if (crdNodes.length === 0) {
      return { nodes: [], edges: [], statistics: null };
    }

    // Apply search filter
    let filteredNodes = crdNodes;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNodes = crdNodes.filter(node => {
        const kind = node.labels?.['crd.kind'] || node.kind || '';
        const apiGroup = node.labels?.['api.group'] || '';
        return kind.toLowerCase().includes(query) ||
               apiGroup.toLowerCase().includes(query);
      });
    }

    // Apply severity filter to edges
    let filteredEdges = crdEdges;
    if (severityFilter !== 'all') {
      filteredEdges = crdEdges.filter(edge => {
        const severity = edge.strength === 'strong' ? 'high' : 
                        edge.strength === 'weak' ? 'low' : 'medium';
        return severity === severityFilter;
      });
    }

    // Filter nodes to only include those involved in relationships
    const involvedNodeIds = new Set<string>();
    filteredEdges.forEach(edge => {
      involvedNodeIds.add(edge.source);
      involvedNodeIds.add(edge.target);
    });

    if (import.meta.env.DEV) {
      console.log('🔍 Node filtering debug:', {
        totalFilteredNodes: filteredNodes.length,
        totalFilteredEdges: filteredEdges.length,
        involvedNodeIds: Array.from(involvedNodeIds),
        minDependencies,
        severityFilter
      });
    }

    const finalNodes = filteredNodes.filter(node => {
      const degree = filteredEdges.filter(edge => 
        edge.source === node.id || edge.target === node.id
      ).length;
      const isInvolved = involvedNodeIds.has(node.id);
      const meetsDeps = degree >= minDependencies;
      
      if (import.meta.env.DEV && (isInvolved || degree > 0)) {
        const kind = node.labels?.['crd.kind'] || node.kind || 'Unknown';
        console.log(`   Node ${kind} (${node.id}): degree=${degree}, involved=${isInvolved}, meetsDeps=${meetsDeps}, showAllConnected=${showAllConnected}`);
      }
      
      return isInvolved && (showAllConnected ? degree > 0 : meetsDeps);
    });

    // Filter edges to only include those between final nodes
    const finalNodeIds = new Set(finalNodes.map(n => n.id));
    const finalEdges = filteredEdges.filter(edge => 
      finalNodeIds.has(edge.source) && finalNodeIds.has(edge.target)
    );

    if (finalNodes.length === 0) {
      return { nodes: [], edges: [], statistics: null };
    }

    // Calculate centrality scores
    const centralityScores = calculateCentrality(finalNodes, finalEdges);

    // Create ReactFlow nodes
    const graphNodes: Node[] = finalNodes.map((node, index) => {
      const kind = node.labels?.['crd.kind'] || node.kind || 'Unknown';
      const apiGroup = node.labels?.['api.group'] || 'core';
      const centralityScore = centralityScores.get(node.id) || 0;
      const edgeCount = finalEdges.filter(e => e.source === node.id || e.target === node.id).length;

      // Mock CRD structure for compatibility with existing node component
      const mockCRD: CRDType = {
        kind,
        apiGroup: apiGroup === 'core' ? undefined : apiGroup,
        version: 'v1',
        plural: node.name?.split('.')[0] || kind.toLowerCase() + 's',
        description: `Custom Resource Definition for ${kind}`,
        dependencies: []
      };

      let position;
      switch (layoutType) {
        case 'circular':
          const angle = (2 * Math.PI * index) / finalNodes.length;
          const radius = Math.min(250 + (finalNodes.length * 15), 400);
          position = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          };
          break;
        
        case 'hierarchical':
          const levels = 5;
          const level = Math.floor(centralityScore * levels);
          const itemsInLevel = Math.ceil(finalNodes.length / levels);
          const indexInLevel = index % itemsInLevel;
          position = {
            x: (indexInLevel - itemsInLevel / 2) * 200,
            y: level * 150,
          };
          break;

        case 'force':
        default:
          position = {
            x: (Math.random() - 0.5) * 800,
            y: (Math.random() - 0.5) * 600,
          };
      }

      return {
        id: node.id,
        type: 'crdToCrd',
        position,
        data: {
          crd: mockCRD,
          crdToCrdCount: edgeCount,
          isHighlighted: selectedNode === node.id,
          isSourceOfHighlighted: selectedNode ? finalEdges.some(edge => 
            edge.source === node.id && edge.target === selectedNode
          ) : false,
          isTargetOfHighlighted: selectedNode ? finalEdges.some(edge => 
            edge.target === node.id && edge.source === selectedNode
          ) : false,
          centralityScore
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create ReactFlow edges
    const graphEdges: Edge[] = finalEdges.map((edge, index) => {
      const severity = edge.strength === 'strong' ? 'high' : 
                      edge.strength === 'weak' ? 'low' : 'medium';
      const dependencyType = edge.metadata?.referenceType || edge.type || 'reference';
      
      return {
        id: `edge-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: severity === 'high',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: severity === 'high' ? 4 : severity === 'medium' ? 3 : 2,
          stroke: severity === 'high' ? '#f44336' : 
                  severity === 'medium' ? '#ff9800' : '#2196f3',
        },
        label: showLabels ? dependencyType : undefined,
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.9,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          fill: '#333',
        },
      };
    });

    // Calculate statistics
    const statistics = {
      totalCRDs: graphNodes.length,
      totalRelations: graphEdges.length,
      highSeverity: graphEdges.filter(e => e.style?.stroke === '#f44336').length,
      mediumSeverity: graphEdges.filter(e => e.style?.stroke === '#ff9800').length,
      lowSeverity: graphEdges.filter(e => e.style?.stroke === '#2196f3').length,
      avgCentrality: Array.from(centralityScores.values()).reduce((sum, score) => sum + score, 0) / centralityScores.size,
      topCentralNodes: Array.from(centralityScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([nodeId, score]) => {
          const node = finalNodes.find(n => n.id === nodeId);
          const kind = node?.labels?.['crd.kind'] || node?.kind || 'Unknown';
          return {
            id: kind,
            score: Math.round(score * 100)
          };
        })
    };

    if (import.meta.env.DEV) {
      console.log('📊 Final graph data:', {
        nodeCount: graphNodes.length,
        edgeCount: graphEdges.length,
        statistics,
        sampleNodes: graphNodes.slice(0, 3).map(n => ({ id: n.id, kind: (n.data as any).crd.kind })),
        sampleEdges: graphEdges.slice(0, 3).map(e => ({ id: e.id, source: e.source, target: e.target }))
      });
    }
    
    return { nodes: graphNodes, edges: graphEdges, statistics };
  }, [results, selectedNode, severityFilter, minDependencies, searchQuery, layoutType, showLabels, showAllConnected]);

  // Update nodes and edges when data changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 Updating ReactFlow state:', {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        nodeIds: graphData.nodes.map(n => n.id),
        edgeIds: graphData.edges.map(e => e.id)
      });
    }
    
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }, [graphData, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode]);

  const resetView = useCallback(() => {
    setSelectedNode(null);
    setSeverityFilter('all');
    setMinDependencies(1);
    setSearchQuery('');
    setShowAllConnected(true);
  }, []);

  if (!results) {
    return (
      <Paper elevation={2} sx={{ p: 3, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            No CRD-to-CRD Dependencies Available
          </Typography>
          <Typography variant="body2">
            Run a CRD analysis to discover relationships between Custom Resource Definitions.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            No CRD-to-CRD Relationships Found
          </Typography>
          <Typography variant="body2">
            With the current filters, no CRD-to-CRD dependencies were found. Try adjusting the minimum dependencies or severity filters.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <ReactFlowProvider>
      <Box>
        {/* Controls Panel */}
      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DependencyIcon />
            CRD-to-CRD Relationship Analysis
          </Typography>
          <CRDGraphHelpButton />
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search CRDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                label="Severity"
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Layout</InputLabel>
              <Select
                value={layoutType}
                label="Layout"
                onChange={(e) => setLayoutType(e.target.value as any)}
              >
                <MenuItem value="circular">Circular</MenuItem>
                <MenuItem value="hierarchical">Hierarchical</MenuItem>
                <MenuItem value="force">Force-based</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Typography variant="caption" display="block">
              Min Dependencies: {minDependencies}
            </Typography>
            <Slider
              value={minDependencies}
              onChange={(_, value) => setMinDependencies(value as number)}
              min={1}
              max={10}
              step={1}
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    size="small"
                  />
                }
                label="Labels"
              />
              <Tooltip title="Show all CRDs with relationships (ignore min dependencies filter)">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAllConnected}
                      onChange={(e) => setShowAllConnected(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Show All"
                />
              </Tooltip>
              <Tooltip title="Reset all filters">
                <IconButton onClick={resetView} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Panel */}
      {graphData.statistics && (
        <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {graphData.statistics.totalCRDs}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  CRDs with Relations
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5" color="secondary" fontWeight="bold">
                  {graphData.statistics.totalRelations}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Relations
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5" color="error.main" fontWeight="bold">
                  {graphData.statistics.highSeverity}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  High Severity
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5" color="info.main" fontWeight="bold">
                  {graphData.statistics.avgCentrality.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg Centrality
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Graph Container */}
      <Paper elevation={2} sx={{ height, position: 'relative', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Controls />
          {showMiniMap && (
            <MiniMap
              nodeColor={(node) => {
                const nodeData = node.data as any;
                if (nodeData?.isHighlighted) return '#1976d2';
                if (nodeData?.centralityScore && nodeData.centralityScore > 0.7) return '#0288d1';
                return '#9e9e9e';
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }}
            />
          )}
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* Legend */}
        <Box sx={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 1000, 
          backgroundColor: 'background.paper',
          p: 2,
          borderRadius: 1,
          boxShadow: 2,
          maxWidth: 300
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">
              🔗 CRD-to-CRD Relations
            </Typography>
            <CRDGraphHelpButton />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption">
              🔴 High Severity • 🟡 Medium • 🔵 Low
            </Typography>
            <Typography variant="caption">
              ⭐ High Centrality Nodes
            </Typography>
            <Typography variant="caption">
              🟢 Sources • 🟡 Targets of Selected
            </Typography>
          </Box>
        </Box>

        {/* Selected Node Info */}
        {selectedNode && graphData.statistics && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            left: 10, 
            zIndex: 1000, 
            backgroundColor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 2,
            maxWidth: 350
          }}>
            {(() => {
              const node = nodes.find((n: any) => n.id === selectedNode);
              const crd = node?.data?.crd;
              if (!crd) return null;
              
              const outgoingEdges = edges.filter((e: any) => e.source === selectedNode);
              const incomingEdges = edges.filter((e: any) => e.target === selectedNode);
              
              return (
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {crd.kind}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {crd.apiGroup || 'core'}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`${outgoingEdges.length} outgoing`} size="small" color="success" />
                    <Chip label={`${incomingEdges.length} incoming`} size="small" color="warning" />
                  </Box>
                  {crd.description && (
                    <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
                      {crd.description}
                    </Typography>
                  )}
                </Box>
              );
            })()}
          </Box>
        )}
      </Paper>
      </Box>
    </ReactFlowProvider>
  );
};

export default CRDToCRDGraphAnalysis;