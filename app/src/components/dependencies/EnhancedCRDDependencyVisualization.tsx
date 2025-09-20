import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterAlt as FilterIcon,
  Analytics as AnalyticsIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Download as ExportIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { 
  DependencyGraph, 
  CRDAnalysisOptions, 
  EnhancedDependencyGraphMetadata,
  APIGroupInfo 
} from '../../services/dependency-analyzer';
import dependencyAnalyzer from '../../services/dependency-analyzer';
import CRDAPIGroupSelector from './CRDAPIGroupSelector';
import CRDDetailSelector from './CRDDetailSelector';
import ResourceDependencyGraph from './ResourceDependencyGraph';

interface EnhancedCRDDependencyVisualizationProps {
  onError?: (error: string) => void;
}

interface AnalysisSettings {
  maxCRDs: number;
  includeNativeResources: boolean;
  analysisDepth: 'shallow' | 'deep';
}

const EnhancedCRDDependencyVisualization: React.FC<EnhancedCRDDependencyVisualizationProps> = ({
  onError
}) => {
  // State management
  const [selectedAPIGroups, setSelectedAPIGroups] = useState<string[]>([]);
  const [selectedCRDs, setSelectedCRDs] = useState<string[]>([]);
  const [graph, setGraph] = useState<DependencyGraph & { metadata: EnhancedDependencyGraphMetadata } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>({
    maxCRDs: 100,
    includeNativeResources: true,
    analysisDepth: 'deep'
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json');
  const [exportOptions, setExportOptions] = useState({
    includeRawGraph: false,
    includeSchemaDetails: true,
    includeDependencyMetadata: false
  });

  // Enhanced analysis function
  const analyzeEnhancedCRDDependencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHasStartedAnalysis(true);
      
      const options: CRDAnalysisOptions = {
        apiGroups: selectedAPIGroups.length > 0 ? selectedAPIGroups : undefined,
        crds: selectedCRDs.length > 0 ? selectedCRDs : undefined,
        maxCRDs: settings.maxCRDs,
        includeNativeResources: settings.includeNativeResources,
        analysisDepth: settings.analysisDepth
      };
      
      const result = await dependencyAnalyzer.getEnhancedCRDDictionaryGraph(options);
      setGraph(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze CRD dependencies';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Enhanced CRD analysis failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAPIGroups, selectedCRDs, settings, onError]);

  // Auto-refresh only if analysis has been started
  // Note: We don't automatically start analysis on mount anymore

  useEffect(() => {
    if (!autoRefresh || !hasStartedAnalysis) return;
    
    const interval = setInterval(() => {
      analyzeEnhancedCRDDependencies();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, hasStartedAnalysis, analyzeEnhancedCRDDependencies]);

  // Analysis statistics
  const analysisStats = useMemo(() => {
    if (!graph) return null;
    
    const metadata = graph.metadata;
    const coreResourceNodes = graph.nodes.filter(node => 
      node.labels['dictionary.type'] === 'core-resource-type'
    );
    const crdNodes = graph.nodes.filter(node => 
      node.labels['dictionary.type'] === 'crd-definition'
    );
    const strongEdges = graph.edges.filter(edge => edge.strength === 'strong');
    const weakEdges = graph.edges.filter(edge => edge.strength === 'weak');
    
    return {
      totalNodes: metadata.nodeCount,
      totalEdges: metadata.edgeCount,
      coreResourceNodes: coreResourceNodes.length,
      crdNodes: crdNodes.length,
      strongDependencies: strongEdges.length,
      weakDependencies: weakEdges.length,
      apiGroups: metadata.apiGroups || [],
      apiGroupStats: metadata.apiGroupStats || {},
      analysisOptions: metadata.analysisOptions || {}
    };
  }, [graph]);

  const handleSettingsChange = (newSettings: Partial<AnalysisSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleAPIGroupsChange = (groups: string[]) => {
    setSelectedAPIGroups(groups);
    // Clear CRD selection when API groups change
    setSelectedCRDs([]);
  };

  const handleCRDsChange = (crds: string[]) => {
    setSelectedCRDs(crds);
  };

  const handleRefresh = () => {
    analyzeEnhancedCRDDependencies();
  };

  const handleExport = async () => {
    if (!graph) {
      onError?.('No analysis data available for export. Please run an analysis first.');
      return;
    }

    try {
      setExporting(true);
      
      const analysisOptions: CRDAnalysisOptions = {
        apiGroups: selectedAPIGroups.length > 0 ? selectedAPIGroups : undefined,
        crds: selectedCRDs.length > 0 ? selectedCRDs : undefined,
        maxCRDs: 9999, // Remove limit for export
        includeNativeResources: settings.includeNativeResources,
        analysisDepth: settings.analysisDepth
      };

      const data = await dependencyAnalyzer.exportEnhancedCRDAnalysis(
        analysisOptions,
        {
          format: exportFormat,
          includeRawGraph: exportOptions.includeRawGraph,
          includeSchemaDetails: exportOptions.includeSchemaDetails,
          includeDependencyMetadata: exportOptions.includeDependencyMetadata
        }
      );

      // Create and download the file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `crd-analysis-${timestamp}.${exportFormat}`;
      
      let blob: Blob;
      let mimeType: string;
      
      switch (exportFormat) {
        case 'json':
          mimeType = 'application/json';
          blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
          break;
        case 'csv':
          mimeType = 'text/csv';
          blob = new Blob([data], { type: mimeType });
          break;
        case 'markdown':
          mimeType = 'text/markdown';
          blob = new Blob([data], { type: mimeType });
          break;
        default:
          mimeType = 'application/octet-stream';
          blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setExportDialogOpen(false);
      console.log(`Exported CRD analysis as ${exportFormat}: ${filename}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export analysis data';
      onError?.(errorMessage);
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const renderAnalysisControls = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          <AnalyticsIcon sx={{ mr: 1 }} />
          Enhanced CRD Dependency Analysis
        </Typography>
        <Box display="flex" gap={1}>
          {hasStartedAnalysis && (
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-refresh"
            />
          )}
          <Tooltip title="Analysis settings">
            <IconButton onClick={() => setSettingsDialogOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          {hasStartedAnalysis && (
            <Tooltip title="Refresh analysis">
              <span>
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {graph && (
            <Tooltip title="Export analysis results">
              <IconButton onClick={() => setExportDialogOpen(true)} disabled={loading}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      
      <CRDAPIGroupSelector
        selectedGroups={selectedAPIGroups}
        onGroupsChange={handleAPIGroupsChange}
        disabled={loading}
      />
      
      {/* Show CRD detail selector after API group selection */}
      <Box sx={{ mt: 2 }}>
        <CRDDetailSelector
          selectedGroups={selectedAPIGroups}
          selectedCRDs={selectedCRDs}
          onCRDsChange={handleCRDsChange}
          disabled={loading}
        />
      </Box>
      
      {!hasStartedAnalysis && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Select API groups and specific CRDs above, then click "Start Analysis" to begin dependency analysis.
            {selectedAPIGroups.length === 0 && " No API groups selected - analysis will include all CRDs."}
            {selectedCRDs.length === 0 && selectedAPIGroups.length > 0 && " No specific CRDs selected - will analyze all CRDs in selected API groups."}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={analyzeEnhancedCRDDependencies}
            disabled={loading}
            startIcon={<AnalyticsIcon />}
          >
            Start Analysis
            {selectedAPIGroups.length > 0 && ` (${selectedAPIGroups.length} API Groups`}
            {selectedCRDs.length > 0 && `, ${selectedCRDs.length} CRDs`}
            {selectedAPIGroups.length > 0 && `)`}
          </Button>
        </Box>
      )}
    </Paper>
  );

  const renderAnalysisStatistics = () => {
    if (!analysisStats) return null;
    
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {analysisStats.totalNodes}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Nodes
              </Typography>
              <Typography variant="caption" display="block">
                {analysisStats.crdNodes} CRDs, {analysisStats.coreResourceNodes} Core Resources
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="secondary">
                {analysisStats.totalEdges}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Dependencies
              </Typography>
              <Typography variant="caption" display="block">
                {analysisStats.strongDependencies} strong, {analysisStats.weakDependencies} weak
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {analysisStats.apiGroups.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                API Groups
              </Typography>
              <Typography variant="caption" display="block">
                {selectedAPIGroups.length > 0 ? `${selectedAPIGroups.length} selected` : 'All groups'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {settings.analysisDepth}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Analysis Depth
              </Typography>
              <Typography variant="caption" display="block">
                Max {settings.maxCRDs} CRDs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderSelectedAPIGroupsSummary = () => {
    if (selectedAPIGroups.length === 0) return null;
    
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Active API Group Filter:</strong>
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {selectedAPIGroups.map(group => (
            <Chip
              key={group}
              label={`${group} (${analysisStats?.apiGroupStats[group]?.count || 0} CRDs)`}
              size="small"
              color="info"
              variant="outlined"
            />
          ))}
        </Box>
      </Alert>
    );
  };

  const renderSettingsDialog = () => (
    <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Analysis Settings</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} pt={1}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Maximum CRDs to Analyze: {settings.maxCRDs}
            </Typography>
            <Slider
              value={settings.maxCRDs}
              onChange={(_, value) => handleSettingsChange({ maxCRDs: value as number })}
              min={10}
              max={500}
              step={10}
              marks={[
                { value: 50, label: '50' },
                { value: 100, label: '100' },
                { value: 250, label: '250' },
                { value: 500, label: '500' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.includeNativeResources}
                onChange={(e) => handleSettingsChange({ includeNativeResources: e.target.checked })}
              />
            }
            label="Include Native Kubernetes Resources"
          />
          
          <FormControl fullWidth>
            <InputLabel>Analysis Depth</InputLabel>
            <Select
              value={settings.analysisDepth}
              label="Analysis Depth"
              onChange={(e) => handleSettingsChange({ analysisDepth: e.target.value as 'shallow' | 'deep' })}
            >
              <MenuItem value="shallow">Shallow - Basic schema analysis</MenuItem>
              <MenuItem value="deep">Deep - Comprehensive schema traversal</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={() => {
            setSettingsDialogOpen(false);
            analyzeEnhancedCRDDependencies();
          }}
          variant="contained"
        >
          Apply & Analyze
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderExportDialog = () => (
    <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle display="flex" alignItems="center">
        <ExportIcon sx={{ mr: 1 }} />
        Export Analysis Results
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} pt={1}>
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'markdown')}
            >
              <MenuItem value="json">JSON - Complete structured data</MenuItem>
              <MenuItem value="csv">CSV - Tabular data for spreadsheets</MenuItem>
              <MenuItem value="markdown">Markdown - Formatted report</MenuItem>
            </Select>
          </FormControl>
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Export Options
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.includeSchemaDetails}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSchemaDetails: e.target.checked }))}
                />
              }
              label="Include CRD Schema Details"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.includeRawGraph}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeRawGraph: e.target.checked }))}
                />
              }
              label="Include Raw Graph Data"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.includeDependencyMetadata}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeDependencyMetadata: e.target.checked }))}
                />
              }
              label="Include Detailed Metadata"
            />
          </Box>
          
          {analysisStats && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Export Preview:</strong> {analysisStats.totalNodes} nodes, {analysisStats.totalEdges} dependencies across {analysisStats.apiGroups.length} API groups
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExportDialogOpen(false)} disabled={exporting}>
          Cancel
        </Button>
        <Button 
          onClick={handleExport}
          variant="contained"
          disabled={exporting || !graph}
          startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
        >
          {exporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box>
        {renderAnalysisControls()}
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography variant="h6">
            Analyzing CRD dependencies...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {renderAnalysisControls()}
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {renderAnalysisControls()}
      {renderSelectedAPIGroupsSummary()}
      {renderAnalysisStatistics()}
      
      {graph && (
        <ResourceDependencyGraph
          filters={{}}
          dictionaryMode={true}
          dictionaryData={graph}
          onNodeClick={(node) => {
            console.log('Enhanced CRD Node clicked:', node);
          }}
          onEdgeClick={(edge) => {
            console.log('Enhanced CRD Edge clicked:', edge);
          }}
        />
      )}
      
      {renderSettingsDialog()}
      {renderExportDialog()}
    </Box>
  );
};

export default EnhancedCRDDependencyVisualization;