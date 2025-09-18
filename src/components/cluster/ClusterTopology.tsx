import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Computer as ComputerIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes';
import { ClusterNode } from '../../types';

interface NodePosition {
  x: number;
  y: number;
}

interface TopologyNode {
  node: ClusterNode;
  position: NodePosition;
  health: 'healthy' | 'warning' | 'error';
  podCount: number;
}

const ClusterTopology: React.FC = () => {
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<ClusterNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        setLoading(true);
        const nodesData = await kubernetesService.getNodes();
        setNodes(nodesData);
        
        // Calculate topology layout
        const topologyData = await calculateTopologyLayout(nodesData);
        setTopologyNodes(topologyData);
        
      } catch (err) {
        console.error('Failed to fetch nodes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cluster data');
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, []);

  const calculateTopologyLayout = async (nodes: ClusterNode[]): Promise<TopologyNode[]> => {
    const topologyNodes: TopologyNode[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeName = node.metadata?.name || '';
      
      // Get pod count for this node
      let podCount = 0;
      try {
        const coreApi = kubernetesService.getKubeConfig().makeApiClient(await import('@kubernetes/client-node').then(k8s => k8s.CoreV1Api));
        const pods = await coreApi.listPodForAllNamespaces(undefined, undefined, `spec.nodeName=${nodeName}`);
        podCount = pods.body.items.length;
      } catch (error) {
        // Ignore pod count errors
      }

      // Calculate position in a circular layout
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = Math.min(200, 50 + nodes.length * 10);
      const centerX = 300;
      const centerY = 200;
      
      const position = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };

      // Determine health status
      const readyCondition = node.status.conditions.find(c => c.type === 'Ready');
      const health: 'healthy' | 'warning' | 'error' = 
        readyCondition?.status === 'True' ? 'healthy' :
        readyCondition?.status === 'Unknown' ? 'warning' : 'error';

      topologyNodes.push({
        node,
        position,
        health,
        podCount
      });
    }

    return topologyNodes;
  };

  const drawTopology = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections between nodes (simple mesh)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i < topologyNodes.length; i++) {
      for (let j = i + 1; j < topologyNodes.length; j++) {
        const node1 = topologyNodes[i];
        const node2 = topologyNodes[j];
        
        ctx.beginPath();
        ctx.moveTo(node1.position.x, node1.position.y);
        ctx.lineTo(node2.position.x, node2.position.y);
        ctx.stroke();
      }
    }

    // Draw nodes
    topologyNodes.forEach((topologyNode) => {
      const { node, position, health } = topologyNode;
      const { x, y } = position;

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      
      // Color based on health
      switch (health) {
        case 'healthy':
          ctx.fillStyle = '#4caf50';
          break;
        case 'warning':
          ctx.fillStyle = '#ff9800';
          break;
        case 'error':
          ctx.fillStyle = '#f44336';
          break;
      }
      
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      const nodeName = node.metadata?.name || 'Unknown';
      ctx.fillText(nodeName.substring(0, 10) + '...', x, y - 25);
    });
  };

  useEffect(() => {
    if (topologyNodes.length > 0) {
      drawTopology();
    }
  }, [topologyNodes, selectedNode]);

  const handleNodeClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Find clicked node
    for (const topologyNode of topologyNodes) {
      const { position, node } = topologyNode;
      const distance = Math.sqrt(
        Math.pow(clickX - position.x, 2) + Math.pow(clickY - position.y, 2)
      );
      
      if (distance <= 20) {
        setSelectedNode(node);
        break;
      }
    }
  };

  const formatBytes = (bytes: string): string => {
    const value = parseInt(bytes.replace(/[^0-9]/g, ''));
    if (isNaN(value)) return bytes;
    
    if (value >= 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else if (value >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(value / 1024).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Cluster Topology
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Cluster Topology
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cluster Topology
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Node Topology View
              </Typography>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  justifyContent: 'center',
                  backgroundColor: '#fafafa'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={handleNodeClick}
                />
              </Paper>
              <Box mt={2} display="flex" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    width={16}
                    height={16}
                    borderRadius="50%"
                    bgcolor="#4caf50"
                  />
                  <Typography variant="body2">Healthy</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    width={16}
                    height={16}
                    borderRadius="50%"
                    bgcolor="#ff9800"
                  />
                  <Typography variant="body2">Warning</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    width={16}
                    height={16}
                    borderRadius="50%"
                    bgcolor="#f44336"
                  />
                  <Typography variant="body2">Error</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cluster Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {nodes.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Nodes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {topologyNodes.filter(n => n.health === 'healthy').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Healthy
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {topologyNodes.filter(n => n.health === 'warning').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Warning
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main">
                      {topologyNodes.filter(n => n.health === 'error').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Error
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          {selectedNode ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Node Details
                </Typography>
                <Box mb={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    {selectedNode.metadata?.name}
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    {selectedNode.status.conditions.map((condition) => (
                      <Chip
                        key={condition.type}
                        label={condition.type}
                        size="small"
                        color={condition.status === 'True' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  System Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <ComputerIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="OS"
                      secondary={selectedNode.status.nodeInfo.osImage}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Speed fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Architecture"
                      secondary={selectedNode.status.nodeInfo.architecture}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Kubelet Version"
                      secondary={selectedNode.status.nodeInfo.kubeletVersion}
                    />
                  </ListItem>
                </List>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Resource Capacity
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Speed fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="CPU"
                      secondary={selectedNode.status.capacity?.cpu || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <MemoryIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Memory"
                      secondary={formatBytes(selectedNode.status.capacity?.memory || '0')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Storage"
                      secondary={formatBytes(selectedNode.status.capacity?.['ephemeral-storage'] || '0')}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Node Details
                </Typography>
                <Typography color="textSecondary">
                  Click on a node in the topology view to see detailed information.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClusterTopology;