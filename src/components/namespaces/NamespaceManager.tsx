import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes';
import { NamespaceWithMetrics } from '../../types';

const NamespaceManager: React.FC = () => {
  const [namespaces, setNamespaces] = useState<NamespaceWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [newNamespaceLabels, setNewNamespaceLabels] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<NamespaceWithMetrics | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuNamespace, setActionMenuNamespace] = useState<NamespaceWithMetrics | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchNamespaces();
  }, []);

  const fetchNamespaces = async () => {
    try {
      setLoading(true);
      const namespacesData = await kubernetesService.getNamespaces();
      setNamespaces(namespacesData);
    } catch (err) {
      console.error('Failed to fetch namespaces:', err);
      setError(err instanceof Error ? err.message : 'Failed to load namespaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) return;

    try {
      const labels: Record<string, string> = {};
      
      // Parse labels from string format "key1=value1,key2=value2"
      if (newNamespaceLabels.trim()) {
        const labelPairs = newNamespaceLabels.split(',');
        for (const pair of labelPairs) {
          const [key, value] = pair.split('=').map(s => s.trim());
          if (key && value) {
            labels[key] = value;
          }
        }
      }

      await kubernetesService.createNamespace(newNamespaceName, labels);
      setCreateDialogOpen(false);
      setNewNamespaceName('');
      setNewNamespaceLabels('');
      await fetchNamespaces();
    } catch (err) {
      console.error('Failed to create namespace:', err);
      setError(err instanceof Error ? err.message : 'Failed to create namespace');
    }
  };

  const handleDeleteNamespace = async () => {
    if (!actionMenuNamespace) return;

    try {
      await kubernetesService.deleteNamespace(actionMenuNamespace.metadata?.name || '');
      setDeleteDialogOpen(false);
      setActionMenuNamespace(null);
      await fetchNamespaces();
    } catch (err) {
      console.error('Failed to delete namespace:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete namespace');
    }
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, namespace: NamespaceWithMetrics) => {
    setAnchorEl(event.currentTarget);
    setActionMenuNamespace(namespace);
  };

  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setActionMenuNamespace(null);
  };

  const formatAge = (creationTimestamp?: string) => {
    if (!creationTimestamp) return 'Unknown';
    
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d${diffHours}h`;
    } else {
      return `${diffHours}h`;
    }
  };

  const getStatusColor = (phase?: string) => {
    switch (phase) {
      case 'Active':
        return 'success';
      case 'Terminating':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Namespaces
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Namespaces
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Namespace
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Namespace Overview
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {namespaces.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Namespaces
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {namespaces.filter(ns => ns.status?.phase === 'Active').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {namespaces.filter(ns => ns.status?.phase === 'Terminating').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Terminating
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {namespaces.reduce((sum, ns) => sum + (ns.metrics?.podCount || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Pods
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Pods</TableCell>
                      <TableCell>Labels</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {namespaces.map((namespace) => (
                      <TableRow key={namespace.metadata?.name} hover>
                        <TableCell component="th" scope="row">
                          <Typography variant="subtitle2">
                            {namespace.metadata?.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={namespace.status?.phase || 'Unknown'}
                            size="small"
                            color={getStatusColor(namespace.status?.phase) as any}
                          />
                        </TableCell>
                        <TableCell>
                          {formatAge(namespace.metadata?.creationTimestamp)}
                        </TableCell>
                        <TableCell>
                          {namespace.metrics?.podCount || 0}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            {Object.entries(namespace.metadata?.labels || {}).map(([key, value]) => (
                              <Chip
                                key={key}
                                label={`${key}=${value}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionMenuOpen(e, namespace)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Namespace Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Namespace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Namespace Name"
            fullWidth
            variant="outlined"
            value={newNamespaceName}
            onChange={(e) => setNewNamespaceName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Labels (key1=value1,key2=value2)"
            fullWidth
            variant="outlined"
            value={newNamespaceLabels}
            onChange={(e) => setNewNamespaceLabels(e.target.value)}
            helperText="Optional: Add labels in key=value format, separated by commas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateNamespace} 
            variant="contained"
            disabled={!newNamespaceName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Namespace</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All resources in this namespace will be deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete the namespace "{actionMenuNamespace?.metadata?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteNamespace} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => {
          console.log('View details for:', actionMenuNamespace?.metadata?.name);
          handleActionMenuClose();
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Edit namespace:', actionMenuNamespace?.metadata?.name);
          handleActionMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleActionMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default NamespaceManager;