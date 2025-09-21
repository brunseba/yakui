import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
  Paper,
  SelectChangeEvent
} from '@mui/material';
import { DependencyFilters, DependencyType } from '../../services/dependency-analyzer';

interface DependencyGraphFiltersProps {
  filters: DependencyFilters;
  onFiltersChange: (filters: DependencyFilters) => void;
  availableNamespaces?: string[];
  availableResourceTypes?: string[];
}

const dependencyTypes: DependencyType[] = [
  'owner',
  'selector',
  'volume',
  'serviceAccount',
  'network',
  'custom',
  'service'
];

const resourceTypes = [
  'Pod',
  'Service',
  'Deployment',
  'ConfigMap',
  'Secret',
  'ServiceAccount',
  'ReplicaSet',
  'DaemonSet',
  'Node'
];

export const DependencyGraphFilters: React.FC<DependencyGraphFiltersProps> = ({
  filters,
  onFiltersChange,
  availableNamespaces = [],
  availableResourceTypes = []
}) => {
  const [maxNodes, setMaxNodes] = useState(filters.maxNodes || 30);

  // Merge available resource types with default ones
  const allResourceTypes = Array.from(new Set([...resourceTypes, ...(availableResourceTypes || [])]));
  const allNamespaces = ['all-namespaces', 'default', 'kube-system', ...availableNamespaces].filter((ns, index, arr) => arr.indexOf(ns) === index);

  const handleNamespaceChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    const namespace = value === 'all-namespaces' ? undefined : value;
    onFiltersChange({ ...filters, namespace });
  };

  const handleResourceTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    onFiltersChange({ ...filters, resourceTypes: value });
  };

  const handleDependencyTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as DependencyType[];
    onFiltersChange({ ...filters, dependencyTypes: value });
  };

  const handleMaxNodesChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setMaxNodes(value);
    onFiltersChange({ ...filters, maxNodes: value });
  };

  const handleIncludeCustomResourcesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, includeCustomResources: event.target.checked });
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dependency Graph Filters
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        For better performance with large clusters, start with a specific namespace and fewer nodes.
      </Alert>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Namespace Selection */}
        <FormControl fullWidth>
          <InputLabel>Namespace</InputLabel>
          <Select
            value={filters.namespace || 'default'}
            onChange={handleNamespaceChange}
            label="Namespace"
          >
            <MenuItem value="all-namespaces">All Namespaces</MenuItem>
            {allNamespaces.filter(ns => ns !== 'all-namespaces').map((namespace) => (
              <MenuItem key={namespace} value={namespace}>
                {namespace}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Max Nodes Slider */}
        <Box>
          <Typography gutterBottom>
            Maximum Nodes: {maxNodes}
          </Typography>
          <Slider
            value={maxNodes}
            onChange={handleMaxNodesChange}
            aria-labelledby="max-nodes-slider"
            min={5}
            max={100}
            step={5}
            marks={[
              { value: 10, label: '10' },
              { value: 30, label: '30' },
              { value: 50, label: '50' },
              { value: 100, label: '100' }
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Resource Types Filter */}
        <FormControl fullWidth>
          <InputLabel>Resource Types</InputLabel>
          <Select
            multiple
            value={filters.resourceTypes || []}
            onChange={handleResourceTypesChange}
            input={<OutlinedInput label="Resource Types" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {allResourceTypes.map((resourceType) => (
              <MenuItem key={resourceType} value={resourceType}>
                {resourceType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Dependency Types Filter */}
        <FormControl fullWidth>
          <InputLabel>Dependency Types</InputLabel>
          <Select
            multiple
            value={filters.dependencyTypes || []}
            onChange={handleDependencyTypesChange}
            input={<OutlinedInput label="Dependency Types" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as DependencyType[]).map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {dependencyTypes.map((depType) => (
              <MenuItem key={depType} value={depType}>
                {depType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Include Custom Resources */}
        <FormControlLabel
          control={
            <Switch
              checked={filters.includeCustomResources || false}
              onChange={handleIncludeCustomResourcesChange}
            />
          }
          label="Include Custom Resources"
        />
      </Box>
    </Paper>
  );
};

export default DependencyGraphFilters;