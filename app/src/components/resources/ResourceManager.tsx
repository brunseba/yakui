import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  Code as CodeIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import * as k8s from '@kubernetes/client-node';
import { kubernetesService } from '../../services/kubernetes-api';
import * as yaml from 'js-yaml';
import HelmManager from '../helm/HelmManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`resource-tabpanel-${index}`}
      aria-labelledby={`resource-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ResourceData {
  deployments: k8s.V1Deployment[];
  services: k8s.V1Service[];
  pods: k8s.V1Pod[];
  configMaps: k8s.V1ConfigMap[];
  secrets: k8s.V1Secret[];
}

const ResourceManager: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default');
  const [namespaces, setNamespaces] = useState<string[]>(['default']);

  // Resource data
  const [resources, setResources] = useState<ResourceData>({
    deployments: [],
    services: [],
    pods: [],
    configMaps: [],
    secrets: []
  });

  // Dialog states
  const [yamlDialogOpen, setYamlDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [resourceType, setResourceType] = useState<string>('');
  const [yamlContent, setYamlContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [podLogs, setPodLogs] = useState<string>('');
  const [selectedPod, setSelectedPod] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchNamespaces();
  }, []);

  useEffect(() => {
    if (selectedNamespace) {
      fetchResources();
    }
  }, [selectedNamespace]);

  const fetchNamespaces = async () => {
    try {
      const namespacesData = await kubernetesService.getNamespaces();
      const nsNames = namespacesData.map(ns => ns.metadata?.name || '').filter(Boolean);
      setNamespaces(nsNames);
      if (nsNames.length > 0) {
        setSelectedNamespace(nsNames[0]);
      }
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
    }
  };

  const fetchResources = async () => {
    if (!selectedNamespace) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all resource types in parallel
      const [deployments, services, pods, configMaps, secrets] = await Promise.all([
        kubernetesService.getDeployments(selectedNamespace),
        kubernetesService.getServices(selectedNamespace),
        kubernetesService.getPods(selectedNamespace),
        kubernetesService.getConfigMaps(selectedNamespace),
        kubernetesService.getSecrets(selectedNamespace)
      ]);
      
      setResources({
        deployments,
        services,
        pods,
        configMaps,
        secrets
      });
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resources');
      // Set empty arrays on error
      setResources({
        deployments: [],
        services: [],
        pods: [],
        configMaps: [],
        secrets: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  const handleViewResource = (resource: any, type: string) => {
    setSelectedResource(resource);
    setResourceType(type);
    setYamlContent(yaml.dump(resource, { indent: 2 }));
    setIsEditing(false);
    setYamlDialogOpen(true);
  };

  const handleEditResource = (resource: any, type: string) => {
    setSelectedResource(resource);
    setResourceType(type);
    setYamlContent(yaml.dump(resource, { indent: 2 }));
    setIsEditing(true);
    setYamlDialogOpen(true);
  };

  const handleCreateResource = (type: string) => {
    setResourceType(type);
    setYamlContent(getTemplateYaml(type));
    setIsEditing(true);
    setSelectedResource(null);
    setCreateDialogOpen(true);
  };

  const getTemplateYaml = (type: string): string => {
    const templates: Record<string, string> = {
      deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
  namespace: ${selectedNamespace}
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-container
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"`,
      service: `apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: ${selectedNamespace}
  labels:
    app: my-app
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  type: ClusterIP`,
      configmap: `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-configmap
  namespace: ${selectedNamespace}
data:
  config.yaml: |
    database:
      host: localhost
      port: 5432
  app.properties: |
    debug=true
    log.level=info`,
      secret: `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: ${selectedNamespace}
type: Opaque
data:
  username: YWRtaW4=  # base64 encoded 'admin'
  password: MWYyZDFlMmU2N2Rm  # base64 encoded password`
    };
    return templates[type] || '';
  };

  const handleSaveResource = async () => {
    try {
      // Parse YAML to validate and get manifest object
      const manifest = yaml.load(yamlContent) as any;
      if (!manifest || typeof manifest !== 'object') {
        throw new Error('YAML did not produce a valid object');
      }

      const type = (resourceType || manifest.kind || '').toString().toLowerCase();
      if (!type) throw new Error('Resource type is unknown');

      const ns = manifest.metadata?.namespace || selectedNamespace;

      // Call backend to create/apply the resource
      await kubernetesService.createResource(type, manifest, ns);

      // Close dialogs and refresh data
      setYamlDialogOpen(false);
      setCreateDialogOpen(false);
      await fetchResources();
    } catch (error) {
      console.error('Failed to save resource:', error);
      setError(error instanceof Error ? error.message : 'Invalid YAML format or failed to save resource');
    }
  };

  const handleViewResourceDetails = (resource: any, type: string) => {
    const resourceName = resource.metadata?.name;
    if (resourceName && selectedNamespace) {
      navigate(`/resources/${type.toLowerCase()}/${selectedNamespace}/${encodeURIComponent(resourceName)}`);
    }
  };

  const handleDeleteResource = async (resource: any, type: string) => {
    const resourceName = resource.metadata?.name;
    if (!resourceName) {
      setError('Resource name not found');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the ${type} "${resourceName}"? This action cannot be undone.`)) {
      try {
        setError(null);
        await kubernetesService.deleteResource(type.toLowerCase(), selectedNamespace, resourceName);
        await fetchResources(); // Refresh the resource list
      } catch (error) {
        console.error('Failed to delete resource:', error);
        setError(error instanceof Error ? error.message : `Failed to delete ${type}`);
      }
    }
  };

  const handleViewPodLogs = async (pod: any) => {
    const podName = pod.metadata?.name;
    if (!podName) {
      setError('Pod name not found');
      return;
    }
    
    setSelectedPod(pod);
    setLogsDialogOpen(true);
    setLoadingLogs(true);
    setPodLogs('');
    
    try {
      const logs = await kubernetesService.getPodLogs(selectedNamespace, podName);
      setPodLogs(logs);
    } catch (error) {
      console.error('Failed to get pod logs:', error);
      setPodLogs(`Error fetching logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'ready':
      case 'available':
        return 'success';
      case 'pending':
      case 'progressing':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Resource Management
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Resource Management
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Namespace</InputLabel>
            <Select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
            >
              {namespaces.map((ns) => (
                <MenuItem key={ns} value={ns}>{ns}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchResources}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Deployments" />
            <Tab label="Services" />
            <Tab label="Pods" />
            <Tab label="ConfigMaps" />
            <Tab label="Secrets" />
            <Tab label="Helm Charts" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Deployments in {selectedNamespace}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleCreateResource('deployment')}
            >
              Create Deployment
            </Button>
          </Box>
          
          <Grid container spacing={3}>
            {resources.deployments.length === 0 ? (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No Deployments Found
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Create your first deployment to manage containerized applications.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleCreateResource('deployment')}
                  >
                    Create Deployment
                  </Button>
                </Paper>
              </Grid>
            ) : (
              resources.deployments.map((deployment) => (
                <Grid item xs={12} md={6} key={deployment.metadata?.name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Typography variant="h6" component="div">
                          {deployment.metadata?.name}
                        </Typography>
                        <Chip 
                          label={`${deployment.status?.readyReplicas || 0}/${deployment.spec?.replicas || 0}`}
                          size="small"
                          color={deployment.status?.readyReplicas === deployment.spec?.replicas ? 'success' : 'warning'}
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Age: {formatAge(deployment.metadata?.creationTimestamp)}
                      </Typography>
                      <Box display="flex" gap={1} mt={2}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewResourceDetails(deployment, 'deployment')}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View YAML">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewResource(deployment, 'deployment')}
                          >
                            <CodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small"
                            onClick={() => handleEditResource(deployment, 'deployment')}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteResource(deployment, 'deployment')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Services in {selectedNamespace}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleCreateResource('service')}
            >
              Create Service
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Cluster IP</TableCell>
                  <TableCell>External IP</TableCell>
                  <TableCell>Ports</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No services found. Create your first service to expose applications.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.services.map((service) => (
                    <TableRow key={service.metadata?.name} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {service.metadata?.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={service.spec?.type} size="small" />
                      </TableCell>
                      <TableCell>{service.spec?.clusterIP}</TableCell>
                      <TableCell>
                        {service.status?.loadBalancer?.ingress?.[0]?.ip || '-'}
                      </TableCell>
                      <TableCell>
                        {service.spec?.ports?.map(port => `${port.port}:${port.targetPort}`).join(', ')}
                      </TableCell>
                      <TableCell>{formatAge(service.metadata?.creationTimestamp)}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewResourceDetails(service, 'service')}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View YAML">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewResource(service, 'service')}
                            >
                              <CodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small"
                              onClick={() => handleEditResource(service, 'service')}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Pods in {selectedNamespace}
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Ready</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Restarts</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Node</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.pods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No pods found in this namespace.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.pods.map((pod) => (
                    <TableRow key={pod.metadata?.name} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {pod.metadata?.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {pod.status?.containerStatuses?.filter(c => c.ready).length}/
                        {pod.status?.containerStatuses?.length || 0}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pod.status?.phase} 
                          size="small"
                          color={getStatusColor(pod.status?.phase) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {pod.status?.containerStatuses?.reduce((sum, c) => sum + (c.restartCount || 0), 0) || 0}
                      </TableCell>
                      <TableCell>{formatAge(pod.metadata?.creationTimestamp)}</TableCell>
                      <TableCell>{pod.spec?.nodeName}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewResourceDetails(pod, 'pod')}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Logs">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewPodLogs(pod)}
                            >
                              <GetAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View YAML">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewResource(pod, 'pod')}
                            >
                              <CodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              ConfigMaps in {selectedNamespace}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleCreateResource('configmap')}
            >
              Create ConfigMap
            </Button>
          </Box>
          
          <Grid container spacing={3}>
            {resources.configMaps.length === 0 ? (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No ConfigMaps Found
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Create ConfigMaps to store configuration data for your applications.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleCreateResource('configmap')}
                  >
                    Create ConfigMap
                  </Button>
                </Paper>
              </Grid>
            ) : (
              resources.configMaps.map((configMap) => (
                <Grid item xs={12} md={6} key={configMap.metadata?.name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" component="div" gutterBottom>
                        {configMap.metadata?.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {Object.keys(configMap.data || {}).length} keys
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Age: {formatAge(configMap.metadata?.creationTimestamp)}
                      </Typography>
                      <Box display="flex" gap={1} mt={2}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewResourceDetails(configMap, 'configmap')}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View YAML">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewResource(configMap, 'configmap')}
                          >
                            <CodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small"
                            onClick={() => handleEditResource(configMap, 'configmap')}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteResource(configMap, 'configmap')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Secrets in {selectedNamespace}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleCreateResource('secret')}
            >
              Create Secret
            </Button>
          </Box>
          
          <Grid container spacing={3}>
            {resources.secrets.length === 0 ? (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No Secrets Found
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Create secrets to store sensitive data like passwords, tokens, and keys.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleCreateResource('secret')}
                  >
                    Create Secret
                  </Button>
                </Paper>
              </Grid>
            ) : (
              resources.secrets.map((secret) => (
                <Grid item xs={12} md={6} key={secret.metadata?.name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" component="div" gutterBottom>
                        {secret.metadata?.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Type: {secret.type}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {Object.keys(secret.data || {}).length} keys
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Age: {formatAge(secret.metadata?.creationTimestamp)}
                      </Typography>
                      <Box display="flex" gap={1} mt={2}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewResourceDetails(secret, 'secret')}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View YAML">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewResource(secret, 'secret')}
                          >
                            <CodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small"
                            onClick={() => handleEditResource(secret, 'secret')}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteResource(secret, 'secret')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <HelmManager />
        </TabPanel>
      </Card>

      {/* YAML View/Edit Dialog */}
      <Dialog 
        open={yamlDialogOpen} 
        onClose={() => setYamlDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ style: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {isEditing ? 'Edit' : 'View'} {resourceType}: {selectedResource?.metadata?.name}
            </Typography>
            <Box>
              {!isEditing && (
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  sx={{ mr: 1 }}
                >
                  Edit
                </Button>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Editor
            height="60vh"
            language="yaml"
            value={yamlContent}
            onChange={(value) => setYamlContent(value || '')}
            options={{
              readOnly: !isEditing,
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
          <Button onClick={() => setYamlDialogOpen(false)}>
            Cancel
          </Button>
          {isEditing && (
            <Button onClick={handleSaveResource} variant="contained" startIcon={<SaveIcon />}>
              Apply Changes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Resource Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ style: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          Create New {resourceType}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Editor
            height="60vh"
            language="yaml"
            value={yamlContent}
            onChange={(value) => setYamlContent(value || '')}
            options={{
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
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveResource} variant="contained" startIcon={<SaveIcon />}>
            Create Resource
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pod Logs Dialog */}
      <Dialog 
        open={logsDialogOpen} 
        onClose={() => setLogsDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ style: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Logs: {selectedPod?.metadata?.name}
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => selectedPod && handleViewPodLogs(selectedPod)}
              disabled={loadingLogs}
            >
              Refresh
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {loadingLogs ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Loading pod logs...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: '60vh', fontFamily: 'monospace', fontSize: '12px' }}>
              <Editor
                height="60vh"
                language="plaintext"
                value={podLogs}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  theme: 'vs-light',
                  automaticLayout: true
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceManager;
