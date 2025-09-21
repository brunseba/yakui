import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Dashboard as DashboardIcon,
  AccountTree as AccountTreeIcon,
  Dns as DnsIcon,
  Apps as AppsIcon,
  Extension as ExtensionIcon,
  Security as SecurityIcon,
  Monitor as MonitorIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  Timeline as TimelineIcon,
  BugReport as BugReportIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
  Layers as LayersIcon,
  Api as ApiIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material';

interface FeatureItem {
  id: number;
  name: string;
  status: 'implemented' | 'partial' | 'coming-soon';
  description: string;
  icon: React.ReactElement;
  paths?: string[];
  progress?: number; // 0-100
  components?: string[];
  apiEndpoints?: string[];
  features?: string[];
  technicalDetails?: {
    backend: string[];
    frontend: string[];
    dependencies?: string[];
  };
  lastUpdated?: string;
  version?: string;
  priority?: 'high' | 'medium' | 'low';
  complexity?: 'low' | 'medium' | 'high';
  estimatedTime?: string;
  blockers?: string[];
  changelog?: {
    version: string;
    date: string;
    changes: string[];
  }[];
}

const features: FeatureItem[] = [
  {
    id: 1,
    name: 'Dashboard',
    status: 'implemented',
    progress: 95,
    description: 'Cluster overview dashboard with real-time cluster metrics and health status',
    icon: <DashboardIcon />,
    paths: ['/dashboard'],
    components: ['pages/Dashboard.tsx', 'components/system/SystemStatus.tsx'],
    apiEndpoints: ['/api/auth/login', '/api/nodes', '/api/namespaces', '/api/events'],
    features: ['Cluster statistics cards', 'Node health monitoring', 'Recent events list', 'Feature status overview', 'Cluster information display'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to Kubernetes API', 'Real-time cluster data via API'],
      frontend: ['React functional components', 'Material-UI stat cards', 'HTTP client service integration'],
      dependencies: ['@kubernetes/client-node', '@mui/material', '@tanstack/react-query']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'high',
    complexity: 'medium',
    blockers: ['Requires active Kubernetes cluster connection']
  },
  {
    id: 2,
    name: 'Cluster Management',
    status: 'implemented',
    progress: 90,
    description: 'Node management and cluster topology visualization with comprehensive node information',
    icon: <AccountTreeIcon />,
    paths: ['/cluster/nodes', '/cluster/topology'],
    components: ['cluster/NodesManager.tsx', 'cluster/ClusterTopology.tsx'],
    apiEndpoints: ['/api/nodes'],
    features: ['Node listing', 'Node health status', 'Cluster topology view', 'Node resource information'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to Node API integration', 'Health status monitoring via API'],
      frontend: ['Node management interface', 'Topology visualization', 'Material-UI components'],
      dependencies: ['@kubernetes/client-node', '@mui/material']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'high',
    complexity: 'medium',
    blockers: ['Requires active Kubernetes cluster connection']
  },
  {
    id: 3,
    name: 'Namespace Management',
    status: 'implemented',
    progress: 100,
    description: 'Complete namespace management with resource metrics and lifecycle operations',
    icon: <DnsIcon />,
    paths: ['/namespaces'],
    components: ['namespaces/NamespaceManager.tsx', 'namespaces/NamespaceDetail.tsx'],
    apiEndpoints: ['/api/namespaces', '/api/namespaces/:name'],
    features: ['Namespace listing', 'Namespace creation/deletion', 'Resource metrics', 'Pod and service counts', 'Detailed namespace views'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to namespace API', 'Resource counting via API'],
      frontend: ['Namespace cards interface', 'Detail modal views', 'Creation dialogs'],
      dependencies: ['@kubernetes/client-node', '@mui/material']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'high',
    complexity: 'medium'
  },
  {
    id: 4,
    name: 'Resource Management',
    status: 'implemented',
    progress: 90,
    description: 'Comprehensive Kubernetes resource management with advanced YAML editing capabilities',
    icon: <AppsIcon />,
    paths: ['/resources'],
    components: ['resources/ResourceManager.tsx', 'resources/ResourceDetail.tsx'],
    apiEndpoints: ['/api/resources/*', '/api/v1/*'],
    features: ['Deployments/Services/Pods/ConfigMaps/Secrets management', 'YAML editor with Monaco', 'Resource creation from templates'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to resource CRUD APIs', 'Resource creation endpoints via API'],
      frontend: ['Tabbed resource interface', 'Monaco YAML editor', 'Resource management UI'],
      dependencies: ['@monaco-editor/react', 'js-yaml', '@kubernetes/client-node']
    },
    lastUpdated: '2024-12-19',
    version: '2.0.0',
    priority: 'high',
    complexity: 'high',
    blockers: ['Some resource operations may require additional Kubernetes permissions']
  },
  {
    id: 5,
    name: 'Custom Resources (CRDs)',
    status: 'implemented',
    progress: 85,
    description: 'Custom Resource Definition management with schema inspection and instance tracking',
    icon: <ExtensionIcon />,
    paths: ['/crds'],
    components: ['crds/CRDManager.tsx', 'crds/CRDDetail.tsx'],
    apiEndpoints: ['/api/crds', '/api/crds/:name'],
    features: ['CRD listing and discovery', 'Schema inspection', 'Instance counting', 'Detailed CRD information'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to CRD API integration', 'Schema parsing via API'],
      frontend: ['CRD management interface', 'Detail views', 'Schema display'],
      dependencies: ['@kubernetes/client-node', '@mui/material']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'medium',
    complexity: 'medium'
  },
  {
    id: 6,
    name: 'RBAC Management',
    status: 'implemented',
    progress: 80,
    description: 'Role-Based Access Control management with comprehensive security features',
    icon: <SecurityIcon />,
    paths: ['/rbac/users', '/rbac/roles', '/rbac/bindings'],
    components: ['rbac/RBACManager.tsx', 'rbac/EnhancedRBACManager.tsx'],
    apiEndpoints: ['/api/serviceaccounts', '/api/rbac.authorization.k8s.io/v1/roles'],
    features: ['Service account forms', 'Role creation interface', 'Permission matrix display', 'RBAC visualization'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to RBAC API endpoints', 'Kubernetes RBAC permissions via API'],
      frontend: ['Enhanced RBAC forms', 'Permission management UI', 'Interactive components'],
      dependencies: ['@mui/material', '@kubernetes/client-node']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'high',
    complexity: 'high',
    blockers: ['Advanced RBAC operations may require cluster admin permissions']
  },
  {
    id: 7,
    name: 'Helm Management',
    status: 'partial',
    progress: 70,
    description: 'Helm chart management with repository and release handling - requires Helm CLI integration',
    icon: <LayersIcon />,
    paths: ['/resources'],
    components: ['helm/HelmManager.tsx'],
    apiEndpoints: ['/api/helm/repositories', '/api/helm/charts', '/api/helm/releases'],
    features: ['Helm repository management', 'Chart search and installation', 'Release lifecycle management', 'Values file editing'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to Helm CLI integration', 'Chart repository management via API'],
      frontend: ['Helm management interface', 'Chart search UI', 'Release management UI'],
      dependencies: ['@monaco-editor/react', 'js-yaml', '@kubernetes/client-node']
    },
    lastUpdated: '2024-12-19',
    version: '2.0.0',
    priority: 'medium',
    complexity: 'high',
    blockers: ['Helm CLI integration needed in backend', 'Requires Helm installation on system']
  },
  {
    id: 8,
    name: 'Monitoring Dashboard',
    status: 'partial',
    progress: 75,
    description: 'Monitoring with events, logs, and metrics visualization - requires metrics server for full functionality',
    icon: <MonitorIcon />,
    paths: ['/monitoring/events', '/monitoring/logs', '/monitoring/metrics'],
    components: ['monitoring/MonitoringDashboard.tsx'],
    apiEndpoints: ['/api/events', '/api/resources/pod/:namespace/:name/logs', '/api/metrics'],
    features: ['Real-time cluster events with filtering', 'Pod log streaming', 'Metrics visualization', 'System health overview'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to Events API', 'Pod logs API via backend', 'Metrics server integration'],
      frontend: ['Tabbed monitoring interface', 'Recharts integration', 'Real-time log viewer', 'Event filtering'],
      dependencies: ['recharts', '@mui/material', '@kubernetes/client-node']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'medium',
    complexity: 'medium',
    blockers: ['Metrics server required for full metrics functionality']
  },
  {
    id: 9,
    name: 'Security Dashboard',
    status: 'implemented',
    progress: 85,
    description: 'Security scanning, vulnerability assessment, and compliance checking',
    icon: <ShieldIcon />,
    paths: ['/security', '/security/scanning', '/security/compliance'],
    components: ['SecurityDashboard.tsx'],
    features: ['Container security validation', 'Image security checks', 'Compliance framework support', 'Security recommendations', 'Policy validation'],
    technicalDetails: {
      backend: ['Security validation rules', 'Compliance frameworks integration'],
      frontend: ['Security overview cards', 'Compliance checking interface', 'Vulnerability reports'],
      dependencies: ['@mui/material']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'medium',
    complexity: 'medium'
  },
  {
    id: 10,
    name: 'Authentication System',
    status: 'implemented',
    progress: 95,
    description: 'Complete Kubernetes authentication with session management and multiple auth methods',
    icon: <SecurityIcon />,
    paths: ['/login'],
    components: ['auth/Login.tsx', 'contexts/AuthContext.tsx'],
    apiEndpoints: ['/api/auth/login', '/api/auth/authenticate'],
    features: ['Kubeconfig authentication', 'Token-based auth', 'Session persistence', 'Cluster context management'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'HTTP proxy to Kubernetes authentication', 'Session management via API'],
      frontend: ['Login forms', 'Auth context provider', 'Protected routes'],
      dependencies: ['@kubernetes/client-node', '@tanstack/react-query']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'high',
    complexity: 'medium'
  },
  {
    id: 11,
    name: 'Error Handling & Validation',
    status: 'implemented',
    progress: 90,
    description: 'Comprehensive error boundaries and input validation system',
    icon: <WarningIcon />,
    paths: ['/'],
    components: ['common/ErrorBoundary.tsx', 'contexts/ValidationContext.tsx', 'utils/validation.ts'],
    features: ['Global error boundaries', 'Kubernetes-aware validation', 'Input sanitization', 'Error reporting'],
    technicalDetails: {
      backend: ['Error handling utilities', 'Validation rules'],
      frontend: ['React error boundaries', 'Validation context', 'User-friendly error display'],
      dependencies: ['@mui/material']
    },
    lastUpdated: '2024-12-19',
    version: '1.0.0',
    priority: 'high',
    complexity: 'medium'
  },
  {
    id: 12,
    name: 'Storage Management',
    status: 'coming-soon',
    progress: 15,
    description: 'Persistent volumes, PVCs, and storage classes management - requires implementation',
    icon: <StorageIcon />,
    paths: ['/storage/persistent-volumes', '/storage/persistent-volume-claims', '/storage/storage-classes'],
    features: ['Persistent Volume management', 'PVC monitoring', 'Storage class configuration', 'Volume usage tracking'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'Storage API endpoints needed', 'Volume metrics integration'],
      frontend: ['Storage management interface', 'Volume usage visualization', 'Storage class configuration UI'],
      dependencies: ['@kubernetes/client-node', '@mui/material']
    },
    priority: 'low',
    complexity: 'medium',
    estimatedTime: '2-3 weeks',
    blockers: ['Storage API endpoints needed', 'Volume metrics integration required']
  },
  {
    id: 13,
    name: 'Network Policies',
    status: 'coming-soon',
    progress: 10,
    description: 'Network policy management and visualization - requires implementation and CNI integration',
    icon: <SecurityIcon />,
    paths: ['/network/policies'],
    features: ['Network policy creation', 'Traffic flow visualization', 'Policy impact analysis', 'Security rule validation'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'NetworkPolicy API proxy needed', 'Traffic analysis engine', 'CNI integration'],
      frontend: ['Visual policy editor', 'Network topology visualization', 'Policy simulation interface'],
      dependencies: ['@kubernetes/client-node', '@mui/material']
    },
    priority: 'low',
    complexity: 'high',
    estimatedTime: '4-6 weeks',
    blockers: ['NetworkPolicy API endpoints needed', 'Network policy analysis tools needed', 'CNI integration required']
  },
  {
    id: 14,
    name: 'Backup & Restore',
    status: 'coming-soon',
    progress: 5,
    description: 'Automated backup and restore capabilities - requires Velero integration',
    icon: <StorageIcon />,
    paths: ['/backup'],
    features: ['Scheduled backup creation', 'Selective resource backup', 'Point-in-time restore', 'Cross-cluster migration'],
    technicalDetails: {
      backend: ['Backend API server available via npm run dev:full', 'Velero integration through API', 'Storage backend management'],
      frontend: ['Backup configuration wizard', 'Restore timeline interface', 'Progress monitoring'],
      dependencies: ['@kubernetes/client-node', '@mui/material']
    },
    priority: 'low',
    complexity: 'high',
    estimatedTime: '6-8 weeks',
    blockers: ['Velero integration required', 'Storage backend setup needed', 'Backup API endpoints needed']
  }
];

interface FeatureStatusProps {
  title?: string;
  showOnlyStatus?: 'implemented' | 'partial' | 'coming-soon';
  detailedView?: boolean;
}

const FeatureStatus: React.FC<FeatureStatusProps> = ({ 
  title = "Kubernetes Admin UI - Feature Status", 
  showOnlyStatus,
  detailedView = false
}) => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  const filteredFeatures = showOnlyStatus 
    ? features.filter(f => f.status === showOnlyStatus)
    : features;

  const implementedCount = features.filter(f => f.status === 'implemented').length;
  const partialCount = features.filter(f => f.status === 'partial').length;
  const totalCount = features.length;
  const overallProgress = Math.round(features.reduce((sum, f) => sum + (f.progress || 0), 0) / totalCount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'success';
      case 'partial': return 'warning';
      case 'coming-soon': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return <CheckCircleIcon />;
      case 'partial': return <BuildIcon />;
      case 'coming-soon': return <ScheduleIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const handleFeatureClick = (feature: FeatureItem) => {
    setSelectedFeature(feature);
    setDetailDialogOpen(true);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      
      {/* Development Setup Info */}
      <Alert 
        severity="info" 
        sx={{ mb: 3 }}
        icon={<ApiIcon />}
      >
        <Typography variant="subtitle2" gutterBottom>Development Setup</Typography>
        <Typography variant="body2">
          Run <strong>npm run dev:full</strong> to start both the frontend and backend API server. 
          The application uses HTTP-based Kubernetes API proxying through a Node.js backend on {import.meta.env.VITE_BACKEND_URL || 'localhost:3001'}.
          Most features require an active connection to a Kubernetes cluster.
        </Typography>
      </Alert>
      
      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Overall Progress</Typography>
            <Typography variant="h4" color="primary">{overallProgress}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={overallProgress} 
            sx={{ height: 8, borderRadius: 5, mb: 2 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip 
              icon={<CheckCircleIcon />} 
              label={`${implementedCount} Fully Implemented`} 
              color="success" 
              size="small"
            />
            <Chip 
              icon={<BuildIcon />} 
              label={`${partialCount} Partial/In Development`} 
              color="warning" 
              size="small"
            />
            <Chip 
              icon={<ScheduleIcon />} 
              label={`${totalCount - implementedCount - partialCount} Coming Soon`} 
              color="default" 
              size="small"
            />
          </Stack>
        </CardContent>
      </Card>

      {detailedView ? (
        /* Detailed Accordion View */
        <Box>
          {filteredFeatures.map((feature) => (
            <Accordion
              key={feature.id}
              expanded={expandedAccordion === `panel${feature.id}`}
              onChange={handleAccordionChange(`panel${feature.id}`)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  {feature.icon}
                  <Box flexGrow={1}>
                    <Typography variant="h6">
                      {feature.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Chip
                        size="small"
                        icon={getStatusIcon(feature.status)}
                        label={feature.status === 'implemented' ? 'Fully Implemented' : feature.status === 'partial' ? 'Partial/In Development' : 'Coming Soon'}
                        color={getStatusColor(feature.status) as any}
                      />
                      {feature.priority && (
                        <Chip
                          size="small"
                          label={`${feature.priority} priority`}
                          color={getPriorityColor(feature.priority) as any}
                          variant="outlined"
                        />
                      )}
                      {feature.progress !== undefined && (
                        <Box sx={{ minWidth: 100 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={feature.progress} 
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeatureClick(feature);
                    }}
                  >
                    <InfoIcon />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="body2" paragraph>
                      {feature.description}
                    </Typography>
                    
                    {feature.features && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Key Features:</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {feature.features.map((feat, idx) => (
                            <Chip key={idx} label={feat} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {feature.components && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Components:</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {feature.components.map((comp, idx) => (
                            <Chip key={idx} label={comp} size="small" icon={<CodeIcon />} />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {feature.blockers && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Blockers:</Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {feature.blockers.map((blocker, idx) => (
                            <li key={idx}>{blocker}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Details</Typography>
                      {feature.version && (
                        <Typography variant="body2">Version: {feature.version}</Typography>
                      )}
                      {feature.lastUpdated && (
                        <Typography variant="body2">Updated: {feature.lastUpdated}</Typography>
                      )}
                      {feature.complexity && (
                        <Typography variant="body2">Complexity: {feature.complexity}</Typography>
                      )}
                      {feature.estimatedTime && (
                        <Typography variant="body2">Estimated: {feature.estimatedTime}</Typography>
                      )}
                      {feature.paths && (
                        <Box mt={1}>
                          <Typography variant="caption">Routes:</Typography>
                          {feature.paths.map((path, idx) => (
                            <Typography key={idx} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                              {path}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        /* Simple List View */
        <List>
          {filteredFeatures.map((feature) => (
            <ListItem 
              key={feature.id}
              button
              onClick={() => handleFeatureClick(feature)}
            >
              <ListItemIcon>
                {feature.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">
                      {feature.id}. {feature.name}
                    </Typography>
                    <Chip
                      size="small"
                      icon={getStatusIcon(feature.status)}
                      label={feature.status === 'implemented' ? 'Fully Implemented' : feature.status === 'partial' ? 'Partial/In Development' : 'Coming Soon'}
                      color={getStatusColor(feature.status) as any}
                    />
                    {feature.progress !== undefined && (
                      <Box sx={{ minWidth: 50 }}>
                        <Typography variant="caption">{feature.progress}%</Typography>
                      </Box>
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      {feature.description}
                    </Typography>
                    {feature.progress !== undefined && (
                      <LinearProgress 
                        variant="determinate" 
                        value={feature.progress} 
                        sx={{ mt: 1, height: 4, borderRadius: 2 }}
                      />
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Feature Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedFeature && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                {selectedFeature.icon}
                <Box>
                  <Typography variant="h5">{selectedFeature.name}</Typography>
                  <Chip
                    size="small"
                    icon={getStatusIcon(selectedFeature.status)}
                    label={selectedFeature.status === 'implemented' ? 'Fully Implemented' : selectedFeature.status === 'partial' ? 'Partial/In Development' : 'Coming Soon'}
                    color={getStatusColor(selectedFeature.status) as any}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedFeature.description}
              </Typography>
              
              {selectedFeature.blockers && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Current Blockers:</Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {selectedFeature.blockers.map((blocker, idx) => (
                      <li key={idx}>{blocker}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <Grid container spacing={2}>
                {selectedFeature.features && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Key Features</Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {selectedFeature.features.map((feature, idx) => (
                        <Chip key={idx} label={feature} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}

                {selectedFeature.technicalDetails && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Technical Details</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2">Backend:</Typography>
                        <ul>
                          {selectedFeature.technicalDetails.backend.map((detail, idx) => (
                            <li key={idx}><Typography variant="body2">{detail}</Typography></li>
                          ))}
                        </ul>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2">Frontend:</Typography>
                        <ul>
                          {selectedFeature.technicalDetails.frontend.map((detail, idx) => (
                            <li key={idx}><Typography variant="body2">{detail}</Typography></li>
                          ))}
                        </ul>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default FeatureStatus;