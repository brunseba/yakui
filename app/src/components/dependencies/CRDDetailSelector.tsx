import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Alert,
  Paper,
  Grid,
  Tooltip,
  IconButton,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  SelectAll as SelectAllIcon,
  ClearAll as DeselectAllIcon,
  Info as InfoIcon,
  FilterList as FilterIcon,
  Extension as CRDIcon
} from '@mui/icons-material';
import { APIGroupInfo, CRDInfo } from '../../services/dependency-analyzer';
import dependencyAnalyzer from '../../services/dependency-analyzer';

export interface CRDDetailSelectorProps {
  selectedGroups: string[];
  selectedCRDs: string[];
  onCRDsChange: (crds: string[]) => void;
  disabled?: boolean;
  maxWidth?: number | string;
}

const CRDDetailSelector: React.FC<CRDDetailSelectorProps> = ({
  selectedGroups,
  selectedCRDs,
  onCRDsChange,
  disabled = false,
  maxWidth = '100%'
}) => {
  const [apiGroups, setApiGroups] = useState<APIGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [groupByAPIGroup, setGroupByAPIGroup] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Fetch API groups from the backend
  const fetchAPIGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const groups = await dependencyAnalyzer.getCRDAPIGroups();
      setApiGroups(groups);
      
      // Auto-expand selected groups
      const newExpandedGroups: Record<string, boolean> = {};
      groups.forEach(group => {
        if (selectedGroups.length === 0 || selectedGroups.includes(group.group)) {
          newExpandedGroups[group.group] = true;
        }
      });
      setExpandedGroups(newExpandedGroups);
    } catch (err) {
      console.error('Failed to fetch CRD API groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIGroups();
  }, []);

  // Get filtered CRDs based on selected API groups and search
  const getFilteredCRDs = () => {
    let filteredGroups = apiGroups;
    
    // Filter by selected API groups if any are selected
    if (selectedGroups.length > 0) {
      filteredGroups = apiGroups.filter(group => selectedGroups.includes(group.group));
    }
    
    // Get all CRDs from filtered groups
    const allCRDs = filteredGroups.flatMap(group => 
      group.crds.map(crd => ({
        ...crd,
        apiGroup: group.group,
        fullName: `${crd.kind} (${group.group})`
      }))
    );
    
    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      return allCRDs.filter(crd => 
        crd.kind.toLowerCase().includes(searchTerm) ||
        crd.name.toLowerCase().includes(searchTerm) ||
        crd.apiGroup.toLowerCase().includes(searchTerm)
      );
    }
    
    return allCRDs;
  };

  const handleCRDToggle = (crdName: string) => {
    const isSelected = selectedCRDs.includes(crdName);
    if (isSelected) {
      onCRDsChange(selectedCRDs.filter(name => name !== crdName));
    } else {
      onCRDsChange([...selectedCRDs, crdName]);
    }
  };

  const handleSelectAllCRDs = () => {
    const filteredCRDs = getFilteredCRDs();
    const allCRDNames = filteredCRDs.map(crd => crd.name);
    onCRDsChange([...new Set([...selectedCRDs, ...allCRDNames])]);
  };

  const handleDeselectAllCRDs = () => {
    const filteredCRDs = getFilteredCRDs();
    const crdNamesToRemove = new Set(filteredCRDs.map(crd => crd.name));
    onCRDsChange(selectedCRDs.filter(name => !crdNamesToRemove.has(name)));
  };

  const handleGroupToggle = (groupName: string) => {
    const group = apiGroups.find(g => g.group === groupName);
    if (!group) return;
    
    const groupCRDNames = group.crds.map(crd => crd.name);
    const allSelected = groupCRDNames.every(name => selectedCRDs.includes(name));
    
    if (allSelected) {
      // Deselect all CRDs from this group
      onCRDsChange(selectedCRDs.filter(name => !groupCRDNames.includes(name)));
    } else {
      // Select all CRDs from this group
      onCRDsChange([...new Set([...selectedCRDs, ...groupCRDNames])]);
    }
  };

  const toggleGroupExpansion = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const getCRDSummary = () => {
    const filteredCRDs = getFilteredCRDs();
    const selectedCount = filteredCRDs.filter(crd => selectedCRDs.includes(crd.name)).length;
    const totalCount = filteredCRDs.length;
    
    if (selectedCRDs.length === 0) {
      return `All ${totalCount} CRDs will be analyzed`;
    }
    
    return `${selectedCount}/${totalCount} CRDs selected for analysis`;
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, maxWidth }}>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={100}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body2">Loading CRDs...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, maxWidth }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Paper>
    );
  }

  const filteredCRDs = getFilteredCRDs();
  const groupedCRDs = filteredCRDs.reduce((acc, crd) => {
    const group = crd.apiGroup;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(crd);
    return acc;
  }, {} as Record<string, typeof filteredCRDs>);

  return (
    <Paper sx={{ p: 2, maxWidth }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          <CRDIcon sx={{ mr: 1 }} />
          CRD Detail Selection
          <Tooltip title="Select specific Custom Resource Definitions to include in the dependency analysis">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box display="flex" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={groupByAPIGroup}
                onChange={(e) => setGroupByAPIGroup(e.target.checked)}
                size="small"
              />
            }
            label="Group by API"
          />
          <Tooltip title="Select all visible CRDs">
            <IconButton 
              size="small" 
              onClick={handleSelectAllCRDs}
              disabled={disabled || filteredCRDs.length === 0}
            >
              <SelectAllIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deselect all visible CRDs">
            <IconButton 
              size="small" 
              onClick={handleDeselectAllCRDs}
              disabled={disabled}
            >
              <DeselectAllIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search and Summary */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search CRDs by name, kind, or API group..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Selection Summary
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {getCRDSummary()}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* CRD List */}
      <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
        {groupByAPIGroup ? (
          // Grouped view by API Group
          Object.entries(groupedCRDs).map(([groupName, crds]) => {
            const group = apiGroups.find(g => g.group === groupName);
            if (!group) return null;
            
            const groupCRDNames = crds.map(crd => crd.name);
            const selectedInGroup = groupCRDNames.filter(name => selectedCRDs.includes(name)).length;
            const isExpanded = expandedGroups[groupName];
            
            return (
              <Accordion 
                key={groupName}
                expanded={isExpanded}
                onChange={() => toggleGroupExpansion(groupName)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Checkbox
                        checked={selectedInGroup === groupCRDNames.length && groupCRDNames.length > 0}
                        indeterminate={selectedInGroup > 0 && selectedInGroup < groupCRDNames.length}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleGroupToggle(groupName);
                        }}
                        disabled={disabled}
                      />
                      <Typography variant="subtitle1">
                        {groupName}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
                      {selectedInGroup}/{crds.length} selected
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {crds.map((crd) => (
                      <ListItem key={crd.name} divider>
                        <ListItemIcon>
                          <Checkbox
                            checked={selectedCRDs.includes(crd.name)}
                            onChange={() => handleCRDToggle(crd.name)}
                            disabled={disabled}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={crd.kind}
                          secondary={
                            <>
                              <span style={{ display: 'block', fontSize: '0.75rem' }}>
                                Name: {crd.name}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                Version: {crd.version} • Group: {crd.group}
                              </span>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })
        ) : (
          // Flat list view
          <List>
            {filteredCRDs.map((crd, index) => (
              <React.Fragment key={crd.name}>
                <ListItem>
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedCRDs.includes(crd.name)}
                      onChange={() => handleCRDToggle(crd.name)}
                      disabled={disabled}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{crd.kind}</Typography>
                        <Chip 
                          label={crd.apiGroup} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <span style={{ display: 'block', fontSize: '0.75rem' }}>
                          Name: {crd.name}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          Version: {crd.version} • Group: {crd.group}
                        </span>
                      </>
                    }
                  />
                </ListItem>
                {index < filteredCRDs.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {filteredCRDs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="textSecondary">
            {searchFilter ? 'No CRDs match your search criteria.' : 'No CRDs available for the selected API groups.'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CRDDetailSelector;