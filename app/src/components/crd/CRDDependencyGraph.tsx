import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  Panel,
  Position,
  MarkerType,
  NodeTypes,
  EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  ButtonGroup,
  Button,
  Alert,
  Divider
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  AccountTree as DependencyIcon,
  Extension as CRDIcon,
  Code as SchemaIcon
} from '@mui/icons-material';
import {
  CRDAnalysisResult,
  CRDType,
  CRDDependency,
  crdAnalysisService
} from '../../services/crd-analysis';

// Custom node component for CRDs
const CRDNode: React.FC<{ data: { crd: CRDType; dependencyCount: number; isHighlighted: boolean } }> = ({ data }) => {
  const { crd, dependencyCount, isHighlighted } = data;
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: isHighlighted ? 'primary.main' : 'background.paper',
        color: isHighlighted ? 'primary.contrastText' : 'text.primary',
        border: 2,
        borderColor: isHighlighted ? 'primary.main' : 'divider',
        boxShadow: isHighlighted ? 4 : 2,
        minWidth: 150,
        maxWidth: 250,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 6,
          transform: 'scale(1.02)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {crdAnalysisService.getCRDIcon(crd)}
        <Typography variant="h6" fontWeight="bold" noWrap>
          {crd.kind}
        </Typography>
      </Box>
      
      <Typography variant="caption" color={isHighlighted ? 'primary.contrastText' : 'text.secondary'} display="block">
        {crd.apiGroup || 'core'}
      </Typography>
      
      {crd.version && (
        <Chip
          label={`v${crd.version}`}
          size="small"
          variant="outlined"
          sx={{ mt: 1, fontSize: '0.7rem' }}
        />
      )}
      
      {dependencyCount > 0 && (
        <Chip
          label={`${dependencyCount} deps`}
          size="small"
          color="secondary"
          variant="filled"
          sx={{ mt: 1, ml: 1, fontSize: '0.7rem' }}
        />
      )}
    </Box>
  );
};

// Define node types
const nodeTypes: NodeTypes = {
  crd: CRDNode,
};

interface CRDDependencyGraphProps {
  results: CRDAnalysisResult | null;
  height?: number;
}

