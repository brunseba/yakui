import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudOff as CloudOffIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  PlayArrow as ConnectIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CloudUpload as ImportIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useCluster } from '../../contexts/ClusterContext';
import { ClusterConnection, ClusterListFilters } from '../../types/cluster';
import { clusterService } from '../../services/clusterService';
import AddClusterModal from './AddClusterModal';
import ClusterView from './ClusterView';
import ClusterEditForm from './ClusterEditForm';

const ClusterManager: React.FC = () => {
  const {
    clusters,
    currentCluster,
    isLoading,
    error,
    switchCluster,
    removeCluster,
    refreshCluster,
    refreshAllClusters,
    setDefaultCluster,
  } = useCluster();

  const [filters, setFilters] = useState<ClusterListFilters>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<ClusterConnection | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterConnection | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [addClusterModalOpen, setAddClusterModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'view' | 'edit'>('list');
  const [viewClusterId, setViewClusterId] = useState<string | null>(null);
  const [editCluster, setEditCluster] = useState<ClusterConnection | null>(null);

  const filteredClusters = clusters.filter((cluster) => {
    if (filters.provider && cluster.config.provider !== filters.provider) return false;
    if (filters.environment && cluster.config.environment !== filters.environment) return false;
    if (filters.status && cluster.status.status !== filters.status) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        cluster.config.name.toLowerCase().includes(search) ||
        cluster.config.displayName?.toLowerCase().includes(search) ||
        cluster.config.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleDeleteCluster = (cluster: ClusterConnection) => {
    setClusterToDelete(cluster);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDeleteCluster = async () => {
    if (!clusterToDelete) return;

    try {
      await removeCluster(clusterToDelete.config.id);
      setDeleteDialogOpen(false);
      setClusterToDelete(null);
    } catch (error) {
      console.error('Error deleting cluster:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cluster: ClusterConnection) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedCluster(cluster);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedCluster(null);
  };

  const handleSetDefault = async (clusterId: string) => {
    try {
      await setDefaultCluster(clusterId);
      handleMenuClose();
    } catch (error) {
      console.error('Error setting default cluster:', error);
    }
  };

  const handleRefreshCluster = async (clusterId: string) => {
    try {
      await refreshCluster(clusterId);
      handleMenuClose();
    } catch (error) {
      console.error('Error refreshing cluster:', error);
    }
  };

  const handleConnectCluster = async (clusterId: string) => {
    try {
      await switchCluster(clusterId);
      handleMenuClose();
    } catch (error) {
      console.error('Error connecting to cluster:', error);
    }
  };

  const handleAddCluster = () => {
    setAddClusterModalOpen(true);
  };

  const handleClusterAdded = (cluster: ClusterConnection) => {
    console.log('Cluster added successfully:', cluster);
    // The cluster is already added via the context in the modal
  };

  const handleViewCluster = (clusterId: string) => {
    setViewClusterId(clusterId);
    setCurrentView('view');
    handleMenuClose();
  };

  const handleEditCluster = (cluster: ClusterConnection) => {
    setEditCluster(cluster);
    setCurrentView('edit');
    handleMenuClose();
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setViewClusterId(null);
    setEditCluster(null);
  };

  const handleClusterUpdated = (updatedCluster: ClusterConnection) => {
    console.log('Cluster updated successfully:', updatedCluster);
    setCurrentView('list');
    setEditCluster(null);
    // The cluster is already updated via the context
  };

  const handleEditFromView = (cluster: ClusterConnection) => {
    setEditCluster(cluster);
    setCurrentView('edit');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'disconnected':
        return <CloudOffIcon color="action" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'unknown':
      default:
        return <ScheduleIcon color="action" />;
    }
  };

  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'aws':
        return '🟠';
      case 'gcp':
        return '🔵';
      case 'azure':
        return '🟢';
      case 'local':
        return '🖥️';
      default:
        return '☁️';
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

  const getUniqueProviders = () => {
    return Array.from(new Set(clusters.map(c => c.config.provider).filter(Boolean)));
  };

  const getUniqueEnvironments = () => {
    return Array.from(new Set(clusters.map(c => c.config.environment).filter(Boolean)));
  };

  const getUniqueStatuses = () => {
    return Array.from(new Set(clusters.map(c => c.status.status)));
  };

  const renderClusterCard = (cluster: ClusterConnection) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={cluster.config.id}>
      <Card 
        sx={{ 
          height: '100%',
          position: 'relative',
          border: cluster.config.id === currentCluster?.config.id ? 2 : 1,
          borderColor: cluster.config.id === currentCluster?.config.id ? 'primary.main' : 'divider',
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="between" alignItems="flex-start" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              {getStatusIcon(cluster.status.status)}
              <Typography variant="body2">
                {getProviderIcon(cluster.config.provider)}
              </Typography>
              {cluster.config.isDefault && (
                <Tooltip title="Default cluster">
                  <StarIcon color="primary" fontSize="small" />
                </Tooltip>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, cluster)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="h6" noWrap mb={0.5}>
            {cluster.config.displayName || cluster.config.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={1}>
            {cluster.config.description || cluster.config.server}
          </Typography>

          <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
            <Chip 
              size="small" 
              label={cluster.config.environment} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              size="small" 
              label={cluster.status.status} 
              color={
                cluster.status.status === 'connected' ? 'success' :
                cluster.status.status === 'error' ? 'error' : 'default'
              }
              variant="outlined"
            />
          </Box>

          <Box mb={1}>
            <Typography variant="caption" color="text.secondary">
              Version: {cluster.status.version || 'Unknown'}
            </Typography>
          </Box>

          <Box display="flex" justify="between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Last checked: {formatLastChecked(cluster.status.lastChecked)}
            </Typography>
            {cluster.status.responseTime && (
              <Typography variant="caption" color="text.secondary">
                {Math.round(cluster.status.responseTime)}ms
              </Typography>
            )}
          </Box>

          {cluster.status.error && (
            <Alert severity="error" sx={{ mt: 1 }} variant="outlined">
              <Typography variant="caption">{cluster.status.error}</Typography>
            </Alert>
          )}

          <Box mt={1} display="flex" gap={0.5}>
            {cluster.status.nodeCount && (
              <Tooltip title="Nodes">
                <Chip size="small" label={`${cluster.status.nodeCount} nodes`} />
              </Tooltip>
            )}
            {cluster.status.namespaceCount && (
              <Tooltip title="Namespaces">
                <Chip size="small" label={`${cluster.status.namespaceCount} ns`} />
              </Tooltip>
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Button
            size="small"
            onClick={() => handleConnectCluster(cluster.config.id)}
            disabled={cluster.config.id === currentCluster?.config.id}
            startIcon={<ConnectIcon />}
          >
            {cluster.config.id === currentCluster?.config.id ? 'Connected' : 'Connect'}
          </Button>
          <Button
            size="small"
            onClick={() => handleRefreshCluster(cluster.config.id)}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderClusterTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Environment</TableCell>
            <TableCell>Version</TableCell>
            <TableCell>Resources</TableCell>
            <TableCell>Last Checked</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredClusters.map((cluster) => (
            <TableRow 
              key={cluster.config.id}
              selected={cluster.config.id === currentCluster?.config.id}
            >
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  {getStatusIcon(cluster.status.status)}
                  <Typography variant="body2" textTransform="capitalize">
                    {cluster.status.status}
                  </Typography>
                  {cluster.config.isDefault && (
                    <Tooltip title="Default cluster">
                      <StarIcon color="primary" fontSize="small" />
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {cluster.config.displayName || cluster.config.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cluster.config.description}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">
                    {getProviderIcon(cluster.config.provider)}
                  </Typography>
                  <Typography variant="body2" textTransform="capitalize">
                    {cluster.config.provider || 'Unknown'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={cluster.config.environment || 'Unknown'} 
                  color="primary" 
                  variant="outlined" 
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {cluster.status.version || 'Unknown'}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" gap={0.5}>
                  {cluster.status.nodeCount && (
                    <Chip size="small" label={`${cluster.status.nodeCount} nodes`} />
                  )}
                  {cluster.status.namespaceCount && (
                    <Chip size="small" label={`${cluster.status.namespaceCount} ns`} />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatLastChecked(cluster.status.lastChecked)}
                </Typography>
                {cluster.status.responseTime && (
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(cluster.status.responseTime)}ms
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, cluster)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render different views based on current state
  if (currentView === 'view' && viewClusterId) {
    return (
      <ClusterView
        clusterId={viewClusterId}
        onBack={handleBackToList}
        onEdit={handleEditFromView}
      />
    );
  }

  if (currentView === 'edit' && editCluster) {
    return (
      <ClusterEditForm
        cluster={editCluster}
        onSave={handleClusterUpdated}
        onCancel={handleBackToList}
      />
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Cluster Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your Kubernetes clusters and switch between them
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshAllClusters}
            disabled={isLoading}
          >
            Refresh All
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCluster}
          >
            Add Cluster
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search clusters..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={filters.provider || ''}
              label="Provider"
              onChange={(e) => setFilters({ ...filters, provider: e.target.value || undefined })}
            >
              <SelectMenuItem value="">All</SelectMenuItem>
              {getUniqueProviders().map((provider) => (
                <SelectMenuItem key={provider} value={provider}>
                  {provider}
                </SelectMenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Environment</InputLabel>
            <Select
              value={filters.environment || ''}
              label="Environment"
              onChange={(e) => setFilters({ ...filters, environment: e.target.value || undefined })}
            >
              <SelectMenuItem value="">All</SelectMenuItem>
              {getUniqueEnvironments().map((env) => (
                <SelectMenuItem key={env} value={env}>
                  {env}
                </SelectMenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            >
              <SelectMenuItem value="">All</SelectMenuItem>
              {getUniqueStatuses().map((status) => (
                <SelectMenuItem key={status} value={status}>
                  {status}
                </SelectMenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'table'}
                onChange={(e) => setViewMode(e.target.checked ? 'table' : 'cards')}
              />
            }
            label="Table view"
          />

          <Typography variant="body2" color="text.secondary" ml="auto">
            {filteredClusters.length} of {clusters.length} clusters
          </Typography>
        </Box>
      </Paper>

      {/* Loading */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Clusters */}
      {filteredClusters.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No clusters found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {clusters.length === 0 
              ? "You haven't configured any clusters yet. Add your first cluster to get started."
              : "No clusters match your current filters."
            }
          </Typography>
          {clusters.length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddCluster}>
              Add Your First Cluster
            </Button>
          )}
        </Paper>
      ) : viewMode === 'cards' ? (
        <Grid container spacing={2}>
          {filteredClusters.map(renderClusterCard)}
        </Grid>
      ) : (
        renderClusterTable()
      )}

      {/* Cluster Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {selectedCluster ? [
          <MenuItem key="connect" onClick={() => handleConnectCluster(selectedCluster.config.id)}>
            <ListItemIcon>
              <ConnectIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Connect" />
          </MenuItem>,
          
          <MenuItem key="default" onClick={() => handleSetDefault(selectedCluster.config.id)}>
            <ListItemIcon>
              {selectedCluster.config.isDefault ? (
                <StarIcon fontSize="small" />
              ) : (
                <StarBorderIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText primary={selectedCluster.config.isDefault ? "Remove Default" : "Set as Default"} />
          </MenuItem>,
          
          <Divider key="divider1" />,
          
          <MenuItem key="refresh" onClick={() => handleRefreshCluster(selectedCluster.config.id)}>
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Refresh" />
          </MenuItem>,
          
          <MenuItem key="view" onClick={() => handleViewCluster(selectedCluster.config.id)}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="View Details" />
          </MenuItem>,
          
          <MenuItem key="edit" onClick={() => handleEditCluster(selectedCluster)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>,
          
          <MenuItem key="clone">
            <ListItemIcon>
              <CopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Clone" />
          </MenuItem>,
          
          <Divider key="divider2" />,
          
          <MenuItem key="delete" onClick={() => handleDeleteCluster(selectedCluster)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        ] : []}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Cluster</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to delete the cluster "{clusterToDelete?.config.displayName || clusterToDelete?.config.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. The cluster configuration will be permanently removed from the application.
          </Typography>
          {clusterToDelete?.config.id === currentCluster?.config.id && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is your currently connected cluster. You will be disconnected after deletion.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteCluster} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Cluster Modal */}
      <AddClusterModal
        open={addClusterModalOpen}
        onClose={() => setAddClusterModalOpen(false)}
        onSuccess={handleClusterAdded}
      />
    </Box>
  );
};

export default ClusterManager;
