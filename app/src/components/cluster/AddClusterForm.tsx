import React, { useState, useRef } from 'react';
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Tab,
  Tabs,
  Paper,
  Alert,
  FormHelperText,
  Chip,
  IconButton,
  LinearProgress,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  NetworkCheck as TestIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ClusterConfig, ClusterAuth, AddClusterRequest } from '../../types/cluster';
import { clusterService } from '../../services/clusterService';
import ConnectionLogViewer, { ConnectionLogEntry } from './ConnectionLogViewer';

interface AddClusterFormProps {
  onSubmit: (cluster: AddClusterRequest) => void;
  onCancel: () => void;
  onTestConnection?: (config: ClusterConfig, auth: ClusterAuth) => Promise<{ success: boolean; error?: string; version?: string }>;
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
      id={`cluster-tabpanel-${index}`}
      aria-labelledby={`cluster-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AddClusterForm: React.FC<AddClusterFormProps> = ({
  onSubmit,
  onCancel,
  onTestConnection,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; version?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Basic configuration
    name: '',
    displayName: '',
    description: '',
    server: '',
    version: '',
    provider: 'other' as const,
    region: '',
    environment: 'development' as const,
    tags: {} as Record<string, string>,
    
    // Authentication
    authType: 'kubeconfig' as const,
    kubeconfig: '',
    token: '',
    certificate: '',
    privateKey: '',
    caCertificate: '',
    serviceAccountNamespace: 'kube-system',
    serviceAccountName: '',
    serviceAccountToken: '',
    namespace: 'default',
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear any previous errors and set uploading state
    setError(null);
    setTestResult(null);
    setUploading(true);

    // Validate file type
    const validExtensions = ['.yaml', '.yml', '.config', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext)) || !fileName.includes('.');
    
    if (!isValidFile) {
      setError('Please select a valid kubeconfig file (.yaml, .yml, .config)');
      setUploading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          setError('File appears to be empty');
          setUploading(false);
          return;
        }

        // Basic validation - check if it looks like a kubeconfig
        if (!content.includes('apiVersion') && !content.includes('clusters')) {
          setError('File does not appear to be a valid kubeconfig');
          setUploading(false);
          return;
        }

        setFormData(prev => ({
          ...prev,
          kubeconfig: content,
          authType: 'kubeconfig',
        }));
        setActiveTab(0); // Switch to kubeconfig tab
        
        // Try to extract cluster info from kubeconfig
        try {
          const lines = content.split('\n');
          const serverLine = lines.find(line => line.trim().startsWith('server:'));
          let extractedServer = '';
          
          if (serverLine) {
            extractedServer = serverLine.split('server:')[1].trim().replace(/["']/g, '');
          }
          
          // Try to extract cluster name from current-context or first cluster
          const contextLines = lines.filter(line => line.trim().startsWith('current-context:') || line.trim().startsWith('name:'));
          let extractedName = '';
          
          if (contextLines.length > 0) {
            const contextLine = contextLines.find(line => line.includes('current-context:'));
            if (contextLine) {
              extractedName = contextLine.split('current-context:')[1].trim().replace(/["']/g, '');
            }
          }
          
          setFormData(prev => ({
            ...prev,
            server: extractedServer || prev.server,
            name: extractedName || prev.name || `cluster-${Date.now()}`,
            displayName: prev.displayName || (extractedName ? extractedName.replace(/[@-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Imported Cluster'),
          }));
          
          // Show success feedback
          setTestResult({
            success: true,
            version: undefined,
            error: undefined,
          });
          setUploading(false);
          
        } catch (err) {
          console.warn('Could not parse kubeconfig details:', err);
          // Still allow the upload, just don't auto-fill
        }
        
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Error reading file. Please ensure it is a valid text file.');
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
      setUploading(false);
    };
    
    reader.readAsText(file);
    
    // Clear the file input so the same file can be selected again
    event.target.value = '';
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
    setFormData(prev => ({
      ...prev,
      tags: Object.fromEntries(
        Object.entries(prev.tags).filter(([k]) => k !== key)
      ),
    }));
  };

  const validateForm = (isTestOnly: boolean = false): boolean => {
    // For test connection, we only need basic info + auth
    if (!formData.server.trim()) {
      setError('Server URL is required');
      return false;
    }

    // For final submission, we need more complete info
    if (!isTestOnly) {
      if (!formData.name.trim()) {
        setError('Cluster name is required');
        return false;
      }
      if (!formData.displayName.trim()) {
        setError('Display name is required');
        return false;
      }
    }

    // Validate based on auth type
    if (formData.authType === 'kubeconfig' && !formData.kubeconfig.trim()) {
      setError('Kubeconfig content is required');
      return false;
    }
    if (formData.authType === 'token' && !formData.token.trim()) {
      setError('Token is required');
      return false;
    }
    if (formData.authType === 'certificate') {
      if (!formData.certificate.trim()) {
        setError('Client certificate is required');
        return false;
      }
      if (!formData.privateKey.trim()) {
        setError('Private key is required');
        return false;
      }
    }
    if (formData.authType === 'serviceaccount') {
      if (!formData.serviceAccountName.trim()) {
        setError('Service account name is required');
        return false;
      }
      if (!formData.serviceAccountToken.trim()) {
        setError('Service account token is required');
        return false;
      }
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm(true)) return; // Use test-only validation

    setTesting(true);
    setTestResult(null);
    setConnectionLogs([]); // Clear previous logs

    try {
      const config: ClusterConfig = {
        name: formData.name || `test-cluster-${Date.now()}`,
        displayName: formData.displayName || 'Test Cluster',
        description: formData.description,
        server: formData.server,
        version: formData.version,
        provider: formData.provider,
        region: formData.region,
        environment: formData.environment,
        tags: formData.tags,
        id: '', // Will be generated
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let auth: ClusterAuth;
      if (formData.authType === 'kubeconfig') {
        auth = {
          clusterId: '',
          type: 'kubeconfig',
          kubeconfig: formData.kubeconfig,
          namespace: formData.namespace,
        };
      } else if (formData.authType === 'token') {
        auth = {
          clusterId: '',
          type: 'token',
          token: formData.token,
          namespace: formData.namespace,
        };
      } else if (formData.authType === 'certificate') {
        auth = {
          clusterId: '',
          type: 'certificate',
          certificate: formData.certificate,
          privateKey: formData.privateKey,
          caCertificate: formData.caCertificate,
          namespace: formData.namespace,
        };
      } else {
        auth = {
          clusterId: '',
          type: 'serviceaccount',
          serviceAccount: {
            namespace: formData.serviceAccountNamespace,
            name: formData.serviceAccountName,
            token: formData.serviceAccountToken,
          },
          namespace: formData.namespace,
        };
      }

      // Log callback to capture detailed connection logs
      const logCallback = (log: ConnectionLogEntry) => {
        setConnectionLogs(prev => [...prev, log]);
      };

      console.log('Testing connection with config:', { ...config, id: '[generated]' });
      console.log('Testing connection with auth type:', auth.type);
      
      const result = onTestConnection 
        ? await onTestConnection(config, auth)
        : await clusterService.testConnection(config, auth, logCallback);
      
      console.log('Connection test result:', result);
      setTestResult(result);
      
    } catch (err) {
      console.error('Connection test error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      
      // Add error log entry
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

    setLoading(true);
    setError(null);

    try {
      const config: Omit<ClusterConfig, 'id' | 'createdAt' | 'updatedAt'> = {
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

      let auth: Omit<ClusterAuth, 'clusterId'>;
      if (formData.authType === 'kubeconfig') {
        auth = {
          type: 'kubeconfig',
          kubeconfig: formData.kubeconfig,
          namespace: formData.namespace,
        };
      } else if (formData.authType === 'token') {
        auth = {
          type: 'token',
          token: formData.token,
          namespace: formData.namespace,
        };
      } else if (formData.authType === 'certificate') {
        auth = {
          type: 'certificate',
          certificate: formData.certificate,
          privateKey: formData.privateKey,
          caCertificate: formData.caCertificate,
          namespace: formData.namespace,
        };
      } else {
        auth = {
          type: 'serviceaccount',
          serviceAccount: {
            namespace: formData.serviceAccountNamespace,
            name: formData.serviceAccountName,
            token: formData.serviceAccountToken,
          },
          namespace: formData.namespace,
        };
      }

      const request: AddClusterRequest = { config, auth };
      onSubmit(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cluster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 600 }}>
      <Typography variant="h5" gutterBottom>
        Add Cluster
      </Typography>

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
          
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              label="Cluster Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              required
              helperText="Unique identifier for the cluster"
            />
            
            <TextField
              label="Display Name"
              value={formData.displayName}
              onChange={handleInputChange('displayName')}
              required
              helperText="Human-readable name"
            />
            
            <TextField
              label="Server URL"
              value={formData.server}
              onChange={handleInputChange('server')}
              required
              fullWidth
              sx={{ gridColumn: { sm: 'span 2' } }}
              placeholder="https://kubernetes.example.com:6443"
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              sx={{ gridColumn: { sm: 'span 2' } }}
              multiline
              rows={2}
            />
            
            <FormControl>
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
            
            <FormControl>
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
            
            <TextField
              label="Region"
              value={formData.region}
              onChange={handleInputChange('region')}
              placeholder="us-west-2, europe-west1, etc."
            />
            
            <TextField
              label="Version"
              value={formData.version}
              onChange={handleInputChange('version')}
              placeholder="v1.28.0"
            />
          </Box>

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
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Kubeconfig" />
            <Tab label="Token" />
            <Tab label="Certificate" />
            <Tab label="Service Account" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".yaml,.yml,.config"
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              startIcon={uploading ? undefined : <UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Kubeconfig'}
            </Button>
            {uploading && (
              <CircularProgress size={20} sx={{ ml: 1 }} />
            )}
            <Typography variant="body2" color="text.secondary">
              or paste the content below
            </Typography>
          </Box>
          
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
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              label="Service Account Namespace"
              value={formData.serviceAccountNamespace}
              onChange={handleInputChange('serviceAccountNamespace')}
              required
              placeholder="kube-system"
            />
            
            <TextField
              label="Service Account Name"
              value={formData.serviceAccountName}
              onChange={handleInputChange('serviceAccountName')}
              required
              placeholder="admin-user"
            />
          </Box>
          
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
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<TestIcon />}
          onClick={handleTestConnection}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        
        <Button variant="outlined" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        
        <Button 
          type="submit" 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? undefined : <AddIcon />}
        >
          {loading ? 'Adding...' : 'Add Cluster'}
        </Button>
      </Box>

      {(loading || testing) && <LinearProgress sx={{ mt: 1 }} />}
    </Box>
  );
};

export default AddClusterForm;