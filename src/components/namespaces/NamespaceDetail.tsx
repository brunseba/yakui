import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Apps as PodsIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Settings as ConfigIcon,
  Event as EventIcon,
  Policy as PolicyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes-api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: '16px' }}>
    {value === index && children}
  </div>
);

const NamespaceDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  
  const [namespaceDetails, setNamespaceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (name) {
      fetchNamespaceDetails();
    }
  }, [name]);

  const fetchNamespaceDetails = async () => {
    if (!name) return;

    try {
      setLoading(true);
      setError(null);
      const details = await kubernetesService.getNamespaceDetails(name);
      setNamespaceDetails(details);
    } catch (err) {
      console.error('Failed to fetch namespace details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load namespace details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!name) return;
    
    try {
      setDeleting(true);
      await kubernetesService.deleteNamespace(name);
      setDeleteDialogOpen(false);
      navigate('/namespaces');
    } catch (err) {
      console.error('Failed to delete namespace:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete namespace');
    } finally {
      setDeleting(false);
    }
  };

  const formatAge = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Running': return <CheckCircleIcon color="success" />;
      case 'Pending': return <WarningIcon color="warning" />;
      case 'Failed': return <ErrorIcon color="error" />;
      default: return <WarningIcon color="action" />;
    }
  };

  if (loading) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/namespaces')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Loading Namespace Details...
          </Typography>
        </Box>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !namespaceDetails) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/namespaces')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Namespace Details
          </Typography>
        </Box>
        <Alert severity="error">
          {error || 'Namespace not found'}
        </Alert>
      </Box>
    );
  }

  const isSystemNamespace = name?.startsWith('kube-') || 
    ['default', 'cattle-system', 'rancher-operator-system'].includes(name || '');

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate('/namespaces')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {name}
          </Typography>
          <Chip 
            label={namespaceDetails.status?.phase || 'Active'} 
            color="success" 
            size="small" 
            sx={{ ml: 2 }} 
          />
          {isSystemNamespace && (
            <Chip 
              label="System" 
              color="warning" 
              size="small" 
              sx={{ ml: 1 }} 
            />
          )}
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchNamespaceDetails}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => {/* TODO: Open edit dialog */}}
          >
            Edit
          </Button>
          {!isSystemNamespace && (
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PodsIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{namespaceDetails.resources?.pods || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Pods</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{namespaceDetails.resources?.services || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Services</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ConfigIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{namespaceDetails.resources?.configMaps || 0}</Typography>
              <Typography variant="body2" color="textSecondary">ConfigMaps</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SecurityIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{namespaceDetails.resources?.secrets || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Secrets</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PolicyIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{namespaceDetails.resources?.resourceQuotas || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Quotas</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PolicyIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{namespaceDetails.resources?.limitRanges || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Limits</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metadata */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Metadata</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">Created</Typography>
              <Typography variant="body1">
                {formatAge(namespaceDetails.metadata?.creationTimestamp)} ago
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">UID</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {namespaceDetails.metadata?.uid}
              </Typography>
            </Grid>
            {namespaceDetails.metadata?.labels && Object.keys(namespaceDetails.metadata.labels).length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>Labels</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(namespaceDetails.metadata.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}=${value}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`Pods (${namespaceDetails.details?.pods?.length || 0})`} />
            <Tab label={`Services (${namespaceDetails.details?.services?.length || 0})`} />
            <Tab label={`ConfigMaps (${namespaceDetails.details?.configMaps?.length || 0})`} />
            <Tab label={`Secrets (${namespaceDetails.details?.secrets?.length || 0})`} />
            <Tab label={`Events (${namespaceDetails.details?.events?.length || 0})`} />
          </Tabs>
        </Box>

        {/* Pods Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            {namespaceDetails.details?.pods?.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Restarts</TableCell>
                      <TableCell>Node</TableCell>
                      <TableCell>Age</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {namespaceDetails.details.pods.map((pod: any) => (
                      <TableRow key={pod.name}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {getStatusIcon(pod.status)}
                            <Typography sx={{ ml: 1 }}>{pod.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pod.status} 
                            size="small"
                            color={pod.ready ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>{pod.restarts}</TableCell>
                        <TableCell>{pod.node || '-'}</TableCell>
                        <TableCell>{formatAge(pod.age)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary">No pods found in this namespace</Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* Services Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            {namespaceDetails.details?.services?.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Cluster IP</TableCell>
                      <TableCell>Ports</TableCell>
                      <TableCell>Age</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {namespaceDetails.details.services.map((service: any) => (
                      <TableRow key={service.name}>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>
                          <Chip label={service.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{service.clusterIP}</TableCell>
                        <TableCell>{service.ports || '-'}</TableCell>
                        <TableCell>{formatAge(service.age)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary">No services found in this namespace</Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* ConfigMaps Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            {namespaceDetails.details?.configMaps?.length > 0 ? (
              <List>
                {namespaceDetails.details.configMaps.map((cm: any) => (
                  <ListItem key={cm.name}>
                    <ListItemIcon>
                      <ConfigIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={cm.name}
                      secondary={`${cm.dataKeys} keys • ${formatAge(cm.age)} ago`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">No ConfigMaps found in this namespace</Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* Secrets Tab */}
        <TabPanel value={tabValue} index={3}>
          <CardContent>
            {namespaceDetails.details?.secrets?.length > 0 ? (
              <List>
                {namespaceDetails.details.secrets.map((secret: any) => (
                  <ListItem key={secret.name}>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={secret.name}
                      secondary={`${secret.type} • ${secret.dataKeys} keys • ${formatAge(secret.age)} ago`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">No secrets found in this namespace</Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* Events Tab */}
        <TabPanel value={tabValue} index={4}>
          <CardContent>
            {namespaceDetails.details?.events?.length > 0 ? (
              <List>
                {namespaceDetails.details.events.map((event: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {event.type === 'Warning' ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <EventIcon color="info" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${event.reason}: ${event.object}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {event.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatAge(event.age)} ago
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">No recent events found</Typography>
            )}
          </CardContent>
        </TabPanel>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Namespace</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the namespace "{name}"? This action cannot be undone and will delete all resources within the namespace.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            disabled={deleting}
            startIcon={deleting ? <LinearProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NamespaceDetail;