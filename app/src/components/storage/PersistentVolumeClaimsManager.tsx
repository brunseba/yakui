import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  ViewModule as ViewModuleIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PersistentVolumeClaim, StorageFilters } from '../../types/storage';
import { storageService } from '../../services/storageService';

const PersistentVolumeClaimsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; pvc?: PersistentVolumeClaim }>({ open: false });
  const [filters, setFilters] = useState<StorageFilters>({
    search: '',
    status: [],
    storageClass: []
  });

  // Stabilize the filters object to prevent unnecessary re-renders
  const stableFilters = useMemo(() => ({
    search: filters.search || '',
    status: filters.status || [],
    storageClass: filters.storageClass || []
  }), [filters.search, filters.status, filters.storageClass]);

  // Query for PVCs
  const {
    data: persistentVolumeClaims = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['persistent-volume-claims', selectedNamespace, stableFilters],
    queryFn: () => storageService.getPersistentVolumeClaims(selectedNamespace === 'all' ? undefined : selectedNamespace, stableFilters),
    refetchInterval: 30000,
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 2, // Retry failed requests twice
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) => 
      storageService.deletePersistentVolumeClaim(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persistent-volume-claims'] });
      queryClient.invalidateQueries({ queryKey: ['storage-statistics'] });
      setDeleteDialog({ open: false });
    },
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
    setPage(0);
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...(prev.status || []), status]
    }));
    setPage(0);
  };

  const handleDeleteClick = (pvc: PersistentVolumeClaim) => {
    setDeleteDialog({ open: true, pvc });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.pvc) {
      deleteMutation.mutate({
        namespace: deleteDialog.pvc.metadata.namespace,
        name: deleteDialog.pvc.metadata.name
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'bound':
        return 'success';
      case 'pending':
        return 'warning';
      case 'lost':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatAge = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1h';
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  // Memoize unique namespaces to prevent recalculation on every render
  const uniqueNamespaces = useMemo(() => {
    if (!persistentVolumeClaims || persistentVolumeClaims.length === 0) {
      return ['all']; // Always return 'all' even when no PVCs are loaded
    }
    const namespaces = new Set(persistentVolumeClaims.map(pvc => pvc.metadata?.namespace).filter(Boolean));
    return ['all', ...Array.from(namespaces).sort()];
  }, [persistentVolumeClaims]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load persistent volume claims. Please try again.
      </Alert>
    );
  }

  const paginatedPVCs = persistentVolumeClaims.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ViewModuleIcon color="primary" />
                <Box>
                  <Typography variant="h6">{persistentVolumeClaims.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total PVCs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    backgroundColor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <LinkIcon />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {persistentVolumeClaims.filter(pvc => pvc.status.phase === 'Bound').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bound
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    backgroundColor: 'warning.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <LinkOffIcon />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {persistentVolumeClaims.filter(pvc => pvc.status.phase === 'Pending').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    backgroundColor: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {uniqueNamespaces.length - 1}
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Namespaces
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Persistent Volume Claims ({persistentVolumeClaims.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={() => refetch()}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {/* TODO: Open create dialog */}}
              >
                Create PVC
              </Button>
            </Box>
          </Box>

          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={selectedNamespace}
                label="Namespace"
                onChange={(e) => {
                  setSelectedNamespace(e.target.value);
                  setPage(0);
                }}
              >
                {uniqueNamespaces.map((ns) => (
                  <MenuItem key={ns} value={ns}>
                    {ns === 'all' ? 'All Namespaces' : ns}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search PVCs..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />

            <Box display="flex" gap={1} alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Filter by status:
              </Typography>
              {['bound', 'pending', 'lost'].map((status) => (
                <Chip
                  key={status}
                  label={status}
                  size="small"
                  variant={filters.status?.includes(status) ? 'filled' : 'outlined'}
                  color={getStatusColor(status)}
                  onClick={() => handleStatusFilter(status)}
                  sx={{ cursor: 'pointer', textTransform: 'capitalize' }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Namespace</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Volume</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Access Modes</TableCell>
                <TableCell>Storage Class</TableCell>
                <TableCell>Age</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPVCs.map((pvc) => (
                <TableRow key={pvc.metadata.uid} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {pvc.metadata.name}
                    </Typography>
                    {pvc.metadata.labels && Object.keys(pvc.metadata.labels).length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {Object.entries(pvc.metadata.labels).slice(0, 2).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${key}=${value}`}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pvc.metadata.namespace}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pvc.status.phase}
                      color={getStatusColor(pvc.status.phase)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {pvc.spec.volumeName ? (
                      <Typography variant="body2" color="primary">
                        {pvc.spec.volumeName}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Unbound
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        Requested: {pvc.spec.resources.requests.storage}
                      </Typography>
                      {pvc.status.capacity?.storage && (
                        <Typography variant="caption" color="textSecondary">
                          Allocated: {pvc.status.capacity.storage}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {(pvc.status.accessModes || pvc.spec.accessModes).map((mode) => (
                      <Chip
                        key={mode}
                        label={mode.replace('ReadWrite', 'RW').replace('ReadOnly', 'RO')}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>{pvc.spec.storageClassName || 'Default'}</TableCell>
                  <TableCell>{formatAge(pvc.metadata.creationTimestamp)}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(pvc)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={persistentVolumeClaims.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Persistent Volume Claim</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the persistent volume claim "{deleteDialog.pvc?.metadata.name}" 
            from namespace "{deleteDialog.pvc?.metadata.namespace}"?
            This action cannot be undone.
          </DialogContentText>
          {deleteDialog.pvc?.status.phase === 'Bound' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This PVC is currently bound to a persistent volume. Deleting it may affect running workloads.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PersistentVolumeClaimsManager;