export const CRDDependencyGraph: React.FC<CRDDependencyGraphProps> = ({
  results,
  height = 600
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Graph settings
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [nodeSpacing, setNodeSpacing] = useState<number>(200);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const [filterByDependencies, setFilterByDependencies] = useState<boolean>(false);

  // Helper function to extract CRDs from nodes
  const getCRDsFromResults = (results: CRDAnalysisResult) => {
    if (!results.nodes) return [];
    
    const crdNodes = results.nodes.filter(node => 
      node.labels?.['dictionary.type'] === 'crd-definition'
    );
    
    return crdNodes.map(node => {
      const kind = node.labels?.['crd.kind'] || node.kind || 'Unknown';
      const apiGroup = node.labels?.['api.group'] || 'core';
      
      // Extract dependencies from edges
      const dependencies = results.edges?.filter(edge => edge.source === node.id).map(edge => {
        const targetNode = results.nodes?.find(n => n.id === edge.target);
        const targetKind = targetNode?.labels?.['crd.kind'] || targetNode?.kind || 'Unknown';
        const severity = edge.strength === 'strong' ? 'high' : edge.strength === 'weak' ? 'low' : 'medium';
        
        return {
          type: edge.metadata?.referenceType || edge.type || 'reference',
          target: targetKind,
          path: edge.metadata?.field,
          description: edge.metadata?.reason || `Dependency on ${targetKind}`,
          severity: severity as 'low' | 'medium' | 'high'
        };
      }) || [];
      
      return {
        kind,
        apiGroup: apiGroup === 'core' ? undefined : apiGroup,
        version: 'v1',
        plural: node.name?.split('.')[0] || kind.toLowerCase() + 's',
        description: `Custom Resource Definition for ${kind}`,
        dependencies
      };
    });
  };

  // Generate graph data from analysis results
  const graphData = useMemo(() => {
    if (!results || !results.nodes) {
      return { nodes: [], edges: [] };
    }

    const crds = getCRDsFromResults(results);
    const filteredCrds = filterByDependencies 
      ? crds.filter(crd => crd.dependencies.length > 0)
      : crds;

    // Create nodes for each CRD
    const graphNodes: Node[] = filteredCrds.map((crd, index) => {
      const angle = (2 * Math.PI * index) / filteredCrds.length;
      const radius = Math.min(300 + (filteredCrds.length * 10), 500);
      
      return {
        id: `${crd.apiGroup}/${crd.kind}`,
        type: 'crd',
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
        data: {
          crd,
          dependencyCount: crd.dependencies.length,
          isHighlighted: selectedNode === `${crd.apiGroup}/${crd.kind}`
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges for dependencies
    const graphEdges: Edge[] = [];
    const crdMap = new Map(filteredCrds.map(crd => [`${crd.apiGroup}/${crd.kind}`, crd]));

    filteredCrds.forEach(crd => {
      const sourceId = `${crd.apiGroup}/${crd.kind}`;
      
      crd.dependencies.forEach((dep, depIndex) => {
        // Try to find the target CRD
        const targetCrd = filteredCrds.find(c => 
          c.kind.toLowerCase() === dep.target.toLowerCase() ||
          dep.target.includes(c.kind) ||
          dep.target.includes(`${c.apiGroup}/${c.kind}`)
        );

        if (targetCrd) {
          const targetId = `${targetCrd.apiGroup}/${targetCrd.kind}`;
          
          graphEdges.push({
            id: `${sourceId}-${targetId}-${depIndex}`,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: dep.type === 'reference',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: dep.severity === 'high' ? 3 : dep.severity === 'medium' ? 2 : 1,
              stroke: dep.severity === 'high' ? '#f44336' : dep.severity === 'medium' ? '#ff9800' : '#2196f3',
            },
            label: showLabels ? dep.type : undefined,
            labelBgStyle: {
              fill: '#ffffff',
              fillOpacity: 0.8,
            },
            labelStyle: {
              fontSize: 12,
              fontWeight: 'bold',
            },
          });
        } else {
          // Create a dependency node for external references
          const depNodeId = `dep-${sourceId}-${depIndex}`;
          if (!graphNodes.find(n => n.id === depNodeId)) {
            graphNodes.push({
              id: depNodeId,
              type: 'default',
              position: {
                x: Math.random() * 400 - 200,
                y: Math.random() * 400 - 200,
              },
              data: {
                label: dep.target,
              },
              style: {
                backgroundColor: '#f5f5f5',
                border: '2px dashed #ccc',
                borderRadius: 8,
                padding: 8,
                fontSize: 12,
                width: 'auto',
                height: 'auto',
              },
            });
          }

          graphEdges.push({
            id: `${sourceId}-${depNodeId}`,
            source: sourceId,
            target: depNodeId,
            type: 'step',
            style: {
              strokeDasharray: '5,5',
              strokeWidth: 1,
              stroke: '#999',
            },
            markerEnd: {
              type: MarkerType.Arrow,
              width: 15,
              height: 15,
            },
            label: showLabels ? dep.type : undefined,
          });
        }
      });
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [results, nodeSpacing, selectedNode, showLabels, filterByDependencies]);

  // Update nodes and edges when data changes
  React.useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }, [graphData, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode]);

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const exportAsImage = useCallback(() => {
    // This would implement image export functionality
    console.log('Export as image functionality would go here');
  }, []);

  const fitView = useCallback(() => {
    // The ReactFlow instance would handle this
    console.log('Fit view functionality');
  }, []);

  if (!results || !results.nodes || !getCRDsFromResults(results).length) {
    return (
      <Paper elevation={2} sx={{ p: 3, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            No CRD Dependencies to Visualize
          </Typography>
          <Typography variant="body2">
            Run a CRD analysis to see the dependency graph visualization here.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ height, position: 'relative', overflow: 'hidden' }}>
      {/* Graph Title */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 1000, 
        backgroundColor: 'background.paper',
        p: 2,
        borderRadius: 1,
        boxShadow: 2
      }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTree />
          CRD Dependency Graph
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {getCRDsFromResults(results).length} CRDs • {edges.length} dependencies
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        display: 'flex',
        gap: 1
      }}>
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Filter by dependencies">
            <Button
              onClick={() => setFilterByDependencies(!filterByDependencies)}
              color={filterByDependencies ? 'primary' : 'inherit'}
            >
              <FilterIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Settings">
            <Button onClick={handleSettingsClick}>
              <SettingsIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Export">
            <Button onClick={exportAsImage}>
              <DownloadIcon />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Box>

      {/* Selected Node Info */}
      {selectedNode && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 10, 
          left: 10, 
          zIndex: 1000, 
          backgroundColor: 'background.paper',
          p: 2,
          borderRadius: 1,
          boxShadow: 2,
          maxWidth: 300
        }}>
          {(() => {
            const node = nodes.find(n => n.id === selectedNode);
            const crd = node?.data?.crd;
            if (!crd) return null;
            
            return (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {crd.kind}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  {crd.apiGroup || 'core'} • {crd.dependencies.length} dependencies
                </Typography>
                {crd.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {crd.description}
                  </Typography>
                )}
              </Box>
            );
          })()}
        </Box>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1,
          maxZoom: 1.2,
          minZoom: 0.1,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={null} // Disable delete key
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls position="bottom-right" />
        {showMiniMap && (
          <MiniMap
            position="bottom-left"
            style={{
              height: 100,
              width: 150,
            }}
            zoomable
            pannable
            nodeColor={(node) => {
              return node.data.isHighlighted ? '#2196f3' : '#666';
            }}
          />
        )}
      </ReactFlow>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
      >
        <MenuItem disableRipple>
          <FormControlLabel
            control={
              <Switch
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                size="small"
              />
            }
            label="Show Edge Labels"
          />
        </MenuItem>
        
        <MenuItem disableRipple>
          <FormControlLabel
            control={
              <Switch
                checked={showMiniMap}
                onChange={(e) => setShowMiniMap(e.target.checked)}
                size="small"
              />
            }
            label="Show Mini Map"
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem disableRipple>
          <Box sx={{ width: '100%', px: 1 }}>
            <Typography variant="body2" gutterBottom>
              Node Spacing
            </Typography>
            <Slider
              value={nodeSpacing}
              onChange={(e, value) => setNodeSpacing(value as number)}
              min={100}
              max={400}
              step={50}
              size="small"
              valueLabelDisplay="auto"
            />
          </Box>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default CRDDependencyGraph;