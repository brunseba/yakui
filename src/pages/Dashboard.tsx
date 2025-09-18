import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  LinearProgress,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Storage as StorageIcon,
  Dns as DnsIcon,
  Extension as ExtensionIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { kubernetesService } from '../services/kubernetes';
import { ClusterNode, NamespaceWithMetrics, CRDWithInstances, ClusterEvent } from '../types';

interface ClusterStats {
  totalNodes: number;
  readyNodes: number;
  totalNamespaces: number;
  totalCRDs: number;
  recentEvents: ClusterEvent[];
}

const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const [stats, setStats] = useState<ClusterStats>({
    totalNodes: 0,
    readyNodes: 0,
    totalNamespaces: 0,
    totalCRDs: 0,
    recentEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClusterStats = async () => {
      if (!authState.isAuthenticated) return;

      try {
        setLoading(true);
        const [nodes, namespaces, crds, events] = await Promise.all([
          kubernetesService.getNodes(),
          kubernetesService.getNamespaces(),
          kubernetesService.getCRDs(),
          kubernetesService.getEvents()
        ]);

        const readyNodes = nodes.filter(node => 
          node.status.conditions.some(condition => 
            condition.type === 'Ready' && condition.status === 'True'
          )
        ).length;

        const recentEvents = events
          .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime())
          .slice(0, 10);

        setStats({
          totalNodes: nodes.length,
          readyNodes,
          totalNamespaces: namespaces.length,
          totalCRDs: crds.length,
          recentEvents
        });
      } catch (err) {
        console.error('Failed to fetch cluster stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cluster data');
      } finally {
        setLoading(false);
      }
    };

    fetchClusterStats();
  }, [authState.isAuthenticated]);

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = 'primary.main',
    progress 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactElement;
    color?: string;
    progress?: number;
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography variant="h6" color="textSecondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        )}
        {progress !== undefined && (
          <Box mt={2}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {progress.toFixed(1)}% ready
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const nodeHealthPercentage = stats.totalNodes > 0 
    ? (stats.readyNodes / stats.totalNodes) * 100 
    : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {authState.cluster && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Cluster: {authState.cluster.name}
          </Typography>
          <Box display="flex" gap={1}>
            <Chip 
              label={`Server: ${authState.cluster.server}`} 
              variant="outlined" 
              size="small"
            />
            <Chip 
              label={`Version: ${authState.cluster.version}`} 
              variant="outlined" 
              size="small"
            />
          </Box>
        </Box>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Nodes"
            value={stats.totalNodes}
            subtitle={`${stats.readyNodes} ready`}
            icon={<StorageIcon />}
            color="success.main"
            progress={nodeHealthPercentage}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Namespaces"
            value={stats.totalNamespaces}
            icon={<DnsIcon />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Custom Resources"
            value={stats.totalCRDs}
            subtitle="CRD definitions"
            icon={<ExtensionIcon />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cluster Health"
            value={nodeHealthPercentage > 80 ? 'Healthy' : 'Warning'}
            subtitle={`${stats.readyNodes}/${stats.totalNodes} nodes ready`}
            icon={nodeHealthPercentage > 80 ? <CheckCircleIcon /> : <WarningIcon />}
            color={nodeHealthPercentage > 80 ? 'success.main' : 'warning.main'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Events
              </Typography>
              {stats.recentEvents.length === 0 ? (
                <Typography color="textSecondary">
                  No recent events found
                </Typography>
              ) : (
                <List>
                  {stats.recentEvents.map((event, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        {event.type === 'Warning' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <CheckCircleIcon color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">
                              {event.reason}
                            </Typography>
                            <Chip 
                              label={event.type} 
                              size="small" 
                              color={event.type === 'Warning' ? 'error' : 'success'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {event.message}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {event.object} • {new Date(event.lastTimestamp).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Cluster management shortcuts will be available here.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;