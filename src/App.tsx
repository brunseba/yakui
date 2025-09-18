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
import NamespaceManager from './components/namespaces/NamespaceManager';
import CRDManager from './components/crds/CRDManager';
import RBACManager from './components/rbac/RBACManager';
import SecurityDashboard from './components/SecurityDashboard';
import ErrorBoundary from './components/common/ErrorBoundary';

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
  return state.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { state } = useAuth();

  if (!state.isAuthenticated) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Cluster routes */}
        <Route path="/cluster/nodes" element={<div>Nodes Page (Coming Soon)</div>} />
        <Route path="/cluster/topology" element={<ClusterTopology />} />
        
        {/* Namespace routes */}
        <Route path="/namespaces" element={<NamespaceManager />} />
        
        {/* Workload routes */}
        <Route path="/workloads/deployments" element={<div>Deployments Page (Coming Soon)</div>} />
        <Route path="/workloads/pods" element={<div>Pods Page (Coming Soon)</div>} />
        <Route path="/workloads/services" element={<div>Services Page (Coming Soon)</div>} />
        
        {/* CRD routes */}
        <Route path="/crds" element={<CRDManager />} />
        
        {/* RBAC routes */}
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
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ValidationProvider>
          <AuthProvider>
            <Router>
            <Routes>
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
            </Router>
          </AuthProvider>
        </ValidationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
