import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Storage as StorageIcon,
  ViewModule as ViewModuleIcon,
  Folder as FolderIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { StorageStatistics, StorageViewType } from '../../types/storage';
import { storageService } from '../../services/storageService';
import PersistentVolumeManager from './PersistentVolumeManager';
import PersistentVolumeClaimsManager from './PersistentVolumeClaimsManager';
import StorageClassManager from './StorageClassManager';

const storageViews: StorageViewType[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <StorageIcon />,
    path: '/storage'
  },
  {
    id: 'persistent-volumes',
    label: 'Persistent Volumes',
    icon: <StorageIcon />,
    path: '/storage/persistent-volumes'
  },
  {
    id: 'persistent-volume-claims',
    label: 'PV Claims',
    icon: <ViewModuleIcon />,
    path: '/storage/persistent-volume-claims'
  },
  {
    id: 'storage-classes',
    label: 'Storage Classes',
    icon: <FolderIcon />,
    path: '/storage/storage-classes'
  }
];

interface StorageManagerProps {
  initialView?: 'overview' | 'persistent-volumes' | 'persistent-volume-claims' | 'storage-classes';
}

const StorageManager: React.FC<StorageManagerProps> = ({ initialView = 'overview' }) => {
  const theme = useTheme();
  const [currentView, setCurrentView] = useState(initialView);

  const {
    data: statistics,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['storage-statistics'],
    queryFn: () => storageService.getStorageStatistics(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setCurrentView(newValue as typeof currentView);
  };

  const handleRefresh = () => {
    refetchStats();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'bound':
      case 'available':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'lost':
        return 'error';
      case 'released':
        return 'info';
      default:
        return 'default';
    }
  };

  const renderOverview = () => {
    if (isLoadingStats) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      );
    }

    if (statsError) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load storage statistics. Please try again.
        </Alert>
      );
    }

    if (!statistics) {
      return null;
    }

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total PVs
                    </Typography>
                    <Typography variant="h4" component="div">
                      {statistics.totalPVs}
                    </Typography>
                  </Box>
                  <StorageIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total PVCs
                    </Typography>
                    <Typography variant="h4" component="div">
                      {statistics.totalPVCs}
                    </Typography>
                  </Box>
                  <ViewModuleIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Storage Classes
                    </Typography>
                    <Typography variant="h4" component="div">
                      {statistics.totalStorageClasses}
                    </Typography>
                  </Box>
                  <FolderIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Utilization
                    </Typography>
                    <Typography variant="h4" component="div">
                      {Math.round(statistics.utilizationPercentage)}%
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Capacity Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Storage Capacity
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Used: {statistics.usedCapacity}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total: {statistics.totalCapacity}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={statistics.utilizationPercentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: statistics.utilizationPercentage > 80 
                        ? theme.palette.error.main 
                        : statistics.utilizationPercentage > 60
                        ? theme.palette.warning.main
                        : theme.palette.success.main
                    }
                  }}
                />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Available: {statistics.availableCapacity}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Resource Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2">PVs Available</Typography>
                  <Chip 
                    label={statistics.pvsByStatus.available}
                    color={getStatusColor('available')}
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2">PVs Bound</Typography>
                  <Chip 
                    label={statistics.pvsByStatus.bound}
                    color={getStatusColor('bound')}
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2">PVCs Pending</Typography>
                  <Chip 
                    label={statistics.pvcsByStatus.pending}
                    color={getStatusColor('pending')}
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">PVCs Bound</Typography>
                  <Chip 
                    label={statistics.pvcsByStatus.bound}
                    color={getStatusColor('bound')}
                    size="small"
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Storage Class Distribution & Top Namespaces */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Storage Classes
              </Typography>
              <Box sx={{ mt: 2 }}>
                {statistics.storageClassDistribution.map((sc) => (
                  <Box 
                    key={sc.name}
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {sc.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {sc.provisioner}
                      </Typography>
                    </Box>
                    <Chip label={`${sc.count} PVs`} size="small" variant="outlined" />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Namespaces by Usage
              </Typography>
              <Box sx={{ mt: 2 }}>
                {statistics.topNamespacesByUsage.map((ns) => (
                  <Box 
                    key={ns.namespace}
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {ns.namespace}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {ns.pvcCount} PVCs
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="primary">
                      {ns.usage}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'persistent-volumes':
        return <PersistentVolumeManager />;
      case 'persistent-volume-claims':
        return <PersistentVolumeClaimsManager />;
      case 'storage-classes':
        return <StorageClassManager />;
      default:
        return renderOverview();
    }
  };

  return (
    <Box>
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" component="h1" gutterBottom>
              Storage Management
            </Typography>
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} disabled={isLoadingStats}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Tabs
            value={currentView}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mt: 1 }}
          >
            {storageViews.map((view) => (
              <Tab
                key={view.id}
                value={view.id}
                label={view.label}
                icon={view.icon}
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default StorageManager;