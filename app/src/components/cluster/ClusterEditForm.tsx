import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  NetworkCheck as TestIcon,
  Add as AddIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { ClusterConnection, UpdateClusterRequest, ClusterConfig, ClusterAuth } from '../../types/cluster';
import { clusterService } from '../../services/clusterService';
import ConnectionLogViewer, { ConnectionLogEntry } from './ConnectionLogViewer';

interface ClusterEditFormProps {
  cluster: ClusterConnection;
  onSave: (updatedCluster: ClusterConnection) => void;
  onCancel: () => void;
}

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
      id={`edit-tabpanel-${index}`}
      aria-labelledby={`edit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ClusterEditForm: React.FC<ClusterEditFormProps> = ({ cluster, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; version?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLogEntry[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic configuration
    name: cluster.config.name,
    displayName: cluster.config.displayName || '',
    description: cluster.config.description || '',
    server: cluster.config.server,
    version: cluster.config.version || '',
    provider: cluster.config.provider || 'other',
    region: cluster.config.region || '',
    environment: cluster.config.environment || 'development',
    tags: { ...cluster.config.tags } || {},
    
    // Authentication - determine current auth type
    authType: cluster.auth.type,
    kubeconfig: cluster.auth.kubeconfig || '',
    token: cluster.auth.token || '',
    certificate: cluster.auth.certificate || '',
    privateKey: cluster.auth.privateKey || '',
    caCertificate: cluster.auth.caCertificate || '',
    serviceAccountNamespace: cluster.auth.serviceAccount?.namespace || 'kube-system',
    serviceAccountName: cluster.auth.serviceAccount?.name || '',
    serviceAccountToken: cluster.auth.serviceAccount?.token || '',
    namespace: cluster.auth.namespace || 'default',
  });

  // Tag management
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
    setTestResult(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
    setTestResult(null);
    
    // Update authType based on selected tab
    const authTypes = ['kubeconfig', 'token', 'certificate', 'serviceaccount'] as const;
    setFormData(prev => ({
      ...prev,
      authType: authTypes[newValue],
    }));
  };

  const addTag = () => {
    if (newTagKey && newTagValue) {
      setFormData(prev => ({
        ...prev,
        tags: {
          ...prev.tags,
          [newTagKey]: newTagValue,
        },
      }));
      setNewTagKey('');
      setNewTagValue('');
    }
  };

  const removeTag = (key: string) => {
    setFormData(prev => {
      const newTags = { ...prev.tags };
      delete newTags[key];
      return {
        ...prev,
        tags: newTags,
      };
    });
  };

  const validateForm = (testOnly = false): boolean => {
    setError(null);

    // Basic validation
    if (!testOnly && (!formData.name || formData.name.trim() === '')) {
      setError('Cluster name is required');
      return false;
    }

    if (!formData.server || formData.server.trim() === '') {
      setError('Server URL is required');
      return false;
    }

    if (!formData.server.startsWith('https://')) {
      setError('Server URL must start with https://');
      return false;
    }

    // Authentication validation
    switch (formData.authType) {
      case 'kubeconfig':
        if (!formData.kubeconfig || formData.kubeconfig.trim() === '') {
          setError('Kubeconfig content is required');
          return false;
        }
        break;
      case 'token':
        if (!formData.token || formData.token.trim() === '') {
          setError('Token is required');
          return false;
        }
        break;
      case 'certificate':
        if (!formData.certificate || formData.certificate.trim() === '') {
          setError('Client certificate is required');
          return false;
        }
        if (!formData.privateKey || formData.privateKey.trim() === '') {
          setError('Private key is required');
          return false;
        }
        break;
      case 'serviceaccount':
        if (!formData.serviceAccountName || formData.serviceAccountName.trim() === '') {
          setError('Service account name is required');
          return false;
        }
        if (!formData.serviceAccountToken || formData.serviceAccountToken.trim() === '') {
          setError('Service account token is required');
          return false;
        }
        break;
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm(true)) return;

    setTesting(true);
    setTestResult(null);
    setConnectionLogs([]);

    try {
      const config: ClusterConfig = {
        ...cluster.config,
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        server: formData.server,
        version: formData.version,
        provider: formData.provider,
        region: formData.region,
        environment: formData.environment,
        tags: formData.tags,
      };

      let auth: ClusterAuth;
      if (formData.authType === 'kubeconfig') {
        auth = {
          clusterId: cluster.auth.clusterId,
          type: 'kubeconfig',
          kubeconfig: formData.kubeconfig,
          namespace: formData.namespace,
        };
      } else if (formData.authType === 'token') {
        auth = {
          clusterId: cluster.auth.clusterId,
          type: 'token',
          token: formData.token,
          namespace: formData.namespace,
        };
      } else if (formData.authType === 'certificate') {
        auth = {
          clusterId: cluster.auth.clusterId,
          type: 'certificate',
          certificate: formData.certificate,
          privateKey: formData.privateKey,
          caCertificate: formData.caCertificate,
          namespace: formData.namespace,
        };
      } else {
        auth = {
          clusterId: cluster.auth.clusterId,
          type: 'serviceaccount',
          serviceAccount: {
            namespace: formData.serviceAccountNamespace,
            name: formData.serviceAccountName,
            token: formData.serviceAccountToken,
          },
          namespace: formData.namespace,
        };
      }

      const logCallback = (log: ConnectionLogEntry) => {
        setConnectionLogs(prev => [...prev, log]);
      };

      const result = await clusterService.testConnection(config, auth, logCallback);
      setTestResult(result);
      
    } catch (err) {
      console.error('Connection test error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      
      const errorLog: ConnectionLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        level: 'error',
        step: 'Connection Test',
        message: `Test failed: ${errorMessage}`,
        details: err instanceof Error ? { stack: err.stack } : { error: err },
      };
      setConnectionLogs(prev => [...prev, errorLog]);
      
      setTestResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearLogs = () => {
    setConnectionLogs([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    // Check if there are any changes
    const hasConfigChanges = (
      formData.name !== cluster.config.name ||
      formData.displayName !== cluster.config.displayName ||
      formData.description !== cluster.config.description ||
      formData.server !== cluster.config.server ||
      formData.version !== cluster.config.version ||
      formData.provider !== cluster.config.provider ||
      formData.region !== cluster.config.region ||
      formData.environment !== cluster.config.environment ||
      JSON.stringify(formData.tags) !== JSON.stringify(cluster.config.tags)
    );

    const hasAuthChanges = (
      formData.authType !== cluster.auth.type ||
      formData.kubeconfig !== cluster.auth.kubeconfig ||
      formData.token !== cluster.auth.token ||
      formData.certificate !== cluster.auth.certificate ||
      formData.privateKey !== cluster.auth.privateKey ||
      formData.caCertificate !== cluster.auth.caCertificate ||
      formData.serviceAccountNamespace !== cluster.auth.serviceAccount?.namespace ||
      formData.serviceAccountName !== cluster.auth.serviceAccount?.name ||
      formData.serviceAccountToken !== cluster.auth.serviceAccount?.token ||
      formData.namespace !== cluster.auth.namespace
    );

    if (!hasConfigChanges && !hasAuthChanges) {
      onCancel(); // No changes, just cancel
      return;
    }

    // If there are significant changes, show confirmation
    if (formData.server !== cluster.config.server || hasAuthChanges) {
      setConfirmDialogOpen(true);
      return;
    }

    // Otherwise, save directly
    await performSave();
  };

  const performSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const updateRequest: UpdateClusterRequest = {
        config: {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description,
          server: formData.server,
          version: formData.version,
          provider: formData.provider,
          region: formData.region,
          environment: formData.environment,
          tags: formData.tags,
        },
      };

      // Only include auth if it has changed
      const hasAuthChanges = (
        formData.authType !== cluster.auth.type ||
        formData.kubeconfig !== cluster.auth.kubeconfig ||
        formData.token !== cluster.auth.token ||
        formData.certificate !== cluster.auth.certificate ||
        formData.privateKey !== cluster.auth.privateKey ||
        formData.caCertificate !== cluster.auth.caCertificate ||
        formData.serviceAccountNamespace !== cluster.auth.serviceAccount?.namespace ||
        formData.serviceAccountName !== cluster.auth.serviceAccount?.name ||
        formData.serviceAccountToken !== cluster.auth.serviceAccount?.token ||
        formData.namespace !== cluster.auth.namespace
      );

      if (hasAuthChanges) {
        if (formData.authType === 'kubeconfig') {
          updateRequest.auth = {
            type: 'kubeconfig',
            kubeconfig: formData.kubeconfig,
            namespace: formData.namespace,
          };
        } else if (formData.authType === 'token') {
          updateRequest.auth = {
            type: 'token',
            token: formData.token,
            namespace: formData.namespace,
          };
        } else if (formData.authType === 'certificate') {
          updateRequest.auth = {
            type: 'certificate',
            certificate: formData.certificate,
            privateKey: formData.privateKey,
            caCertificate: formData.caCertificate,
            namespace: formData.namespace,
          };
        } else {
          updateRequest.auth = {
            type: 'serviceaccount',
            serviceAccount: {
              namespace: formData.serviceAccountNamespace,
              name: formData.serviceAccountName,
              token: formData.serviceAccountToken,
            },
            namespace: formData.namespace,
          };
        }
      }

      const updatedCluster = await clusterService.updateCluster(cluster.config.id, updateRequest);
      onSave(updatedCluster);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cluster');
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Edit Cluster: {cluster.config.displayName || cluster.config.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update cluster configuration and authentication settings
          </Typography>
        </Box>
        <Button startIcon={<BackIcon />} onClick={onCancel}>
          Cancel
        </Button>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 800 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {testResult && (
          <Alert 
            severity={testResult.success ? 'success' : 'error'} 
            sx={{ mb: 2 }}
            onClose={() => setTestResult(null)}
          >
            {testResult.success 
              ? `Connection successful! ${testResult.version ? `Kubernetes version: ${testResult.version}` : ''}`
              : `Connection failed: ${testResult.error}`
            }
          </Alert>
        )}

        {/* Connection Log Viewer */}
        <ConnectionLogViewer
          logs={connectionLogs}
          onClear={handleClearLogs}
          sx={{ mb: 3 }}
        />

        {/* Basic Configuration */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Configuration
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cluster Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  required
                  fullWidth
                  helperText="Unique identifier for the cluster"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Display Name"
                  value={formData.displayName}
                  onChange={handleInputChange('displayName')}
                  fullWidth
                  helperText="Human-readable name"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Server URL"
                  value={formData.server}
                  onChange={handleInputChange('server')}
                  required
                  fullWidth
                  placeholder="https://kubernetes.example.com:6443"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={formData.provider}
                    onChange={handleInputChange('provider')}
                    label="Provider"
                  >
                    <MenuItem value="local">Local</MenuItem>
                    <MenuItem value="aws">AWS EKS</MenuItem>
                    <MenuItem value="gcp">Google GKE</MenuItem>
                    <MenuItem value="azure">Azure AKS</MenuItem>
                    <MenuItem value="digitalocean">DigitalOcean</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Environment</InputLabel>
                  <Select
                    value={formData.environment}
                    onChange={handleInputChange('environment')}
                    label="Environment"
                  >
                    <MenuItem value="development">Development</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Region"
                  value={formData.region}
                  onChange={handleInputChange('region')}
                  placeholder="us-west-2, europe-west1, etc."
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Version"
                  value={formData.version}
                  onChange={handleInputChange('version')}
                  placeholder="v1.28.0"
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Tags */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {Object.entries(formData.tags).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => removeTag(key)}
                    size="small"
                    deleteIcon={<CloseIcon />}
                  />
                ))}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Key"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  size="small"
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Value"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  size="small"
                  sx={{ width: 120 }}
                />
                <IconButton onClick={addTag} disabled={!newTagKey || !newTagValue}>
                  <AddIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Authentication */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Kubeconfig" />
              <Tab label="Token" />
              <Tab label="Certificate" />
              <Tab label="Service Account" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <TextField
              label="Kubeconfig Content"
              value={formData.kubeconfig}
              onChange={handleInputChange('kubeconfig')}
              multiline
              rows={10}
              fullWidth
              required
              placeholder="apiVersion: v1&#10;kind: Config&#10;clusters:&#10;..."
            />
            
            <TextField
              label="Default Namespace"
              value={formData.namespace}
              onChange={handleInputChange('namespace')}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="default"
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <TextField
              label="Bearer Token"
              value={formData.token}
              onChange={handleInputChange('token')}
              fullWidth
              required
              multiline
              rows={4}
              placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
            />
            
            <TextField
              label="CA Certificate"
              value={formData.caCertificate}
              onChange={handleInputChange('caCertificate')}
              fullWidth
              sx={{ mt: 2 }}
              multiline
              rows={4}
              placeholder="-----BEGIN CERTIFICATE-----&#10;..."
            />
            
            <TextField
              label="Default Namespace"
              value={formData.namespace}
              onChange={handleInputChange('namespace')}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="default"
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <TextField
              label="Client Certificate"
              value={formData.certificate}
              onChange={handleInputChange('certificate')}
              fullWidth
              required
              multiline
              rows={4}
              placeholder="-----BEGIN CERTIFICATE-----&#10;..."
            />
            
            <TextField
              label="Private Key"
              value={formData.privateKey}
              onChange={handleInputChange('privateKey')}
              fullWidth
              required
              sx={{ mt: 2 }}
              multiline
              rows={4}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;..."
            />
            
            <TextField
              label="CA Certificate"
              value={formData.caCertificate}
              onChange={handleInputChange('caCertificate')}
              fullWidth
              sx={{ mt: 2 }}
              multiline
              rows={4}
              placeholder="-----BEGIN CERTIFICATE-----&#10;..."
            />
            
            <TextField
              label="Default Namespace"
              value={formData.namespace}
              onChange={handleInputChange('namespace')}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="default"
            />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Service Account Namespace"
                  value={formData.serviceAccountNamespace}
                  onChange={handleInputChange('serviceAccountNamespace')}
                  required
                  fullWidth
                  placeholder="kube-system"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Service Account Name"
                  value={formData.serviceAccountName}
                  onChange={handleInputChange('serviceAccountName')}
                  required
                  fullWidth
                  placeholder="admin-user"
                />
              </Grid>
            </Grid>
            
            <TextField
              label="Service Account Token"
              value={formData.serviceAccountToken}
              onChange={handleInputChange('serviceAccountToken')}
              fullWidth
              required
              sx={{ mt: 2 }}
              multiline
              rows={4}
              placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
            />
            
            <TextField
              label="Default Namespace"
              value={formData.namespace}
              onChange={handleInputChange('namespace')}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="default"
            />
          </TabPanel>
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<CancelIcon />}
            onClick={onCancel} 
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? undefined : <SaveIcon />}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        {(loading || testing) && <LinearProgress />}
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Changes</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to make significant changes to the cluster configuration. 
            This may affect connectivity and require re-authentication.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Changes include server URL or authentication settings. Please ensure you have tested the connection first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={performSave} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClusterEditForm;