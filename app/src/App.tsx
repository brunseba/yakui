import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ValidationProvider } from './contexts/ValidationContext';
import { ThemeModeProvider } from './contexts/ThemeContext';
import { ClusterProvider } from './contexts/ClusterContext';
import { DependencyThemeContext, getEnvironmentTheme } from './config/dependency-theme';
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
import DependencyBrowser from './components/dependencies/DependencyBrowser';
import CRDAnalysis from './components/crd/CRDAnalysis';
import RBACManager from './components/rbac/RBACManager';
import ComprehensiveRBACManager from './components/rbac/ComprehensiveRBACManager';
import RBACDemo from './components/rbac/RBACDemo';
import SecurityDashboard from './components/SecurityDashboard';
import SecurityComplianceStatus from './components/security/SecurityComplianceStatus';
import ErrorBoundary from './components/common/ErrorBoundary';
import FeatureStatus from './components/common/FeatureStatus';
import ComingSoon from './components/common/ComingSoon';
import DevTest from './components/DevTest';
import CRDGraphTest from './components/crd/CRDGraphTest';
import SimpleCRDGraphTest from './components/crd/SimpleCRDGraphTest';
import { StorageManager } from './components/storage';
import { ClusterManager, ClusterHealthMonitor } from './components/cluster';
import MulticlusterIntegrationTest from './components/testing/MulticlusterIntegrationTest';

// Helper component for CRD detail redirect
const CRDDetailRedirect: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  return <Navigate to={`/dictionary/crds/${name}`} replace />;
};

// Theme is now handled by ThemeModeProvider

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
        <Route path="/cluster/management" element={<ClusterManager />} />
        <Route path="/cluster/health" element={<ClusterHealthMonitor />} />
        <Route path="/cluster/integration-test" element={<MulticlusterIntegrationTest />} />
        
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
        <Route path="/dictionary/crds" element={<CRDManager />} />
        <Route path="/dictionary/crds/:name" element={<CRDDetail />} />
        {/* Legacy routes for backward compatibility */}
        <Route path="/crds" element={<Navigate to="/dictionary/crds" replace />} />
        <Route path="/workloads/crds" element={<Navigate to="/dictionary/crds" replace />} />
        <Route path="/crds/:name" element={<CRDDetailRedirect />} />
        <Route path="/workloads/crds/:name" element={<CRDDetailRedirect />} />
        
        
        {/* CRD Analysis routes */}
        <Route path="/crd-analysis" element={<CRDAnalysis />} />
        
        {/* Dependency routes */}
        <Route path="/workloads/dependencies" element={<DependencyBrowser />} />
        {/* Legacy route for backward compatibility */}
        <Route path="/dependencies" element={<Navigate to="/workloads/dependencies" replace />} />
        
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
        <Route path="/storage" element={<StorageManager initialView="overview" />} />
        <Route path="/storage/persistent-volumes" element={<StorageManager initialView="persistent-volumes" />} />
        <Route path="/storage/persistent-volume-claims" element={<StorageManager initialView="persistent-volume-claims" />} />
        <Route path="/storage/storage-classes" element={<StorageManager initialView="storage-classes" />} />
        
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
  
  const dependencyTheme = getEnvironmentTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <CssBaseline />
        <DependencyThemeContext.Provider value={dependencyTheme}>
          <ValidationProvider>
            <AuthProvider>
              <ClusterProvider>
                <Router>
                  <ErrorBoundary>
                  <Routes>
                    <Route path="/dev-test" element={<DevTest />} />
                    <Route path="/crd-graph-test" element={<CRDGraphTest />} />
                    <Route path="/simple-crd-test" element={<SimpleCRDGraphTest />} />
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
              </ClusterProvider>
            </AuthProvider>
          </ValidationProvider>
        </DependencyThemeContext.Provider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
};

export default App;
