import React, { useState } from 'react';
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
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { PersistentVolume, StorageFilters } from '../../types/storage';
import { storageService } from '../../services/storageService';

const PersistentVolumeManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; pv?: PersistentVolume }>({ open: false });
  const [filters, setFilters] = useState<StorageFilters>({
    search: '',
    status: [],
    storageClass: []
  });

  // Query for PVs
  const {
    data: persistentVolumes = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['persistent-volumes', filters],
    queryFn: () => storageService.getPersistentVolumes(filters),
    refetchInterval: 30000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) => storageService.deletePersistentVolume(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persistent-volumes'] });
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

  const handleDeleteClick = (pv: PersistentVolume) => {
    setDeleteDialog({ open: true, pv });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.pv) {
      deleteMutation.mutate(deleteDialog.pv.metadata.name);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'bound':
        return 'success';
      case 'available':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'released':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getVolumeSourceType = (pv: PersistentVolume): string => {
    const spec = pv.spec;
    if (spec.nfs) return 'NFS';
    if (spec.hostPath) return 'HostPath';
    if (spec.local) return 'Local';
    if (spec.awsElasticBlockStore) return 'AWS EBS';
    if (spec.gcePersistentDisk) return 'GCE PD';
    if (spec.azureDisk) return 'Azure Disk';
    if (spec.csi) return 'CSI';
    return 'Unknown';
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
        Failed to load persistent volumes. Please try again.
      </Alert>
    );
  }

  const paginatedPVs = persistentVolumes.slice(
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
                <StorageIcon color="primary" />
                <Box>
                  <Typography variant="h6">{persistentVolumes.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total PVs
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
                  {persistentVolumes.filter(pv => pv.status.phase === 'Available').length}
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Available
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
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {persistentVolumes.filter(pv => pv.status.phase === 'Bound').length}
                </Box>
                <Box>
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
                  {persistentVolumes.filter(pv => 
                    ['Pending', 'Released', 'Failed'].includes(pv.status.phase)
                  ).length}
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Other States
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
              Persistent Volumes ({persistentVolumes.length})
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
                Create PV
              </Button>
            </Box>
          </Box>

          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search persistent volumes..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />

            <Box display="flex" gap={1} alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Filter by status:
              </Typography>
              {['available', 'bound', 'pending', 'failed', 'released'].map((status) => (
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
                <TableCell>Status</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Access Modes</TableCell>
                <TableCell>Storage Class</TableCell>
                <TableCell>Volume Source</TableCell>
                <TableCell>Reclaim Policy</TableCell>
                <TableCell>Age</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPVs.map((pv) => (
                <TableRow key={pv.metadata.uid} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {pv.metadata.name}
                    </Typography>
                    {pv.metadata.labels && Object.keys(pv.metadata.labels).length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {Object.entries(pv.metadata.labels).slice(0, 2).map(([key, value]) => (
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
                      label={pv.status.phase}
                      color={getStatusColor(pv.status.phase)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{pv.spec.capacity.storage}</TableCell>
                  <TableCell>
                    {pv.spec.accessModes.map((mode) => (
                      <Chip
                        key={mode}
                        label={mode.replace('ReadWrite', 'RW').replace('ReadOnly', 'RO')}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>{pv.spec.storageClassName || 'None'}</TableCell>
                  <TableCell>{getVolumeSourceType(pv)}</TableCell>
                  <TableCell>{pv.spec.persistentVolumeReclaimPolicy}</TableCell>
                  <TableCell>{formatAge(pv.metadata.creationTimestamp)}</TableCell>
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
                          onClick={() => handleDeleteClick(pv)}
                          disabled={pv.status.phase === 'Bound'}
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
          count={persistentVolumes.length}
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
        <DialogTitle>Delete Persistent Volume</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the persistent volume "{deleteDialog.pv?.metadata.name}"?
            This action cannot be undone.
          </DialogContentText>
          {deleteDialog.pv?.status.phase === 'Bound' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This persistent volume is currently bound to a PVC. Please ensure it's safe to delete.
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

export default PersistentVolumeManager;