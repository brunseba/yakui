import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  CircularProgress,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import {
  AnalyticsOutlined as AnalysisIcon,
  CloudDownloadOutlined as ExportIcon,
  RefreshOutlined as RefreshIcon
} from '@mui/icons-material';
import {
  CRDApiGroup,
  CRDAnalysisOptions,
  CRDExportOptions,
  crdAnalysisService
} from '../../services/crd-analysis';

interface CRDAnalysisFiltersProps {
  onAnalysisOptionsChange: (options: CRDAnalysisOptions) => void;
  onRunAnalysis: () => void;
  onExport: (options: CRDExportOptions) => void;
  loading?: boolean;
}

export const CRDAnalysisFilters: React.FC<CRDAnalysisFiltersProps> = ({
  onAnalysisOptionsChange,
  onRunAnalysis,
  onExport,
  loading = false
}) => {
  const [apiGroups, setApiGroups] = useState<CRDApiGroup[]>([]);
  const [selectedApiGroups, setSelectedApiGroups] = useState<string[]>([]);
  const [maxCRDs, setMaxCRDs] = useState<number>(50);
  const [includeNativeResources, setIncludeNativeResources] = useState<boolean>(true);
  const [analysisDepth, setAnalysisDepth] = useState<'shallow' | 'deep'>('deep');
  const [loadingApiGroups, setLoadingApiGroups] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Export options
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json');
  const [includeSchemaDetails, setIncludeSchemaDetails] = useState<boolean>(true);
  const [includeDependencyMetadata, setIncludeDependencyMetadata] = useState<boolean>(false);

  // Load API groups on component mount
  useEffect(() => {
    loadApiGroups();
  }, []);

  // Update analysis options when filters change
  useEffect(() => {
    const options: CRDAnalysisOptions = {
      apiGroups: selectedApiGroups.length > 0 ? selectedApiGroups : undefined,
      maxCRDs,
      includeNativeResources,
      analysisDepth
    };
    onAnalysisOptionsChange(options);
  }, [selectedApiGroups, maxCRDs, includeNativeResources, analysisDepth, onAnalysisOptionsChange]);

  const loadApiGroups = async () => {
    setLoadingApiGroups(true);
    setError(null);
    try {
      const groups = await crdAnalysisService.getApiGroups();
      setApiGroups(groups);
      console.log('Loaded API groups:', groups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load API groups';
      setError(errorMessage);
      console.error('Failed to load API groups:', err);
    } finally {
      setLoadingApiGroups(false);
    }
  };

  const handleApiGroupsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedApiGroups(value);
  };

  const handleMaxCRDsChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setMaxCRDs(value);
  };

  const handleExport = () => {
    const exportOptions: CRDExportOptions = {
      format: exportFormat,
      includeSchemaDetails,
      includeDependencyMetadata,
      focusOnCRDs: true,
      apiGroups: selectedApiGroups.length > 0 ? selectedApiGroups : undefined
    };
    onExport(exportOptions);
  };

  const getTotalCRDs = () => {
    if (selectedApiGroups.length === 0) {
      return apiGroups.reduce((total, group) => total + group.crdCount, 0);
    }
    return apiGroups
      .filter(group => selectedApiGroups.includes(group.group))
      .reduce((total, group) => total + group.crdCount, 0);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🔧 CRD Dependencies Analysis
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Analyze Custom Resource Definition (CRD) schema dependencies and relationships in your Kubernetes cluster.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loadingApiGroups ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading API groups...</Typography>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          Found {apiGroups.length} API groups with {getTotalCRDs()} total CRDs
          {selectedApiGroups.length > 0 && ` (${getTotalCRDs()} selected)`}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* API Groups Selection */}
        <FormControl fullWidth>
          <InputLabel>API Groups</InputLabel>
          <Select
            multiple
            value={selectedApiGroups}
            onChange={handleApiGroupsChange}
            input={<OutlinedInput label="API Groups" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => {
                  const group = apiGroups.find(g => g.group === value);
                  return (
                    <Chip
                      key={value}
                      label={`${value} (${group?.crdCount || 0})`}
                      size="small"
                      color="primary"
                    />
                  );
                })}
              </Box>
            )}
            disabled={loadingApiGroups}
          >
            <MenuItem value="">
              <em>All API Groups</em>
            </MenuItem>
            {apiGroups.map((group) => (
              <MenuItem key={group.group} value={group.group}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{group.group}</span>
                  <Chip label={group.crdCount} size="small" variant="outlined" />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Max CRDs Slider */}
        <Box>
          <Typography gutterBottom>
            Maximum CRDs to Analyze: {maxCRDs}
          </Typography>
          <Slider
            value={maxCRDs}
            onChange={handleMaxCRDsChange}
            aria-labelledby="max-crds-slider"
            min={5}
            max={200}
            step={5}
            marks={[
              { value: 10, label: '10' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
              { value: 200, label: '200' }
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Analysis Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Analysis Depth</InputLabel>
            <Select
              value={analysisDepth}
              onChange={(e) => setAnalysisDepth(e.target.value as 'shallow' | 'deep')}
              label="Analysis Depth"
            >
              <MenuItem value="shallow">
                <Box>
                  <Typography variant="body2" fontWeight="bold">Shallow</Typography>
                  <Typography variant="caption">Basic schema references only</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="deep">
                <Box>
                  <Typography variant="body2" fontWeight="bold">Deep</Typography>
                  <Typography variant="caption">Full schema traversal and cross-references</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={includeNativeResources}
                onChange={(e) => setIncludeNativeResources(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Include Native Resources</Typography>
                <Typography variant="caption" color="text.secondary">
                  Include Kubernetes core resources in dependency analysis
                </Typography>
              </Box>
            }
          />
        </Box>

        <Divider />

        {/* Export Options */}
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Export Options
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'markdown')}
              label="Export Format"
            >
              <MenuItem value="json">JSON - Machine readable</MenuItem>
              <MenuItem value="csv">CSV - Spreadsheet format</MenuItem>
              <MenuItem value="markdown">Markdown - Documentation format</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={includeSchemaDetails}
                onChange={(e) => setIncludeSchemaDetails(e.target.checked)}
              />
            }
            label="Include Schema Details"
          />

          <FormControlLabel
            control={
              <Switch
                checked={includeDependencyMetadata}
                onChange={(e) => setIncludeDependencyMetadata(e.target.checked)}
              />
            }
            label="Include Dependency Metadata"
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <AnalysisIcon />}
            onClick={onRunAnalysis}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            disabled={loading}
          >
            Export
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadApiGroups}
            disabled={loadingApiGroups}
          >
            Refresh
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CRDAnalysisFilters;