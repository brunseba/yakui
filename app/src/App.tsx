import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ValidationProvider } from './contexts/ValidationContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard';
import ClusterTopology from './components/cluster/ClusterTopology';
import NodesManager from './components/cluster/NodesManager';
import NamespaceManager from './components/namespaces/NamespaceManager';
import NamespaceDetail from './components/namespaces/NamespaceDetail';
import ResourceDetail from './components/resources/ResourceDetail';
import ResourceManager from './components/resources/ResourceManager';
import CRDManager from './components/crds/CRDManager';
import CRDDetail from './components/crds/CRDDetail';
import RBACManager from './components/rbac/RBACManager';
import ComprehensiveRBACManager from './components/rbac/ComprehensiveRBACManager';
import RBACDemo from './components/rbac/RBACDemo';
import SecurityDashboard from './components/SecurityDashboard';
import SecurityComplianceStatus from './components/security/SecurityComplianceStatus';
import ErrorBoundary from './components/common/ErrorBoundary';
import FeatureStatus from './components/common/FeatureStatus';
import ComingSoon from './components/common/ComingSoon';
import DevTest from './components/DevTest';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#f8f9fa',
        },
      },
    },
  },
});

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  console.log('ProtectedRoute - isAuthenticated:', state.isAuthenticated);
  return state.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { state } = useAuth();
  console.log('AppRoutes - isAuthenticated:', state.isAuthenticated);

  if (!state.isAuthenticated) {
    console.log('AppRoutes - User not authenticated, showing Login');
    return <Login />;
  }

  console.log('AppRoutes - User authenticated, showing Layout with menu');

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/features" element={<FeatureStatus />} />
        
        {/* Cluster routes */}
        <Route path="/cluster/nodes" element={<NodesManager />} />
        <Route path="/cluster/topology" element={<ClusterTopology />} />
        
        {/* Namespace routes */}
        <Route path="/namespaces" element={<NamespaceManager />} />
        <Route path="/namespaces/:name" element={<NamespaceDetail />} />
        
        {/* Workload routes */}
        <Route path="/workloads/deployments" element={
          <ComingSoon feature="Deployment Management" description="Manage Kubernetes deployments" />
        } />
        <Route path="/workloads/pods" element={
          <ComingSoon 
            feature="Pod Management"
            description="View, create, edit, and delete pods. Monitor pod status, logs, and resource usage."
            requiredBackendEndpoints={['GET /api/pods', 'POST /api/pods', 'DELETE /api/pods/:id', 'GET /api/pods/:id/logs']}
            requiredComponents={['PodList', 'PodEditor', 'PodLogs', 'PodMetrics']}
          />
        } />
        <Route path="/workloads/services" element={
          <ComingSoon feature="Service Management" description="Manage Kubernetes services" />
        } />
        
        {/* Resource Management routes */}
        <Route path="/resources" element={<ResourceManager />} />
        <Route path="/resources/:type/:namespace/:name" element={<ResourceDetail />} />
        
        {/* CRD routes */}
        <Route path="/crds" element={<CRDManager />} />
        <Route path="/crds/:name" element={<CRDDetail />} />
        
        {/* RBAC routes */}
        <Route path="/rbac" element={<ComprehensiveRBACManager />} />
        <Route path="/rbac/demo" element={<RBACDemo />} />
        <Route path="/rbac/users" element={<RBACManager />} />
        <Route path="/rbac/roles" element={<RBACManager />} />
        <Route path="/rbac/bindings" element={<RBACManager />} />
        
        {/* Monitoring routes */}
        <Route path="/monitoring/events" element={<div>Events Page (Coming Soon)</div>} />
        <Route path="/monitoring/logs" element={<div>Logs Page (Coming Soon)</div>} />
        <Route path="/monitoring/metrics" element={<div>Metrics Page (Coming Soon)</div>} />
        
        {/* Security routes */}
                <Route path="/security" element={<SecurityDashboard />} />
                <Route path="/security/scanning" element={<SecurityDashboard />} />
                <Route path="/security/compliance" element={<SecurityDashboard />} />
                <Route path="/security/status" element={<SecurityComplianceStatus detailedView />} />
        
        {/* Storage routes */}
        <Route path="/storage/persistent-volumes" element={<div>Persistent Volumes Page (Coming Soon)</div>} />
        <Route path="/storage/persistent-volume-claims" element={<div>Persistent Volume Claims Page (Coming Soon)</div>} />
        <Route path="/storage/storage-classes" element={<div>Storage Classes Page (Coming Soon)</div>} />
        
        {/* Configuration routes */}
        <Route path="/configuration/configmaps" element={<div>ConfigMaps Page (Coming Soon)</div>} />
        <Route path="/configuration/secrets" element={<div>Secrets Page (Coming Soon)</div>} />
        
        {/* Resource Management routes */}
        <Route path="/resources/quotas" element={<div>Resource Quotas Page (Coming Soon)</div>} />
        <Route path="/resources/limits" element={<div>Limit Ranges Page (Coming Soon)</div>} />
        <Route path="/resources/priority-classes" element={<div>Priority Classes Page (Coming Soon)</div>} />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
};

// Main App Component
const App: React.FC = () => {
  // In development mode, always show login first
  const isDevelopment = import.meta.env.DEV;
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ValidationProvider>
          <AuthProvider>
            <Router>
              <ErrorBoundary>
                <Routes>
                  <Route path="/dev-test" element={<DevTest />} />
                  <Route path="/login" element={<Login />} />
                  <Route 
                    path="/*" 
                    element={
                      <ProtectedRoute>
                        <AppRoutes />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
              </ErrorBoundary>
            </Router>
          </AuthProvider>
        </ValidationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
