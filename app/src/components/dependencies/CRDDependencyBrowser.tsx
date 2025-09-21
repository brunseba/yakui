import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  AccountTree as TreeIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Schema as SchemaIcon
} from '@mui/icons-material';
import ResourceDependencyGraph from './ResourceDependencyGraph';
import { DependencyFilters, DependencyGraphNode, DependencyGraphEdge } from '../../services/dependency-analyzer';

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
      id={`crd-dependency-tabpanel-${index}`}
      aria-labelledby={`crd-dependency-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const CRDDependencyBrowser: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedCRD, setSelectedCRD] = useState<string>('');
  const [includeCoreResources, setIncludeCoreResources] = useState(true);
  const [maxNodes, setMaxNodes] = useState(100);
  const [focusedResource, setFocusedResource] = useState<string>('');

  // Available namespaces - in a real implementation, this would be fetched
  const namespaces = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];
  
  // Available CRDs - in a real implementation, this would be fetched from the cluster
  const crds = [
    'applications.argoproj.io',
    'workflows.argoproj.io',
    'certificates.cert-manager.io',
    'issuers.cert-manager.io',
    'ingresses.networking.k8s.io'
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNodeClick = (node: DependencyGraphNode) => {
    console.log('CRD Dependency Node clicked:', node);
    // You could navigate to a detailed view or update a side panel here
  };

  const handleEdgeClick = (edge: DependencyGraphEdge) => {
    console.log('CRD Dependency Edge clicked:', edge);
    // Show dependency details in a tooltip or modal
  };

  // Build filters based on current selections - CRD-specific filters
  const filters: DependencyFilters & { crdOnly?: boolean; selectedCRD?: string } = {
    namespace: selectedNamespace || undefined,
    includeCustomResources: true, // Always true for CRD browser
    maxNodes,
    crdOnly: !includeCoreResources, // Invert the logic for CRD focus
    selectedCRD: selectedCRD || undefined
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <ExtensionIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          CRD Dependency Browser
        </Typography>
      </Box>

      <Typography variant="body1" color="textSecondary" mb={3}>
        Explore and visualize the relationships between Custom Resource Definitions (CRDs) and other 
        Kubernetes resources in your cluster. Understand how custom resources interact with core 
        Kubernetes objects and other CRDs.
      </Typography>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
          <FilterIcon sx={{ mr: 1 }} />
          CRD Visualization Filters
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>CRD Type</InputLabel>
              <Select
                value={selectedCRD}
                label="CRD Type"
                onChange={(e) => setSelectedCRD(e.target.value)}
              >
                <MenuItem value="">
                  <em>All CRDs</em>
                </MenuItem>
                {crds.map(crd => (
                  <MenuItem key={crd} value={crd}>{crd}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Namespace</InputLabel>
              <Select
                value={selectedNamespace}
                label="Namespace"
                onChange={(e) => setSelectedNamespace(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Namespaces</em>
                </MenuItem>
                {namespaces.map(ns => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Max Resources</InputLabel>
              <Select
                value={maxNodes}
                label="Max Resources"
                onChange={(e) => setMaxNodes(e.target.value as number)}
              >
                <MenuItem value={50}>50 Resources</MenuItem>
                <MenuItem value={100}>100 Resources</MenuItem>
                <MenuItem value={200}>200 Resources</MenuItem>
                <MenuItem value={500}>500 Resources</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeCoreResources}
                  onChange={(e) => setIncludeCoreResources(e.target.checked)}
                />
              }
              label="Include Core Resources"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="crd dependency visualization tabs">
          <Tab 
            label="CRD Overview" 
            icon={<ExtensionIcon />}
            iconPosition="start"
          />
          <Tab 
            label="CRD Schema Relations" 
            icon={<SchemaIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Namespace View" 
            icon={<VisibilityIcon />}
            iconPosition="start"
            disabled={!selectedNamespace}
          />
          <Tab 
            label="CRD Analytics" 
            icon={<AnalyticsIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <ResourceDependencyGraph
          filters={filters}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          initialFocusResource={focusedResource}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <SchemaIcon sx={{ mr: 1 }} />
              CRD Schema Relationships
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              This view shows how CRD schemas reference and depend on each other through:
            </Typography>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2" component="div">
                • Cross-references between CRD properties
              </Typography>
              <Typography variant="body2" component="div">
                • Shared schema components
              </Typography>
              <Typography variant="body2" component="div">
                • API version compatibility
              </Typography>
              <Typography variant="body2" component="div">
                • Webhook dependencies
              </Typography>
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic' }}>
                Schema relationship visualization is coming soon. This will show how CRDs 
                reference each other's schemas and shared validation rules.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {selectedNamespace ? (
          <ResourceDependencyGraph
            filters={{ ...filters, namespace: selectedNamespace }}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        ) : (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select a Namespace
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Choose a namespace from the filters above to view CRD dependencies within that namespace.
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  CRD Usage Analytics
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  Advanced analytics for Custom Resource Definitions:
                </Typography>
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" component="div">
                    • CRD adoption rates across namespaces
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Custom resource instance counts
                  </Typography>
                  <Typography variant="body2" component="div">
                    • CRD version migration status
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Operator dependency mapping
                  </Typography>
                  <Typography variant="body2" component="div">
                    • CRD lifecycle management
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Schema Complexity Metrics
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  Schema analysis and complexity indicators:
                </Typography>
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" component="div">
                    • Schema depth and nesting levels
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Required vs optional fields ratio
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Validation rule complexity
                  </Typography>
                  <Typography variant="body2" component="div">
                    • OpenAPI v3 compliance score
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Breaking change detection
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Info Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                🔧 CRD Dependency Types
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Controller:</strong> Operator-managed relationships (purple)<br/>
                <strong>Reference:</strong> Cross-CRD references (blue)<br/>
                <strong>Schema:</strong> Shared schema components (green)<br/>
                <strong>Webhook:</strong> Validation/mutation deps (orange)<br/>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                🎯 CRD Lifecycle
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Active:</strong> CRDs with active instances<br/>
                <strong>Deprecated:</strong> Marked for removal<br/>
                <strong>Orphaned:</strong> No controller present<br/>
                <strong>Legacy:</strong> Old API versions still in use<br/>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                📊 Interaction Guide
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Click CRD nodes:</strong> View CRD schema details<br/>
                <strong>Hover edges:</strong> See dependency types<br/>
                <strong>Filter by CRD:</strong> Focus on specific types<br/>
                <strong>Toggle core resources:</strong> Show/hide K8s objects<br/>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CRDDependencyBrowser;