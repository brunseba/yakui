import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Dns as DnsIcon,
} from '@mui/icons-material';
import { useCluster } from '../../contexts/ClusterContext';
import { ClusterConnection, ClusterHealthCheck } from '../../types/cluster';
import { clusterService } from '../../services/clusterService';

interface HealthMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
}

const ClusterHealthMonitor: React.FC = () => {
  const { clusters, currentCluster, refreshCluster } = useCluster();
  const [healthChecks, setHealthChecks] = useState<Record<string, ClusterHealthCheck>>({});
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load initial health checks for all clusters
    loadAllHealthChecks();
  }, [clusters]);

  const loadAllHealthChecks = async () => {
    const checks: Record<string, ClusterHealthCheck> = {};
    
    await Promise.all(
      clusters.map(async (cluster) => {
        try {
          const healthCheck = await clusterService.checkClusterHealth(cluster.config.id);
          checks[cluster.config.id] = healthCheck;
        } catch (error) {
          console.error(`Failed to check health for cluster ${cluster.config.id}:`, error);
        }
      })
    );
    
    setHealthChecks(checks);
  };

  const handleRefreshClusterHealth = async (clusterId: string) => {
    setIsRefreshing(prev => ({ ...prev, [clusterId]: true }));
    
    try {
      const healthCheck = await clusterService.checkClusterHealth(clusterId);
      setHealthChecks(prev => ({ ...prev, [clusterId]: healthCheck }));
      await refreshCluster(clusterId);
    } catch (error) {
      console.error(`Failed to refresh health for cluster ${clusterId}:`, error);
    } finally {
      setIsRefreshing(prev => ({ ...prev, [clusterId]: false }));
    }
  };

  const getHealthMetrics = (cluster: ClusterConnection): HealthMetric[] => {
    const metrics: HealthMetric[] = [];
    
    if (cluster.metrics?.resources) {
      const { cpu, memory, storage } = cluster.metrics.resources;
      
      metrics.push({
        name: 'CPU Usage',
        value: cpu.usage,
        max: cpu.capacity,
        unit: 'cores',
        status: (cpu.usage / cpu.capacity) > 0.8 ? 'critical' : 
                (cpu.usage / cpu.capacity) > 0.6 ? 'warning' : 'healthy',
        icon: <SpeedIcon />,
      });

      metrics.push({
        name: 'Memory Usage',
        value: memory.usage,
        max: memory.capacity,
        unit: 'MB',
        status: (memory.usage / memory.capacity) > 0.8 ? 'critical' : 
                (memory.usage / memory.capacity) > 0.6 ? 'warning' : 'healthy',
        icon: <MemoryIcon />,
      });

      metrics.push({
        name: 'Storage Usage',
        value: storage.usage,
        max: storage.capacity,
        unit: 'GB',
        status: (storage.usage / storage.capacity) > 0.8 ? 'critical' : 
                (storage.usage / storage.capacity) > 0.6 ? 'warning' : 'healthy',
        icon: <StorageIcon />,
      });
    }

    return metrics;
  };

  const getOverallHealthStatus = (cluster: ClusterConnection): 'healthy' | 'warning' | 'critical' | 'unknown' => {
    const healthCheck = healthChecks[cluster.config.id];
    
    if (!healthCheck || cluster.status.status === 'unknown') {
      return 'unknown';
    }

    if (cluster.status.status === 'error' || !healthCheck.healthy) {
      return 'critical';
    }

    const metrics = getHealthMetrics(cluster);
    const hasWarning = metrics.some(m => m.status === 'warning');
    const hasCritical = metrics.some(m => m.status === 'critical');

    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'healthy';
  };

  const getHealthIcon = (status: 'healthy' | 'warning' | 'critical' | 'unknown') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'unknown':
      default:
        return <ScheduleIcon color="action" />;
    }
  };

  const getHealthColor = (status: 'healthy' | 'warning' | 'critical' | 'unknown') => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      case 'unknown':
      default:
        return 'default';
    }
  };

  const renderHealthCard = (cluster: ClusterConnection) => {
    const healthStatus = getOverallHealthStatus(cluster);
    const healthCheck = healthChecks[cluster.config.id];
    const metrics = getHealthMetrics(cluster);
    const isExpanded = expandedCluster === cluster.config.id;
    const isCurrentCluster = cluster.config.id === currentCluster?.config.id;

    return (
      <Card 
        key={cluster.config.id}
        sx={{ 
          border: isCurrentCluster ? 2 : 1,
          borderColor: isCurrentCluster ? 'primary.main' : 'divider',
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              {getHealthIcon(healthStatus)}
              <Typography variant="h6">
                {cluster.config.displayName || cluster.config.name}
              </Typography>
              {isCurrentCluster && (
                <Chip size="small" label="Current" color="primary" variant="outlined" />
              )}
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                size="small" 
                label={healthStatus} 
                color={getHealthColor(healthStatus) as any}
                variant="outlined"
              />
              <IconButton 
                size="small" 
                onClick={() => handleRefreshClusterHealth(cluster.config.id)}
                disabled={isRefreshing[cluster.config.id]}
              >
                {isRefreshing[cluster.config.id] ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setExpandedCluster(isExpanded ? null : cluster.config.id)}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Basic Info */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status: {cluster.status.status}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Response: {cluster.status.responseTime ? `${Math.round(cluster.status.responseTime)}ms` : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Version: {cluster.status.version || 'Unknown'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Last Check: {new Date(cluster.status.lastChecked).toLocaleTimeString()}
              </Typography>
            </Grid>
          </Grid>

          {/* Resource Metrics */}
          {metrics.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>
                Resource Usage
              </Typography>
              <Grid container spacing={1}>
                {metrics.map((metric) => {
                  const percentage = (metric.value / metric.max) * 100;
                  return (
                    <Grid item xs={4} key={metric.name}>
                      <Box textAlign="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={0.5}>
                          {metric.icon}
                          <Typography variant="caption">
                            {metric.name}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          color={metric.status === 'critical' ? 'error' : metric.status === 'warning' ? 'warning' : 'success'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {metric.value.toFixed(1)} / {metric.max} {metric.unit}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* Errors */}
          {cluster.status.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cluster.status.error}
            </Alert>
          )}

          {/* Expanded Details */}
          <Collapse in={isExpanded}>
            {healthCheck && (
              <Box>
                <Typography variant="subtitle2" mb={1}>
                  Health Checks
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>API Server</TableCell>
                        <TableCell>
                          {healthCheck.checks.apiServer ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Nodes</TableCell>
                        <TableCell>
                          {healthCheck.checks.nodes ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>CoreDNS</TableCell>
                        <TableCell>
                          {healthCheck.checks.coreDNS ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Networking</TableCell>
                        <TableCell>
                          {healthCheck.checks.networking ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {healthCheck.errors && healthCheck.errors.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" mb={1}>
                      Issues
                    </Typography>
                    {healthCheck.errors.map((error, index) => (
                      <Alert key={index} severity="error" sx={{ mb: 1 }}>
                        {error}
                      </Alert>
                    ))}
                  </Box>
                )}

                {cluster.metrics && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" mb={1}>
                      Cluster Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="body2">
                          <strong>Nodes:</strong> {cluster.metrics.nodes.ready}/{cluster.metrics.nodes.total} ready
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">
                          <strong>Pods:</strong> {cluster.metrics.pods.running}/{cluster.metrics.pods.total} running
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">
                          <strong>Namespaces:</strong> {cluster.metrics.namespaces.active}/{cluster.metrics.namespaces.total} active
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const healthyClusters = clusters.filter(c => getOverallHealthStatus(c) === 'healthy').length;
  const warningClusters = clusters.filter(c => getOverallHealthStatus(c) === 'warning').length;
  const criticalClusters = clusters.filter(c => getOverallHealthStatus(c) === 'critical').length;
  const unknownClusters = clusters.filter(c => getOverallHealthStatus(c) === 'unknown').length;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Cluster Health Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor the health and performance of all your Kubernetes clusters
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadAllHealthChecks}
        >
          Refresh All
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" color="success.main">
              {healthyClusters}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Healthy
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <WarningIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {warningClusters}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Warning
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <ErrorIcon color="error" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" color="error.main">
              {criticalClusters}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Critical
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <ScheduleIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" color="text.secondary">
              {unknownClusters}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unknown
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Cluster Health Cards */}
      <Box display="flex" flexDirection="column" gap={2}>
        {clusters.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No clusters configured
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add clusters to monitor their health and performance.
            </Typography>
          </Paper>
        ) : (
          clusters
            .sort((a, b) => {
              // Sort by health status (critical first, then warning, then healthy)
              const statusOrder = { critical: 0, warning: 1, healthy: 2, unknown: 3 };
              const aStatus = getOverallHealthStatus(a);
              const bStatus = getOverallHealthStatus(b);
              return statusOrder[aStatus] - statusOrder[bStatus];
            })
            .map(renderHealthCard)
        )}
      </Box>
    </Box>
  );
};

export default ClusterHealthMonitor;