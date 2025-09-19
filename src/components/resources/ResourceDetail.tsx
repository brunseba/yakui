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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Settings as ConfigIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  GetApp as LogsIcon
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';
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

interface ResourceDetailProps {
  resourceType?: string;
  namespace?: string;
  name?: string;
}

const ResourceDetail: React.FC = () => {
  const { type, namespace, name } = useParams<{ type: string; namespace: string; name: string }>();
  const navigate = useNavigate();
  
  const [resourceData, setResourceData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [relatedResources, setRelatedResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [yamlDialogOpen, setYamlDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    if (type && namespace && name) {
      fetchResourceDetails();
    }
  }, [type, namespace, name]);

  const fetchResourceDetails = async () => {
    if (!type || !namespace || !name) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch the main resource details
      const resource = await kubernetesService.getResourceDetails(type, namespace, name);
      setResourceData(resource);

      // Fetch related data based on resource type
      await Promise.all([
        fetchResourceEvents(),
        fetchRelatedResources()
      ]);

    } catch (err) {
      console.error('Failed to fetch resource details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resource details');
    } finally {
      setLoading(false);
    }
  };

  const fetchResourceEvents = async () => {
    try {
      if (type && namespace && name) {
        const events = await kubernetesService.getResourceEvents(type, namespace, name);
        setEvents(events);
      }
    } catch (err) {
      console.error('Failed to fetch resource events:', err);
    }
  };

  const fetchRelatedResources = async () => {
    try {
      if (type && namespace && name && resourceData) {
        const related = await kubernetesService.getRelatedResources(type, namespace, name, resourceData);
        setRelatedResources(related);
      }
    } catch (err) {
      console.error('Failed to fetch related resources:', err);
    }
  };

  const fetchResourceLogs = async () => {
    try {
      if (type === 'pod' && namespace && name) {
        const logData = await kubernetesService.getPodLogs(namespace, name);
        setLogs(logData);
        setLogsDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch pod logs:', err);
    }
  };

  const handleDelete = async () => {
    if (!type || !namespace || !name) return;
    
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        await kubernetesService.deleteResource(type, namespace, name);
        navigate(`/resources?tab=${getResourceTabIndex(type!)}&namespace=${namespace}`);
      } catch (err) {
        console.error('Failed to delete resource:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete resource');
      }
    }
  };

  const getResourceTabIndex = (resourceType: string): number => {
    const tabMap: Record<string, number> = {
      'deployment': 0,
      'service': 1,
      'pod': 2,
      'configmap': 3,
      'secret': 4
    };
    return tabMap[resourceType.toLowerCase()] || 0;
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
    switch (status?.toLowerCase()) {
      case 'running':
      case 'ready':
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'pending':
      case 'progressing':
        return <WarningIcon color="warning" />;
      case 'failed':
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="action" />;
    }
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType?.toLowerCase()) {
      case 'pod':
        return <StorageIcon />;
      case 'service':
        return <ConfigIcon />;
      case 'deployment':
        return <PlayArrowIcon />;
      case 'configmap':
        return <ConfigIcon />;
      case 'secret':
        return <SecurityIcon />;
      default:
        return <StorageIcon />;
    }
  };

  const renderResourceSpecificDetails = () => {
    if (!resourceData) return null;

    switch (type?.toLowerCase()) {
      case 'pod':
        return renderPodDetails();
      case 'deployment':
        return renderDeploymentDetails();
      case 'service':
        return renderServiceDetails();
      case 'configmap':
        return renderConfigMapDetails();
      case 'secret':
        return renderSecretDetails();
      default:
        return renderGenericDetails();
    }
  };

  const renderPodDetails = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Pod Status</Typography>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {getStatusIcon(resourceData?.status?.phase)}
              <Chip 
                label={resourceData?.status?.phase || 'Unknown'} 
                color={resourceData?.status?.phase === 'Running' ? 'success' : 'warning'}
              />
            </Box>
            <Typography variant="body2"><strong>Node:</strong> {resourceData?.spec?.nodeName || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Pod IP:</strong> {resourceData?.status?.podIP || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Host IP:</strong> {resourceData?.status?.hostIP || 'N/A'}</Typography>
            <Typography variant="body2"><strong>QoS Class:</strong> {resourceData?.status?.qosClass || 'N/A'}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Containers</Typography>
            {resourceData?.spec?.containers?.map((container: any, index: number) => (
              <Box key={index} mb={2}>
                <Typography variant="subtitle2">{container.name}</Typography>
                <Typography variant="body2" color="textSecondary">Image: {container.image}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Ports: {container.ports?.map((p: any) => p.containerPort).join(', ') || 'None'}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDeploymentDetails = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Deployment Status</Typography>
            <Typography variant="h4" color="primary">
              {resourceData?.status?.readyReplicas || 0}/{resourceData?.spec?.replicas || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">Ready Replicas</Typography>
            <Box mt={2}>
              <Chip 
                label={resourceData?.status?.readyReplicas === resourceData?.spec?.replicas ? 'Ready' : 'Updating'}
                color={resourceData?.status?.readyReplicas === resourceData?.spec?.replicas ? 'success' : 'warning'}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Strategy</Typography>
            <Typography variant="body2"><strong>Type:</strong> {resourceData?.spec?.strategy?.type || 'RollingUpdate'}</Typography>
            {resourceData?.spec?.strategy?.rollingUpdate && (
              <>
                <Typography variant="body2">
                  <strong>Max Unavailable:</strong> {resourceData.spec.strategy.rollingUpdate.maxUnavailable || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Max Surge:</strong> {resourceData.spec.strategy.rollingUpdate.maxSurge || 'N/A'}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Template</Typography>
            <Typography variant="body2">
              <strong>Containers:</strong> {resourceData?.spec?.template?.spec?.containers?.length || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Restart Policy:</strong> {resourceData?.spec?.template?.spec?.restartPolicy || 'Always'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderServiceDetails = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Service Configuration</Typography>
            <Typography variant="body2"><strong>Type:</strong> {resourceData?.spec?.type || 'ClusterIP'}</Typography>
            <Typography variant="body2"><strong>Cluster IP:</strong> {resourceData?.spec?.clusterIP || 'N/A'}</Typography>
            <Typography variant="body2"><strong>External IP:</strong> {resourceData?.status?.loadBalancer?.ingress?.[0]?.ip || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Session Affinity:</strong> {resourceData?.spec?.sessionAffinity || 'None'}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Ports</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>Target Port</TableCell>
                    <TableCell>Protocol</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resourceData?.spec?.ports?.map((port: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{port.name || '-'}</TableCell>
                      <TableCell>{port.port}</TableCell>
                      <TableCell>{port.targetPort}</TableCell>
                      <TableCell>{port.protocol || 'TCP'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderConfigMapDetails = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Data</Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {Object.keys(resourceData?.data || {}).length} keys
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>View Configuration Data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {Object.entries(resourceData?.data || {}).map(([key, value]) => (
                <Box key={key} mb={2}>
                  <Typography variant="subtitle2" color="primary">{key}</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {value as string}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );

  const renderSecretDetails = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Secret Information</Typography>
        <Typography variant="body2"><strong>Type:</strong> {resourceData?.type || 'Opaque'}</Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {Object.keys(resourceData?.data || {}).length} keys
        </Typography>
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>Data Keys:</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {Object.keys(resourceData?.data || {}).map((key) => (
              <Chip key={key} label={key} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          Secret data values are hidden for security purposes.
        </Alert>
      </CardContent>
    </Card>
  );

  const renderGenericDetails = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Resource Information</Typography>
        <Typography variant="body2">This resource type doesn't have specialized detail views yet.</Typography>
        <Typography variant="body2">Use the YAML tab to view the complete resource definition.</Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Loading {type} Details...
          </Typography>
        </Box>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !resourceData) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {type} Details
          </Typography>
        </Box>
        <Alert severity="error">
          {error || 'Resource not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box display="flex" alignItems="center" gap={2}>
            {getResourceIcon(type!)}
            <Typography variant="h4">
              {name}
            </Typography>
            <Chip 
              label={type} 
              color="primary" 
              size="small" 
            />
            {resourceData?.status?.phase && (
              <Chip 
                label={resourceData.status.phase} 
                color={resourceData.status.phase === 'Running' || resourceData.status.phase === 'Active' ? 'success' : 'warning'}
                size="small" 
              />
            )}
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchResourceDetails}
            disabled={loading}
          >
            Refresh
          </Button>
          {type === 'pod' && (
            <Button
              startIcon={<LogsIcon />}
              variant="outlined"
              onClick={fetchResourceLogs}
            >
              View Logs
            </Button>
          )}
          <Button
            startIcon={<CodeIcon />}
            variant="outlined"
            onClick={() => setYamlDialogOpen(true)}
          >
            View YAML
          </Button>
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => {/* TODO: Open edit dialog */}}
          >
            Edit
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {/* Metadata */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Metadata</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">Namespace</Typography>
              <Typography variant="body1">{namespace}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">Created</Typography>
              <Typography variant="body1">
                {formatAge(resourceData?.metadata?.creationTimestamp)} ago
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">UID</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {resourceData?.metadata?.uid}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="textSecondary">Resource Version</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {resourceData?.metadata?.resourceVersion}
              </Typography>
            </Grid>
            {resourceData?.metadata?.labels && Object.keys(resourceData.metadata.labels).length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>Labels</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(resourceData.metadata.labels).map(([key, value]) => (
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
            <Tab label="Details" />
            <Tab label={`Events (${events.length})`} />
            <Tab label={`Related (${relatedResources.length})`} />
          </Tabs>
        </Box>

        {/* Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            {renderResourceSpecificDetails()}
          </CardContent>
        </TabPanel>

        {/* Events Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            {events.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Count</TableCell>
                      <TableCell>Age</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {event.type === 'Warning' ? (
                              <WarningIcon color="warning" fontSize="small" />
                            ) : (
                              <EventIcon color="info" fontSize="small" />
                            )}
                            <Chip 
                              label={event.type} 
                              size="small"
                              color={event.type === 'Warning' ? 'warning' : 'success'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{event.reason}</TableCell>
                        <TableCell>{event.message}</TableCell>
                        <TableCell>{event.count}</TableCell>
                        <TableCell>{formatAge(event.age)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary">No events found for this resource</Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* Related Resources Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            {relatedResources.length > 0 ? (
              <List>
                {relatedResources.map((resource: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getResourceIcon(resource.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${resource.type}: ${resource.name}`}
                      secondary={`Namespace: ${resource.namespace} • Age: ${formatAge(resource.age)}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">No related resources found</Typography>
            )}
          </CardContent>
        </TabPanel>
      </Card>

      {/* YAML Dialog */}
      <Dialog 
        open={yamlDialogOpen} 
        onClose={() => setYamlDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ style: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          Resource YAML: {name}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Editor
            height="60vh"
            language="yaml"
            value={yaml.dump(resourceData, { indent: 2 })}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              theme: 'vs-light'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYamlDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog 
        open={logsDialogOpen} 
        onClose={() => setLogsDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ style: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          Pod Logs: {name}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, backgroundColor: '#000', color: '#fff', fontFamily: 'monospace', fontSize: '0.875rem', height: '60vh', overflow: 'auto' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{logs}</pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceDetail;