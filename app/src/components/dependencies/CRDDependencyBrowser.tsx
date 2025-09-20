import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Chip
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Extension as ExtensionIcon
} from '@mui/icons-material';
import CRDDictionaryVisualization from './CRDDictionaryVisualization';
import EnhancedCRDDependencyVisualization from './EnhancedCRDDependencyVisualization';
import { DependencyFilters, DependencyGraphNode, DependencyGraphEdge, DependencyGraph } from '../../services/dependency-analyzer';
import { kubernetesService } from '../../services/kubernetes-api';
import { CRDWithInstances } from '../../types/dev';
import { useEffect } from 'react';

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
  const [maxNodes, setMaxNodes] = useState(500);
  const [focusedResource, setFocusedResource] = useState<string>('');
  const [crds, setCrds] = useState<CRDWithInstances[]>([]);
  const [crdsLoading, setCrdsLoading] = useState(false);
  const [crdsError, setCrdsError] = useState<string | null>(null);
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState(true);

  // Fetch CRDs from the cluster on component mount
  useEffect(() => {
    const fetchCRDs = async () => {
      setCrdsLoading(true);
      setCrdsError(null);
      try {
        // Fetch CRD definitions using existing kubernetes API service
        const crdData = await kubernetesService.getCRDs();
        setCrds(crdData);
      } catch (err) {
        console.error('Failed to fetch CRDs:', err);
        setCrdsError('Failed to load Custom Resource Definitions from cluster');
      } finally {
        setCrdsLoading(false);
      }
    };

    fetchCRDs();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNodeClick = (node: DependencyGraphNode) => {
    console.log('CRD Dependency - Node clicked:', node);
    // You could navigate to a detailed view or update a side panel here
  };

  const handleEdgeClick = (edge: DependencyGraphEdge) => {
    console.log('CRD Dependency - Edge clicked:', edge);
    // Show dependency details in a tooltip or modal
  };

  // CRD Dictionary configuration - focuses on definitions, not instances
  const dictionaryConfig = {
    maxNodes,
    // Focus only on CRD definitions (cluster-scoped resources)
    analysisMode: 'definitions' as const,
    includeNativeResources: true // Show relationships to core K8s resources
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <ExtensionIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
      <Typography variant="h4" component="h1">
        CRD Dictionary Dependencies
      </Typography>
    </Box>

    <Typography variant="body1" color="textSecondary" mb={3}>
      Analyze Custom Resource Definition schemas and their relationships to native Kubernetes API types.
      This dictionary focuses exclusively on CRD definitions and their references to core K8s resources at the API specification level.
    </Typography>

      {/* CRD Dictionary notice */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>CRD Overview:</strong> This tool displays Custom Resource Definitions from your cluster, 
          showing their API specifications, deployed instances, and relationships to the Kubernetes API.
        </Typography>
      </Alert>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> This view shows Custom Resource Definitions which are cluster-scoped resources. 
          Individual custom resource instances may be namespaced, but the definitions themselves apply cluster-wide.
        </Typography>
      </Alert>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
          <FilterIcon sx={{ mr: 1 }} />
          CRD Analysis Options
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={3} mt={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={useEnhancedAnalysis}
                  onChange={(e) => setUseEnhancedAnalysis(e.target.checked)}
                  color="primary"
                />
              }
              label="Enhanced Analysis (Multi-API Group Support)"
            />
            <Chip
              label={useEnhancedAnalysis ? "Enhanced" : "Legacy"}
              color={useEnhancedAnalysis ? "primary" : "default"}
              size="small"
              variant="outlined"
            />
          </Box>
          
          {!useEnhancedAnalysis && (
            <Box display="flex" flexDirection="row" flexWrap="wrap" gap={3}>
              <Box flexBasis={{ xs: '100%', sm: '40%' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Max CRDs to Display</InputLabel>
                  <Select
                    value={maxNodes}
                    label="Max CRDs to Display"
                    onChange={(e) => setMaxNodes(e.target.value as number)}
                  >
                    <MenuItem value={25}>25 CRDs</MenuItem>
                    <MenuItem value={50}>50 CRDs</MenuItem>
                    <MenuItem value={100}>100 CRDs</MenuItem>
                    <MenuItem value={200}>200 CRDs</MenuItem>
                    <MenuItem value={500}>500 CRDs</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box flexBasis={{ xs: '100%', sm: '60%' }}>
                <Box display="flex" alignItems="center" height="100%" gap={2}>
                  <Chip 
                    icon={<ExtensionIcon />}
                    label="Cluster-Scoped CRDs" 
                    color="primary" 
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="body2" color="textSecondary">
                    Custom Resource Definitions are cluster-wide resources
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
          
          {useEnhancedAnalysis && (
            <Alert severity="info">
              <Typography variant="body2">
                Enhanced analysis provides multi-API group filtering, improved OpenAPI schema traversal, 
                and more efficient dependency detection. Use the controls within each tab for detailed configuration.
              </Typography>
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="CRD dictionary visualization tabs">
          <Tab 
            label={useEnhancedAnalysis ? "Enhanced Schema Analysis" : "Schema Relationships"}
            icon={<ExtensionIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Resource Type Map" 
            icon={<VisibilityIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Definition Analytics" 
            icon={<AnalyticsIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {useEnhancedAnalysis ? (
          <EnhancedCRDDependencyVisualization
            onError={(error) => {
              console.error('Enhanced CRD analysis error:', error);
            }}
          />
        ) : (
          <>
            {crdsLoading && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Loading Custom Resource Definitions...</Typography>
              </Box>
            )}
            {crdsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {crdsError}
              </Alert>
            )}
            {crds.length > 0 ? (
              <CRDDictionaryVisualization
                crds={crds}
                config={dictionaryConfig}
                onCRDClick={(crd) => {
                  // Navigate to CRD detail view or handle click
                  console.log('CRD clicked:', crd);
                  handleNodeClick && handleNodeClick({
                    id: crd.crd?.metadata?.name || '',
                    kind: 'CustomResourceDefinition',
                    name: crd.crd?.metadata?.name || '',
                    labels: {},
                    status: {}
                  });
                }}
              />
            ) : !crdsLoading && !crdsError ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  No Custom Resource Definitions found in the cluster
                </Typography>
              </Box>
            ) : null}
          </>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              CRD to Native Resource Mapping
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              This analysis shows how Custom Resource Definitions reference native Kubernetes resources in their schemas:
            </Typography>
            <Box>
              <Typography variant="body2" component="div">
                • Direct references to native K8s types (Pod, Service, ConfigMap, etc.) in CRD schemas
              </Typography>
              <Typography variant="body2" component="div">
                • OpenAPI schema validation rules that depend on core resource types
              </Typography>
              <Typography variant="body2" component="div">
                • Cross-references between different CRD definitions
              </Typography>
              <Typography variant="body2" component="div">
                • API group and version dependencies on core Kubernetes APIs
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              CRD Schema Analytics
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Deep analysis of CRD schema definitions and their API dependencies:
            </Typography>
            <Box>
            <Typography variant="body2" component="div">
              • CRD OpenAPI schema complexity metrics
            </Typography>
            <Typography variant="body2" component="div">
              • Native Kubernetes API dependencies per CRD
            </Typography>
            <Typography variant="body2" component="div">
              • CRD-to-CRD reference patterns and circular dependencies
            </Typography>
            <Typography variant="body2" component="div">
              • API version compatibility and migration paths
            </Typography>
            <Typography variant="body2" component="div">
              • Schema validation rules and constraint analysis
            </Typography>
            <Typography variant="body2" component="div">
              • Resource definition inheritance and composition patterns
            </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Info Cards */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          CRD Dictionary Analysis Types
        </Typography>
        
        <Box display="flex" flexDirection="row" flexWrap="wrap" gap={2}>
          <Card variant="outlined" sx={{ minWidth: 250 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                📋 CRD → Native API References
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Analyzes how CRD schemas reference core Kubernetes resource types 
                (Pod, Service, ConfigMap, etc.) in their OpenAPI definitions.
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ minWidth: 250 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                🔗 CRD → CRD Dependencies
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Cross-references between Custom Resource Definitions, 
                including schema composition and inheritance patterns.
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ minWidth: 250 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                📊 API Schema Mapping
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Complete mapping of CRD schema definitions to Kubernetes API groups, 
                versions, and resource types at the definition level.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default CRDDependencyBrowser;