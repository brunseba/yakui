import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Storage as StorageIcon,
  Memory as MemoryIcon,
  DeveloperBoard as CpuIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Computer as ComputerIcon,
  ExpandMore as ExpandMoreIcon,
  CloudQueue as CloudIcon,
  Architecture as ArchitectureIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes-api';
import { ClusterNode } from '../../types/dev';

interface NodeMetrics {
  cpuUsage: string;
  memoryUsage: string;
  podCount: number;
  ready: boolean;
}

const NodesManager: React.FC = () => {
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[NodesManager] Fetching nodes...');
      const nodesData = await kubernetesService.getNodes();
      console.log('[NodesManager] Retrieved nodes:', nodesData);
      setNodes(nodesData);
    } catch (err) {
      console.error('[NodesManager] Failed to fetch nodes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load nodes';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getNodeStatus = (node: ClusterNode): 'Ready' | 'NotReady' | 'Unknown' => {
    const readyCondition = node.status?.conditions?.find(c => c.type === 'Ready');
    if (!readyCondition) return 'Unknown';
    return readyCondition.status === 'True' ? 'Ready' : 'NotReady';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'success';
      case 'NotReady': return 'error';
      default: return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ready': return <CheckCircleIcon color="success" />;
      case 'NotReady': return <ErrorIcon color="error" />;
      default: return <WarningIcon color="warning" />;
    }
  };

  const formatCapacity = (capacity: Record<string, string>) => {
    return {
      cpu: capacity.cpu || 'N/A',
      memory: capacity.memory || 'N/A',
      pods: capacity.pods || 'N/A',
      storage: capacity['ephemeral-storage'] || 'N/A'
    };
  };

  const getNodeRole = (node: ClusterNode): string => {
    const labels = node.metadata?.labels || {};
    if (labels['node-role.kubernetes.io/control-plane'] !== undefined) {
      return 'Control Plane';
    }
    if (labels['node-role.kubernetes.io/master'] !== undefined) {
      return 'Master';
    }
    if (labels['node-role.kubernetes.io/worker'] !== undefined) {
      return 'Worker';
    }
    return 'Worker'; // Default to worker
  };

  const getNodeAge = (creationTimestamp?: string | Date) => {
    if (!creationTimestamp) return 'Unknown';
    
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else {
      return `${diffHours}h`;
    }
  };

  const getTotalResources = () => {
    return nodes.reduce((total, node) => {
      const capacity = formatCapacity(node.status?.capacity || {});
      return {
        cpu: total.cpu + (parseInt(capacity.cpu) || 0),
        memory: total.memory + (parseInt(capacity.memory.replace(/[^\d]/g, '')) || 0),
        pods: total.pods + (parseInt(capacity.pods) || 0)
      };
    }, { cpu: 0, memory: 0, pods: 0 });
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Cluster Nodes
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading node information from your cluster...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Cluster Nodes
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const readyNodes = nodes.filter(node => getNodeStatus(node) === 'Ready').length;
  const totalResources = getTotalResources();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cluster Nodes
      </Typography>

      {/* Cluster Summary */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <ComputerIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{nodes.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Nodes
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(readyNodes / nodes.length) * 100} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {readyNodes} of {nodes.length} ready
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CpuIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{totalResources.cpu}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total CPU Cores
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <MemoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{Math.round(totalResources.memory / 1024 / 1024)}Gi</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Memory
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <CloudIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{totalResources.pods}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Max Pods
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Nodes Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Node Details
          </Typography>
          
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>CPU</TableCell>
                  <TableCell>Memory</TableCell>
                  <TableCell>Pods</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.map((node) => {
                  const status = getNodeStatus(node);
                  const capacity = formatCapacity(node.status?.capacity || {});
                  const role = getNodeRole(node);
                  const age = getNodeAge(node.metadata?.creationTimestamp);

                  return (
                    <TableRow key={node.metadata?.name} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getStatusIcon(status)}
                          <Box ml={2}>
                            <Typography variant="body2" fontWeight="bold">
                              {node.metadata?.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {node.status?.nodeInfo?.osImage}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={status} 
                          color={getStatusColor(status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={role} 
                          variant="outlined" 
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{age}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {node.status?.nodeInfo?.kubeletVersion}
                        </Typography>
                      </TableCell>
                      <TableCell>{capacity.cpu}</TableCell>
                      <TableCell>{capacity.memory}</TableCell>
                      <TableCell>{capacity.pods}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Detailed Node Information */}
      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Detailed Node Information
        </Typography>
        
        {nodes.map((node) => (
          <Accordion key={node.metadata?.name} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                {getStatusIcon(getNodeStatus(node))}
                <Typography variant="h6" sx={{ ml: 2, flexGrow: 1 }}>
                  {node.metadata?.name}
                </Typography>
                <Chip 
                  label={getNodeRole(node)} 
                  size="small" 
                  sx={{ mr: 2 }}
                />
                <Chip 
                  label={getNodeStatus(node)} 
                  color={getStatusColor(getNodeStatus(node)) as any}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* System Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <ArchitectureIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    System Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Operating System"
                        secondary={node.status?.nodeInfo?.osImage}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Kernel Version"
                        secondary={node.status?.nodeInfo?.kernelVersion}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Container Runtime"
                        secondary={node.status?.nodeInfo?.containerRuntimeVersion}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Architecture"
                        secondary={`${node.status?.nodeInfo?.operatingSystem}/${node.status?.nodeInfo?.architecture}`}
                      />
                    </ListItem>
                  </List>
                </Grid>

                {/* Resource Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Resources
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {formatCapacity(node.status?.capacity || {}).cpu}
                        </Typography>
                        <Typography variant="caption">CPU Cores</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {formatCapacity(node.status?.capacity || {}).memory}
                        </Typography>
                        <Typography variant="caption">Memory</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {formatCapacity(node.status?.capacity || {}).pods}
                        </Typography>
                        <Typography variant="caption">Max Pods</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {Math.round(parseInt(formatCapacity(node.status?.capacity || {}).storage.replace(/[^\d]/g, '')) / 1024 / 1024)}Gi
                        </Typography>
                        <Typography variant="caption">Storage</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Conditions */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Node Conditions
                  </Typography>
                  <Grid container spacing={1}>
                    {node.status?.conditions?.map((condition, index) => (
                      <Grid item key={index}>
                        <Chip
                          label={`${condition.type}: ${condition.status}`}
                          color={condition.status === 'True' ? 'success' : condition.status === 'False' ? 'default' : 'warning'}
                          size="small"
                          variant="outlined"
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default NodesManager;