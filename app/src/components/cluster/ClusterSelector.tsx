import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  Chip,
  Avatar,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  ListItemButton,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useCluster } from '../../contexts/ClusterContext';
import { ClusterConnection, ClusterStatusType } from '../../types/cluster';

interface ClusterSelectorProps {
  variant?: 'header' | 'sidebar' | 'compact';
  showAddButton?: boolean;
  onAddCluster?: () => void;
  onManageClusters?: () => void;
}

const ClusterSelector: React.FC<ClusterSelectorProps> = ({
  variant = 'header',
  showAddButton = true,
  onAddCluster,
  onManageClusters,
}) => {
  const { 
    clusters, 
    currentCluster, 
    isLoading, 
    error, 
    switchCluster, 
    refreshAllClusters 
  } = useCluster();
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClusterSelect = async (clusterId: string) => {
    try {
      // Don't try to switch if clusterId is empty or invalid
      if (!clusterId || clusterId.trim() === '') {
        console.warn('Invalid cluster ID provided:', clusterId);
        return;
      }
      
      console.log('Attempting to switch to cluster:', clusterId);
      await switchCluster(clusterId);
      setMenuAnchorEl(null);
    } catch (error) {
      console.error('Error switching cluster:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllClusters();
    } catch (error) {
      console.error('Error refreshing clusters:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'aws':
        return '🟠'; // AWS orange
      case 'gcp':
        return '🔵'; // GCP blue
      case 'azure':
        return '🟢'; // Azure blue
      case 'local':
        return '🖥️'; // Local
      default:
        return '☁️'; // Generic cloud
    }
  };

  const getStatusIcon = (status: ClusterStatusType) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'disconnected':
        return <CloudOffIcon color="action" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'unknown':
      default:
        return <ScheduleIcon color="action" fontSize="small" />;
    }
  };

  const getStatusColor = (status: ClusterStatusType) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      case 'unknown':
      default:
        return 'warning';
    }
  };

  const formatLastChecked = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (isLoading && clusters.length === 0) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading clusters...
        </Typography>
      </Box>
    );
  }

  if (error && clusters.length === 0) {
    return (
      <Alert severity="error" variant="outlined" sx={{ maxWidth: 300 }}>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (clusters.length === 0) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" color="text.secondary">
          No clusters configured
        </Typography>
        {showAddButton && onAddCluster && (
          <IconButton size="small" onClick={onAddCluster}>
            <AddIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Compact variant for smaller spaces
  if (variant === 'compact') {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title={currentCluster?.config.displayName || currentCluster?.config.name || 'No cluster selected'}>
          <Chip
            size="small"
            avatar={
              <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                {getProviderIcon(currentCluster?.config.provider)}
              </Avatar>
            }
            label={(typeof currentCluster?.config.name === 'string' ? currentCluster.config.name.substring(0, 8) : 'None')}
            color={currentCluster ? getStatusColor(currentCluster.status.status) : 'default'}
            onClick={handleMenuOpen}
          />
        </Tooltip>
        
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          PaperProps={{ sx: { minWidth: 280 } }}
        >
          {clusters.map((cluster) => (
            <MenuItem
              key={cluster.config.id}
              selected={cluster.config.id === currentCluster?.config.id}
              onClick={() => handleClusterSelect(cluster.config.id)}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {getStatusIcon(cluster.status.status)}
              </ListItemIcon>
              <ListItemText
                primary={cluster.config.displayName || cluster.config.name}
                secondary={cluster.config.environment}
              />
              <Typography variant="body2" color="text.secondary">
                {getProviderIcon(cluster.config.provider)}
              </Typography>
            </MenuItem>
          ))}
          
          <Divider />
          
          <MenuItem onClick={handleRefresh} disabled={isRefreshing}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {isRefreshing ? (
                <CircularProgress size={16} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText primary="Refresh All" />
          </MenuItem>
          
          {onManageClusters && (
            <MenuItem onClick={() => { onManageClusters(); handleMenuClose(); }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Manage Clusters" />
            </MenuItem>
          )}
          
          {showAddButton && onAddCluster && (
            <MenuItem onClick={() => { onAddCluster(); handleMenuClose(); }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Add Cluster" />
            </MenuItem>
          )}
        </Menu>
      </Box>
    );
  }

  // Full variant for header/sidebar
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1}>
        <FormControl sx={{ minWidth: 200 }}>
          <Select
            value={currentCluster?.config.id || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value && typeof value === 'string') {
                handleClusterSelect(value);
              }
            }}
            displayEmpty
            size="small"
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            {!currentCluster && (
              <MenuItem key="empty" value="" disabled>
                <em>Select a cluster</em>
              </MenuItem>
            )}
            
            {clusters.map((cluster) => (
              <MenuItem key={cluster.config.id} value={cluster.config.id}>
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(cluster.status.status)}
                    <Typography variant="body2">
                      {getProviderIcon(cluster.config.provider)}
                    </Typography>
                  </Box>
                  
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {cluster.config.displayName || cluster.config.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cluster.config.environment} • {formatLastChecked(cluster.status.lastChecked)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {cluster.config.isDefault && (
                      <Tooltip title="Default cluster">
                        <Chip size="small" label="Default" color="primary" variant="outlined" />
                      </Tooltip>
                    )}
                    
                    {cluster.status.responseTime && (
                      <Tooltip title={`Response time: ${Math.round(cluster.status.responseTime)}ms`}>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(cluster.status.responseTime)}ms
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Action buttons */}
        <IconButton 
          size="small" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          title="Refresh All Clusters"
        >
          {isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
        
        {onManageClusters && (
          <IconButton size="small" onClick={onManageClusters} title="Manage Clusters">
            <SettingsIcon fontSize="small" />
          </IconButton>
        )}
        
        {showAddButton && onAddCluster && (
          <IconButton size="small" onClick={onAddCluster} title="Add Cluster">
            <AddIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Current cluster info */}
      {currentCluster && variant !== 'compact' && (
        <Box mt={1} display="flex" alignItems="center" gap={1}>
          <Chip
            size="small"
            icon={getStatusIcon(currentCluster.status.status)}
            label={currentCluster.status.status}
            color={getStatusColor(currentCluster.status.status)}
            variant="outlined"
          />
          
          {currentCluster.status.nodeCount && (
            <Tooltip title="Nodes">
              <Chip
                size="small"
                label={`${currentCluster.status.nodeCount} nodes`}
                variant="outlined"
              />
            </Tooltip>
          )}
          
          {currentCluster.status.version && (
            <Tooltip title="Kubernetes version">
              <Chip
                size="small"
                label={currentCluster.status.version}
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
      )}
      
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }} variant="outlined">
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ClusterSelector;