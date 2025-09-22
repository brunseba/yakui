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
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { StorageClass } from '../../types/storage';
import { storageService } from '../../services/storageService';

const StorageClassManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; sc?: StorageClass }>({ open: false });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string>('');

  // Query for Storage Classes
  const {
    data: storageClasses = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['storage-classes'],
    queryFn: () => storageService.getStorageClasses(),
    refetchInterval: 30000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) => storageService.deleteStorageClass(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-classes'] });
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
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleDeleteClick = (sc: StorageClass) => {
    setDeleteDialog({ open: true, sc });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.sc) {
      deleteMutation.mutate(deleteDialog.sc.metadata.name);
    }
  };

  const isDefault = (sc: StorageClass) => {
    return sc.metadata.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true';
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

  const handleRowExpand = (scName: string) => {
    setExpandedRow(expandedRow === scName ? '' : scName);
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
        Failed to load storage classes. Please try again.
      </Alert>
    );
  }

  const filteredSCs = storageClasses.filter((sc) =>
    !searchQuery || 
    sc.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sc.provisioner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedSCs = filteredSCs.slice(
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
                <FolderIcon color="primary" />
                <Box>
                  <Typography variant="h6">{storageClasses.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Classes
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
                  <CheckCircleIcon />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {storageClasses.filter(sc => isDefault(sc)).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Default
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
                  {storageClasses.filter(sc => sc.allowVolumeExpansion).length}
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Expandable
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
                  {new Set(storageClasses.map(sc => sc.provisioner)).size}
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Provisioners
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
              Storage Classes ({filteredSCs.length})
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
                Create Storage Class
              </Button>
            </Box>
          </Box>

          <TextField
            size="small"
            placeholder="Search storage classes..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Provisioner</TableCell>
                <TableCell>Reclaim Policy</TableCell>
                <TableCell>Volume Binding</TableCell>
                <TableCell>Allow Expansion</TableCell>
                <TableCell>Age</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSCs.map((sc) => (
                <React.Fragment key={sc.metadata.uid}>
                  <TableRow 
                    hover 
                    onClick={() => handleRowExpand(sc.metadata.name)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {sc.metadata.name}
                        </Typography>
                        {isDefault(sc) && (
                          <Chip
                            label="Default"
                            size="small"
                            color="success"
                            variant="filled"
                          />
                        )}
                      </Box>
                      {sc.metadata.labels && Object.keys(sc.metadata.labels).length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          {Object.entries(sc.metadata.labels).slice(0, 2).map(([key, value]) => (
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
                      <Typography variant="body2" color="primary">
                        {sc.provisioner}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sc.reclaimPolicy || 'Delete'}
                        size="small"
                        variant="outlined"
                        color={sc.reclaimPolicy === 'Retain' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sc.volumeBindingMode || 'Immediate'}
                        size="small"
                        variant="outlined"
                        color={sc.volumeBindingMode === 'WaitForFirstConsumer' ? 'warning' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      {sc.allowVolumeExpansion ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <CancelIcon color="disabled" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell>{formatAge(sc.metadata.creationTimestamp)}</TableCell>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(sc);
                            }}
                            disabled={isDefault(sc)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Details */}
                  {expandedRow === sc.metadata.name && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ pb: 2, pt: 1 }}>
                        <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 1 }}>
                          <Grid container spacing={3}>
                            {/* Parameters */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Parameters
                              </Typography>
                              {sc.parameters && Object.keys(sc.parameters).length > 0 ? (
                                <Box>
                                  {Object.entries(sc.parameters).map(([key, value]) => (
                                    <Box key={key} display="flex" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                      <Typography variant="body2" color="textSecondary">
                                        {key}:
                                      </Typography>
                                      <Typography variant="body2">{value}</Typography>
                                    </Box>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  No parameters configured
                                </Typography>
                              )}
                            </Grid>

                            {/* Mount Options */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Mount Options
                              </Typography>
                              {sc.mountOptions && sc.mountOptions.length > 0 ? (
                                <Box display="flex" gap={0.5} flexWrap="wrap">
                                  {sc.mountOptions.map((option, index) => (
                                    <Chip
                                      key={index}
                                      label={option}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  No mount options configured
                                </Typography>
                              )}
                            </Grid>

                            {/* Allowed Topologies */}
                            {sc.allowedTopologies && sc.allowedTopologies.length > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Allowed Topologies
                                </Typography>
                                <Box>
                                  {sc.allowedTopologies.map((topology, index) => (
                                    <Box key={index} sx={{ mb: 1 }}>
                                      {topology.matchLabelExpressions?.map((expr, exprIndex) => (
                                        <Box key={exprIndex}>
                                          <Typography variant="body2">
                                            <strong>{expr.key}:</strong> {expr.values.join(', ')}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  ))}
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredSCs.length}
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
        <DialogTitle>Delete Storage Class</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the storage class "{deleteDialog.sc?.metadata.name}"?
            This action cannot be undone.
          </DialogContentText>
          {isDefault(deleteDialog.sc!) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This is the default storage class. Deleting it may prevent new PVCs from being provisioned automatically.
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
            disabled={deleteMutation.isPending || isDefault(deleteDialog.sc!)}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StorageClassManager;