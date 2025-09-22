import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Computer as NodeIcon,
  Dns as DnsIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Timeline as MetricsIcon,
  Settings as ConfigIcon,
} from '@mui/icons-material';
import { ClusterConnection, ClusterHealthCheck, ClusterMetrics } from '../../types/cluster';
import { clusterService } from '../../services/clusterService';

interface ClusterViewProps {
  clusterId: string;
  onBack: () => void;
  onEdit: (cluster: ClusterConnection) => void;
}

const ClusterView: React.FC<ClusterViewProps> = ({ clusterId, onBack, onEdit }) => {
  const [cluster, setCluster] = useState<ClusterConnection | null>(null);
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [healthCheck, setHealthCheck] = useState<ClusterHealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClusterData();
  }, [clusterId]);

  const loadClusterData = async () => {
    try {
      setLoading(true);
      setError(null);

      const clusterData = await clusterService.getCluster(clusterId);
      if (!clusterData) {
        throw new Error('Cluster not found');
      }

      setCluster(clusterData);

      // Load metrics and health check in parallel
      const [metricsResult, healthResult] = await Promise.allSettled([
        clusterService.getClusterMetrics(clusterId),
        clusterService.checkClusterHealth(clusterId),
      ]);

      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value);
      }

      if (healthResult.status === 'fulfilled') {
        setHealthCheck(healthResult.value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cluster data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await clusterService.refreshCluster(clusterId);
      await loadClusterData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh cluster');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'error':
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <HealthyIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'error':
      case 'disconnected':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const renderHealthChecks = () => {
    if (!healthCheck) return null;

    const checks = Object.entries(healthCheck.checks).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      status: value,
      icon: value ? <HealthyIcon color="success" /> : <ErrorIcon color="error" />,
    }));

    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <NetworkIcon color="primary" />
            <Typography variant="h6">Health Checks</Typography>
          </Box>
          <Grid container spacing={2}>
            {checks.map((check) => (
              <Grid item xs={12} sm={6} md={3} key={check.name}>
                <Box display="flex" alignItems="center" gap={1}>
                  {check.icon}
                  <Typography variant="body2">{check.name}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {healthCheck.errors && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Issues Found:
              </Typography>
              <List dense>
                {healthCheck.errors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemText primary={error} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Last checked: {formatDate(healthCheck.timestamp)}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    const getUsagePercentage = (used: number, total: number) => {
      return total > 0 ? Math.round((used / total) * 100) : 0;
    };

    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <MetricsIcon color="primary" />
            <Typography variant="h6">Resource Overview</Typography>
          </Box>
          
          <Grid container spacing={3}>
            {/* Nodes */}
            <Grid item xs={12} md={4}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <NodeIcon />
                  <Typography variant="subtitle2">Nodes</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {metrics.nodes.ready}/{metrics.nodes.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.nodes.notReady > 0 && `${metrics.nodes.notReady} not ready`}
                </Typography>
                {metrics.nodes.total > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(metrics.nodes.ready, metrics.nodes.total)}
                    color={metrics.nodes.notReady > 0 ? "warning" : "success"}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>

            {/* Namespaces */}
            <Grid item xs={12} md={4}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <StorageIcon />
                  <Typography variant="subtitle2">Namespaces</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {metrics.namespaces.active}/{metrics.namespaces.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.namespaces.terminating > 0 && `${metrics.namespaces.terminating} terminating`}
                </Typography>
                {metrics.namespaces.total > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(metrics.namespaces.active, metrics.namespaces.total)}
                    color="success"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>

            {/* Pods */}
            <Grid item xs={12} md={4}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <MemoryIcon />
                  <Typography variant="subtitle2">Pods</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {metrics.pods.running}/{metrics.pods.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.pods.pending > 0 && `${metrics.pods.pending} pending`}
                  {metrics.pods.failed > 0 && `, ${metrics.pods.failed} failed`}
                </Typography>
                {metrics.pods.total > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(metrics.pods.running, metrics.pods.total)}
                    color={metrics.pods.failed > 0 ? "error" : metrics.pods.pending > 0 ? "warning" : "success"}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
          
          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Last updated: {formatDate(metrics.timestamp)}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const renderConfiguration = () => {
    if (!cluster) return null;

    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ConfigIcon color="primary" />
            <Typography variant="h6">Configuration</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Basic Information</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell>{cluster.config.name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Display Name</strong></TableCell>
                      <TableCell>{cluster.config.displayName || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Server</strong></TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>
                        {cluster.config.server}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Provider</strong></TableCell>
                      <TableCell>
                        <Chip size="small" label={cluster.config.provider || 'Unknown'} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Environment</strong></TableCell>
                      <TableCell>
                        <Chip size="small" label={cluster.config.environment || 'Unknown'} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Status Information</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell>
                        <Chip 
                          icon={getStatusIcon(cluster.status.status)}
                          label={cluster.status.status}
                          color={getStatusColor(cluster.status.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Version</strong></TableCell>
                      <TableCell>{cluster.status.version || 'Unknown'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Response Time</strong></TableCell>
                      <TableCell>
                        {cluster.status.responseTime 
                          ? `${Math.round(cluster.status.responseTime)}ms`
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Last Checked</strong></TableCell>
                      <TableCell>{formatDate(cluster.status.lastChecked)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Created</strong></TableCell>
                      <TableCell>{formatDate(cluster.config.createdAt)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {cluster.config.description && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Description</Typography>
              <Typography variant="body2" color="text.secondary">
                {cluster.config.description}
              </Typography>
            </Box>
          )}

          {Object.keys(cluster.config.tags || {}).length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Tags</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {Object.entries(cluster.config.tags || {}).map(([key, value]) => (
                  <Chip key={key} size="small" label={`${key}: ${value}`} variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button startIcon={<BackIcon />} onClick={onBack}>
            Back to Clusters
          </Button>
        </Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!cluster) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button startIcon={<BackIcon />} onClick={onBack}>
            Back to Clusters
          </Button>
        </Box>
        <Alert severity="warning">Cluster not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<BackIcon />} onClick={onBack}>
            Back to Clusters
          </Button>
          <Box>
            <Typography variant="h4">
              {cluster.config.displayName || cluster.config.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {cluster.config.description || cluster.config.server}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh cluster data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => onEdit(cluster)}
          >
            Edit Cluster
          </Button>
        </Box>
      </Box>

      {/* Loading indicator for refresh */}
      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error message */}
      {cluster.status.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Cluster Error</Typography>
          {cluster.status.error}
        </Alert>
      )}

      {/* Content */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {renderConfiguration()}
        </Grid>
        
        <Grid item xs={12} lg={6}>
          {renderHealthChecks()}
        </Grid>
        
        <Grid item xs={12} lg={6}>
          {renderMetrics()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClusterView;