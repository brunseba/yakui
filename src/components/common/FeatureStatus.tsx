import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Dashboard as DashboardIcon,
  AccountTree as AccountTreeIcon,
  Dns as DnsIcon,
  Apps as AppsIcon,
  Extension as ExtensionIcon,
  Security as SecurityIcon,
  Monitor as MonitorIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

interface FeatureItem {
  id: number;
  name: string;
  status: 'implemented' | 'coming-soon';
  description: string;
  icon: React.ReactElement;
  paths?: string[];
}

const features: FeatureItem[] = [
  {
    id: 1,
    name: 'Dashboard',
    status: 'implemented',
    description: 'Real-time cluster overview with metrics from your kind-krateo-quickstart cluster',
    icon: <DashboardIcon />,
    paths: ['/dashboard']
  },
  {
    id: 2,
    name: 'Cluster Management',
    status: 'implemented',
    description: 'Full cluster nodes management and topology visualization with real-time data',
    icon: <AccountTreeIcon />,
    paths: ['/cluster/nodes', '/cluster/topology']
  },
  {
    id: 3,
    name: 'Namespace Management',
    status: 'implemented',
    description: 'Create, view, and manage Kubernetes namespaces',
    icon: <DnsIcon />,
    paths: ['/namespaces']
  },
  {
    id: 4,
    name: 'Workload Management',
    status: 'coming-soon',
    description: 'Manage pods, deployments, and services',
    icon: <AppsIcon />,
    paths: ['/workloads/deployments', '/workloads/pods', '/workloads/services']
  },
  {
    id: 5,
    name: 'Custom Resources',
    status: 'implemented',
    description: 'View and manage custom resource definitions (CRDs)',
    icon: <ExtensionIcon />,
    paths: ['/crds']
  },
  {
    id: 6,
    name: 'RBAC Management',
    status: 'implemented',
    description: 'Manage roles, role bindings, and service accounts',
    icon: <SecurityIcon />,
    paths: ['/rbac/users', '/rbac/roles', '/rbac/bindings']
  },
  {
    id: 7,
    name: 'Monitoring',
    status: 'coming-soon',
    description: 'View cluster events, logs, and metrics',
    icon: <MonitorIcon />,
    paths: ['/monitoring/events', '/monitoring/logs', '/monitoring/metrics']
  },
  {
    id: 8,
    name: 'Security',
    status: 'implemented',
    description: 'Security overview, vulnerability scanning, and compliance',
    icon: <ShieldIcon />,
    paths: ['/security', '/security/scanning', '/security/compliance']
  },
  {
    id: 9,
    name: 'Storage Management',
    status: 'coming-soon',
    description: 'Manage persistent volumes, PVCs, and storage classes',
    icon: <StorageIcon />,
    paths: ['/storage/persistent-volumes', '/storage/persistent-volume-claims', '/storage/storage-classes']
  },
  {
    id: 10,
    name: 'Configuration',
    status: 'coming-soon',
    description: 'Manage ConfigMaps and Secrets',
    icon: <SettingsIcon />,
    paths: ['/configuration/configmaps', '/configuration/secrets']
  },
  {
    id: 11,
    name: 'Resource Management',
    status: 'coming-soon',
    description: 'Resource quotas, limits, and priority classes',
    icon: <TuneIcon />,
    paths: ['/resources/quotas', '/resources/limits', '/resources/priority-classes']
  }
];

interface FeatureStatusProps {
  title?: string;
  showOnlyStatus?: 'implemented' | 'coming-soon';
}

const FeatureStatus: React.FC<FeatureStatusProps> = ({ 
  title = "Kubernetes Admin UI - Feature Status", 
  showOnlyStatus 
}) => {
  const filteredFeatures = showOnlyStatus 
    ? features.filter(f => f.status === showOnlyStatus)
    : features;

  const implementedCount = features.filter(f => f.status === 'implemented').length;
  const totalCount = features.length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>{implementedCount} of {totalCount} features</strong> are implemented and working with your{' '}
          <strong>kind-krateo-quickstart</strong> cluster.
        </Typography>
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Chip 
          icon={<CheckCircleIcon />} 
          label={`${implementedCount} Implemented`} 
          color="success" 
          sx={{ mr: 1 }}
        />
        <Chip 
          icon={<ScheduleIcon />} 
          label={`${totalCount - implementedCount} Coming Soon`} 
          color="warning" 
        />
      </Box>

      <List>
        {filteredFeatures.map((feature) => (
          <ListItem key={feature.id}>
            <ListItemIcon>
              {feature.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {feature.id}. {feature.name}
                  </Typography>
                  <Chip
                    size="small"
                    icon={feature.status === 'implemented' ? <CheckCircleIcon /> : <ScheduleIcon />}
                    label={feature.status === 'implemented' ? 'Working' : 'Coming Soon'}
                    color={feature.status === 'implemented' ? 'success' : 'warning'}
                  />
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    {feature.description}
                  </Typography>
                  {feature.paths && (
                    <Box mt={1}>
                      <Typography variant="caption" color="textSecondary">
                        Routes: {feature.paths.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default FeatureStatus;