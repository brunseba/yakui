import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Login: React.FC = () => {
  const { login, isLoading, error, state } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [kubeconfig, setKubeconfig] = useState('');
  const [token, setToken] = useState('');
  const [useDefault, setUseDefault] = useState(true);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Redirect to dashboard after successful authentication
  useEffect(() => {
    if (state.isAuthenticated) {
      console.log('Authentication successful, redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [state.isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Attempting login...');
    try {
      if (tabValue === 0) {
        // Default kubeconfig
        console.log('Using default kubeconfig...');
        await login();
      } else if (tabValue === 1) {
        // Custom kubeconfig
        console.log('Using custom kubeconfig...');
        await login(kubeconfig);
      } else {
        // Token auth
        console.log('Using token authentication...');
        await login(undefined, token);
      }
      console.log('Login call completed successfully');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
    >
      <Paper elevation={3} sx={{ width: 500, p: 0 }}>
        <Box p={3} textAlign="center">
          <Typography variant="h4" gutterBottom>
            Kubernetes Admin UI
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Connect to your cluster to get started
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="auth tabs">
            <Tab label="Default Config" />
            <Tab label="Custom Config" />
            <Tab label="Token Auth" />
          </Tabs>
        </Box>

        <form onSubmit={handleLogin}>
          <TabPanel value={tabValue} index={0}>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Use the default kubeconfig from ~/.kube/config
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={useDefault}
                  onChange={(e) => setUseDefault(e.target.checked)}
                />
              }
              label="Use default kubeconfig location"
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Kubeconfig YAML"
              value={kubeconfig}
              onChange={(e) => setKubeconfig(e.target.value)}
              placeholder="Paste your kubeconfig content here..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="textSecondary">
              Paste the content of your kubeconfig file here. Make sure it includes
              the cluster, user, and context information.
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <TextField
              fullWidth
              label="Service Account Token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your service account token..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="textSecondary">
              Use a service account token to authenticate with the cluster.
              This requires proper RBAC setup.
            </Typography>
          </TabPanel>

          {error && (
            <Box px={3} pb={2}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          <Box p={3} pt={1}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || (tabValue === 1 && !kubeconfig) || (tabValue === 2 && !token)}
              startIcon={isLoading && <CircularProgress size={20} />}
            >
              {isLoading ? 'Connecting...' : 'Connect to Cluster'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;