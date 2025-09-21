import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, Paper } from '@mui/material';

// Simple node component
const SimpleNode: React.FC<{ data: { label: string; } }> = ({ data }) => {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        border: 2,
        borderColor: 'primary.main',
        minWidth: 120,
        textAlign: 'center',
        boxShadow: 4,
      }}
    >
      <Typography variant="body2" fontWeight="bold">
        {data.label}
      </Typography>
    </Box>
  );
};

const nodeTypes = { simpleNode: SimpleNode };

export const SimpleCRDGraphTest: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Generate simple test data
  const testData = useMemo(() => {
    const testNodes: Node[] = [
      {
        id: 'app',
        type: 'simpleNode',
        position: { x: 100, y: 100 },
        data: { label: 'Application' },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: 'project',
        type: 'simpleNode', 
        position: { x: 400, y: 100 },
        data: { label: 'AppProject' },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
    ];

    const testEdges: Edge[] = [
      {
        id: 'app-to-project',
        source: 'app',
        target: 'project',
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 3,
          stroke: '#f44336',
        },
        label: 'references',
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.9,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          fill: '#333',
        },
      }
    ];

    console.log('🔧 Simple test data generated:', { nodes: testNodes.length, edges: testEdges.length });
    return { nodes: testNodes, edges: testEdges };
  }, []);

  // Update nodes and edges
  useEffect(() => {
    console.log('📊 Setting test data:', { nodes: testData.nodes.length, edges: testData.edges.length });
    setNodes(testData.nodes);
    setEdges(testData.edges);
  }, [testData, setNodes, setEdges]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Simple CRD Graph Test
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This tests basic ReactFlow edge rendering with a simple Application → AppProject connection.
      </Typography>
      
      <Paper elevation={2} sx={{ height: 500, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
        
        {/* Debug info */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, backgroundColor: 'background.paper', p: 1, borderRadius: 1 }}>
          <Typography variant="caption">
            Nodes: {nodes.length} | Edges: {edges.length}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SimpleCRDGraphTest;