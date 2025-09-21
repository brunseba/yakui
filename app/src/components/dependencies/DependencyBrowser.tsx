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
  AccountTree as TreeIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import ResourceDependencyGraph from './ResourceDependencyGraph';
import { DependencyFilters, DependencyGraphNode, DependencyGraphEdge } from '../../services/dependency-analyzer';
import { kubernetesService } from '../../services/kubernetes';

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
      id={`dependency-tabpanel-${index}`}
      aria-labelledby={`dependency-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const DependencyBrowser: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [includeCustomResources, setIncludeCustomResources] = useState(true);
  const [maxNodes, setMaxNodes] = useState(100);
  const [focusedResource, setFocusedResource] = useState<string>('');

  // Available namespaces - fetched dynamically from cluster
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [loadingNamespaces, setLoadingNamespaces] = useState(true);

  // Fetch available namespaces on component mount
  React.useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        setLoadingNamespaces(true);
        // Fetch namespaces from actual Kubernetes cluster
        const namespacesData = await kubernetesService.getNamespaces();
        const namespaceNames = namespacesData.map(ns => ns.metadata?.name).filter(Boolean);
        setNamespaces(namespaceNames);
      } catch (error) {
        console.error('Failed to fetch namespaces from cluster:', error);
        // Don't fall back to hardcoded namespaces - show empty list
        setNamespaces([]);
      } finally {
        setLoadingNamespaces(false);
      }
    };

    fetchNamespaces();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNodeClick = (node: DependencyGraphNode) => {
    console.log('Node clicked:', node);
    // You could navigate to a detailed view or update a side panel here
  };

  const handleEdgeClick = (edge: DependencyGraphEdge) => {
    console.log('Edge clicked:', edge);
    // Show dependency details in a tooltip or modal
  };

  // Build filters based on current selections
  const filters: DependencyFilters = {
    namespace: selectedNamespace || undefined,
    includeCustomResources,
    maxNodes
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <TreeIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Resource Dependency Browser
        </Typography>
      </Box>

      <Typography variant="body1" color="textSecondary" mb={3}>
        Explore and visualize the relationships between Kubernetes resources in your cluster.
        Understand dependencies, ownership, and operational relationships.
      </Typography>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
          <FilterIcon sx={{ mr: 1 }} />
          Visualization Filters
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Namespace</InputLabel>
              <Select
                value={selectedNamespace}
                label="Namespace"
                onChange={(e) => setSelectedNamespace(e.target.value)}
                disabled={loadingNamespaces}
              >
                <MenuItem value="">
                  <em>{loadingNamespaces ? 'Loading namespaces...' : namespaces.length === 0 ? 'No namespaces available' : 'All Namespaces'}</em>
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
                  checked={includeCustomResources}
                  onChange={(e) => setIncludeCustomResources(e.target.checked)}
                />
              }
              label="Include Custom Resources"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dependency visualization tabs">
          <Tab 
            label="Cluster Overview" 
            icon={<TreeIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Namespace View" 
            icon={<VisibilityIcon />}
            iconPosition="start"
            disabled={!selectedNamespace}
          />
          <Tab 
            label="Analytics" 
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
                Choose a namespace from the filters above to view its resource dependency graph.
              </Typography>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dependency Analytics
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  This section will show advanced analytics about resource dependencies:
                </Typography>
                <Box mt={2}>
                  <Typography variant="body2" component="div">
                    • Resource relationship patterns
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Dependency complexity metrics
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Critical path analysis
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Orphaned resource detection
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Circular dependency warnings
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
                🔗 Dependency Types
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Ownership:</strong> Parent-child relationships (red)<br/>
                <strong>Volume:</strong> Storage mount relationships (teal)<br/>
                <strong>Service:</strong> Network discovery relationships (orange)<br/>
                <strong>Selector:</strong> Label-based selections (green)<br/>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                💪 Dependency Strength
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Strong:</strong> Required dependencies (solid lines)<br/>
                <strong>Weak:</strong> Optional relationships (dashed lines)<br/>
                Strong dependencies are critical for resource operation, while weak ones provide additional context.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                🎯 Interaction Tips
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Click nodes:</strong> View resource details<br/>
                <strong>Hover edges:</strong> See dependency info<br/>
                <strong>Search:</strong> Find specific resources<br/>
                <strong>Filter:</strong> Focus on resource types<br/>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DependencyBrowser;